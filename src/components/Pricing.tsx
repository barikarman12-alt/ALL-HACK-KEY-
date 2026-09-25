import { Check, X, Minus, Plus, Loader2, Key, Copy, Wallet, Search, Tag, Sparkles, AlertCircle, Clock, Users, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { FastAverageColor } from 'fast-average-color';
import { useInventory, useBalance, useCoupons, Coupon, getCouponRemainingTime, resolveProductName } from '../store';
import { useAuth } from '../lib/useAuth';
import { createFamGatewayOrder } from '../lib/famPay';

export interface PurchaseSuccessPayload {
  keys: string[];
  productName?: string;
  durationLabel?: string;
  amount?: number;
  couponCode?: string;
  date?: string;
  orderId?: string;
}

interface PricingProps {
  onPurchaseSuccess?: (payload?: PurchaseSuccessPayload) => void;
  onRequiresLogin?: () => void;
}

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
      gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + delay + 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration - 0.05);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + delay + duration);
      
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + duration);
    };

    playTone(523.25, 0, 0.15); // C5
    playTone(659.25, 0.15, 0.3); // E5
  } catch (e) {
    console.error('Audio playback failed', e);
  }
};

const ProductCard = ({ category, pricingOptions, openPurchaseModal }: any) => {
  const categoryPrices = pricingOptions
    .filter((p: any) => p.category === category.id)
    .sort((a: any, b: any) => a.price - b.price);
  
  const startingPrice = categoryPrices[0]?.price || 40;
  const inStock = pricingOptions
    .filter((p: any) => p.category === category.id)
    .some((p: any) => p.stock > 0);

  return (
    <div 
      key={category.id} 
      className="group relative bg-[#121215]/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/10 hover:border-white/20 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] theme-card"
    >
      {category.popular && (
        <div className="absolute top-3 right-3 text-[10px] sm:text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-white/10 text-white border border-white/15 backdrop-blur-md z-10 theme-pill">
          Popular
        </div>
      )}

      <div className="p-4 sm:p-7 flex flex-col items-center text-center">
        {/* Glossy App Icon */}
        <div className="relative mb-3 sm:mb-4">
          <img 
            src={category.logoUrl || "/logo.png"} 
            alt={category.name} 
            className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl object-cover bg-zinc-900 border border-white/10 shadow-[0_8px_20px_rgba(0,0,0,0.6)] group-hover:scale-105 transition-transform duration-300" 
          />
        </div>

        {/* Product Title */}
        <h3 className="text-sm sm:text-lg font-semibold text-white tracking-tight uppercase mb-1 theme-text-title">
          {category.name}
        </h3>

        {/* Price & Stock Badge */}
        <div className="flex items-baseline gap-1 mt-1 mb-2">
          <span className="text-xl sm:text-3xl font-bold font-display text-white theme-text-title">
            ₹{startingPrice}
          </span>
          <span className="text-zinc-500 text-[10px] sm:text-xs font-medium theme-text-sub">/ start</span>
        </div>

        {/* Minimal IN STOCK tag */}
        <div className="mt-1">
          {inStock ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              IN STOCK
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium tracking-wide bg-rose-950/40 text-rose-400 border border-rose-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              OUT OF STOCK
            </span>
          )}
        </div>
      </div>
      
      {/* Action Button: Glowing when in-stock, completely disabled when out-of-stock */}
      <div className="p-3.5 sm:p-5 pt-0">
        {inStock ? (
          <button 
            type="button"
            onClick={() => openPurchaseModal(category.id)}
            className="w-full relative group/btn inline-flex items-center justify-center py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 border border-indigo-400/40 hover:border-indigo-300 shadow-[0_0_20px_rgba(99,102,241,0.45),inset_0_1px_1px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.75),0_0_12px_rgba(168,85,247,0.5)] transition-all duration-300 cursor-pointer active:scale-[0.98]"
          >
            <span className="relative z-10 flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              Buy Now
            </span>
            {/* Ambient Pulse Glow */}
            <span className="absolute inset-0 rounded-xl bg-indigo-500/20 blur-md group-hover/btn:bg-indigo-500/40 transition-all duration-300"></span>
          </button>
        ) : (
          <button 
            type="button"
            disabled
            className="w-full inline-flex items-center justify-center py-2.5 sm:py-3 px-4 text-xs sm:text-sm font-medium rounded-xl bg-zinc-900/60 text-zinc-500 border border-zinc-800/80 cursor-not-allowed opacity-50 shadow-none pointer-events-none select-none"
            aria-disabled="true"
          >
            Out of Stock
          </button>
        )}
      </div>
    </div>
  );
};

