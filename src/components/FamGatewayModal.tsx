import { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, Sparkles, ExternalLink, QrCode } from 'lucide-react';
import confetti from 'canvas-confetti';

interface FamGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkoutUrl: string;
  orderId: string;
  amount: number;
  productName?: string;
  onSuccess: (paymentData: { orderId: string; amount: number; [key: string]: any }) => void;
}

export function FamGatewayModal({
  isOpen,
  onClose,
  checkoutUrl,
  orderId,
  amount,
  productName = 'Payment',
  onSuccess
}: FamGatewayModalProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);
  const [isSuccessHandled, setIsSuccessHandled] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  // Reset loading state whenever checkoutUrl changes
  useEffect(() => {
    if (isOpen && checkoutUrl) {
      setIframeLoading(true);
      setIsSuccessHandled(false);

      // Fallback timer to hide loader if iframe onload is suppressed
      const timer = setTimeout(() => {
        setIframeLoading(false);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [isOpen, checkoutUrl]);

  // Real-time payment verification polling
  useEffect(() => {
    if (!isOpen || !orderId || isSuccessHandled) return;

    let isMounted = true;

    const interval = setInterval(async () => {
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

        if (isPaid && isMounted && !isSuccessHandled) {
          setIsSuccessHandled(true);
          clearInterval(interval);

          try {
            confetti({
              particleCount: 120,
              spread: 70,
              origin: { y: 0.6 }
            });
          } catch {}

          onSuccessRef.current({
            orderId,
            amount,
            ...data
          });
        }
      } catch (err) {
        console.warn('Polling check error:', err);
      } finally {
        if (isMounted) {
          setPollCount(c => c + 1);
        }
      }
    }, 2800);

    // Cross-origin message listener
    const handleMessage = (e: MessageEvent) => {
      if (!isMounted || isSuccessHandled) return;
      if (
        e.data && 
        (e.data.status === 'COMPLETED' || 
         e.data.status === 'SUCCESS' || 
         e.data.type === 'PAYMENT_SUCCESS')
      ) {
        setIsSuccessHandled(true);
        clearInterval(interval);
        try {
          confetti({
            particleCount: 120,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {}
        onSuccessRef.current({
          orderId,
          amount,
          ...e.data
        });
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('message', handleMessage);
    };
  }, [isOpen, orderId, amount, isSuccessHandled]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-[480px] h-[670px] max-h-[92vh] bg-[#12141a] border border-white/15 rounded-3xl overflow-hidden shadow-[0_25px_70px_rgba(0,0,0,0.9)] flex flex-col z-10 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 sm:px-5 py-3.5 bg-[#161822] border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-white text-xs sm:text-sm font-bold tracking-tight">
                  Secure UPI Checkout
                </h3>
                <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 text-[10px] font-semibold border border-indigo-500/30">
                  Fam Gateway
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate max-w-[200px] sm:max-w-[260px]">
                {productName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 text-xs font-black">
              ₹{amount}
            </span>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Close Checkout"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative flex-1 bg-white overflow-hidden flex flex-col">
          {/* Loading Spinner */}
          {iframeLoading && (
            <div className="absolute inset-0 bg-[#12141a] flex flex-col items-center justify-center gap-3.5 z-20 text-center p-6">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center animate-pulse">
                  <QrCode className="w-6 h-6 text-indigo-400" />
                </div>
                <div className="absolute -inset-1 rounded-2xl bg-indigo-500/20 blur-md -z-10 animate-pulse"></div>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Generating Instant UPI QR...</p>
                <p className="text-zinc-400 text-xs mt-0.5">Connecting securely to Fam Gateway</p>
              </div>
            </div>
          )}

          {/* Checkout Iframe */}
          {checkoutUrl ? (
            <iframe
              src={checkoutUrl}
              className="w-full flex-1 border-0"
              allow="payment; clipboard-write"
              title="Fam Gateway UPI Checkout"
              onLoad={() => setIframeLoading(false)}
            />
          ) : (
            <div className="flex-1 bg-[#12141a] flex items-center justify-center text-zinc-400 text-sm">
              Invalid checkout session.
            </div>
          )}
        </div>

        {/* Footer Info Bar */}
        <div className="px-4 py-2.5 bg-[#141620] border-t border-white/10 flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
          <div className="flex items-center gap-1.5 text-zinc-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Auto-verifying payment...</span>
          </div>

          <a
            href={checkoutUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>Open in new tab</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
