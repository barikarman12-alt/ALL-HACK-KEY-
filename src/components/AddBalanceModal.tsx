import React, { useState } from 'react';
import { X, Loader2, ArrowRight, Wallet } from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { createFamGatewayOrder } from '../lib/famPay';

interface AddBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddBalanceModal({ isOpen, onClose }: AddBalanceModalProps) {
  const { currentUser } = useAuth();
  
  const [amount, setAmount] = useState<number>(100);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleProceed = async () => {
    if (amount < 10) {
      setError('Minimum amount is ₹10');
      return;
    }
    setError('');
    setIsRedirecting(true);

    try {
      const order = await createFamGatewayOrder({
        amount,
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        productName: 'Wallet Top-up',
        durationLabel: `₹${amount} Balance Deposit`
      });

      // Save pending payment metadata
      localStorage.setItem('pendingPayment', JSON.stringify({
        orderId: order.orderId,
        type: 'balance',
        amount: amount,
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        productName: 'Wallet Balance Deposit',
        durationLabel: `₹${amount} Balance`,
        timestamp: Date.now()
      }));
      
      // Direct redirect to payment gateway
      window.location.href = order.checkoutUrl;
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize payment.');
      setIsRedirecting(false);
    }
  };

  const presetAmounts = [50, 100, 200, 500, 1000];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Frosted Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity" 
        onClick={onClose}
      />

      {/* Main Container - Obsidian Matte Dark Card */}
      <div className="relative bg-[#0B0B0D] border border-white/10 rounded-2xl sm:rounded-3xl w-full max-w-sm sm:max-w-md overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.9)] backdrop-blur-2xl z-10 theme-modal">
        
        {/* Minimal Header */}
        <div className="flex justify-between items-center px-5 sm:px-6 py-4 border-b border-white/10 theme-modal-section">
          <div className="flex items-center gap-2.5">
            <Wallet className="w-4 h-4 text-zinc-300" strokeWidth={1.8} />
            <h3 className="text-base font-semibold text-white tracking-tight theme-text-title">
              Add Balance
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {!isRedirecting ? (
          <div className="p-5 sm:p-6 space-y-5">
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
              <div className="text-rose-400 text-xs bg-rose-950/40 p-2.5 rounded-xl border border-rose-500/30 text-center">
                {error}
              </div>
            )}
            
            {/* Primary Action Button */}
            <button 
              onClick={handleProceed}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm sm:text-base font-bold rounded-xl shadow-[0_4px_20px_rgba(99,102,241,0.35)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>Pay via UPI</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Muted Minimalist Footer */}
            <div className="text-[10px] text-zinc-500 text-center tracking-tight theme-text-sub pt-1">
              🔒 Secure Payment • Instant Wallet Auto-Credit
            </div>
          </div>
        ) : (
          <div className="p-8 sm:p-10 space-y-4 flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 animate-pulse">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-white theme-text-title">
              Redirecting to UPI Payment...
            </h4>
            <p className="text-zinc-400 text-xs max-w-xs theme-text-sub">
              Opening secure checkout for ₹{amount}. Once paid, balance is automatically added to your wallet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
