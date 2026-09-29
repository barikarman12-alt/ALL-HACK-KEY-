import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, 
  ShieldCheck, 
  Sparkles, 
  ExternalLink, 
  QrCode, 
  Clock, 
  Zap, 
  AlertTriangle, 
  ArrowLeft, 
  CheckCircle2, 
  RefreshCw 
} from 'lucide-react';
import { triggerCelebrationConfetti, playSuccessChime } from '../lib/celebrate';

interface FamGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutUrl: string;
  orderId: string;
  amount: number;
  productName?: string;
  initialTimestamp?: number;
  onSuccess: (paymentData: { orderId: string; amount: number; [key: string]: any }) => void;
}

const TOTAL_COUNTDOWN_SECONDS = 300; // 5 minutes

export function FamGatewayModal({
  isOpen,
  onClose,
  checkoutUrl,
  orderId,
  amount,
  productName = 'Payment Order',
  initialTimestamp,
  onSuccess
}: FamGatewayModalProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(TOTAL_COUNTDOWN_SECONDS);
  const [isSuccessHandled, setIsSuccessHandled] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  // Calculate remaining time smoothly based on when order was created
  useEffect(() => {
    if (isOpen && checkoutUrl) {
      setIframeLoading(true);
      setIsSuccessHandled(false);
      setShowCancelConfirm(false);

      // Determine initial start time
      let startTs = initialTimestamp;
      if (!startTs) {
        try {
          const raw = localStorage.getItem('pendingPayment');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed.orderId === orderId && parsed.timestamp) {
              startTs = parsed.timestamp;
            }
          }
        } catch {}
      }

      if (startTs) {
        const elapsed = Math.floor((Date.now() - startTs) / 1000);
        const rem = Math.max(0, TOTAL_COUNTDOWN_SECONDS - elapsed);
        setTimeLeft(rem);
      } else {
        setTimeLeft(TOTAL_COUNTDOWN_SECONDS);
      }

      // Safe fallback to hide loader if onload is suppressed
      const timer = setTimeout(() => {
        setIframeLoading(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, checkoutUrl, orderId, initialTimestamp]);

  // Countdown Timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, timeLeft]);

  // Unified Verification Function
  const checkPaymentVerification = useCallback(async () => {
    if (!orderId || isSuccessHandled) return;

    try {
      const res = await fetch(`/api/fampay/verify-order?orderId=${encodeURIComponent(orderId)}`);
      if (!res.ok) return;

      const data = await res.json();
      const isPaid = 
        data?.success === true ||
        data?.verified === true ||
        data?.status === 'SUCCESS' ||
        data?.status === 'COMPLETED' ||
        data?.data?.status === 'SUCCESS' ||
        data?.data?.status === 'COMPLETED';

      if (isPaid && !isSuccessHandled) {
        setIsSuccessHandled(true);
        localStorage.removeItem('pendingPayment');

        playSuccessChime();
        triggerCelebrationConfetti();

        onSuccessRef.current({
          orderId,
          amount,
          ...data
        });
      }
    } catch (err) {
      console.warn('Payment check warning:', err);
    }
  }, [orderId, isSuccessHandled, amount]);

  // Real-time payment verification polling
  useEffect(() => {
    if (!isOpen || !orderId || isSuccessHandled) return;

    const interval = setInterval(checkPaymentVerification, 2800);

    // Immediate check when returning from UPI apps (visibility or window focus)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        checkPaymentVerification();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    // Cross-origin message listener
    const handleMessage = (e: MessageEvent) => {
      if (isSuccessHandled) return;
      if (
        e.data && 
        (e.data.status === 'COMPLETED' || 
         e.data.status === 'SUCCESS' || 
         e.data.type === 'PAYMENT_SUCCESS')
      ) {
        setIsSuccessHandled(true);
        localStorage.removeItem('pendingPayment');

        playSuccessChime();
        triggerCelebrationConfetti();

        onSuccessRef.current({
          orderId,
          amount,
          ...e.data
        });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, orderId, isSuccessHandled, checkPaymentVerification]);

  if (!isOpen) return null;

  // Intercept close button / fail action to show re-confirmation
  const handleRequestClose = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    localStorage.removeItem('pendingPayment');
    setShowCancelConfirm(false);
    onClose();
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progressPercent = (timeLeft / TOTAL_COUNTDOWN_SECONDS) * 100;

  // Dynamic gradient based on remaining time
  const timerGradient = timeLeft <= 60
    ? 'from-rose-500 via-red-500 to-rose-600 shadow-[0_0_12px_rgba(244,63,94,0.9)]'
    : timeLeft <= 120
      ? 'from-amber-400 via-orange-500 to-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.8)]'
      : 'from-cyan-400 via-indigo-500 to-emerald-400 shadow-[0_0_10px_rgba(6,182,212,0.8)]';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-300">
      {/* Dark Frosted Glassmorphism Backdrop */}
      <div 
        className="absolute inset-0 bg-[#05070d]/85 backdrop-blur-xl transition-opacity" 
        onClick={handleRequestClose}
      />

      {/* Ambient Neon Glow Blobs behind Modal */}
      <div className="absolute w-80 h-80 bg-cyan-500/15 rounded-full blur-[100px] pointer-events-none -translate-x-32 -translate-y-20 animate-pulse"></div>
      <div className="absolute w-80 h-80 bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none translate-x-32 translate-y-20 animate-pulse delay-700"></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-[480px] h-[700px] max-h-[94vh] bg-[#0b0f19]/95 border border-cyan-500/20 hover:border-cyan-500/30 rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.95),0_0_35px_rgba(6,182,212,0.15)] flex flex-col z-10 animate-in zoom-in-95 duration-250 backdrop-blur-2xl">
        
        {/* Animated Countdown Progress Bar Track */}
        <div className="h-1.5 w-full bg-slate-950/90 overflow-hidden relative border-b border-white/[0.04]">
          <div 
            className={`h-full bg-gradient-to-r ${timerGradient} relative`}
            style={{ 
              width: `${progressPercent}%`,
              transition: 'width 1000ms linear'
            }}
          >
            {/* Glowing Leading Head Indicator */}
            <div className="absolute right-0 top-0 bottom-0 w-2.5 bg-white rounded-full blur-[1px] opacity-90 shadow-[0_0_8px_#ffffff]" />
          </div>
        </div>

        {/* Modal Header */}
        <div className="px-5 py-4 bg-gradient-to-b from-[#111827] to-[#0b0f19] border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {/* Live Indicator Pulse */}
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-cyan-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-white text-sm font-bold tracking-tight">
                  Instant UPI Checkout
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 text-[10px] font-semibold border border-cyan-500/30 flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-cyan-400" />
                  Fam Gateway
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate max-w-[210px] sm:max-w-[260px] mt-0.5 font-medium">
                {productName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Distinct Gold Amount Badge */}
            <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/15 to-yellow-500/10 border border-amber-500/30 text-amber-300 text-xs font-black tracking-wide shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center gap-1">
              <span>₹{amount}</span>
            </div>

            {/* Close Button (With Re-confirmation Prompt) */}
            <button
              onClick={handleRequestClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-white/5"
              title="Close Checkout"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security & Timer Sub-bar */}
        <div className="px-5 py-2 bg-[#0b0f19]/90 border-b border-white/[0.05] flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>256-Bit Encrypted UPI Session</span>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>Expires in:</span>
            <span className={`font-bold ${timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-cyan-300'}`}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* QR Code / Iframe Display Area */}
        <div className="relative flex-1 bg-[#090d16] overflow-hidden flex flex-col p-3 sm:p-4">
          
          {/* Ambient Glow Frame around Iframe/QR */}
          <div className="relative flex-1 rounded-2xl overflow-hidden border border-cyan-500/20 bg-white shadow-[0_0_35px_rgba(6,182,212,0.15),0_0_15px_rgba(99,102,241,0.1)] flex flex-col">
            
            {/* Loading State Skeleton */}
            {iframeLoading && (
              <div className="absolute inset-0 bg-[#0b0f19] flex flex-col items-center justify-center gap-3 z-20 text-center p-6">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-400/40 flex items-center justify-center animate-pulse shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                    <QrCode className="w-7 h-7 text-cyan-300" />
                  </div>
                  <div className="absolute -inset-2 rounded-2xl bg-cyan-400/20 blur-lg -z-10 animate-pulse"></div>
                </div>

                <div>
                  <p className="text-white font-semibold text-sm">Generating Live UPI QR...</p>
                  <p className="text-zinc-400 text-xs mt-1">Connecting securely to Indian Banking Network</p>
                </div>
              </div>
            )}

            {/* Embedded Payment Gateway */}
            {checkoutUrl ? (
              <iframe
                src={checkoutUrl}
                className="w-full flex-1 border-0"
                allow="payment; clipboard-write"
                title="Fam Gateway UPI Checkout"
                onLoad={() => setIframeLoading(false)}
              />
            ) : (
              <div className="flex-1 bg-[#0b0f19] flex items-center justify-center text-zinc-400 text-sm">
                Invalid checkout session.
              </div>
            )}
          </div>
        </div>

        {/* UPI App Pill-Chips at the bottom */}
        <div className="px-4 py-3 bg-[#0d121f] border-t border-white/[0.08] flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="font-semibold text-zinc-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Supported UPI Apps:
            </span>
            <span className="text-[10px] text-zinc-500">Auto-Verifies on Return</span>
          </div>

          <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
            {/* Google Pay */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-medium text-zinc-300 hover:border-blue-500/40 hover:bg-blue-500/10 transition-colors">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              <span>GPay</span>
            </div>

            {/* PhonePe */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-medium text-zinc-300 hover:border-purple-500/40 hover:bg-purple-500/10 transition-colors">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              <span>PhonePe</span>
            </div>

            {/* Paytm */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-medium text-zinc-300 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-colors">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span>Paytm</span>
            </div>

            {/* BHIM */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-medium text-zinc-300 hover:border-amber-500/40 hover:bg-amber-500/10 transition-colors">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span>BHIM</span>
            </div>

            {/* CRED */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-medium text-zinc-300 hover:border-rose-500/40 hover:bg-rose-500/10 transition-colors">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span>CRED</span>
            </div>
          </div>

          {/* External tab fallback */}
          <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
            <span>Scan QR from any UPI app to pay</span>
            <a
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
            >
              <span>Open Gateway URL</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>

        {/* RE-CONFIRMATION MODAL OVERLAY ON CANCEL/FAIL */}
        {showCancelConfirm && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="bg-[#111827] border border-amber-500/30 rounded-2xl p-5 w-full max-w-sm shadow-[0_15px_40px_rgba(0,0,0,0.8),0_0_20px_rgba(245,158,11,0.15)] flex flex-col items-center text-center">
              
              <div className="w-12 h-12 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 animate-pulse" />
              </div>

              <h4 className="text-white text-base font-bold">
                Payment Cancel Karna Chahte Hain?
              </h4>
              
              <p className="text-zinc-300 text-xs mt-2 leading-relaxed">
                Agar aapne apne UPI app (PhonePe / GPay / Paytm) se payment kar diya hai to thoda wait karein. 
                <span className="block font-semibold text-emerald-400 mt-1">
                  ⚡ Payment automatically verify ho rahi hai!
                </span>
                Cancel karne par ye QR code band ho sakta hai.
              </p>

              <div className="w-full flex flex-col gap-2.5 mt-5">
                {/* Primary: Continue Payment */}
                <button
                  type="button"
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Nahi, Payment Chalu Rakhein</span>
                </button>

                {/* Secondary: Confirm Cancel */}
                <button
                  type="button"
                  onClick={handleConfirmCancel}
                  className="w-full py-2 px-4 rounded-xl bg-white/[0.04] hover:bg-rose-950/40 text-rose-400 border border-rose-500/20 hover:border-rose-500/40 font-medium text-xs transition-all cursor-pointer"
                >
                  Haan, Payment Cancel Karein
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
