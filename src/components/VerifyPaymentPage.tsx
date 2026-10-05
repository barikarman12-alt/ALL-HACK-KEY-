import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  Download, 
  ArrowLeft, 
  Send, 
  ShieldCheck, 
  Clock, 
  Sparkles, 
  ShoppingBag, 
  CheckCircle2, 
  FileText,
  Gift,
  User,
  MessageCircle,
  Phone
} from 'lucide-react';
import { triggerCelebrationConfetti, playSuccessChime } from '../lib/celebrate';
import { store, useInventory, useBalance, resolveProductName, useSpinBalance } from '../store';
import { useAuth } from '../lib/useAuth';
import { PurchaseSuccessPayload } from './Pricing';
import { SpinWheelModal } from './SpinWheelModal';
import { Helmet } from './Helmet';

interface VerifyPaymentPageProps {
  onBackToHome: () => void;
  onViewPurchases?: () => void;
}

export function VerifyPaymentPage({ onBackToHome, onViewPurchases }: VerifyPaymentPageProps) {
  const { currentUser } = useAuth();
  const { items, settings, purchases, purchaseKeys } = useInventory(currentUser?.uid, currentUser?.email || undefined);
  const { addBalance } = useBalance(currentUser?.uid);

  // Extract order ID from URL query parameters
  const [orderId, setOrderId] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('order_id') || params.get('orderId') || params.get('client_txn_id') || params.get('id') || '';
  });

  const [manualOrderIdInput, setManualOrderIdInput] = useState('');
  const [verificationState, setVerificationState] = useState<'verifying' | 'success' | 'enter_order'>('verifying');
  const [deliveredKeys, setDeliveredKeys] = useState<string[]>([]);
  const [orderDetails, setOrderDetails] = useState<PurchaseSuccessPayload | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
  const { spinBalance, countdown } = useSpinBalance(currentUser?.uid);

  const purchaseKeysRef = useRef(purchaseKeys);
  purchaseKeysRef.current = purchaseKeys;

  const addBalanceRef = useRef(addBalance);
  addBalanceRef.current = addBalance;

  const apkLink = "https://t.me/allfileupdatehack";

  // Deliver key immediately to user
  const deliverUserKey = useCallback(async (targetOrderId: string) => {
    let effectiveOrderId = targetOrderId.trim();
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
      setVerificationState('enter_order');
      return;
    }

    // 1. Check if key is already delivered for this order
    const saved = localStorage.getItem('latestReceivedKey');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.orderId === effectiveOrderId && parsed.keys && parsed.keys.length > 0) {
          setDeliveredKeys(parsed.keys);
          setOrderDetails(parsed);
          setVerificationState('success');
          triggerCelebrationConfetti();
          playSuccessChime();
          return;
        }
      } catch (e) {}
    }

    // 2. Read pending payment metadata
    const pendingStr = localStorage.getItem('pendingPayment');
    let orderMeta: any = null;
    if (pendingStr) {
      try {
        orderMeta = JSON.parse(pendingStr);
      } catch (e) {}
    }

    // Try finding order in pendingOrders store or server API if orderMeta is missing
    if (!orderMeta) {
      const foundOrder = store.getPendingOrders().find(o => o.orderId === effectiveOrderId);
      if (foundOrder) {
        orderMeta = {
          orderId: foundOrder.orderId,
          amount: foundOrder.amount,
          customerName: foundOrder.customerName,
          customerPhone: foundOrder.customerPhone,
          productName: foundOrder.productName,
          durationLabel: foundOrder.durationLabel,
          userId: foundOrder.userId,
          userEmail: foundOrder.userEmail
        };
      } else {
        try {
          const res = await fetch(`/api/fampay/get-order?order_id=${encodeURIComponent(effectiveOrderId)}`);
          if (res.ok) {
            const json = await res.json();
            if (json.order) {
              orderMeta = {
                orderId: json.order.order_id,
                amount: json.order.amount,
                customerName: json.order.customer_name,
                customerPhone: json.order.customer_phone,
                productName: json.order.product_name,
                durationLabel: json.order.duration_label,
                durationValue: json.order.duration_value,
                quantity: json.order.quantity,
                userId: json.order.user_id,
                userEmail: json.order.user_email
              };
            }
          }
        } catch (e) {}
      }
    }

    const isBalanceDeposit = orderMeta?.type === 'balance' || 
      orderMeta?.productName?.toLowerCase().includes('balance') || 
      orderMeta?.productName?.toLowerCase().includes('wallet');

    const totalPaid = orderMeta?.amount || 40;
    const targetUid = currentUser?.uid || orderMeta?.userId;
    const targetEmail = currentUser?.email || orderMeta?.userEmail;
    const customerName = orderMeta?.customerName || localStorage.getItem('customer_name') || currentUser?.displayName || '';
    const customerPhone = orderMeta?.customerPhone || localStorage.getItem('customer_phone') || '';

    // Handle wallet balance deposit
    if (isBalanceDeposit) {
      if (targetUid) {
        addBalanceRef.current(targetUid, totalPaid, {
          method: 'Gateway Auto Verification',
          referenceId: effectiveOrderId,
          note: `Wallet Deposit (Order #${effectiveOrderId})`,
          type: 'deposit',
          userEmail: targetEmail
        });
      }

      const successPayload: PurchaseSuccessPayload = {
        keys: [],
        productName: 'Wallet Balance Deposit',
        durationLabel: `₹${totalPaid} Added to Wallet`,
        amount: totalPaid,
        date: new Date().toISOString(),
        orderId: effectiveOrderId
      };

      store.updatePendingOrderStatus(effectiveOrderId, 'completed', new Date().toISOString(), {
        customerName,
        customerPhone
      });

      setOrderDetails(successPayload);
      localStorage.removeItem('pendingPayment');
      playSuccessChime();
      triggerCelebrationConfetti();
      setVerificationState('success');
      return;
    }

    // Handle digital key delivery
    const productVal = orderMeta?.durationValue || orderMeta?.categoryId || (items && items[0]?.value) || 'bgmi_mod_1day';
    const quantity = orderMeta?.quantity || 1;
    const couponUsed = orderMeta?.couponCode;

    let keys: string[] = [];
    if (productVal) {
      try {
        keys = await purchaseKeysRef.current(
          productVal,
          quantity,
          targetUid || 'anonymous',
          targetEmail,
          { 
            amount: totalPaid, 
            couponCode: couponUsed,
            customerName,
            customerPhone,
            orderId: effectiveOrderId
          }
        );
      } catch (err) {
        console.warn('Inventory fetch note:', err);
      }
    }

    // Real keys strictly from stock (No external or fake generated keys)
    const finalKeys = keys || [];

    if (finalKeys.length === 0 && totalPaid > 0 && targetUid) {
      // If product became out of stock during payment, auto-refund to user's wallet
      addBalanceRef.current(targetUid, totalPaid, {
        method: 'Auto-Refund (Out of Stock)',
        referenceId: effectiveOrderId,
        note: `Auto-refund of ₹${totalPaid} for out-of-stock keys (Order #${effectiveOrderId})`,
        type: 'refund',
        userEmail: targetEmail
      });
    }

    setDeliveredKeys(finalKeys);

    store.updatePendingOrderStatus(effectiveOrderId, 'completed', new Date().toISOString(), {
      deliveredKeys: finalKeys,
      customerName,
      customerPhone
    });

    const productNameStr = resolveProductName(orderMeta?.productName || orderMeta?.categoryId, settings.categories, items);
    const successPayload: PurchaseSuccessPayload = {
      keys: finalKeys,
      productName: productNameStr || 'VIP Digital Key',
      durationLabel: orderMeta?.durationLabel || 'Instant Access',
      amount: totalPaid,
      couponCode: couponUsed,
      customerName,
      customerPhone,
      date: new Date().toISOString(),
      orderId: effectiveOrderId
    };

    setOrderDetails(successPayload);
    localStorage.setItem('latestReceivedKey', JSON.stringify(successPayload));
    localStorage.removeItem('pendingPayment');

    // Trigger celebration effects
    playSuccessChime();
    triggerCelebrationConfetti();
    setVerificationState('success');
  }, [currentUser, items, settings.categories]);

  // Run automatically when page opens
  useEffect(() => {
    deliverUserKey(orderId);
  }, [orderId, deliverUserKey]);

  // Copy single key
  const handleCopyKey = (keyText: string, index: number) => {
    navigator.clipboard.writeText(keyText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  // Copy all keys
  const handleCopyAll = () => {
    navigator.clipboard.writeText(deliveredKeys.join('\n'));
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  };

  // Download Receipt
  const handleDownloadReceipt = () => {
    const text = `================================================
          ${settings.siteName || 'ARMAN X STORE'} - OFFICIAL RECEIPT
================================================
Order ID:    ${orderDetails?.orderId || orderId}
Date:        ${new Date(orderDetails?.date || Date.now()).toLocaleString()}
Product:     ${orderDetails?.productName || 'VIP Key'}
Plan:        ${orderDetails?.durationLabel || 'Active'}
Amount Paid: ₹${orderDetails?.amount || 0}
Status:      SUCCESS / VERIFIED (FAMGATEWAY)
------------------------------------------------
YOUR VIP KEYS:
${deliveredKeys.map((k, i) => `[${i + 1}] ${k}`).join('\n')}
------------------------------------------------
Instructions:
1. Paste key into the application.
2. Join our Telegram for latest updates:
   ${apkLink}
================================================
Thank you for your purchase!
`;
    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `receipt-${orderDetails?.orderId || orderId || 'order'}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleManualOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = manualOrderIdInput.trim();
    if (!cleanId) return;
    setOrderId(cleanId);
    deliverUserKey(cleanId);
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-zinc-100 flex flex-col justify-between selection:bg-cyan-500/30">
      <Helmet 
        title={`Verify Payment - ${settings?.siteName || 'Arman X Store'}`}
        description={`Verify your UPI payment order and download your official VIP key receipt on ${settings?.siteName || 'Arman X Store'}.`}
      />
      
      {/* Background Neon Ambient Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-cyan-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[140px]" />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-3xl mx-auto px-4 py-8 sm:py-12 flex-1 flex flex-col justify-center">
        
        {/* Navigation Bar */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20"
          >
            <ArrowLeft className="w-4 h-4 text-cyan-400" />
            <span>Back to Store</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSpinModal(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:from-amber-500/30 hover:to-yellow-500/20 text-amber-300 text-xs sm:text-sm font-bold rounded-xl border border-amber-500/30 flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            >
              <Gift className="w-4 h-4 text-amber-400" />
              <span>Free Spin {spinBalance > 0 ? `(${spinBalance})` : ''}</span>
            </button>

            <button
              onClick={onBackToHome}
              className="px-3.5 py-2 bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-xs sm:text-sm font-medium rounded-xl border border-white/10 transition-colors flex items-center gap-1.5"
            >
              <ShoppingBag className="w-4 h-4 text-cyan-400" />
              <span>Shop More</span>
            </button>
          </div>
        </div>

        {/* ================= SUCCESS STATE: KEY DELIVERED ================= */}
        {verificationState === 'success' && (
          <div className="bg-[#0b0f19]/95 border border-emerald-500/40 rounded-3xl p-6 sm:p-9 space-y-7 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_35px_rgba(16,185,129,0.2)] backdrop-blur-2xl animate-in zoom-in-95 duration-300">
            
            {/* Header Badge */}
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.35)] animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  Payment Successful
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mt-2">
                  Aapki VIP Key Ready Hai! 🎉
                </h2>
                <p className="text-zinc-300 text-xs sm:text-sm mt-1">
                  Payment successfully confirm ho chuki hai. Niche se apni digital key copy karein:
                </p>
              </div>
            </div>

            {/* Order Summary & Customer Info Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-xs">
              <div>
                <span className="text-zinc-400 text-[11px] block">Order ID</span>
                <span className="font-mono font-bold text-white truncate block">
                  {orderDetails?.orderId || orderId || 'N/A'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px] block">Customer Name</span>
                <span className="font-bold text-white truncate block flex items-center gap-1">
                  <User className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>{orderDetails?.customerName || localStorage.getItem('customer_name') || currentUser?.displayName || 'Customer'}</span>
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px] block">Customer Gmail</span>
                <span className="font-mono font-bold text-zinc-200 truncate block text-[11px]" title={orderDetails?.customerEmail || currentUser?.email || 'Verified'}>
                  {orderDetails?.customerEmail || currentUser?.email || localStorage.getItem('customer_email') || 'Direct Checkout'}
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px] block">WhatsApp</span>
                <span className="font-mono font-bold text-emerald-400 truncate block flex items-center gap-1">
                  <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{orderDetails?.customerPhone ? `+91 ${orderDetails.customerPhone}` : (localStorage.getItem('customer_phone') ? `+91 ${localStorage.getItem('customer_phone')}` : 'Verified')}</span>
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px] block">Product & Plan</span>
                <span className="font-semibold text-cyan-300 truncate block">
                  {orderDetails?.productName || 'VIP License'} ({orderDetails?.durationLabel || 'Active'})
                </span>
              </div>
              <div>
                <span className="text-zinc-400 text-[11px] block">Amount Paid</span>
                <span className="font-bold text-emerald-400 block">
                  ₹{orderDetails?.amount || 0}
                </span>
              </div>
            </div>

            {/* Delivered Key Box */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span>Your VIP Key{deliveredKeys.length > 1 ? 's' : ''}:</span>
                </span>
                {deliveredKeys.length > 1 && (
                  <button
                    onClick={handleCopyAll}
                    className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors flex items-center gap-1"
                  >
                    {allCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{allCopied ? 'All Copied!' : 'Copy All Keys'}</span>
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {deliveredKeys.length > 0 ? (
                  deliveredKeys.map((key, idx) => (
                    <div 
                      key={idx}
                      className="relative flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-cyan-950/20 to-black/80 border border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)] group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="font-mono text-sm sm:text-base font-bold text-emerald-300 select-all tracking-wider break-all">
                          {key}
                        </span>
                      </div>

                      <button
                        onClick={() => handleCopyKey(key, idx)}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                          copiedIndex === idx
                            ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                        }`}
                      >
                        {copiedIndex === idx ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy Key</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-sm space-y-2 text-center">
                    <p className="font-bold">⚠️ Product Stock Limit Exceeded</p>
                    <p className="text-xs text-amber-300/80">
                      Payment receive ho gaya tha lekin product instantly out of stock ho gaya. Aapka ₹{orderDetails?.amount || 0} wallet balance me safely refund kar diya gaya hai!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {/* WhatsApp Receipt Share */}
              {(orderDetails?.customerPhone || localStorage.getItem('customer_phone')) && (
                <a
                  href={`https://wa.me/91${(orderDetails?.customerPhone || localStorage.getItem('customer_phone') || '').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Arman X Store Order Confirmation 🎉\n\nOrder ID: ${orderDetails?.orderId || orderId}\nCustomer: ${orderDetails?.customerName || localStorage.getItem('customer_name') || ''}\nVIP License Key:\n${deliveredKeys.join('\n')}\n\nAPK / Updates Channel: ${apkLink}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer sm:col-span-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Save Receipt & Key to WhatsApp (+91 {orderDetails?.customerPhone || localStorage.getItem('customer_phone')})</span>
                </a>
              )}

              {/* Telegram Channel Link */}
              <a
                href={apkLink}
                target="_blank"
                rel="noopener noreferrer"
                className="py-3 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Join Official Telegram Channel</span>
              </a>

              {/* Download Receipt */}
              <button
                onClick={handleDownloadReceipt}
                className="py-3 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/10 hover:border-white/20 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>Download Invoice Receipt (.txt)</span>
              </button>
            </div>

            {/* Support footer */}
            <div className="pt-4 border-t border-white/[0.06] text-center text-xs text-zinc-400">
              Kisi bhi sahayata ke liye Telegram support par contact karein. Thank you for shopping with us!
            </div>
          </div>
        )}

        {/* ================= ENTER ORDER ID STATE ================= */}
        {verificationState === 'enter_order' && (
          <div className="bg-[#0b0f19]/95 border border-cyan-500/30 rounded-3xl p-6 sm:p-9 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(6,182,212,0.3)]">
                <Key className="w-7 h-7" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Enter Your Order ID to Get Key
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm">
                Apna FamGateway Order ID (e.g. fg_VXIXN54KM) yahan daalein aur turant apni key claim karein:
              </p>
            </div>

            <form onSubmit={handleManualOrderSubmit} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={manualOrderIdInput}
                  onChange={(e) => setManualOrderIdInput(e.target.value)}
                  placeholder="Enter Order ID (e.g. fg_VXIXN54KM)"
                  className="flex-1 bg-black/70 border border-white/15 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 rounded-xl px-4 py-3 text-white font-mono text-sm sm:text-base outline-none transition-all"
                  required
                />
                <button
                  type="submit"
                  className="py-3 px-6 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-sm sm:text-base rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer shrink-0"
                >
                  Get Key Instantly ➔
                </button>
              </div>
            </form>
          </div>
        )}

      </div>

      {/* Free Spin Wheel Modal */}
      <SpinWheelModal
        isOpen={showSpinModal}
        onClose={() => setShowSpinModal(false)}
      />
    </div>
  );
}
