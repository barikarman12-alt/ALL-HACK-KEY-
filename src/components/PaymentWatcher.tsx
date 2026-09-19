import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, X, Wallet, Key } from 'lucide-react';
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
    if (saved) {
      const parsed: PendingPaymentData = JSON.parse(saved);
      if (parsed && parsed.orderId && Date.now() - (parsed.timestamp || 0) < 24 * 60 * 60 * 1000) {
        return parsed;
      }
      localStorage.removeItem('pendingPayment');
    }

    // Fallback: Check if redirected from payment gateway with order_id in URL params
    const params = new URLSearchParams(window.location.search);
    const orderIdFromUrl = params.get('order_id') || params.get('orderId') || params.get('client_txn_id') || params.get('txn_id');
    if (orderIdFromUrl) {
      const reconstructed: PendingPaymentData = {
        orderId: orderIdFromUrl,
        type: 'keys',
        amount: 0,
        userId: '',
        timestamp: Date.now()
      };
      try {
        localStorage.setItem('pendingPayment', JSON.stringify(reconstructed));
      } catch(e) {}
      return reconstructed;
    }
  } catch (e) {}
  return null;
}

export function PaymentWatcher({ onKeyReceived }: PaymentWatcherProps) {
  const { currentUser } = useAuth();
  const { addBalance } = useBalance(currentUser?.uid);
  const { purchaseKeys, settings, items } = useInventory(currentUser?.uid);

  const [pending, setPending] = useState<PendingPaymentData | null>(() => readStoredPending());
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Keep latest mutable values in refs to prevent useEffect dependencies loops
  const pendingRef = useRef<PendingPaymentData | null>(pending);
  pendingRef.current = pending;

  const isCheckingRef = useRef(false);
  isCheckingRef.current = isChecking;

  const onKeyReceivedRef = useRef(onKeyReceived);
  onKeyReceivedRef.current = onKeyReceived;

  const currentUserRef = useRef(currentUser);
  currentUserRef.current = currentUser;

  const addBalanceRef = useRef(addBalance);
  addBalanceRef.current = addBalance;

  const purchaseKeysRef = useRef(purchaseKeys);
  purchaseKeysRef.current = purchaseKeys;

  // Safe helper that updates React state only if the stored order is actually different
  const syncPendingFromStorage = useCallback(() => {
    const current = readStoredPending();
    const currentOrderId = current?.orderId || null;
    const prevOrderId = pendingRef.current?.orderId || null;

    if (currentOrderId !== prevOrderId) {
      pendingRef.current = current;
      setPending(current);
    }
    return current;
  }, []);

  const isOwner = currentUser?.email?.includes('barikarman') || 
                  ['admin', 'owner', 'arman_123'].includes(currentUser?.customId || '') || 
                  currentUser?.customId?.includes('barikarman');

  const fulfillPayment = useCallback(async (target: PendingPaymentData) => {
    playDing();
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#e000ff', '#4ade80', '#ffffff', '#fbbf24']
    });

    localStorage.removeItem('pendingPayment');
    pendingRef.current = null;
    setPending(null);
    setStatusMessage(null);

    const targetUid = target.userId || currentUserRef.current?.uid;

    if (target.type === 'balance' || !target.durationValue) {
      if (targetUid) {
        addBalanceRef.current(targetUid, target.amount, {
          method: 'UPI / QR Gateway (FamPay)',
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
            date: new Date().toISOString()
          };
          localStorage.setItem('latestReceivedKey', JSON.stringify(payload));
          setSuccessToast(`🎉 Payment Confirmed! Your ${keys.length} key(s) are ready.`);
          setTimeout(() => setSuccessToast(null), 6000);

          if (onKeyReceivedRef.current) {
            onKeyReceivedRef.current(payload);
          }
        } else {
          if (targetUid) {
            addBalanceRef.current(targetUid, target.amount, {
              method: 'Auto-Refund (Stock Out)',
              referenceId: target.orderId,
              note: `Auto-refund of ₹${target.amount} for out-of-stock keys (${resolveProductName(target.productName, settings.categories, items)})`,
              type: 'refund',
              userEmail: currentUserRef.current?.email || undefined
            });
          }
          setSuccessToast(`Payment received! Due to stock limit, ₹${target.amount} was refunded to your Wallet.`);
          setTimeout(() => setSuccessToast(null), 8000);
        }
      } catch (e) {
        if (targetUid) {
          addBalanceRef.current(targetUid, target.amount, {
            method: 'Auto-Refund (Stock Out)',
            referenceId: target.orderId,
            note: `Refund of ₹${target.amount} to wallet balance`,
            type: 'refund',
            userEmail: currentUserRef.current?.email || undefined
          });
        }
        setSuccessToast(`Payment received! ₹${target.amount} was refunded to your Wallet.`);
        setTimeout(() => setSuccessToast(null), 8000);
      }
    }
  }, [items, settings.categories]);

  const verifyPayment = useCallback(async (isManual: boolean = false) => {
    const target = pendingRef.current || readStoredPending();
    if (!target || !target.orderId || isCheckingRef.current) return;

    isCheckingRef.current = true;
    setIsChecking(true);
    if (isManual) {
      setStatusMessage('Checking with UPI payment gateway...');
    }

    try {
      const res = await fetch('/api/fampay/verify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: target.orderId })
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch (e) {
        data = { status: 'pending', message: 'Verifying payment...' };
      }

      const status = (data.status || data.data?.status || '').toString().toLowerCase();

      if (status === 'success' || status === 'paid' || status === 'completed') {
        await fulfillPayment(target);
      } else if (isManual) {
        setStatusMessage(data.message || 'Payment is awaiting UPI confirmation. If you completed payment, please wait a few seconds and tap verify again.');
        setTimeout(() => setStatusMessage(null), 7000);
      }
    } catch (err: any) {
      if (isManual) {
        setStatusMessage('Gateway verification pending. If you already paid, please tap Verify in a moment.');
        setTimeout(() => setStatusMessage(null), 6000);
      }
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, [fulfillPayment]);

  // Set up listeners once on mount
  useEffect(() => {
    // Initial verification if pending exists
    const p = syncPendingFromStorage();
    if (p) {
      verifyPayment(false);
    }

    // Polling interval
    const interval = setInterval(() => {
      const active = syncPendingFromStorage();
      if (active) {
        verifyPayment(false);
      }
    }, 4000);

    // Event handlers for when user returns from UPI app or switches tabs
    const handleActive = () => {
      if (!document.hidden) {
        const active = syncPendingFromStorage();
        if (active) {
          verifyPayment(false);
        }
      }
    };

    window.addEventListener('visibilitychange', handleActive);
    window.addEventListener('focus', handleActive);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleActive);
      window.removeEventListener('focus', handleActive);
    };
  }, [syncPendingFromStorage, verifyPayment]);

  const handleDismiss = () => {
    localStorage.removeItem('pendingPayment');
    pendingRef.current = null;
    setPending(null);
    setStatusMessage(null);
  };

  return (
    <>
      {/* Success Notification Toast */}
      {successToast && (
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
              className="text-emerald-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Status Bar for Active Pending Payment */}
      {pending && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[90] max-w-lg w-[92%] animate-in slide-in-from-bottom duration-300">
          <div className="bg-zinc-900/95 border border-fuchsia-500/40 rounded-2xl p-4 shadow-[0_0_30px_rgba(224,0,255,0.25)] backdrop-blur-xl text-white">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-fuchsia-500/10 rounded-xl text-fuchsia-400 shrink-0">
                  {pending.type === 'balance' ? <Wallet className="w-5 h-5" /> : <Key className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold flex items-center gap-2 truncate">
                    <span>Payment Pending</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-mono">
                      ₹{pending.amount}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400 truncate">
                    Order: <span className="font-mono text-zinc-300">{pending.orderId}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isOwner && (
                  <button
                    onClick={() => fulfillPayment(pending)}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-xl flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all cursor-pointer"
                    title="Owner/Admin Instant Claim"
                  >
                    <span>⚡ Claim (Admin)</span>
                  </button>
                )}

                <button
                  onClick={() => verifyPayment(true)}
                  disabled={isChecking}
                  className="px-3 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-[0_0_10px_rgba(224,0,255,0.3)] transition-all cursor-pointer"
                >
                  {isChecking ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Checking...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Verify & Claim</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDismiss}
                  title="Dismiss if payment was not made"
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {statusMessage && (
              <div className="mt-2.5 pt-2 border-t border-white/10 text-xs flex items-center gap-2 text-amber-300">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
