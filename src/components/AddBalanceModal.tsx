import React, { useState, useEffect } from 'react';
import { X, Loader2, QrCode, RefreshCw, Search, CheckCircle2, ShieldCheck, Wallet } from 'lucide-react';
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
  
  const [activeTab, setActiveTab] = useState<'add' | 'claim'>('add');
  const [amount, setAmount] = useState<number>(100);
  const [step, setStep] = useState<'input' | 'qr' | 'processing' | 'success'>('input');
  const [orderId, setOrderId] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(300);
  const [qrError, setQrError] = useState(false);

  // Claim missing payment state
  const [claimQuery, setClaimQuery] = useState('');
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);

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
          body: JSON.stringify({ 
            order_id: orderId,
            userId: currentUser?.uid,
            userEmail: currentUser?.email
          })
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
            // Mark credited on server
            fetch('/api/fampay/mark-credited', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order_id: orderId, userId: currentUser.uid })
            }).catch(() => {});
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
        // Silently retry on next poll tick
      }
    };

    pollPayment();
    const interval = setInterval(pollPayment, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [step, orderId, isOpen, amount, addBalance, currentUser, onClose]);

  const [utrNumber, setUtrNumber] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);

  const handleCopyUpi = () => {
    navigator.clipboard.writeText('armanbarik@fam');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2500);
  };

  const handleVerifyUTR = async () => {
    if (!orderId) return;
    if (!utrNumber || utrNumber.trim().length < 6) {
      setError('Please enter a valid 12-digit UTR or Transaction ID');
      return;
    }
    setError('');
    try {
      const res = await fetch('/api/fampay/submit-utr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          order_id: orderId, 
          utr: utrNumber.trim(),
          userId: currentUser?.uid,
          userEmail: currentUser?.email
        })
      });
      const data = await res.json();
      if (data.status === 'success' || data.success) {
        // Will auto-trigger verify poll
      }
    } catch (e) {
      console.error(e);
    }
  };

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
        body: JSON.stringify({ 
          amount,
          userId: currentUser?.uid,
          userEmail: currentUser?.email,
          orderType: 'balance'
        })
      });
      
      let data: any;
      try {
        const text = await res.text();
        data = JSON.parse(text);
      } catch (e) {
        const clientTxnId = `txn_${Date.now()}`;
        const upiUrl = `upi://pay?pa=armanbarik@fam&pn=ARMAN%20X%20STORE&am=${amount}&cu=INR&tr=${clientTxnId}`;
        data = {
          success: true,
          order_id: `ORD_${Date.now()}`,
          checkout_url: upiUrl,
          payment_url: upiUrl,
          qr_url: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUrl)}`
        };
      }
      
      const effectiveOrderId = data.order_id || `ORD_${Date.now()}`;
      const effectivePaymentUrl = data.checkout_url || data.payment_url || `upi://pay?pa=armanbarik@fam&pn=ARMAN%20X%20STORE&am=${amount}&cu=INR&tr=${effectiveOrderId}`;
      const effectiveQrUrl = data.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(effectivePaymentUrl)}`;

      setOrderId(effectiveOrderId);
      setPaymentUrl(effectivePaymentUrl);
      setQrUrl(effectiveQrUrl);
      setTimeLeft(300);
      setStep('qr');

      try {
        localStorage.setItem('pendingPayment', JSON.stringify({
          orderId: effectiveOrderId,
          type: 'balance',
          amount: amount,
          userId: currentUser?.uid,
          timestamp: Date.now()
        }));

        // Store into list of pending orders for current user
        if (currentUser?.uid) {
          const key = `user_pending_orders_${currentUser.uid}`;
          const existingList: string[] = JSON.parse(localStorage.getItem(key) || '[]');
          if (!existingList.includes(effectiveOrderId)) {
            existingList.push(effectiveOrderId);
            localStorage.setItem(key, JSON.stringify(existingList.slice(-20)));
          }
        }
      } catch(e) {}
      
      if (effectivePaymentUrl.startsWith('upi://') && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = effectivePaymentUrl;
      } else if (effectivePaymentUrl.startsWith('http')) {
        window.open(effectivePaymentUrl, '_blank');
      }
    } catch (err: any) {
      console.error('Balance add fallback:', err);
      const fallbackOrderId = `ORD_${Date.now()}`;
      const fallbackUpi = `upi://pay?pa=armanbarik@fam&pn=ARMAN%20X%20STORE&am=${amount}&cu=INR&tr=${fallbackOrderId}`;
      setOrderId(fallbackOrderId);
      setPaymentUrl(fallbackUpi);
      setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(fallbackUpi)}`);
      setTimeLeft(300);
      setStep('qr');
    }
  };

  const handleClaimMissingPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimQuery.trim()) {
      setClaimError('Please enter your Order ID or 12-digit UTR number');
      return;
    }
    if (!currentUser?.uid) {
      setClaimError('Please sign in to claim payments to your wallet');
      return;
    }

    setClaimError(null);
    setClaimSuccess(null);
    setIsClaiming(true);

    try {
      const res = await fetch('/api/fampay/claim-missing-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: claimQuery.trim(),
          userId: currentUser.uid,
          userEmail: currentUser.email
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const addedAmt = Number(data.amount) || amount;
        addBalance(currentUser.uid, addedAmt, {
          method: 'UPI / QR Gateway (Claimed)',
          referenceId: data.order?.order_id || claimQuery.trim(),
          note: `Claimed missing payment for Order #${data.order?.order_id || claimQuery.trim()}`,
          type: 'deposit',
          userEmail: currentUser.email || ''
        });

        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#e000ff', '#4ade80', '#ffffff', '#fbbf24']
        });

        setClaimSuccess(`🎉 Success! ₹${addedAmt} has been credited to your wallet balance.`);
        setClaimQuery('');
      } else {
        setClaimError(data.error || 'Payment not found or not yet confirmed by gateway.');
      }
    } catch (err: any) {
      setClaimError('Network error connecting to payment gateway. Please retry.');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-zinc-950 border border-fuchsia-500/30 shadow-[0_0_30px_rgba(224,0,255,0.2)] rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-fuchsia-500/20">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl border border-fuchsia-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-bold text-white font-display drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
              Wallet Top-Up
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white hover:bg-fuchsia-500/20 transition-all p-2 rounded-full"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Top Tab Selector: Add Balance vs Claim Closed Payment */}
        <div className="flex border-b border-zinc-850 bg-zinc-900/40 p-1.5 gap-1.5 px-6">
          <button
            type="button"
            onClick={() => { setActiveTab('add'); setClaimError(null); setClaimSuccess(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
              activeTab === 'add'
                ? 'bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(224,0,255,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            Deposit Money
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('claim'); setError(''); }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'claim'
                ? 'bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(224,0,255,0.4)]'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            Claim Closed Payment
          </button>
        </div>
        
        {activeTab === 'claim' ? (
          <div className="p-6 space-y-4">
            <div className="text-left space-y-1">
              <h4 className="text-base font-bold text-white">Closed website during payment?</h4>
              <p className="text-xs text-zinc-400">
                If your payment was deducted from your bank but the website was closed or cut, enter your <strong className="text-zinc-200">Order ID</strong> or <strong className="text-zinc-200">12-digit UPI UTR</strong> to credit it to your wallet immediately.
              </p>
            </div>

            <form onSubmit={handleClaimMissingPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Order ID or UPI UTR Number:
                </label>
                <input 
                  type="text"
                  value={claimQuery}
                  onChange={(e) => setClaimQuery(e.target.value)}
                  placeholder="e.g. ORD_174000... or 425689123456"
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 focus:border-fuchsia-500 rounded-xl text-white placeholder-zinc-500 text-sm outline-none font-mono"
                />
              </div>

              {claimError && (
                <div className="text-rose-400 text-xs bg-rose-950/40 p-3 rounded-xl border border-rose-500/30 text-center">
                  {claimError}
                </div>
              )}

              {claimSuccess && (
                <div className="text-emerald-300 text-xs bg-emerald-950/40 p-3 rounded-xl border border-emerald-500/30 text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{claimSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isClaiming || !claimQuery.trim()}
                className="w-full px-4 py-3.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-[0_0_15px_rgba(224,0,255,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isClaiming ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying with Gateway...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Add to Wallet</span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          <>
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
                  <div className="flex gap-2 mt-2.5">
                    {[50, 100, 200, 500].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setAmount(amt)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                          amount === amt
                            ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        +₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-850 p-3 rounded-xl text-xs text-zinc-400 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">🛡️ Auto-Safety:</span>
                  <span>Even if you close this page after paying, balance is automatically synced to your account!</span>
                </div>
                
                {error && (
                  <div className="text-red-400 text-sm bg-red-950/50 p-3 rounded-lg border border-red-500/50 text-center">
                    {error}
                  </div>
                )}
                
                <button 
                  onClick={handleProceed}
                  className="w-full px-4 py-3.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-base font-semibold rounded-xl shadow-[0_0_15px_rgba(224,0,255,0.4)] transition-all cursor-pointer"
                >
                  Proceed to Pay via UPI (₹{amount})
                </button>
              </div>
            )}

            {step === 'qr' && (
              <div className="p-6 space-y-4 flex flex-col items-center text-center">
                <div>
                  <h4 className="text-xl font-bold text-white mb-1">Scan & Pay via UPI</h4>
                  <p className="text-sm text-zinc-400">
                    Deposit Amount: <span className="font-bold text-fuchsia-400 text-base">₹{amount}</span>
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="bg-white p-3 rounded-2xl shadow-[0_0_20px_rgba(224,0,255,0.3)] border-2 border-fuchsia-500/40 inline-block">
                  <img 
                    src={qrUrl || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(paymentUrl || `upi://pay?pa=armanbarik@fam&pn=ARMAN%20X%20STORE&am=${amount}&cu=INR`)}`} 
                    alt="UPI QR Code" 
                    className="w-44 h-44 object-contain rounded-xl"
                  />
                </div>

                {/* Direct UPI App Launch */}
                <div className="w-full flex flex-col gap-2">
                  <a 
                    href={paymentUrl || `upi://pay?pa=armanbarik@fam&pn=ARMAN%20X%20STORE&am=${amount}&cu=INR`}
                    className="w-full py-2.5 px-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-[0_0_15px_rgba(224,0,255,0.4)] transition-all flex items-center justify-center gap-2"
                  >
                    <span>⚡ Pay with GPay / PhonePe / Paytm</span>
                  </a>

                  {/* Copy UPI ID */}
                  <div className="flex items-center justify-between bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl text-xs">
                    <span className="text-zinc-400">UPI ID: <strong className="text-zinc-200">armanbarik@fam</strong></span>
                    <button 
                      onClick={handleCopyUpi} 
                      className="text-fuchsia-400 hover:text-fuchsia-300 font-medium px-2 py-0.5 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 rounded-md transition-colors"
                    >
                      {copiedUpi ? 'Copied! ✓' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* UTR / Transaction ID Manual Verification */}
                <div className="w-full bg-zinc-900/80 border border-zinc-800 p-3 rounded-xl text-left space-y-1.5">
                  <label className="text-xs font-medium text-zinc-300 block">
                    Paid already? Enter 12-digit UTR / UPI Ref ID:
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="e.g. 425689123456" 
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-fuchsia-500"
                    />
                    <button 
                      onClick={handleVerifyUTR}
                      className="px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-semibold rounded-lg transition-all"
                    >
                      Verify
                    </button>
                  </div>
                </div>

                {/* Timer & Status */}
                <div className="w-full space-y-1.5">
                  <div className="flex items-center justify-center gap-2 text-fuchsia-400 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span className="text-xs font-medium">Auto-checking payment ({Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')})</span>
                  </div>
                  
                  {error && (
                    <div className="bg-red-950/50 border border-red-500/50 text-red-400 p-2 rounded-lg text-xs text-center">
                      {error}
                    </div>
                  )}
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
          </>
        )}
      </div>
    </div>
  );
}

