import { Check, X, Minus, Plus, QrCode, Loader2, Key } from 'lucide-react';
import { useState, useEffect, SVGProps } from 'react';
import { useInventory } from '../store';
import { useAuth } from '../lib/useAuth';

interface PricingProps {
  onPurchaseSuccess?: () => void;
}

export function Pricing({ onPurchaseSuccess }: PricingProps) {
  const { currentUser } = useAuth();
  const { items: pricingOptions, purchaseKeys, settings } = useInventory(currentUser?.uid);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState(pricingOptions[0]);
  const [quantity, setQuantity] = useState(1);
  const [paymentStep, setPaymentStep] = useState<'configure' | 'qr' | 'processing' | 'success'>('configure');
  const [generatedKeys, setGeneratedKeys] = useState<string[]>([]);
  const [utrNumber, setUtrNumber] = useState('');
  const [paymentError, setPaymentError] = useState('');

  const openPurchaseModal = (productName: string) => {
    setSelectedProduct(productName);
    const categoryOptions = pricingOptions.filter(p => p.category === productName);
    const inStockOptions = categoryOptions.filter(p => p.stock > 0);
    setSelectedDuration(inStockOptions.length > 0 ? inStockOptions[0] : (categoryOptions[0] || pricingOptions[0]));
    setQuantity(1);
    setPaymentStep('configure');
    setGeneratedKeys([]);
    setUtrNumber('');
    setPaymentError('');
  };

  const closePurchaseModal = () => {
    setSelectedProduct(null);
  };

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= 10 && newQuantity <= (selectedDuration?.stock || 0)) {
      setQuantity(newQuantity);
    }
  };

  const handleProceed = () => {
    setPaymentStep('qr');
  };

  const handleCheckPayment = () => {
    if (utrNumber.length !== 12 || !/^\d+$/.test(utrNumber)) {
      setPaymentError('Payment not verified. Please enter a valid 12-digit UTR/Reference number.');
      return;
    }
    setPaymentError('');
    setPaymentStep('processing');
    
    setTimeout(async () => {
      // In a real application, you would send this UTR number to your backend server
      // and verify it against a payment gateway API (like Razorpay, PhonePe, or Cashfree)
      // to ensure the transaction is real and matches the exact amount. 
      // Since this is a UI prototype without a backend, we reject all UTRs except our mock one.

      if (utrNumber === '123456789012') {
        const purchased = await purchaseKeys(selectedDuration.value, quantity, currentUser?.uid, currentUser?.email || undefined);
        setGeneratedKeys(purchased);
        setPaymentStep('success');
        
        // Auto-redirect to purchase history where they can view the keys
        setTimeout(() => {
          closePurchaseModal();
          if (onPurchaseSuccess) {
            onPurchaseSuccess();
          }
        }, 2000);
      } else {
        // Reject fake/random UTRs
        setPaymentStep('qr');
        setPaymentError('Payment verification failed. No valid transaction found for this UTR number. If you just paid, please wait 2-3 minutes and try again.');
      }
    }, 2500); 
  };

  const totalPrice = selectedDuration.price * quantity;

  return (
    <section id="pricing" className="py-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {settings.categories.map((category) => (
            <div key={category.id} className={`bg-zinc-900 rounded-3xl overflow-hidden flex flex-col relative ${
              category.theme === 'dark' ? 'border-2 border-fuchsia-500 shadow-[0_0_30px_rgba(224,0,255,0.3)]' : 'border border-fuchsia-500/20 shadow-[0_0_15px_rgba(224,0,255,0.1)]'
            }`}>
              {category.popular && (
                <div className="absolute top-0 right-0 bg-fuchsia-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider shadow-[0_0_10px_rgba(224,0,255,0.6)]">
                  Most Popular
                </div>
              )}
              <div className="p-8 sm:p-10 bg-zinc-950/50 text-white flex flex-col items-center text-center">
                <img src={category.logoUrl} alt={category.name} className="w-24 h-24 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.5)] border border-fuchsia-500/50 mb-6 object-cover bg-zinc-950" />
                <h3 className="text-2xl font-semibold mb-2 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{category.name}</h3>
                <p className="text-zinc-400 mb-6">{category.theme === 'dark' ? 'Maximum performance and ultimate control.' : 'Perfect for standard devices.'}</p>
                <div className="flex items-baseline drop-shadow-[0_0_8px_rgba(224,0,255,0.4)]">
                  <span className="text-5xl font-display font-bold tracking-tight">
                    ₹{pricingOptions.filter(p => p.category === category.id).sort((a,b)=>a.price - b.price)[0]?.price || 100}
                  </span>
                  <span className="text-gray-400 ml-2">/ starting</span>
                </div>
                <div className="mt-4 flex flex-col items-center">
                  <div className="flex flex-wrap justify-center gap-2">
                    {pricingOptions.filter(p => p.category === category.id).some(p => p.stock > 0) ? (
                      <div className="flex items-center bg-green-500/10 text-green-500 px-3 py-1 rounded-full text-xs font-semibold border border-green-500/30">
                        <span className="relative flex h-2 w-2 mr-1.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        Keys Available Now
                      </div>
                    ) : (
                      <div className="flex items-center bg-red-500/10 text-red-500 px-3 py-1 rounded-full text-xs font-semibold border border-red-500/30">
                        <span className="relative flex h-2 w-2 mr-1.5">
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Currently Out of Stock
                      </div>
                    )}
                  </div>
                  <p className="text-gray-400 text-xs mt-2 font-medium">Restock Days: Mon, Wed, Fri</p>
                </div>
              </div>
              
              <div className="p-8 sm:p-10 flex-grow flex flex-col">
                <ul className="space-y-4 mb-8 flex-grow">
                  {[
                    `Full access to ${category.name} features`,
                    category.theme === 'dark' ? 'Advanced system-level modifications' : 'Standard performance optimization',
                    category.theme === 'dark' ? 'Priority VIP customer support' : 'Flexible duration options',
                    'Safe & secure bypassing',
                    '24/7 dedicated support team'
                  ].map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <div className="flex-shrink-0">
                        <Check className={`h-6 w-6 ${category.theme === 'dark' ? 'text-purple-600' : 'text-green-500'}`} />
                      </div>
                      <p className="ml-3 text-base text-gray-700">{feature}</p>
                    </li>
                  ))}
                </ul>
                
                <button 
                  onClick={() => openPurchaseModal(category.id)}
                  className={`w-full inline-flex items-center justify-center px-8 py-4 text-lg font-medium rounded-xl transition-all hover:-translate-y-1 ${
                    category.theme === 'dark' ? 'text-white bg-fuchsia-600 hover:bg-fuchsia-500 shadow-[0_0_20px_rgba(224,0,255,0.4)] hover:shadow-[0_0_25px_rgba(224,0,255,0.6)]' : 'text-zinc-100 bg-zinc-800 border border-fuchsia-500/30 hover:border-fuchsia-500'
                  }`}
                >
                  Buy {category.name}
                </button>
                {category.theme === 'dark' && (
                  <p className="text-center text-sm text-zinc-500 mt-4 flex items-center justify-center">
                    Secured by Stripe <ShieldCheckIcon className="w-4 h-4 ml-1" />
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Purchase Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={closePurchaseModal}></div>
          <div className="relative bg-zinc-950 border border-fuchsia-500/30 shadow-[0_0_30px_rgba(224,0,255,0.2)] rounded-3xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-fuchsia-500/20">
              <h3 className="text-2xl font-bold text-white font-display drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                {paymentStep === 'configure' && 'Configure Plan'}
                {paymentStep === 'qr' && 'Complete Payment'}
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
                              if (quantity > option.stock) setQuantity(option.stock);
                            }
                          }}
                          disabled={option.stock <= 0}
                          className={`relative overflow-hidden px-4 py-3 border rounded-xl text-sm font-medium transition-all ${
                            option.stock <= 0
                              ? 'border-zinc-800 bg-zinc-900/50 text-zinc-600 cursor-not-allowed'
                              : selectedDuration.value === option.value
                                ? 'border-fuchsia-500 bg-fuchsia-500/10 text-fuchsia-400 shadow-[0_0_10px_rgba(224,0,255,0.2)]'
                                : 'border-zinc-800 text-zinc-400 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5'
                          }`}
                        >
                          <div className="flex flex-col items-center justify-center">
                            <span className="block mb-1">{option.label}</span>
                            <span className={`block text-xs ${option.stock <= 0 ? 'text-zinc-600 line-through' : selectedDuration.value === option.value ? 'text-fuchsia-400' : 'text-zinc-500'}`}>
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
                </div>
                
                {/* Purchase Summary & Action */}
                <div className="p-6 bg-zinc-950/50 border-t border-fuchsia-500/20 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-400 mb-1">Total Amount</p>
                    <p className="text-3xl font-bold font-display text-white">₹{totalPrice}</p>
                  </div>
                  <button 
                    onClick={handleProceed}
                    disabled={!selectedDuration || selectedDuration.stock <= 0 || quantity > selectedDuration.stock}
                    className="px-8 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-lg font-medium rounded-xl shadow-[0_0_15px_rgba(224,0,255,0.4)] transition-all hover:shadow-[0_0_20px_rgba(224,0,255,0.6)] hover:-translate-y-0.5"
                  >
                    Proceed
                  </button>
                </div>
              </>
            )}

            {paymentStep === 'qr' && (
              <div className="p-6 space-y-6 flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-fuchsia-500/10 text-fuchsia-500 rounded-full flex items-center justify-center mb-2 shadow-[0_0_15px_rgba(224,0,255,0.3)]">
                  <QrCode className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-2">Scan & Pay</h4>
                  <p className="text-zinc-400">Scan the QR code below with any UPI app to pay <span className="font-bold text-fuchsia-400 drop-shadow-[0_0_5px_rgba(224,0,255,0.5)]">₹{totalPrice}</span></p>
                </div>
                
                <div className="bg-white p-4 border-2 border-fuchsia-500/50 rounded-2xl shadow-[0_0_20px_rgba(224,0,255,0.4)] inline-block">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=armanbarik@fam&pn=${selectedProduct || 'DRIPCLINT'}&am=${totalPrice}&cu=INR`)}`}
                    alt="UPI QR Code"
                    className="w-48 h-48"
                  />
                </div>
                <div className="text-sm text-zinc-400 max-w-xs">
                  UPI ID: <span className="font-mono text-zinc-200 bg-zinc-800 px-2 py-1 rounded">armanbarik@fam</span>
                </div>

                <div className="w-full pt-4 space-y-4">
                  <div className="text-left">
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Enter 12-digit UTR / Reference Number
                    </label>
                    <input 
                      type="text" 
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value)}
                      placeholder="e.g. 123456789012"
                      className={`w-full px-4 py-3 bg-zinc-900 text-white placeholder-zinc-600 border ${paymentError ? 'border-red-500 focus:ring-red-500' : 'border-zinc-700 focus:border-fuchsia-500 focus:ring-fuchsia-500/20'} rounded-xl focus:ring-2 outline-none transition-all`}
                      maxLength={12}
                    />
                    {paymentError && <p className="text-sm text-red-400 mt-2">{paymentError}</p>}
                    <p className="text-xs text-zinc-500 mt-2">
                      * Demo Mode: Use UTR <span className="font-mono bg-zinc-800 px-1 py-0.5 rounded text-zinc-300">123456789012</span> to test a successful purchase. Real verifications require a payment gateway backend.
                    </p>
                  </div>

                  <button 
                    onClick={handleCheckPayment}
                    className="w-full px-6 py-4 bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-lg font-medium rounded-xl shadow-[0_0_15px_rgba(224,0,255,0.4)] hover:shadow-[0_0_20px_rgba(224,0,255,0.6)] transition-all flex items-center justify-center"
                  >
                    Check Payment
                  </button>
                </div>
              </div>
            )}

            {paymentStep === 'processing' && (
              <div className="p-12 space-y-4 flex flex-col items-center text-center">
                <Loader2 className="w-12 h-12 text-fuchsia-500 animate-spin flex items-center justify-center" style={{ filter: 'drop-shadow(0 0 10px rgba(224,0,255,0.6))' }} />
                <h4 className="text-xl font-bold text-white">Checking Payment...</h4>
                <p className="text-zinc-400">Please do not close this window.</p>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="p-6 space-y-6 text-center">
                <div className="w-16 h-16 bg-green-500/10 text-green-400 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-2 shadow-[0_0_15px_rgba(74,222,128,0.2)]">
                  <Check className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-2xl font-bold text-white mb-2">Payment Successful!</h4>
                  {generatedKeys.length > 0 ? (
                    <div className="bg-green-950/30 border border-green-500/20 p-4 rounded-xl text-left mt-4 shadow-[0_0_10px_rgba(74,222,128,0.1)]">
                      <p className="text-green-400 text-sm mb-3">
                        Your license {generatedKeys.length > 1 ? 'keys have' : 'key has'} been successfully generated:
                      </p>
                      <div className="space-y-2">
                        {generatedKeys.map((key, i) => (
                          <div key={i} className="flex items-center justify-between bg-zinc-900 px-4 py-3 border border-green-500/20 rounded-lg">
                            <span className="font-mono text-zinc-100 text-sm tracking-widest">{key}</span>
                            <Key className="w-4 h-4 text-green-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-950/30 border border-amber-500/20 p-4 rounded-xl text-left mt-4 text-amber-400 text-sm shadow-[0_0_10px_rgba(251,191,36,0.1)]">
                      <strong className="text-amber-300">Currently out of stock.</strong> We have received your payment, but license keys are temporarily out of stock. We will manually add your keys to your order later.
                    </div>
                  )}
                </div>

                <div className="w-full pt-4">
                  <p className="text-zinc-400 flex items-center justify-center text-sm">
                    <Loader2 className="w-4 h-4 text-fuchsia-500 animate-spin mr-2" />
                    Redirecting to your keys...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ShieldCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
