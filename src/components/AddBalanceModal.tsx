import React, { useState, useEffect } from 'react';
import { X, Loader2, QrCode, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../lib/useAuth';
import { useBalance } from '../store';

interface AddBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddBalanceModal({ isOpen, onClose }: AddBalanceModalProps) {
  const { currentUser } = useAuth();
  const { addBalance } = useBalance(currentUser?.uid);
  
  const [amount, setAmount] = useState<number>(100);
  const [step, setStep] = useState<'input' | 'qr' | 'processing' | 'success'>('input');
  const [orderId, setOrderId] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);
  const [qrError, setQrError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let interval: NodeJS.Timeout;
    let timeoutId: NodeJS.Timeout;

    if (step === 'qr') {
      if (timeLeft > 0) {
        interval = setInterval(() => {
          setTimeLeft((prev) => prev - 1);
        }, 1000);
      } else {
        setError('Payment window expired. Please try again.');
        setStep('input');
      }
    }

    const pollPayment = async () => {
      if (!orderId || step !== 'qr') return;
      
      try {
        const res = await fetch('/api/fampay/verify-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId })
        });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.error('Verify Polling Error (Not JSON):', text.substring(0, 200));
          if (isMounted) {
            timeoutId = setTimeout(pollPayment, 5000);
          }
          return;
        }
        
        const status = (data.status || '').toLowerCase();
        if (isMounted && (status === 'success' || status === 'paid' || data.data?.status === 'SUCCESS' || data.data?.status === 'PAID')) {
           setStep('processing');
           addBalance(currentUser!.uid, amount);
           confetti({
             particleCount: 150,
             spread: 80,
             origin: { y: 0.6 },
             colors: ['#e000ff', '#4ade80', '#ffffff', '#fbbf24']
           });
           setStep('success');
     
           setTimeout(() => {
             onClose();
             setStep('input');
           }, 4000);
           return;
        } else if (isMounted && (status === 'error' || status === 'expired' || data.data?.status === 'FAILED')) {
           setError(data.message || 'Payment verification failed or expired.');
           setStep('input');
           return;
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
      
      if (isMounted) {
        timeoutId = setTimeout(pollPayment, 5000);
      }
    };

    if (step === 'qr' && orderId) {
      timeoutId = setTimeout(pollPayment, 5000);
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [step, orderId, timeLeft, onClose, amount, addBalance, currentUser]);

  const handleProceed = async () => {
    if (amount < 10) {
      setError('Minimum amount is ₹10');
      return;
    }
    setError('');
    setQrError(false);
    setStep('processing');
    try {
      const res = await fetch('/api/fampay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('API Error (Not JSON):', text.substring(0, 200));
        setError('Payment Gateway is currently unavailable. Please try again later.');
        setStep('input');
        return;
      }
      
      if (data.order_id && data.payment_url) {
        setOrderId(data.order_id);
        const redirectUrl = data.checkout_url || data.payment_url;
        setPaymentUrl(redirectUrl);
        if (data.qr_url) setQrUrl(data.qr_url);
        setTimeLeft(300);
        setStep('qr');
        
        // Auto redirect
        window.location.href = redirectUrl;
      } else {
        setError(data.error || data.message || 'Failed to initialize payment.');
        setStep('input');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize payment.');
      setStep('input');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-zinc-950 border border-fuchsia-500/30 shadow-[0_0_30px_rgba(224,0,255,0.2)] rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-fuchsia-500/20">
          <h3 className="text-2xl font-bold text-white font-display drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
            Add Balance
          </h3>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white hover:bg-fuchsia-500/20 transition-all p-2 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {step === 'input' && (
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Enter Amount (₹)</label>
              <input 
                type="number"
                min="10"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-colors"
                placeholder="Amount"
              />
            </div>
            
            {error && (
              <div className="text-red-400 text-sm bg-red-950/50 p-3 rounded-lg border border-red-500/50 text-center">
                {error}
              </div>
            )}
            
            <button 
              onClick={handleProceed}
              className="w-full px-4 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-base font-medium rounded-xl shadow-[0_0_15px_rgba(224,0,255,0.4)] transition-all"
            >
              Proceed to Pay
            </button>
          </div>
        )}

        {step === 'qr' && (
          <div className="p-10 space-y-6 flex flex-col items-center text-center">
            <Loader2 className="w-12 h-12 text-fuchsia-500 animate-spin mb-4" />
            <div>
              <h4 className="text-2xl font-bold text-white mb-2">Redirecting...</h4>
              <p className="text-zinc-400">Please complete your payment of <span className="font-bold text-fuchsia-400">₹{amount}</span> on the gateway.</p>
            </div>
            
            <a 
              href={paymentUrl}
              className="mt-6 px-6 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 font-medium rounded-xl transition-all border border-white/10 flex items-center gap-2"
            >
              Click here if not redirected
            </a>
            
            <button 
              onClick={async () => {
                 setError('');
                 try {
                   const res = await fetch('/api/fampay/verify-order', {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ order_id: orderId })
                   });
                   const text = await res.text();
                   let data;
                   try {
                     data = JSON.parse(text);
                   } catch (e) {
                     console.error('Verify Button Error (Not JSON):', text.substring(0, 200));
                     setError('Payment Gateway is currently unavailable. Please try again later.');
                     return;
                   }
                   const status = (data.status || '').toLowerCase();
                   if (status === 'success' || status === 'paid' || data.data?.status === 'SUCCESS' || data.data?.status === 'PAID') {
                     setStep('processing');
                     addBalance(currentUser!.uid, amount);
                     confetti({
                       particleCount: 150,
                       spread: 80,
                       origin: { y: 0.6 },
                       colors: ['#e000ff', '#4ade80', '#ffffff', '#fbbf24']
                     });
                     setStep('success');
                     setTimeout(() => { onClose(); setStep('input'); }, 4000);
                   } else {
                     setError(data.message || 'Payment not yet received.');
                   }
                 } catch (e) {
                   setError('Could not verify at this time.');
                 }
              }}
              className="w-full px-6 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-lg font-medium rounded-xl shadow-[0_0_15px_rgba(224,0,255,0.4)] transition-all flex items-center justify-center mt-2"
            >
              I have paid - Verify Now
            </button>
          </div>
        )}

        {step === 'processing' && (
          <div className="p-12 space-y-4 flex flex-col items-center text-center">
            <Loader2 className="w-12 h-12 text-fuchsia-500 animate-spin" />
            <h4 className="text-xl font-bold text-white">Processing...</h4>
          </div>
        )}

        {step === 'success' && (
          <div className="p-12 space-y-4 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-2 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
              <span className="text-3xl">₹</span>
            </div>
            <h4 className="text-2xl font-bold text-white">Balance Added!</h4>
            <p className="text-zinc-400">₹{amount} has been added to your wallet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
