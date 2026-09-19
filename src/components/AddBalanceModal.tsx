import React, { useState, useEffect } from 'react';
import { X, Loader2, QrCode, RefreshCw, ExternalLink, Smartphone } from 'lucide-react';
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
      const currentOrigin = window.location.origin;
      const res = await fetch('/api/fampay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount,
          origin: currentOrigin,
          redirect_url: `${currentOrigin}/success`
        })
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
      
      if (data.order_id && (data.payment_url || data.checkout_url)) {
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
        
        // Auto open payment url safely
        try {
          if (redirectUrl.startsWith('http')) {
            window.open(redirectUrl, '_blank');
          }
        } catch(e) {}
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
          <div className="p-6 sm:p-8 space-y-6 flex flex-col items-center text-center">
            <div className="w-14 h-14 bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(224,0,255,0.25)]">
              <Smartphone className="w-7 h-7" />
            </div>

            <div>
              <h4 className="text-xl sm:text-2xl font-bold text-white mb-1">Add ₹{amount} Balance</h4>
              <p className="text-sm text-zinc-400">Complete payment via FamPay UPI Gateway</p>
              {orderId && (
                <p className="text-xs text-zinc-500 font-mono mt-1">Order ID: {orderId}</p>
              )}
            </div>
            
            {/* Direct Actions */}
            <div className="w-full space-y-3">
              {paymentUrl && paymentUrl.startsWith('http') && (
                <a 
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 px-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(224,0,255,0.4)] hover:shadow-[0_0_20px_rgba(224,0,255,0.6)] flex items-center justify-center gap-2 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Payment Gateway (Pay Now)
                </a>
              )}

              <a 
                href={`upi://pay?pa=armanbarik@fam&pn=${encodeURIComponent('ARMAN X STORE')}&am=${amount}&cu=INR`}
                className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl border border-zinc-700 transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                Pay via UPI App (GPay / PhonePe / Paytm)
              </a>
            </div>

            {/* QR Code preview if available */}
            {qrUrl && (
              <div className="p-3 bg-white rounded-2xl shadow-lg border border-zinc-700 inline-block">
                <img src={qrUrl} alt="UPI QR Code" className="w-40 h-40 object-contain rounded-lg" />
              </div>
            )}

            {/* Polling & Manual Verify */}
            <div className="w-full pt-2 border-t border-zinc-800 space-y-3">
              <div className="flex items-center justify-center gap-2 text-fuchsia-400 animate-pulse text-xs">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Auto-checking payment... ({Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')})</span>
              </div>

              <button
                onClick={() => {
                  localStorage.setItem('paymentRedirected', 'true');
                }}
                className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-xl border border-zinc-800 transition-colors flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-fuchsia-400" />
                I Have Paid - Verify & Add Balance Now
              </button>

              <p className="text-[11px] text-zinc-500">
                After paying in your UPI app, return here to have your wallet balance credited immediately.
              </p>
            </div>
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
