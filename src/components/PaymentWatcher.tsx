import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CheckCircle2, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../lib/useAuth';
import { useBalance, useInventory, resolveProductName } from '../store';
import { PurchaseSuccessPayload } from './Pricing';

export interface PendingPaymentData {
  orderId: string;
  type: 'balance' | 'keys';
  amount: number;
  userId: string;
  productName?: string;
  durationLabel?: string;
  durationValue?: string;
  quantity?: number;
  timestamp: number;
}

interface PaymentWatcherProps {
  onKeyReceived?: (payload: PurchaseSuccessPayload) => void;
}

const playDing = () => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
};

function readStoredPending(): PendingPaymentData | null {
  try {
    const saved = localStorage.getItem('pendingPayment');
    if (!saved) return null;
    const parsed: PendingPaymentData = JSON.parse(saved);
    if (parsed && parsed.orderId && Date.now() - (parsed.timestamp || 0) < 24 * 60 * 60 * 1000) {
      return parsed;
    }
    localStorage.removeItem('pendingPayment');
  } catch (e) {}
  return null;
}

export function PaymentWatcher({ onKeyReceived }: PaymentWatcherProps) {
  const { currentUser } = useAuth();
  const { addBalance } = useBalance(currentUser?.uid);
  const { purchaseKeys, settings, items } = useInventory(currentUser?.uid);

  const [successToast, setSuccessToast] = useState<string | null>(null);

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const addBalanceRef = useRef(addBalance);
  addBalanceRef.current = addBalance;

  const purchaseKeysRef = useRef(purchaseKeys);
  purchaseKeysRef.current = purchaseKeys;

  const onKeyReceivedRef = useRef(onKeyReceived);
  onKeyReceivedRef.current = onKeyReceived;

  const isCheckingRef = useRef(false);

  const verifyBackgroundPayment = useCallback(async () => {
    // If on /verify-payment, the verify page handles auto-claim
    if (window.location.pathname === '/verify-payment' || isCheckingRef.current) return;

    const target = readStoredPending();
    if (!target || !target.orderId) return;

    isCheckingRef.current = true;

    try {
      let data: any = null;
      try {
        const res = await fetch('/api/fampay/verify-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: target.orderId })
        });
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {}
      } catch {}

      if (!data) {
        const apiKey = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';
        try {
          const directRes = await fetch(`https://famgateway.in/api/verify-order.php?api_key=${apiKey}&order_id=${encodeURIComponent(target.orderId)}`);
          const directText = await directRes.text();
          try {
            data = JSON.parse(directText);
          } catch {}
        } catch {}
      }

      const status = (data?.status || data?.data?.status || '').toString().toLowerCase();

      if (status === 'success' || status === 'paid' || status === 'completed') {
        playDing();
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#e000ff', '#4ade80', '#ffffff', '#fbbf24']
        });

        localStorage.removeItem('pendingPayment');

        const targetUid = target.userId || currentUserRef.current?.uid;

        if (target.type === 'balance' || !target.durationValue) {
          if (targetUid) {
            addBalanceRef.current(targetUid, target.amount, {
              method: 'UPI Direct Gateway',
              referenceId: target.orderId,
              note: `Wallet balance deposit of ₹${target.amount} via UPI Gateway`,
              type: 'deposit',
              userEmail: currentUserRef.current?.email || undefined
            });
          }
          setSuccessToast(`🎉 ₹${target.amount} successfully added to your Wallet balance!`);
          setTimeout(() => setSuccessToast(null), 7000);
        } else {
          const quantity = target.quantity || 1;
          try {
            const keys = await purchaseKeysRef.current(
              target.durationValue,
              quantity,
              targetUid,
              currentUserRef.current?.email || undefined
            );

            if (keys && keys.length > 0) {
              const payload: PurchaseSuccessPayload = {
                keys,
                productName: resolveProductName(target.productName, settings.categories, items),
                durationLabel: target.durationLabel || '',
                amount: target.amount,
                date: new Date().toISOString(),
                orderId: target.orderId
              };
              localStorage.setItem('latestReceivedKey', JSON.stringify(payload));
              setSuccessToast(`🎉 Payment Confirmed! Your digital key has been delivered.`);
              setTimeout(() => setSuccessToast(null), 6000);

              if (onKeyReceivedRef.current) {
                onKeyReceivedRef.current(payload);
              }
            } else {
              if (targetUid) {
                addBalanceRef.current(targetUid, target.amount, {
                  method: 'Auto-Refund (Stock Limit)',
                  referenceId: target.orderId,
                  note: `Auto-refund of ₹${target.amount} for out-of-stock keys (${resolveProductName(target.productName, settings.categories, items)})`,
                  type: 'refund',
                  userEmail: currentUserRef.current?.email || undefined
                });
              }
              setSuccessToast(`Payment received! ₹${target.amount} was refunded to your Wallet due to stock limit.`);
              setTimeout(() => setSuccessToast(null), 8000);
            }
          } catch (e) {
            if (targetUid) {
              addBalanceRef.current(targetUid, target.amount, {
                method: 'Auto-Refund',
                referenceId: target.orderId,
                note: `Refund of ₹${target.amount} to wallet balance`,
                type: 'refund',
                userEmail: currentUserRef.current?.email || undefined
              });
            }
          }
        }
      }
    } catch (err) {
      // Quiet background check
    } finally {
      isCheckingRef.current = false;
    }
  }, [items, settings.categories]);

  useEffect(() => {
    // Check once when page becomes active or user navigates back
    const handleVisibility = () => {
      if (!document.hidden) {
        verifyBackgroundPayment();
      }
    };

    window.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    // Initial check on mount
    verifyBackgroundPayment();

    return () => {
      window.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [verifyBackgroundPayment]);

  if (!successToast) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-md w-full px-4 animate-in slide-in-from-top duration-300">
      <div className="bg-emerald-950/90 border border-emerald-500/50 text-white p-4 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)] backdrop-blur-md flex items-center gap-3">
        <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="font-bold text-emerald-200">Payment Confirmed!</div>
          <div className="text-sm text-emerald-100/90">{successToast}</div>
        </div>
        <button 
          onClick={() => setSuccessToast(null)}
          className="text-emerald-400 hover:text-white p-1 rounded-lg cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
