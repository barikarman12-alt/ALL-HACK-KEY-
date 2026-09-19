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

  // Separate countdown timer effect
  useEffect(() => {
    if (step !== 'qr' || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setError('Payment window expired. Please try again.');
          setStep('input');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  // Check for existing pending balance topup on open
  useEffect(() => {
    if (!isOpen || !currentUser) return;
    try {
      const saved = localStorage.getItem('pendingPayment');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.type === 'balance' && (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000)) {
          setOrderId(parsed.orderId);
          setAmount(parsed.amount);
          setStep('qr');
        }
      }
    } catch(e) {}
  }, [isOpen, currentUser]);

  // Dedicated polling effect that doesn't get cancelled by the timer
  useEffect(() => {
    if (!orderId || (step !== 'qr' && step !== 'processing') || !isOpen) return;
    let isMounted = true;

    const pollPayment = async () => {
      if (!orderId || !isMounted) return;
      
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
          return;
        }
        
        const status = (data.status || data.data?.status || '').toString().toLowerCase();
        if (isMounted && (status === 'success' || status === 'paid' || status === 'completed')) {
          setStep('processing');
          if (currentUser?.uid) {
            addBalance(currentUser.uid, amount, {
              method: 'UPI / QR Gateway (FamPay)',
              referenceId: orderId,
              note: `Wallet balance deposit of ₹${amount} via FamPay UPI Gateway`,
              type: 'deposit',
              userEmail: currentUser.email || ''
            });
          }
          localStorage.removeItem('pendingPayment');
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#e000ff', '#4ade80', '#ffffff', '#fbbf24']
          });
          setStep('success');

          setTimeout(() => {
            if (isMounted) {
              onClose();
              setStep('input');
            }
          }, 3000);
        } else if (isMounted && (status === 'error' || status === 'expired' || data.data?.status === 'FAILED')) {
          setError(data.message || 'Payment verification failed or expired.');
          setStep('input');
          localStorage.removeItem('pendingPayment');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollPayment();
    const interval = setInterval(pollPayment, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [step, orderId, isOpen, amount, addBalance, currentUser, onClose]);

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
        console.warn('Backend API not responding with JSON. Attempting direct client-side fetch (Static mode fallback)...');
        try {
          const apiKey = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';
          const directRes = await fetch(`https://famgateway.in/api/create-order.php`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              amount: parseFloat(amount.toString()).toFixed(2),
              redirect_url: window.location.origin + '/success',
              webhook_url: window.location.origin + '/api/fampay/webhook'
            })
          });
          const directText = await directRes.text();
          const extData = JSON.parse(directText);
          data = {
              success: true,
              order_id: extData.data?.order_id || extData.order_id || `txn_${Date.now()}`,
              checkout_url: extData.data?.checkout_url || extData.checkout_url,
              payment_url: extData.data?.checkout_url || extData.data?.upi_intent || extData.payment_url || extData.upi_link,
              qr_url: extData.data?.qr_url || extData.qr_url
          };
        } catch (directErr) {
          console.error('Direct fetch failed:', directErr);
          setError('Payment Gateway is currently unavailable. Please try again later.');
          setStep('input');
          return;
        }
      }
      
      if (data.order_id && data.payment_url) {
        setOrderId(data.order_id);
        const redirectUrl = data.checkout_url || data.payment_url;
        setPaymentUrl(redirectUrl);
        if (data.qr_url) setQrUrl(data.qr_url);
        setTimeLeft(300);
        setStep('qr');

        // Save pending payment so if user presses back or leaves, balance is credited upon verification
        try {
          localStorage.setItem('pendingPayment', JSON.stringify({
            orderId: data.order_id,
            type: 'balance',
            amount: amount,
            userId: currentUser?.uid,
            timestamp: Date.now()
          }));
        } catch(e) {}
        
        // Auto redirect
        if (redirectUrl.startsWith('http')) {
          window.open(redirectUrl, '_blank');
        } else {
          window.location.href = redirectUrl;
        }
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
