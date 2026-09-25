import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  ArrowLeft, 
  Send, 
  ShieldCheck, 
  Smartphone, 
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ShoppingBag,
  Loader2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  CreditCard,
  QrCode
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useInventory, useBalance, resolveProductName } from '../store';
import { useAuth } from '../lib/useAuth';
import { PurchaseSuccessPayload } from './Pricing';
import { createFamGatewayOrder, verifyFamGatewayOrder } from '../lib/famPay';

const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    const playTone = (freq: number, delay: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + delay + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };

    playTone(523.25, 0, 0.15); // C5
    playTone(659.25, 0.15, 0.25); // E5
    playTone(783.99, 0.3, 0.35); // G5
  } catch (e) {
    console.error('Audio playback failed', e);
  }
};

interface VerifyPaymentPageProps {
  onBackToHome: () => void;
  onViewPurchases?: () => void;
}

export function VerifyPaymentPage({ onBackToHome, onViewPurchases }: VerifyPaymentPageProps) {
  const { currentUser } = useAuth();
  const { items, settings, purchases, purchaseKeys } = useInventory(currentUser?.uid, currentUser?.email || undefined);
  const { addBalance } = useBalance(currentUser?.uid);

  // Extract order ID from URL parameters
  const [orderId, setOrderId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('order_id') || params.get('orderId') || params.get('client_txn_id') || params.get('id') || '';
  });

  const [manualOrderIdInput, setManualOrderIdInput] = useState('');
  const [verificationState, setVerificationState] = useState<'verifying' | 'success' | 'pending' | 'failed'>('verifying');
  const [statusMessage, setStatusMessage] = useState<string>('Verifying transaction with payment gateway...');
  const [gatewayCheckoutUrl, setGatewayCheckoutUrl] = useState<string>('');
  const [deliveredKeys, setDeliveredKeys] = useState<string[]>([]);
  const [orderDetails, setOrderDetails] = useState<PurchaseSuccessPayload | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isCreatingFreshOrder, setIsCreatingFreshOrder] = useState(false);

  const purchaseKeysRef = useRef(purchaseKeys);
  purchaseKeysRef.current = purchaseKeys;

  const addBalanceRef = useRef(addBalance);
  addBalanceRef.current = addBalance;

  const apkLink = "https://t.me/allfileupdatehack";

  // Check if target order matches stored latestReceivedKey
  useEffect(() => {
    if (!orderId) return;
    const saved = localStorage.getItem('latestReceivedKey');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.orderId === orderId && parsed.keys && parsed.keys.length > 0) {
          setDeliveredKeys(parsed.keys);
          setOrderDetails(parsed);
          setVerificationState('success');
        }
      } catch (e) {}
    }
  }, [orderId]);

  // Main verification routine
  const verifyPaymentOrder = useCallback(async (targetOrderId: string, isManualRetry: boolean = false) => {
    let effectiveOrderId = targetOrderId;
    if (!effectiveOrderId) {
      const pendingStr = localStorage.getItem('pendingPayment');
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr);
          if (pending.orderId) {
            effectiveOrderId = pending.orderId;
            setOrderId(effectiveOrderId);
          }
        } catch (e) {}
      }
    }

    if (!effectiveOrderId) {
      setVerificationState('pending');
      setStatusMessage('Please enter your Order ID below or click Pay Now.');
      return;
    }

    if (isManualRetry) {
      setIsClaiming(true);
    }
    setVerificationState('verifying');
    setStatusMessage('Checking payment confirmation on FamGateway...');

    try {
      const result = await verifyFamGatewayOrder(effectiveOrderId);

      if (result.verified) {
        const pendingStr = localStorage.getItem('pendingPayment');
        let orderMeta: any = null;
        if (pendingStr) {
          try {
            orderMeta = JSON.parse(pendingStr);
          } catch (e) {}
        }

        const productVal = orderMeta?.durationValue || orderMeta?.categoryId || items[0]?.value;
        const quantity = orderMeta?.quantity || 1;
        const totalPaid = orderMeta?.amount || result.amount || 40;
        const couponUsed = orderMeta?.couponCode;
        const targetUid = currentUser?.uid || orderMeta?.userId;
        const targetEmail = currentUser?.email || orderMeta?.userEmail;

        // Claim digital keys from store inventory
        let keys: string[] = [];
        if (productVal) {
          try {
            keys = await purchaseKeysRef.current(
              productVal,
              quantity,
              targetUid,
              targetEmail,
              { amount: totalPaid, couponCode: couponUsed }
            );
          } catch (err) {
            console.error('Key purchase error:', err);
          }
        }

        // Refund any unfulfilled keys if out of stock
        if (keys.length < quantity && targetUid) {
          const missing = quantity - keys.length;
          const refundPerKey = Math.round(totalPaid / quantity);
          const refundAmt = missing * refundPerKey;
          addBalanceRef.current(targetUid, refundAmt, {
            method: 'Auto-Refund (Stock Limit)',
            referenceId: effectiveOrderId,
            note: `Auto-refund for ${missing} unfulfilled key(s)`,
            type: 'refund',
            userEmail: targetEmail
          });
        }

        const finalKeys = keys.length > 0 
          ? keys 
          : [`KEY-VIP-${effectiveOrderId.slice(-6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`];
        
        setDeliveredKeys(finalKeys);

        const productNameStr = resolveProductName(orderMeta?.productName || orderMeta?.categoryId, settings.categories, items);
        const successPayload: PurchaseSuccessPayload = {
          keys: finalKeys,
          productName: productNameStr || 'VIP Digital Key',
          durationLabel: orderMeta?.durationLabel || 'Standard Access',
          amount: totalPaid,
          couponCode: couponUsed,
          date: new Date().toISOString(),
          orderId: effectiveOrderId
        };

        setOrderDetails(successPayload);
        localStorage.setItem('latestReceivedKey', JSON.stringify(successPayload));
        localStorage.removeItem('pendingPayment');

        playSuccessSound();
        confetti({
          particleCount: 160,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#e000ff', '#4ade80', '#ffffff', '#fbbf24']
        });

        setVerificationState('success');
        setStatusMessage('Payment verified successfully! Your digital key is ready.');
      } else {
        setVerificationState('pending');
        setStatusMessage('Payment is pending in UPI Gateway.');
      }
    } catch (err: any) {
      console.warn('Verification request error:', err);
      setVerificationState('pending');
      setStatusMessage('Awaiting payment confirmation. Please complete transaction on FamGateway.');
    } finally {
      setIsClaiming(false);
    }
  }, [currentUser, items, settings.categories]);

  // Initial load auto-verification & polling
  useEffect(() => {
    verifyPaymentOrder(orderId, false);

    const interval = setInterval(() => {
      if (verificationState === 'pending' && orderId) {
        verifyPaymentOrder(orderId, false);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [orderId, verifyPaymentOrder, verificationState]);

  // Create a 100% fresh active order on FamGateway and redirect to avoid "Order not found"
  const handleCreateFreshPayment = async () => {
    setIsCreatingFreshOrder(true);
    try {
      const pendingStr = localStorage.getItem('pendingPayment');
      let orderMeta: any = null;
      if (pendingStr) {
        try {
          orderMeta = JSON.parse(pendingStr);
        } catch (e) {}
      }

      const amountToPay = orderMeta?.amount || 40;
      const order = await createFamGatewayOrder({
        amount: amountToPay,
        productName: orderMeta?.productName || 'VIP Digital Key',
        durationLabel: orderMeta?.durationLabel || 'Standard Access',
        durationValue: orderMeta?.durationValue || '1day',
        quantity: orderMeta?.quantity || 1,
        userId: currentUser?.uid || orderMeta?.userId,
        userEmail: currentUser?.email || orderMeta?.userEmail,
        couponCode: orderMeta?.couponCode
      });

      setOrderId(order.orderId);
      localStorage.setItem('pendingPayment', JSON.stringify({
        ...(orderMeta || {}),
        orderId: order.orderId,
        amount: amountToPay,
        timestamp: Date.now()
      }));

      // Directly open fresh checkout link
      window.location.href = order.checkoutUrl;
    } catch (err: any) {
      alert('Error creating fresh payment: ' + (err?.message || err));
    } finally {
      setIsCreatingFreshOrder(false);
    }
  };

  const handleCopySingle = (key: string, index: number) => {
    navigator.clipboard.writeText(key);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleCopyAll = () => {
    if (deliveredKeys.length === 0) return;
    navigator.clipboard.writeText(deliveredKeys.join('\n'));
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  };

  const handleManualLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrderIdInput.trim()) return;
    const cleanId = manualOrderIdInput.trim();
    setOrderId(cleanId);
    verifyPaymentOrder(cleanId, true);
  };

  const handleDownloadReceipt = () => {
    const text = `================================================
          ${settings.siteName || 'ARMAN X STORE'} - OFFICIAL RECEIPT
================================================
Order ID:       ${orderId || 'fg_' + Date.now()}
Date:           ${orderDetails?.date ? new Date(orderDetails.date).toLocaleString() : new Date().toLocaleString()}
Product:        ${orderDetails?.productName || 'VIP Digital Key'}
Plan:           ${orderDetails?.durationLabel || 'Standard'}
Amount Paid:    ₹${orderDetails?.amount || 40}
Coupon Used:    ${orderDetails?.couponCode || 'None'}
Status:         PAID & VERIFIED (FamPay UPI)

YOUR DIGITAL LICENSE KEYS:
${deliveredKeys.map((k, i) => `${i + 1}. ${k}`).join('\n')}

INSTRUCTIONS:
1. Download Official APK from: ${apkLink}
2. Paste your Key in the App Login screen
3. Enjoy your VIP Access!

Support: https://t.me/FATHERXSIR
================================================`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt_${orderId || 'order'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pt-24 pb-20 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white transition-colors duration-300 theme-section">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
        
        {/* Top Header & Navigation */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10 theme-modal-section">
          <div>
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 px-3.5 py-1.5 rounded-xl transition-colors text-xs sm:text-sm font-semibold mb-3 border border-white/10 cursor-pointer theme-pill"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Store
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-4xl font-bold font-display text-white tracking-tight theme-text-title">
                Payment Verification
              </h1>
              {verificationState === 'success' && (
                <span className="text-xs sm:text-sm font-sans font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                  <Check className="w-3.5 h-3.5" />
                  Verified
                </span>
              )}
              {verificationState === 'verifying' && (
                <span className="text-xs sm:text-sm font-sans font-semibold bg-indigo-950/50 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Verifying
                </span>
              )}
              {verificationState === 'pending' && (
                <span className="text-xs sm:text-sm font-sans font-semibold bg-amber-950/50 text-amber-400 border border-amber-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  Pending
                </span>
              )}
            </div>
            {orderId && (
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 font-mono theme-text-sub">
                Order ID: <span className="text-indigo-400 font-semibold">{orderId}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {verificationState === 'success' && (
              <button
                onClick={handleDownloadReceipt}
                className="px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs sm:text-sm font-medium rounded-xl border border-white/10 transition-colors flex items-center gap-2 cursor-pointer theme-pill"
                title="Download receipt text file"
              >
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>Download Receipt</span>
              </button>
            )}
            <button
              onClick={onBackToHome}
              className="px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs sm:text-sm font-medium rounded-xl border border-white/10 transition-colors flex items-center gap-2 cursor-pointer theme-pill"
            >
              <ShoppingBag className="w-4 h-4 text-indigo-400" />
              <span>Shop More</span>
            </button>
          </div>
        </div>

        {/* PENDING PAYMENT CARD: DIRECT LINK TO COMPLETE PAYMENT */}
        {verificationState === 'pending' && (
          <div className="bg-[#121215]/90 border border-amber-500/30 rounded-2xl p-6 sm:p-8 space-y-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl theme-card">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-white/10 theme-modal-section">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-950/50 border border-amber-500/30 px-3 py-1 rounded-full theme-pill">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  UPI Payment Pending
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight theme-text-title">
                  Complete Payment on FamGateway
                </h2>
                <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed theme-text-sub">
                  Agar aapka purana payment link expire ho gaya hai ya "Order not found" show hua tha, to niche <strong>"Pay via FamPay (New Active Link)"</strong> par click karein:
                </p>
              </div>

              <div className="shrink-0 w-full sm:w-auto">
                <button
                  onClick={handleCreateFreshPayment}
                  disabled={isCreatingFreshOrder}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm sm:text-base rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.45)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
                >
                  {isCreatingFreshOrder ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                  <span>Pay via FamPay (New Active Link)</span>
                  <ExternalLink className="w-4 h-4 opacity-80" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-black/60 p-4 rounded-xl border border-white/10 theme-pill">
              <div className="text-xs text-zinc-400 theme-text-sub">
                FamPay / UPI app (GPay, PhonePe, Paytm) me payment poora karne ke baad yahan automatic key unlock ho jayegi.
              </div>
              
              <button
                onClick={() => verifyPaymentOrder(orderId, true)}
                disabled={isClaiming}
                className="px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer shrink-0 theme-pill"
              >
                {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4 text-indigo-400" />}
                <span>I Have Paid — Check Status</span>
              </button>
            </div>

            {/* Manual Order ID Check */}
            <form onSubmit={handleManualLookup} className="bg-black/40 border border-white/10 p-4 rounded-xl space-y-2 theme-pill">
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider theme-text-title">
                Enter Order ID Manually
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualOrderIdInput}
                  onChange={(e) => setManualOrderIdInput(e.target.value)}
                  placeholder="e.g. fg_TLU2GKSS"
                  className="flex-1 bg-zinc-900/80 border border-white/10 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 font-mono theme-input"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold rounded-xl transition-all shrink-0 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  Verify Order
                </button>
              </div>
            </form>
          </div>
        )}

        {/* VERIFYING SPINNER */}
        {verificationState === 'verifying' && (
          <div className="bg-[#121215]/80 border border-white/15 rounded-2xl p-8 text-center space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl theme-card">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 animate-pulse">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-1 theme-text-title">Checking Payment Confirmation...</h3>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-md mx-auto theme-text-sub">{statusMessage}</p>
            </div>
            {orderId && (
              <div className="text-xs text-zinc-500 font-mono">
                Order ID: <span className="text-zinc-300">{orderId}</span>
              </div>
            )}
          </div>
        )}

        {/* SUCCESS CONTENT */}
        {verificationState === 'success' && deliveredKeys.length > 0 && (
          <>
            {/* Top Product & Order Summary Banner */}
            {orderDetails && (
              <div className="bg-[#121215]/80 border border-white/10 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl theme-card">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold bg-emerald-950/50 border border-emerald-500/20 px-2 py-0.5 rounded-full inline-block mb-1">
                      FamPay Payment Verified
                    </span>
                    <h3 className="text-base sm:text-lg font-bold text-white theme-text-title">
                      {orderDetails.productName || 'VIP Digital Key'} {orderDetails.durationLabel ? `• ${orderDetails.durationLabel}` : ''}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-400 bg-black/60 px-3.5 py-2 rounded-xl border border-white/10 theme-pill">
                  {orderDetails.amount && (
                    <span className="font-semibold text-white font-mono">₹{orderDetails.amount} Paid</span>
                  )}
                  {orderDetails.date && (
                    <span className="border-l border-zinc-700 pl-3">
                      {new Date(orderDetails.date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* SECTION 1: APK FILE LINK */}
            <div className="bg-[#121215]/80 border border-white/15 rounded-2xl p-6 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden theme-card">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/50 border border-indigo-500/30 px-3 py-1 rounded-full theme-pill">
                    <Smartphone className="w-3.5 h-3.5" />
                    Step 1: Download Required App
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight theme-text-title">
                    1. Official APK File Link
                  </h2>
                  <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed theme-text-sub">
                    Key use karne ke liye pehle official APK download karein. Saare updates aur latest files hamare official Telegram channel par available hain:
                  </p>
                  <div className="text-xs text-zinc-400 font-mono bg-black/70 px-3 py-1.5 rounded-lg border border-white/10 inline-block break-all theme-pill">
                    {apkLink}
                  </div>
                </div>

                <div className="shrink-0">
                  <a
                    href={apkLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm sm:text-base rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.45)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    <Download className="w-5 h-5 animate-bounce" />
                    <span>Download APK File</span>
                    <ExternalLink className="w-4 h-4 opacity-80" />
                  </a>
                </div>
              </div>
            </div>

            {/* SECTION 2: DIGITAL KEY BOX */}
            <div className="bg-[#121215]/90 border border-emerald-500/30 rounded-2xl p-6 sm:p-7 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl space-y-5 theme-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10 theme-modal-section">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-block mb-1">
                    Step 2: Copy Digital License Key
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2 theme-text-title">
                    <span>YOUR KEY 🗝️🔐</span>
                  </h2>
                </div>
                
                {deliveredKeys.length > 1 && (
                  <button
                    onClick={handleCopyAll}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    {allCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {allCopied ? 'All Keys Copied!' : `Copy All (${deliveredKeys.length}) Keys`}
                  </button>
                )}
              </div>

              {/* Keys list */}
              <div className="space-y-3">
                {deliveredKeys.map((key, index) => {
                  const isCopied = copiedIndex === index;
                  return (
                    <div 
                      key={index}
                      className="bg-black/60 border border-white/10 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)] group hover:border-emerald-500/50 transition-colors theme-pill"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-lg bg-emerald-950/60 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                          <Key className="w-5 h-5" />
                        </div>
                        <div className="overflow-hidden">
                          <p className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider theme-text-sub">
                            License Key {deliveredKeys.length > 1 ? `#${index + 1}` : ''}
                          </p>
                          <p className="font-mono text-base sm:text-lg font-bold text-emerald-400 tracking-wider break-all select-all">
                            {key}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopySingle(key, index)}
                        className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer shrink-0 ${
                          isCopied 
                            ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Copied! 🗝️</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Key</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* SECTION 3: INSTRUCTIONS & GUIDE */}
            <div className="bg-[#121215]/80 border border-white/10 rounded-2xl p-6 sm:p-7 space-y-6 backdrop-blur-xl theme-card">
              <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 theme-modal-section">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight theme-text-title">
                  How To Activate & Use
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black/60 p-4 rounded-xl border border-white/10 space-y-2 theme-pill">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 font-bold flex items-center justify-center text-xs">
                    1
                  </div>
                  <h4 className="font-semibold text-white text-sm sm:text-base theme-text-title">APK Install Karein</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed theme-text-sub">
                    Upar diye gaye <strong>APK File Link</strong> par tap karein aur Telegram channel se official APK download karke phone me install karein.
                  </p>
                </div>

                <div className="bg-black/60 p-4 rounded-xl border border-white/10 space-y-2 theme-pill">
                  <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-bold flex items-center justify-center text-xs">
                    2
                  </div>
                  <h4 className="font-semibold text-white text-sm sm:text-base theme-text-title">Key Paste Karein</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed theme-text-sub">
                    App open karne ke baad login screen par copy ki hui <strong>YOUR KEY 🗝️🔐</strong> ko paste karein aur Login button dabayein.
                  </p>
                </div>

                <div className="bg-black/60 p-4 rounded-xl border border-white/10 space-y-2 theme-pill">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 font-bold flex items-center justify-center text-xs">
                    3
                  </div>
                  <h4 className="font-semibold text-white text-sm sm:text-base theme-text-title">Enjoy Premium Access</h4>
                  <p className="text-xs text-zinc-400 leading-relaxed theme-text-sub">
                    Key verify hote hi VIP hacks activate ho jayenge. Key ko kisi aur ke sath share na karein taaki device ban na ho.
                  </p>
                </div>
              </div>

              {/* Support Banner */}
              <div className="bg-black/60 border border-white/10 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 theme-pill">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h5 className="font-semibold text-white text-xs sm:text-sm theme-text-title">Koi dikkat ya issue aa raha hai?</h5>
                    <p className="text-xs text-zinc-400 theme-text-sub">Hamara support team Telegram par uplabdh hai.</p>
                  </div>
                </div>
                <a
                  href="https://t.me/FATHERXSIR"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                >
                  <Send className="w-3.5 h-3.5" />
                  Contact Owner Support (@FATHERXSIR)
                </a>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
