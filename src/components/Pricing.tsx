import { Check, X, Minus, Plus, Loader2, Key, QrCode, Copy, Wallet, Search, Tag, Sparkles, AlertCircle, Clock, Users } from 'lucide-react';
import { useState, useEffect, useRef, SVGProps } from 'react';
import confetti from 'canvas-confetti';
import { FastAverageColor } from 'fast-average-color';
import { useInventory, useBalance, useCoupons, Coupon, getCouponRemainingTime, resolveProductName } from '../store';
import { useAuth } from '../lib/useAuth';

export interface PurchaseSuccessPayload {
  keys: string[];
  productName?: string;
  durationLabel?: string;
  amount?: number;
  couponCode?: string;
  date?: string;
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

const colorCache: Record<string, string> = {};

const ProductCard = ({ category, pricingOptions, openPurchaseModal, fallbackColor }: any) => {
  const [accentColor, setAccentColor] = useState<string>(() => {
    if (category.logoUrl && colorCache[category.logoUrl]) {
      return colorCache[category.logoUrl];
    }
    return fallbackColor;
  });

  useEffect(() => {
    if (!category.logoUrl) return;
    if (colorCache[category.logoUrl]) {
      setAccentColor(colorCache[category.logoUrl]);
      return;
    }
    const fac = new FastAverageColor();
    fac.getColorAsync(category.logoUrl)
      .then(color => {
        if (color && color.hex) {
          colorCache[category.logoUrl] = color.hex;
          setAccentColor(color.hex);
        }
      })
      .catch(() => {
        // Fallback color is already default
      });
  }, [category.logoUrl]);

  return (
    <div key={category.id} className="bg-zinc-900 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col relative border-2 transition-colors duration-500"
         style={{ borderColor: accentColor, boxShadow: `0 0 30px ${accentColor}4D` }}>
      {category.popular && (
        <div className="absolute top-0 right-0 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:px-3 sm:py-1 rounded-bl-lg uppercase tracking-wider z-10 transition-colors duration-500"
             style={{ backgroundColor: accentColor, boxShadow: `0 0 10px ${accentColor}99` }}>
          Popular
        </div>
      )}
      <div className="p-4 sm:p-10 bg-zinc-950/50 text-white flex flex-col items-center text-center">
        <img src={category.logoUrl} alt={category.name} className="w-12 h-12 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl object-cover bg-zinc-950 mb-3 sm:mb-6 border transition-colors duration-500"
             style={{ borderColor: `${accentColor}80`, boxShadow: `0 0 15px ${accentColor}80` }} />
        <h3 className="text-base sm:text-2xl font-semibold mb-1 sm:mb-2 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{category.name}</h3>
        <div className="flex items-baseline drop-shadow-[0_0_8px_rgba(224,0,255,0.4)]">
          <span className="text-2xl sm:text-5xl font-display font-bold tracking-tight">
            ₹{pricingOptions.filter((p: any) => p.category === category.id).sort((a: any,b: any)=>a.price - b.price)[0]?.price || 100}
          </span>
          <span className="text-gray-400 text-[10px] sm:text-base ml-1 sm:ml-2">/ start</span>
        </div>
        <div className="mt-3 sm:mt-4 flex flex-col items-center">
          <div className="flex flex-wrap justify-center gap-1 sm:gap-2">
            {pricingOptions.filter((p: any) => p.category === category.id).some((p: any) => p.stock > 0) ? (
              <div className="flex items-center bg-green-500/10 text-green-500 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-xs font-semibold border border-green-500/30">
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 mr-1 sm:mr-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-green-500"></span>
                </span>
                Keys Available
              </div>
            ) : (
              <div className="flex items-center bg-red-500/10 text-red-500 px-2 sm:px-3 py-1 rounded-full text-[9px] sm:text-xs font-semibold border border-red-500/30">
                <span className="relative flex h-1.5 w-1.5 sm:h-2 sm:w-2 mr-1 sm:mr-1.5">
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 sm:h-2 sm:w-2 bg-red-500"></span>
                </span>
                Out of Stock
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-4 sm:p-10 flex-grow flex flex-col justify-end">
        <button 
          onClick={() => openPurchaseModal(category.id)}
          className="w-full inline-flex items-center justify-center px-2 py-2.5 sm:px-8 sm:py-4 text-xs sm:text-lg font-bold rounded-lg sm:rounded-xl transition-all hover:-translate-y-1 text-white border border-white/20"
          style={{ 
            backgroundColor: accentColor, 
            boxShadow: `0 0 15px ${accentColor}99, inset 0 2px 5px rgba(255,255,255,0.2)`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 0 25px ${accentColor}ff, inset 0 2px 8px rgba(255,255,255,0.4)`;
            e.currentTarget.style.transform = 'translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = `0 0 15px ${accentColor}99, inset 0 2px 5px rgba(255,255,255,0.2)`;
            e.currentTarget.style.transform = 'none';
          }}
        >
          Buy
        </button>
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
  const [paymentStep, setPaymentStep] = useState<'configure' | 'qr' | 'processing' | 'success' | 'wallet_confirm'>('configure');
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
  const [couponError, setCouponError] = useState('');

  const [orderId, setOrderId] = useState('');
  const [paymentUrl, setPaymentUrl] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(300);
  const [isResumedPayment, setIsResumedPayment] = useState(false);

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
    // Cap discount so price is at least ₹1
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

  // If user switches product or duration and the applied coupon is restricted to specific products
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

  // Resume payment flow if pending
  useEffect(() => {
    const pendingStr = localStorage.getItem('pendingPayment');
    if (pendingStr && currentUser) {
      try {
        const pending = JSON.parse(pendingStr);
        // Resume if less than 24 hours old
        if (Date.now() - pending.timestamp < 24 * 60 * 60 * 1000) {
          setSelectedProduct(pending.selectedProduct);
          setSelectedDuration(pending.selectedDuration);
          setQuantity(pending.quantity);
          setOrderId(pending.orderId);
          setIsResumedPayment(true);
          setPaymentStep('qr');
          setTimeLeft(Math.max(0, 300 - Math.floor((Date.now() - pending.timestamp) / 1000)));
        } else {
          localStorage.removeItem('pendingPayment');
        }
      } catch(e) {}
    }
  }, [currentUser]);

  const handleCopy = (key: string, index: number) => {
    navigator.clipboard.writeText(key);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
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
    if (!currentUser) return;
    if (balance < totalPrice) return;
    
    setPaymentError('');
    setPaymentStep('processing');
    
    // Deduct balance (discounted totalPrice) and immediately issue keys
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
            note: `Auto-refund for ${missingCount} unfulfilled key(s) (${resolveProductName(selectedProduct || '', settings.categories, pricingOptions)})`,
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
        } else {
          setPaymentStep('success');
          setGeneratedKeys(keys);
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

  const onPurchaseSuccessRef = useRef(onPurchaseSuccess);
  onPurchaseSuccessRef.current = onPurchaseSuccess;

  const purchaseKeysRef = useRef(purchaseKeys);
  purchaseKeysRef.current = purchaseKeys;

  const addBalanceRef = useRef(addBalance);
  addBalanceRef.current = addBalance;

  // Separate timer effect to avoid re-triggering polling every second
  useEffect(() => {
    if (paymentStep !== 'qr') return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [paymentStep]);

  useEffect(() => {
    if (!orderId || (paymentStep !== 'qr' && paymentStep !== 'processing')) return;
    let isMounted = true;

    const pollPayment = async () => {
      if (!orderId || (paymentStep !== 'qr' && paymentStep !== 'processing') || isVerifying || !isMounted) return;
      
      try {
        if (localStorage.getItem('paymentRedirected') === 'true') {
           localStorage.removeItem('paymentRedirected');
           setPaymentStep('processing');
        }

        const res = await fetch('/api/fampay/verify-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderId })
        });
        
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          return;
        }
        
        // Wait for status 'success', 'paid', or 'PAID' from the webhook/verify endpoint
        const status = (data.status || data.data?.status || '').toString().toLowerCase();
        if (isMounted && (status === 'success' || status === 'paid' || status === 'completed')) {
           setIsVerifying(true);
           setPaymentStep('processing');
           
           const pendingStr = localStorage.getItem('pendingPayment');
           let orderAmount = (selectedDuration?.price || 0) * quantity;
           let orderCoupon: string | undefined = undefined;
           if (pendingStr) {
             try {
               const parsed = JSON.parse(pendingStr);
               if (parsed.amount) orderAmount = parsed.amount;
               if (parsed.couponCode) orderCoupon = parsed.couponCode;
             } catch (e) {}
           }

           const targetUid = currentUser?.uid;

           // Try to generate keys
           let keys: string[] = [];
           if (selectedDuration?.value) {
             try {
               keys = await purchaseKeysRef.current(
                 selectedDuration.value, 
                 quantity, 
                 targetUid, 
                 currentUser?.email || undefined,
                 { amount: orderAmount, couponCode: orderCoupon }
               );
             } catch (err) {
               console.warn('Error purchasing keys:', err);
             }
           }

           // If some or all keys missing due to stock, refund to wallet balance
           if (keys.length < quantity && targetUid) {
             const missingCount = quantity - keys.length;
             const refundPerKey = Math.round(orderAmount / quantity);
             const refundAmt = missingCount * refundPerKey;
             addBalanceRef.current(targetUid, refundAmt, {
               method: 'Auto-Refund (Stock Limit)',
               referenceId: orderId,
               note: `Auto-refund for ${missingCount} unfulfilled key(s) (${resolveProductName(selectedProduct || '', settings.categories, pricingOptions)})`,
               type: 'refund',
               userEmail: currentUser?.email || undefined
             });
           }

           playSuccessSound();
           confetti({
             particleCount: 150,
             spread: 80,
             origin: { y: 0.6 },
             colors: ['#e000ff', '#4ade80', '#ffffff', '#fbbf24']
           });

           if (keys.length > 0) {
             const payload: PurchaseSuccessPayload = {
               keys,
               productName: resolveProductName(selectedProduct || '', settings.categories, pricingOptions),
               durationLabel: selectedDuration?.label || '',
               amount: orderAmount,
               couponCode: orderCoupon,
               date: new Date().toISOString()
             };
             localStorage.setItem('latestReceivedKey', JSON.stringify(payload));
             localStorage.removeItem('pendingPayment');

             closePurchaseModal();
             if (onPurchaseSuccessRef.current) {
               onPurchaseSuccessRef.current(payload);
             } else {
               setPaymentStep('success');
               setGeneratedKeys(keys);
             }
           } else {
             // 0 keys in stock, full amount went to wallet balance
             if (targetUid) {
               addBalanceRef.current(targetUid, orderAmount, {
                 method: 'Auto-Refund (Out of Stock)',
                 referenceId: orderId,
                 note: `Full auto-refund for out-of-stock order #${orderId} (${resolveProductName(selectedProduct || '', settings.categories, pricingOptions)})`,
                 type: 'refund',
                 userEmail: currentUser?.email || undefined
               });
             }
             localStorage.removeItem('pendingPayment');
             closePurchaseModal();
             setPaymentStep('configure');
           }
           return;
        } else if (isMounted && (status === 'error' || status === 'expired' || data.data?.status === 'FAILED')) {
           setPaymentError(data.message || 'Payment verification failed or expired.');
           setPaymentStep('configure');
           localStorage.removeItem('pendingPayment');
           return;
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    };

    pollPayment();
    const interval = setInterval(pollPayment, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [paymentStep, orderId, isVerifying, selectedDuration, quantity, currentUser?.uid, currentUser?.email, selectedProduct]);

  const openPurchaseModal = (productName: string) => {
    if (!currentUser) {
      if (onRequiresLogin) onRequiresLogin();
      return;
    }
    setSelectedProduct(productName);
    const categoryOptions = pricingOptions.filter(p => p.category === productName);
    const inStockOptions = categoryOptions.filter(p => p.stock > 0);
    setSelectedDuration(inStockOptions.length > 0 ? inStockOptions[0] : (categoryOptions[0] || pricingOptions[0]));
    setQuantity(1);
    setPaymentStep('configure');
    setGeneratedKeys([]);
    setUtrNumber('');
    setPaymentError('');
    setOrderId('');
    setPaymentUrl('');
    setQrUrl('');
    setTimeLeft(300);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  const closePurchaseModal = () => {
    setSelectedProduct(null);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponError('');
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
    }
  };

  const handleProceed = async () => {
    setPaymentStep('processing');
    try {
      const res = await fetch('/api/fampay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: totalPrice })
      });
      
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.warn('Backend API not responding with JSON. Attempting direct client-side fetch (Static mode fallback)...');
        try {
          const apiKey = 'fam_b498f3cf06ce60dd253667adc30a6a2b142584cf';
          const directRes = await fetch(`https://famgateway.in/api/create-order.php`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              amount: parseFloat(totalPrice.toString()).toFixed(2),
              redirect_url: window.location.origin + '/success',
              webhook_url: window.location.origin + '/api/fampay/webhook'
            })
          });
          const directText = await directRes.text();
          const extData = JSON.parse(directText);
          data = {
              success: true,
              order_id: extData.data?.order_id || extData.order_id || `txn_${Date.now()}`,
              checkout_url: extData.data?.checkout_url || extData.checkout_url,
              payment_url: extData.data?.checkout_url || extData.data?.upi_intent || extData.payment_url || extData.upi_link,
              qr_url: extData.data?.qr_url || extData.qr_url
          };
        } catch (directErr) {
          console.error('Direct fetch failed:', directErr);
          setPaymentError('Payment Gateway is currently unavailable. Please try again later.');
          setPaymentStep('configure');
          return;
        }
      }
      
      if (data.order_id) {
        setOrderId(data.order_id);
        
        const redirectUrl = data.checkout_url || data.payment_url || `upi://pay?pa=armanbarik@fam&pn=${encodeURIComponent(settings.siteName || 'ARMAN X STORE')}&am=${totalPrice}&cu=INR`;
        setPaymentUrl(redirectUrl);

        if (data.qr_url) {
           setQrUrl(data.qr_url);
        }
        setTimeLeft(300);
        setPaymentStep('qr');

        localStorage.setItem('pendingPayment', JSON.stringify({
          orderId: data.order_id,
          type: 'keys',
          amount: totalPrice,
          userId: currentUser?.uid,
          productName: resolveProductName(selectedProduct || '', settings.categories, pricingOptions),
          categoryId: selectedProduct,
          durationLabel: selectedDuration?.label,
          durationValue: selectedDuration?.value,
          quantity: quantity,
          couponCode: appliedCoupon?.code,
          timestamp: Date.now()
        }));
        
        // Auto redirect
        if (redirectUrl.startsWith('http')) {
          window.open(redirectUrl, '_blank');
        } else {
          window.location.href = redirectUrl;
        }
      } else {
        setPaymentError(data.error || data.message || 'Failed to initialize payment.');
        setPaymentStep('configure');
      }
    } catch (err: any) {
      console.error(err);
      setPaymentError(err.message || 'Failed to initialize payment');
      setPaymentStep('configure');
    }
  };

  const filteredCategories = settings.categories.filter((category) => 
    category.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <section id="pricing" className="py-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto mb-8 relative">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-zinc-500 group-focus-within:text-fuchsia-400 transition-colors" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for products, subscriptions, or services..."
              className="block w-full pl-11 pr-4 py-4 bg-zinc-900/50 border-2 border-zinc-800 rounded-2xl leading-5 bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/50 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.5)] focus:shadow-[0_0_20px_rgba(224,0,255,0.15)] sm:text-lg"
            />
          </div>
        </div>

        {(!isInitialized && filteredCategories.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <Loader2 className="w-12 h-12 animate-spin text-fuchsia-500 mb-4" />
            <p className="text-xl font-medium">Loading store...</p>
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 md:gap-8 max-w-5xl mx-auto">
            {filteredCategories.map((category, index) => {
              const fallbackColors = ['#d946ef', '#06b6d4', '#10b981', '#f59e0b'];
              const fallbackColor = fallbackColors[index % fallbackColors.length];
              return (
                <ProductCard 
                  key={category.id} 
                  category={category} 
                  pricingOptions={pricingOptions} 
                  openPurchaseModal={openPurchaseModal} 
                  fallbackColor={fallbackColor} 
                />
              );
            })}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto text-center py-12 bg-zinc-900/30 rounded-3xl border border-zinc-800/50">
            <Search className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-zinc-300 mb-2">No products found</h3>
            <p className="text-zinc-500">We couldn't find anything matching "{searchQuery}". Try a different term.</p>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closePurchaseModal}></div>
          <div className="relative bg-zinc-950 border border-fuchsia-500/30 shadow-[0_0_30px_rgba(224,0,255,0.2)] rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-fuchsia-500/20">
              <h3 className="text-2xl font-bold text-white font-display drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                {paymentStep === 'configure' && 'Configure Plan'}
                {paymentStep === 'processing' && 'Processing...'}
                {paymentStep === 'success' && 'Success'}
              </h3>
              <button 
                onClick={closePurchaseModal}
                className="text-zinc-400 hover:text-white hover:bg-fuchsia-500/20 transition-all p-2 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {paymentStep === 'configure' && (
              <>
                <div className="p-6 space-y-8">
                  <div>
                    <p className="text-sm font-medium text-zinc-400 mb-1">Selected Product</p>
                    <p className="text-lg font-bold text-fuchsia-400 drop-shadow-[0_0_5px_rgba(224,0,255,0.5)]">
                      {settings.categories.find(c => c.id === selectedProduct)?.name || selectedProduct}
                    </p>
                  </div>

                  {/* Duration Selection */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-3">
                      Select Duration
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                       {pricingOptions.filter(p => p.category === selectedProduct).map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            if (option.stock > 0) {
                              setSelectedDuration(option);
                            }
                          }}
                          disabled={option.stock <= 0}
                          className={`relative overflow-hidden px-4 py-3 border rounded-xl text-sm font-medium transition-all ${
                            option.stock <= 0
                              ? 'border-zinc-800 bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
                              : selectedDuration?.value === option.value
                                ? 'border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-400 shadow-[0_0_10px_rgba(224,0,255,0.2)]'
                                : 'border-zinc-800 text-zinc-400 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span className="block mb-1">{option.label}</span>
                            <span className={`block text-xs ${option.stock <= 0 ? 'text-zinc-600 line-through' : selectedDuration?.value === option.value ? 'text-fuchsia-400' : 'text-zinc-500'}`}>
                              ₹{option.price}
                            </span>
                            {option.stock <= 0 && (
                              <span className="absolute -top-1 -right-2 transform scale-75 text-[10px] uppercase font-bold text-red-400 bg-red-950/50 border border-red-500/30 rounded px-2 py-0.5 mt-2 mr-2">
                                Out of stock
                              </span>
                            )}
                            {option.stock > 0 && (
                              <span className="absolute -top-1 -right-2 transform scale-75 text-[10px] uppercase font-bold text-green-400 bg-green-950/50 border border-green-500/30 rounded px-2 py-0.5 mt-2 mr-2">
                                {option.stock} left
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quantity Selection */}
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-3">
                      Quantity (Keys)
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center border border-zinc-800 rounded-xl bg-zinc-900 overflow-hidden">
                        <button 
                          onClick={() => handleQuantityChange(-1)}
                          disabled={quantity <= 1}
                          className="p-3 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50 transition-colors"
                        >
                          <Minus className="w-5 h-5" />
                        </button>
                        <div className="w-16 text-center font-semibold text-lg text-white">
                          {quantity}
                        </div>
                        <button 
                          onClick={() => handleQuantityChange(1)}
                          disabled={quantity >= 10 || quantity >= (selectedDuration?.stock || 0)}
                          className="p-3 text-zinc-400 hover:bg-zinc-800 hover:text-white disabled:opacity-50 transition-colors"
                        >
                          <Plus className="w-5 h-5" />
                        </button>
                      </div>
                      <span className="text-sm text-gray-500">Max 10 limit</span>
                    </div>
                  </div>

                  {/* Apply Coupon Code (Product Only) */}
                  <div className="pt-4 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                        <Tag className="w-4 h-4 text-fuchsia-400" />
                        Apply Coupon Code
                      </span>
                      {appliedCoupon && (
                        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {appliedCoupon.discountType === 'percentage' ? `${appliedCoupon.discountValue}% OFF` : `₹${appliedCoupon.discountValue} OFF`} Applied
                        </span>
                      )}
                    </div>

                    {appliedCoupon ? (
                      <div className="flex items-center justify-between p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            %
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-bold text-emerald-400 text-sm tracking-wide">{appliedCoupon.code}</span>
                              <span className="text-xs text-zinc-400">({appliedCoupon.description || 'Discount'})</span>
                              {appliedCoupon.expiresAt && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-medium">
                                  <Clock className="w-3 h-3" />
                                  {getCouponRemainingTime(appliedCoupon.expiresAt).text}
                                </span>
                              )}
                              {appliedCoupon.maxUses && appliedCoupon.maxUses > 0 && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/20 px-1.5 py-0.5 rounded font-medium">
                                  <Users className="w-3 h-3" />
                                  {Math.max(0, appliedCoupon.maxUses - (appliedCoupon.usageCount || 0))} left
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-emerald-300/90 font-medium">
                              You saved ₹{discountAmount} on this order!
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="px-2.5 py-1 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors flex items-center gap-1"
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
                            placeholder="Enter coupon code (e.g. DISCOUNT20)"
                            className="flex-1 bg-zinc-900 border border-zinc-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 font-mono tracking-wider"
                          />
                          <button
                            type="button"
                            onClick={handleApplyCoupon}
                            disabled={!couponInput.trim()}
                            className="px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_10px_rgba(224,0,255,0.3)] shrink-0"
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
                
                {/* Purchase Summary & Action */}
                <div className="p-6 bg-zinc-950/50 border-t border-fuchsia-500/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-400 mb-1">Total Amount</p>
                      <div className="flex items-baseline gap-2.5">
                        <p className="text-3xl font-bold font-display text-white">₹{totalPrice}</p>
                        {appliedCoupon && discountAmount > 0 && (
                          <>
                            <span className="text-lg text-zinc-500 line-through">₹{baseTotalPrice}</span>
                            <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                              Saved ₹{discountAmount}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {paymentError && (
                    <div className="bg-red-950/50 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm text-center">
                      {paymentError}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 mt-2">
                    <button 
                      onClick={handleProceed}
                      disabled={!selectedDuration || selectedDuration?.stock <= 0 || quantity > selectedDuration?.stock}
                      className="w-full px-4 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-medium rounded-xl shadow-[0_0_15px_rgba(224,0,255,0.4)] transition-all hover:shadow-[0_0_20px_rgba(224,0,255,0.6)]"
                    >
                      Pay via UPI (QR Code)
                    </button>
                    
                    {currentUser && (
                      <button 
                        onClick={handleProceedWithWallet}
                        disabled={!selectedDuration || selectedDuration?.stock <= 0 || quantity > selectedDuration?.stock || balance < totalPrice}
                        className="w-full px-4 py-4 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-base font-medium rounded-xl border border-zinc-700 transition-all flex items-center justify-center gap-2"
                      >
                        <Wallet className="w-5 h-5 text-fuchsia-400" />
                        Buy with Wallet Balance (₹{balance})
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            {paymentStep === 'wallet_confirm' && (
              <div className="p-6 space-y-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-fuchsia-500/10 text-fuchsia-500 rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(224,0,255,0.3)]">
                  <Wallet className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Confirm Purchase</h4>
                  <p className="text-zinc-400">Are you sure you want to spend <span className="font-bold text-fuchsia-400 drop-shadow-[0_0_5px_rgba(224,0,255,0.5)]">₹{totalPrice}</span> from your wallet balance?</p>
                  {appliedCoupon && (
                    <p className="text-xs text-emerald-400 mt-1 font-medium">Includes coupon discount ({appliedCoupon.code})</p>
                  )}
                  <p className="text-sm text-zinc-500 mt-2">Your current balance is ₹{balance}</p>
                </div>
                
                {paymentError && (
                  <div className="bg-red-950/50 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-2 w-full">
                    {paymentError}
                  </div>
                )}

                <div className="w-full flex gap-3 mt-4">
                  <button
                    onClick={() => setPaymentStep('configure')}
                    className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all font-medium border border-zinc-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmWalletPurchase}
                    className="flex-1 px-4 py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl transition-all shadow-[0_0_15px_rgba(224,0,255,0.4)] hover:shadow-[0_0_20px_rgba(224,0,255,0.6)] font-medium"
                  >
                    Confirm & Buy
                  </button>
                </div>
              </div>
            )}

            {paymentStep === 'qr' && (
              <div className="p-10 space-y-6 flex flex-col items-center text-center">
                <Loader2 className="w-12 h-12 text-fuchsia-500 animate-spin mb-4" />
                <div>
                  <h4 className="text-2xl font-bold text-white mb-2">Redirecting...</h4>
                  <p className="text-zinc-400">Please complete your payment of <span className="font-bold text-fuchsia-400 drop-shadow-[0_0_5px_rgba(224,0,255,0.5)]">₹{totalPrice}</span> on the gateway.</p>
                </div>
                
                <a 
                  href={paymentUrl || `upi://pay?pa=armanbarik@fam&pn=${encodeURIComponent(settings.siteName || 'ARMAN X STORE')}&am=${totalPrice}&cu=INR`}
                  target={paymentUrl?.startsWith('http') ? '_blank' : '_self'}
                  rel="noopener noreferrer"
                  className="mt-6 px-6 py-3 bg-white/5 hover:bg-white/10 text-zinc-300 font-medium rounded-xl transition-all border border-white/10 flex items-center gap-2"
                >
                  Click here if not redirected
                </a>

                <div className="w-full pt-4 space-y-4">
                  <div className="flex items-center justify-center gap-2 text-fuchsia-400 mt-4 animate-pulse">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Waiting for payment... ({Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')})</span>
                  </div>
                  
                  {paymentError && (
                    <div className="bg-red-950/50 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4 text-center">
                      {paymentError}
                    </div>
                  )}


                </div>
              </div>
            )}

            {paymentStep === 'processing' && (
              <div className="p-12 space-y-4 flex flex-col items-center text-center">
                <Loader2 className="w-12 h-12 text-fuchsia-500 animate-spin flex items-center justify-center" style={{ filter: 'drop-shadow(0 0 10px rgba(224,0,255,0.6))' }} />
                <h4 className="text-xl font-bold text-white">Processing...</h4>
                <p className="text-zinc-400">Please wait while we process your request.</p>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="p-6 space-y-6 text-center">
                <div className="w-16 h-16 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-2 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white mb-2">Purchase Successful!</h4>
                  {generatedKeys.length > 0 ? (
                    <div className="bg-green-950/30 border border-green-500/20 p-4 rounded-xl text-left mt-4 shadow-[0_0_10px_rgba(74,222,128,0.1)]">
                      <p className="text-green-400 text-sm mb-3">
                        Your license {generatedKeys.length > 1 ? 'keys have' : 'key has'} been successfully generated:
                      </p>
                      <div className="space-y-2">
                        {generatedKeys.map((key, i) => (
                          <div key={i} className="flex items-center justify-between bg-zinc-900 px-4 py-3 border border-green-500/20 rounded-lg group">
                            <span className="font-mono text-zinc-100 text-sm tracking-widest">{key}</span>
                            <button 
                              onClick={() => handleCopy(key, i)}
                              className="text-zinc-400 hover:text-white hover:bg-zinc-800 p-1.5 rounded-md transition-colors"
                              title="Copy to clipboard"
                            >
                              {copiedIndex === i ? (
                                <Check className="w-4 h-4 text-green-400" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                      
                      {generatedKeys.length < quantity && (
                        <div className="mt-4 p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-amber-300 text-xs">
                          <strong>Note:</strong> You requested {quantity} keys but only {generatedKeys.length} were in stock. The remaining amount has been <strong>refunded to your {settings.siteName || 'ARMAN X STORE'} Wallet</strong>.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-amber-950/30 border border-amber-500/20 p-4 rounded-xl text-left mt-4 text-amber-400 text-sm shadow-[0_0_10px_rgba(251,191,36,0.1)]">
                      <strong className="text-amber-300">Keys out of stock.</strong> Your payment was successful, but there weren't enough license keys available. The paid amount has been <strong>automatically refunded to your {settings.siteName || 'ARMAN X STORE'} Wallet balance</strong>.
                    </div>
                  )}
                </div>

                <div className="w-full pt-4">
                  <button 
                    onClick={() => {
                      closePurchaseModal();
                      if (onPurchaseSuccess) onPurchaseSuccess();
                    }}
                    className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-3.5 rounded-xl transition duration-300 shadow-[0_0_15px_rgba(224,0,255,0.4)]"
                  >
                    View Purchase History
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
