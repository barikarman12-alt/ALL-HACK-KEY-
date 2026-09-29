import React, { useState } from 'react';
import { 
  X, 
  Loader2, 
  ArrowRight, 
  Wallet, 
  ShieldCheck, 
  Zap,
  CreditCard,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { useBalance } from '../store';
import { createFamGatewayOrder } from '../lib/famPay';
import { FamGatewayModal } from './FamGatewayModal';

interface AddBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddBalanceModal({ isOpen, onClose }: AddBalanceModalProps) {
  const { currentUser } = useAuth();
  const { addBalance } = useBalance(currentUser?.uid);
  
  const [amount, setAmount] = useState<number>(100);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState('');

  // Fam Gateway Modal State
  const [famModalOpen, setFamModalOpen] = useState(false);
  const [famCheckoutUrl, setFamCheckoutUrl] = useState('');
  const [famOrderId, setFamOrderId] = useState('');

  if (!isOpen) return null;

  const handleProceedToGateway = async () => {
    if (!amount || amount < 10) {
      setError('Minimum deposit amount is ₹10');
      return;
    }
    setError('');
    setIsRedirecting(true);

    try {
      const order = await createFamGatewayOrder({
        amount,
        userId: currentUser?.uid || 'anonymous',
        userEmail: currentUser?.email || undefined,
        productName: 'Wallet Balance Deposit',
        durationLabel: `₹${amount} Balance Deposit`
      });

      // Save pending order metadata
      localStorage.setItem('pendingPayment', JSON.stringify({
        orderId: order.orderId,
        checkoutUrl: order.checkoutUrl,
        type: 'balance',
        amount: amount,
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        productName: 'Wallet Balance Deposit',
        durationLabel: `₹${amount} Balance`,
        timestamp: Date.now()
      }));

      // Open Inline Fam Gateway Popup Modal (NO REDIRECT!)
      setFamCheckoutUrl(order.checkoutUrl);
      setFamOrderId(order.orderId);
      setFamModalOpen(true);
      setIsRedirecting(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize payment gateway. Please retry.');
      setIsRedirecting(false);
    }
  };

  const handlePaymentSuccess = (paymentData: any) => {
    if (currentUser?.uid) {
      addBalance(currentUser.uid, amount, {
        method: 'FamGateway UPI QR',
        referenceId: paymentData.orderId,
        note: `Instant Wallet Deposit of ₹${amount}`,
        type: 'deposit',
        userEmail: currentUser.email || undefined
      });
    }
    setFamModalOpen(false);
    onClose();
  };

  const handleClose = () => {
    if (isRedirecting) return;
    setError('');
    onClose();
  };

  const presetAmounts = [50, 100, 200, 500, 1000];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Frosted Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" 
        onClick={handleClose}
      />

      {/* Main Container - Obsidian Dark Card */}
      <div className="relative bg-[#0B0B0D] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-sm sm:max-w-md overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl z-10 theme-modal">
        
        {/* Header */}
        <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-white/10 theme-modal-section">
          <div className="flex items-center gap-2.5">
            <Wallet className="w-5 h-5 text-indigo-400" strokeWidth={2} />
            <h3 className="text-base font-semibold text-white tracking-tight theme-text-title">
              Add Balance via Gateway
            </h3>
          </div>
          <button 
            onClick={handleClose}
            disabled={isRedirecting}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-30"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          {isRedirecting ? (
            <div className="py-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.35)] animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              </div>
              <div>
                <h4 className="text-lg font-bold text-white mb-1">Connecting to Gateway...</h4>
                <p className="text-xs text-zinc-400 max-w-xs">
                  Redirecting to official secure payment gateway for ₹{amount}.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 theme-text-title">
                  ENTER AMOUNT (₹)
                </label>
                
                {/* Amount Input Box */}
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-lg">
                    ₹
                  </span>
                  <input 
                    type="number"
                    min="10"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-4 py-3 bg-[#131317] border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-xl sm:text-2xl font-bold theme-input"
                    placeholder="100"
                  />
                </div>

                {/* Preset Buttons */}
                <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mt-3">
                  {presetAmounts.map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className={`py-2 px-1 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer text-center ${
                        amount === val 
                          ? 'bg-indigo-950/70 border-indigo-500/50 text-indigo-300 shadow-[0_0_12px_rgba(99,102,241,0.25)]' 
                          : 'bg-[#131317]/70 border-white/5 text-zinc-400 hover:text-white hover:bg-zinc-800/60 theme-pill'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>
              
              {error && (
                <div className="text-rose-400 text-xs bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30 text-center flex items-center justify-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Gateway Supported Features Badge */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 bg-white/[0.02] border border-white/5 p-3 rounded-xl">
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Instant Auto Credit</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>100% Secure Gateway</span>
                </div>
              </div>
              
              {/* Primary Action Button: Inline Modal Checkout */}
              <button 
                onClick={handleProceedToGateway}
                disabled={isRedirecting}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm sm:text-base font-bold rounded-xl shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span>Pay via UPI (₹{amount})</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Muted Footer */}
              <div className="text-[10px] text-zinc-500 text-center tracking-tight theme-text-sub pt-1">
                🔒 All UPI Apps (PhonePe, GPay, Paytm) Supported
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inline Fam Gateway Checkout Modal */}
      <FamGatewayModal
        isOpen={famModalOpen}
        onClose={() => setFamModalOpen(false)}
        checkoutUrl={famCheckoutUrl}
        orderId={famOrderId}
        amount={amount}
        productName="Wallet Balance Deposit"
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