export function Pricing({ onPurchaseSuccess, onRequiresLogin }: PricingProps) {
  const { currentUser } = useAuth();
  const { items: pricingOptions, purchaseKeys, settings, isInitialized } = useInventory(currentUser?.uid);
  const { balance, deductBalance, addBalance } = useBalance(currentUser?.uid);
  const { validateCoupon } = useCoupons();

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<any>(pricingOptions[0] || null);

  useEffect(() => {
    if (pricingOptions.length > 0 && !selectedDuration) {
      setSelectedDuration(pricingOptions[0]);
    }
  }, [pricingOptions, selectedDuration]);

  const [quantity, setQuantity] = useState(1);
  const [paymentStep, setPaymentStep] = useState<'configure' | 'redirecting' | 'processing' | 'wallet_confirm'>('configure');
  const [paymentError, setPaymentError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  // Dynamic pricing calculation with coupon
  const baseTotalPrice = (selectedDuration?.price || 0) * quantity;

  const calculateDiscount = (coupon: Coupon | null, basePrice: number) => {
    if (!coupon) return 0;
    let disc = 0;
    if (coupon.discountType === 'percentage') {
      disc = Math.round((basePrice * coupon.discountValue) / 100);
    } else {
      disc = Math.round(coupon.discountValue);
    }
    return Math.min(disc, Math.max(0, basePrice - 1));
  };

  const discountAmount = calculateDiscount(appliedCoupon, baseTotalPrice);
  const totalPrice = Math.max(1, baseTotalPrice - discountAmount);

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    const res = validateCoupon(couponInput.trim(), baseTotalPrice, selectedDuration?.value);
    if (!res.valid || !res.coupon) {
      setCouponError(res.message || 'Invalid or inactive coupon code');
      setAppliedCoupon(null);
    } else {
      setAppliedCoupon(res.coupon);
      setCouponError('');
    }
  };

  useEffect(() => {
    if (appliedCoupon && selectedDuration?.value) {
      const res = validateCoupon(appliedCoupon.code, baseTotalPrice, selectedDuration.value);
      if (!res.valid) {
        setAppliedCoupon(null);
        setCouponError(res.message || 'Coupon removed because it is not valid for this product.');
      }
    }
  }, [selectedDuration?.value, baseTotalPrice]);

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  const openPurchaseModal = (productName: string) => {
    const categoryOptions = pricingOptions.filter(p => p.category === productName);
    const inStockOptions = categoryOptions.filter(p => p.stock > 0);
    
    // Prevent opening modal for out-of-stock products
    if (inStockOptions.length === 0) {
      return;
    }

    if (!currentUser) {
      if (onRequiresLogin) onRequiresLogin();
      return;
    }
    setSelectedProduct(productName);
    setSelectedDuration(inStockOptions[0]);
    setQuantity(1);
    setPaymentStep('configure');
    setPaymentError('');
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  const closePurchaseModal = () => {
    setSelectedProduct(null);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
    setPaymentStep('configure');
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  /**
   * DIRECT REDIRECT PAYMENT INITIATION:
   * 1. Call Backend API to generate payment session/order.
   * 2. Receive checkout_url with redirect_url=/verify-payment configured.
   * 3. Immediately redirect via window.location.href (NO intermediate QR screen!).
   */
  const handleProceedDirectRedirect = async () => {
    setPaymentError('');
    setPaymentStep('redirecting');

    try {
      const order = await createFamGatewayOrder({
        amount: totalPrice,
        productName: resolveProductName(selectedProduct || '', settings.categories, pricingOptions),
        durationLabel: selectedDuration?.label,
        durationValue: selectedDuration?.value,
        quantity: quantity,
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        couponCode: appliedCoupon?.code
      });

      // Save pending order metadata so /verify-payment can hydrate all product info
      localStorage.setItem('pendingPayment', JSON.stringify({
        orderId: order.orderId,
        type: 'keys',
        amount: totalPrice,
        userId: currentUser?.uid,
        userEmail: currentUser?.email,
        productName: resolveProductName(selectedProduct || '', settings.categories, pricingOptions),
        categoryId: selectedProduct,
        durationLabel: selectedDuration?.label,
        durationValue: selectedDuration?.value,
        quantity: quantity,
        couponCode: appliedCoupon?.code,
        timestamp: Date.now()
      }));

      // Direct forward to FamGateway checkout
      window.location.href = order.checkoutUrl;
    } catch (err: any) {
      console.warn('Checkout error handled:', err);
      setPaymentError(err?.message || 'Payment initiation error. Please retry.');
      setPaymentStep('configure');
    }
  };

  const handleProceedWithWallet = async () => {
    if (!currentUser) return;
    if (balance < totalPrice) {
      setPaymentError(`Insufficient wallet balance. You need ₹${totalPrice} but have ₹${balance}. Please top up your wallet.`);
      return;
    }
    setPaymentError('');
    setPaymentStep('wallet_confirm');
  };

  const confirmWalletPurchase = async () => {
    if (!currentUser || balance < totalPrice) return;
    
    setPaymentError('');
    setPaymentStep('processing');
    
    if (deductBalance(currentUser.uid, totalPrice)) {
      try {
        const keys = await purchaseKeys(
          selectedDuration?.value, 
          quantity, 
          currentUser.uid, 
          currentUser.email || undefined,
          { amount: totalPrice, couponCode: appliedCoupon?.code }
        );

        if (keys.length < quantity && currentUser?.uid) {
          const missingCount = quantity - keys.length;
          const refundPerKey = Math.round(totalPrice / quantity);
          const refundAmt = missingCount * refundPerKey;
          addBalance(currentUser.uid, refundAmt, {
            method: 'Auto-Refund (Stock Limit)',
            referenceId: `part_ref_${Date.now()}`,
            note: `Auto-refund for ${missingCount} unfulfilled key(s)`,
            type: 'refund',
            userEmail: currentUser.email || undefined
          });
        }

        playSuccessSound();
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#e000ff', '#4ade80', '#ffffff', '#fbbf24']
        });
        
        const payload: PurchaseSuccessPayload = {
          keys,
          productName: resolveProductName(selectedProduct || '', settings.categories, pricingOptions),
          durationLabel: selectedDuration?.label || '',
          amount: totalPrice,
          couponCode: appliedCoupon?.code,
          date: new Date().toISOString()
        };
        localStorage.setItem('latestReceivedKey', JSON.stringify(payload));

        closePurchaseModal();
        if (onPurchaseSuccess) {
          onPurchaseSuccess(payload);
        }
      } catch (err) {
        setPaymentError('Failed to generate keys. Please contact support.');
        setPaymentStep('configure');
      }
    } else {
      setPaymentError('Failed to deduct balance.');
      setPaymentStep('configure');
    }
  };

  const filteredCategories = settings.categories.filter((category) => 
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="pricing" className="py-6 sm:py-10 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Sleek Pill-Shaped Search Header */}
        <div className="max-w-3xl mx-auto mb-8 relative">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-500 group-focus-within:text-zinc-300 transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products..."
              className="block w-full pl-10 pr-4 py-3 bg-[#121215]/80 border border-white/10 rounded-full leading-5 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-white/20 focus:ring-1 focus:ring-white/20 transition-all text-xs sm:text-sm shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-md theme-input"
            />
          </div>
        </div>

        {/* Categories Grid */}
        {(!isInitialized && filteredCategories.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <Loader2 className="w-10 h-10 animate-spin text-zinc-400 mb-3" />
            <p className="text-sm font-medium theme-text-sub">Loading store...</p>
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-4xl mx-auto">
            {filteredCategories.map((category) => (
              <ProductCard 
                key={category.id} 
                category={category} 
                pricingOptions={pricingOptions} 
                openPurchaseModal={openPurchaseModal} 
              />
            ))}
          </div>
        ) : (
          <div className="max-w-3xl mx-auto text-center py-12 bg-zinc-900/30 rounded-3xl border border-zinc-800/50 theme-card">
            <Search className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-medium text-zinc-300 mb-1 theme-text-title">No products found</h3>
            <p className="text-xs text-zinc-500 theme-text-sub">We couldn't find anything matching "{searchQuery}".</p>
          </div>
        )}
      </div>

      {/* Direct Checkout Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={closePurchaseModal}></div>
          <div className="relative bg-[#121214] border border-zinc-800/80 shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200 theme-modal">
            
            {/* Header */}
            <div className="flex justify-between items-start p-6 pb-4 border-b border-zinc-800/60 theme-modal-section">
              <div>
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-widest mb-0.5 theme-text-sub">Instant Shop Maker</p>
                <h3 className="text-2xl font-bold text-zinc-100 font-display tracking-tight theme-text-title">
                  {paymentStep === 'configure' && 'Select Plan'}
                  {paymentStep === 'redirecting' && 'Connecting to Gateway...'}
                  {paymentStep === 'processing' && 'Processing...'}
                  {paymentStep === 'wallet_confirm' && 'Confirm Wallet Payment'}
                </h3>
              </div>
              <button 
                onClick={closePurchaseModal}
                className="text-zinc-500 hover:text-zinc-300 p-1.5 rounded-full hover:bg-zinc-800/50 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {paymentStep === 'configure' && (
              <>
                <div className="p-6 space-y-6">
                  {/* Selected Product */}
                  <div>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">SELECTED PRODUCT</p>
                    <p className="text-xl font-bold font-serif text-zinc-100 tracking-wide">
                      {settings.categories.find(c => c.id === selectedProduct)?.name || selectedProduct}
                    </p>
                  </div>

                  {/* Duration Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
                      Select Duration
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {pricingOptions.filter(p => p.category === selectedProduct).map((option) => {
                        const isSelected = selectedDuration?.value === option.value;
                        const inStock = option.stock > 0;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              if (inStock) {
                                setSelectedDuration(option);
                              }
                            }}
                            disabled={!inStock}
                            className={`relative px-4 py-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              !inStock
                                ? 'border-zinc-800/50 bg-zinc-900/30 text-zinc-600 cursor-not-allowed opacity-50'
                                : isSelected
                                  ? 'border-indigo-500/80 bg-indigo-950/20 text-white shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30'
                                  : 'border-zinc-800 bg-[#17171a] text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-xs font-semibold uppercase tracking-wider block text-zinc-300">
                                {option.label}
                              </span>
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                inStock 
                                  ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-500/20' 
                                  : 'text-red-400 bg-red-950/40 border border-red-500/20'
                              }`}>
                                {inStock ? 'IN STOCK' : 'OUT'}
                              </span>
                            </div>
                            <div className="mt-2 text-base font-bold text-white font-mono">
                              ₹{option.price}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quantity Selection */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Quantity (Keys)
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center border border-zinc-800 rounded-xl bg-[#17171a] overflow-hidden">
                        <button 
                          onClick={() => handleQuantityChange(-1)}
                          disabled={quantity <= 1}
                          className="p-2.5 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <div className="w-12 text-center font-bold text-sm text-zinc-100 font-mono">
                          {quantity}
                        </div>
                        <button 
                          onClick={() => handleQuantityChange(1)}
                          disabled={quantity >= 10 || quantity >= (selectedDuration?.stock || 0)}
                          className="p-2.5 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-30 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <span className="text-xs text-zinc-500">Max 10 keys per order</span>
                    </div>
                  </div>

                  {/* Apply Coupon Code */}
                  <div className="pt-2 border-t border-zinc-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        <Tag className="w-3.5 h-3.5 text-indigo-400" />
                        Have a Coupon?
                      </span>
                      {appliedCoupon && (
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}% OFF` : `₹${appliedCoupon.discountValue} OFF`} Applied
                        </span>
                      )}
                    </div>

                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
                        <div>
                          <span className="font-mono font-bold text-emerald-400 text-sm">{appliedCoupon.code}</span>
                          <p className="text-xs text-emerald-300 font-medium">
                            You saved ₹{discountAmount} on this order!
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="px-2.5 py-1 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(e) => {
                              setCouponInput(e.target.value.toUpperCase());
                              if (couponError) setCouponError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleApplyCoupon();
                              }
                            }}
                            placeholder="Enter coupon code"
                            className="flex-1 bg-[#17171a] border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 uppercase tracking-wider focus:outline-none focus:border-indigo-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={!couponInput.trim()}
                            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                          >
                            Apply
                          </button>
                        </div>
                        {couponError && (
                          <div className="flex items-center gap-1.5 text-xs text-rose-400 bg-rose-950/30 border border-rose-500/20 px-3 py-1.5 rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>{couponError}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Summary & Direct Action */}
                <div className="p-6 bg-[#17171a] border-t border-zinc-800/80 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold mb-0.5">TOTAL AMOUNT</p>
                      <div className="flex items-baseline gap-2.5">
                        <p className="text-3xl font-bold font-display text-white">₹{totalPrice}</p>
                        {appliedCoupon && discountAmount > 0 && (
                          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                            Saved ₹{discountAmount}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase font-semibold text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800">
                        <Zap className="w-3 h-3 text-indigo-400" />
                        Direct Redirect
                      </span>
                    </div>
                  </div>
                  
                  {paymentError && (
                    <div className="bg-red-950/50 border border-red-500/50 text-red-400 p-3 rounded-xl text-xs text-center">
                      {paymentError}
                    </div>
                  )}

                  <div className="flex flex-col gap-2.5 mt-1">
                    {/* PRIMARY DIRECT REDIRECT BUTTON */}
                    <button 
                      onClick={handleProceedDirectRedirect}
                      disabled={!selectedDuration || selectedDuration?.stock <= 0 || quantity > selectedDuration?.stock}
                      className="w-full px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-2xl shadow-[0_4px_20px_rgba(79,70,229,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Pay via UPI Gateway →</span>
                    </button>
                    
                    {currentUser && (
                      <button 
                        onClick={handleProceedWithWallet}
                        disabled={!selectedDuration || selectedDuration?.stock <= 0 || quantity > selectedDuration?.stock || balance < totalPrice}
                        className="w-full px-5 py-3 bg-[#121214] hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-300 text-xs font-medium rounded-2xl border border-zinc-800 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                        Pay with Wallet Balance (₹{balance})
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {paymentStep === 'redirecting' && (
              <div className="p-10 space-y-5 flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 animate-pulse">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-white">Redirecting to Payment Gateway...</h4>
                  <p className="text-zinc-400 text-sm max-w-xs">
                    Opening your UPI payment checkout. You will be redirected back to <span className="font-mono text-fuchsia-400">/verify-payment</span> upon completion.
                  </p>
                </div>
                <div className="text-[11px] text-zinc-500 font-mono">
                  Direct Redirect Flow Active (No Intermediate QR)
                </div>
              </div>
            )}

            {paymentStep === 'wallet_confirm' && (
              <div className="p-6 space-y-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-fuchsia-500/10 text-fuchsia-500 rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(224,0,255,0.3)]">
                  <Wallet className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Confirm Purchase</h4>
                  <p className="text-zinc-400 text-sm">
                    Are you sure you want to spend <span className="font-bold text-fuchsia-400">₹{totalPrice}</span> from your wallet balance?
                  </p>
                  <p className="text-xs text-zinc-500 mt-2">Current balance: ₹{balance}</p>
                </div>
                
                {paymentError && (
                  <div className="bg-red-950/50 border border-red-500/50 text-red-400 p-3 rounded-lg text-xs w-full">
                    {paymentError}
                  </div>
                )}

                <div className="w-full flex gap-3 mt-4">
                  <button
                    onClick={() => setPaymentStep('configure')}
                    className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium border border-zinc-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmWalletPurchase}
                    className="flex-1 px-4 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-sm font-bold shadow-[0_0_15px_rgba(224,0,255,0.4)] cursor-pointer"
                  >
                    Confirm & Buy
                  </button>
                </div>
              </div>
            )}

            {paymentStep === 'processing' && (
              <div className="p-12 space-y-4 flex flex-col items-center text-center">
                <Loader2 className="w-12 h-12 text-fuchsia-500 animate-spin" />
                <h4 className="text-xl font-bold text-white">Generating Keys...</h4>
                <p className="text-zinc-400 text-sm">Allocating your license keys from inventory.</p>
              </div>
            )}

          </div>
        </div>
      )}
    </section>
  );
}
