import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2, RefreshCw, CheckCircle2, AlertTriangle, X, Wallet, Key, Sparkles } from 'lucide-react';
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

  const [pending, setPending] = useState<PendingPaymentData | null>(() => readStoredPending());
  const [isChecking, setIsChecking] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Keep latest mutable values in refs
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

  // Track already credited orders locally to prevent double processing in same session
  const processedOrdersRef = useRef<Set<string>>(new Set());

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

  // Background Auto-Reconciliation for Payments Made Even If Site Was Closed
  const reconcileUserPayments = useCallback(async () => {
    const user = currentUserRef.current;
    if (!user || !user.uid) return;

    let pendingOrderIds: string[] = [];
    try {
      const storedIds = localStorage.getItem(`user_pending_orders_${user.uid}`);
      if (storedIds) {
        pendingOrderIds = JSON.parse(storedIds);
      }
    } catch (e) {}

    const pendingItem = readStoredPending();
    if (pendingItem?.orderId && !pendingOrderIds.includes(pendingItem.orderId)) {
      pendingOrderIds.push(pendingItem.orderId);
    }

    try {
      const res = await fetch('/api/fampay/reconcile-user-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          userEmail: user.email,
          pendingOrderIds
        })
      });

      const data = await res.json();
      if (data.success && Array.isArray(data.uncreditedOrders) && data.uncreditedOrders.length > 0) {
        for (const order of data.uncreditedOrders) {
          if (processedOrdersRef.current.has(order.order_id)) continue;
          processedOrdersRef.current.add(order.order_id);

          const targetUid = order.userId || user.uid;
          const orderAmt = Number(order.amount) || 0;

          if (order.orderType === 'balance' || !order.durationValue) {
            // Auto add balance to wallet
            addBalanceRef.current(targetUid, orderAmt, {
              method: 'UPI Gateway (Auto-Reconciled)',
              referenceId: order.order_id,
              note: `Wallet deposit of ₹${orderAmt} (Auto-credited for Order #${order.order_id})`,
              type: 'deposit',
              userEmail: user.email || undefined
            });

            // Mark as credited on server
            fetch('/api/fampay/mark-credited', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order_id: order.order_id, userId: targetUid })
            }).catch(() => {});

            playDing();
            confetti({
              particleCount: 160,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#e000ff', '#4ade80', '#ffffff', '#fbbf24']
            });

            setSuccessToast(`💰 ₹${orderAmt} Auto-Credited: We detected your payment for Order #${order.order_id} while you were away!`);
            setTimeout(() => setSuccessToast(null), 8000);

            // Clean pending storage if matched
            if (pendingRef.current?.orderId === order.order_id) {
              localStorage.removeItem('pendingPayment');
              pendingRef.current = null;
              setPending(null);
            }
          } else {
            // Keys order auto-fulfillment
            const quantity = order.quantity || 1;
            try {
              const keys = await purchaseKeysRef.current(
                order.durationValue,
                quantity,
                targetUid,
                user.email || undefined
              );

              fetch('/api/fampay/mark-credited', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: order.order_id, userId: targetUid })
              }).catch(() => {});

              if (keys && keys.length > 0) {
                const payload: PurchaseSuccessPayload = {
                  keys,
                  productName: resolveProductName(order.productName, settings.categories, items),
                  durationLabel: order.durationLabel || '',
                  amount: orderAmt,
                  date: new Date().toISOString()
                };
                localStorage.setItem('latestReceivedKey', JSON.stringify(payload));
                playDing();
                setSuccessToast(`🎉 Order #${order.order_id} Confirmed! Your ${keys.length} license key(s) are ready in Purchase History.`);
                setTimeout(() => setSuccessToast(null), 8000);

                if (onKeyReceivedRef.current) {
                  onKeyReceivedRef.current(payload);
                }
              } else {
                // Out of stock refund to wallet
                addBalanceRef.current(targetUid, orderAmt, {
                  method: 'Auto-Refund (Stock Out)',
                  referenceId: order.order_id,
                  note: `Auto-refund of ₹${orderAmt} for keys limit`,
                  type: 'refund',
                  userEmail: user.email || undefined
                });
                setSuccessToast(`Payment received! ₹${orderAmt} was credited to your Wallet.`);
                setTimeout(() => setSuccessToast(null), 8000);
              }
            } catch (err) {
              addBalanceRef.current(targetUid, orderAmt, {
                method: 'Auto-Refund',
                referenceId: order.order_id,
                note: `Refund of ₹${orderAmt} to wallet`,
                type: 'refund',
                userEmail: user.email || undefined
              });
              setSuccessToast(`Payment verified! ₹${orderAmt} added to your Wallet balance.`);
              setTimeout(() => setSuccessToast(null), 8000);
            }

            if (pendingRef.current?.orderId === order.order_id) {
              localStorage.removeItem('pendingPayment');
              pendingRef.current = null;
              setPending(null);
            }
          }
        }
      }
    } catch (e) {
      // Reconcile failed silently, will retry on next tick
    }
  }, [settings.categories, items]);

  const verifyPayment = useCallback(async (isManual: boolean = false) => {
    const target = pendingRef.current || readStoredPending();
    if (!target || !target.orderId || isCheckingRef.current) return;

    isCheckingRef.current = true;
    setIsChecking(true);
    if (isManual) {
      setStatusMessage('Checking payment gateway status...');
    }

    try {
      const res = await fetch('/api/fampay/verify-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          order_id: target.orderId,
          userId: currentUserRef.current?.uid,
          userEmail: currentUserRef.current?.email
        })
      });

      const data = await res.json();
      const status = (data.status || data.data?.status || '').toString().toLowerCase();

      if (status === 'success' || status === 'paid' || status === 'completed') {
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

        const targetUid = target.userId || currentUserRef.current?.uid;

        // Mark as credited on backend
        fetch('/api/fampay/mark-credited', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: target.orderId, userId: targetUid })
        }).catch(() => {});

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
      } else if (isManual) {
        setStatusMessage(data.message || 'Payment not yet received. If you paid, please wait a moment and tap verify again.');
        setTimeout(() => setStatusMessage(null), 6000);
      }
    } catch (err) {
      if (isManual) {
        setStatusMessage('Could not connect to payment gateway. Please retry.');
        setTimeout(() => setStatusMessage(null), 5000);
      }
    } finally {
      isCheckingRef.current = false;
      setIsChecking(false);
    }
  }, [settings.categories, items]);

  // Set up auto-reconcile & listeners
  useEffect(() => {
    // Initial runs
    const p = syncPendingFromStorage();
    if (p) {
      verifyPayment(false);
    }
    reconcileUserPayments();

    // Polling interval: single pending verification (3s) + auto-reconciliation (7s)
    const interval = setInterval(() => {
      const active = syncPendingFromStorage();
      if (active) {
        verifyPayment(false);
      }
      reconcileUserPayments();
    }, 5000);

    // Event handlers for when user returns from UPI app or switches tabs
    const handleActive = () => {
      if (!document.hidden) {
        const active = syncPendingFromStorage();
        if (active) {
          verifyPayment(false);
        }
        reconcileUserPayments();
      }
    };

    window.addEventListener('visibilitychange', handleActive);
    window.addEventListener('focus', handleActive);

    return () => {
      clearInterval(interval);
      window.removeEventListener('visibilitychange', handleActive);
      window.removeEventListener('focus', handleActive);
    };
  }, [syncPendingFromStorage, verifyPayment, reconcileUserPayments]);

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
          <div className="bg-emerald-950/95 border border-emerald-500/60 text-white p-4 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.35)] backdrop-blur-md flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 rounded-xl text-emerald-400 shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-emerald-200 text-sm">Payment Synchronized!</div>
              <div className="text-xs text-emerald-100/90 leading-relaxed">{successToast}</div>
            </div>
            <button 
              onClick={() => setSuccessToast(null)}
              className="text-emerald-400 hover:text-white p-1.5 rounded-lg shrink-0 cursor-pointer"
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

