import { useState, useEffect } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  ArrowLeft, 
  ShieldCheck, 
  Download, 
  ExternalLink, 
  ShoppingBag,
  Clock,
  Sparkles,
  ChevronRight,
  Terminal,
  Layers,
  Send,
  Smartphone
} from 'lucide-react';
import { useInventory, resolveProductName, useSpinBalance } from '../store';
import { useAuth } from '../lib/useAuth';
import { SpinWheelModal } from './SpinWheelModal';
import { Helmet } from './Helmet';
import { Gift } from 'lucide-react';

export interface KeyReceivedData {
  key?: string;
  keys: string[];
  productName?: string;
  durationLabel?: string;
  amount?: number;
  date?: string;
  orderId?: string;
}

interface KeyReceivedPageProps {
  data?: KeyReceivedData | null;
  onBackToHome: () => void;
  onViewKeyHistory?: () => void;
}

export function KeyReceivedPage({ data, onBackToHome, onViewKeyHistory }: KeyReceivedPageProps) {
  const { currentUser } = useAuth();
  const { purchases, settings, items } = useInventory(currentUser?.uid, currentUser?.email || undefined);
  const { spinBalance, countdown } = useSpinBalance(currentUser?.uid);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [showSpinModal, setShowSpinModal] = useState(false);
  
  const apkDownloadLink = "https://t.me/allfileupdatehack";

  // Resolve the active key data: prioritize passed props, then localStorage, then latest purchase from store
  const [activeData, setActiveData] = useState<KeyReceivedData | null>(() => {
    if (data && data.keys && data.keys.length > 0) {
      return data;
    }
    const saved = localStorage.getItem('latestReceivedKey');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.keys && parsed.keys.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return null;
  });

  useEffect(() => {
    if (data && data.keys && data.keys.length > 0) {
      setActiveData(data);
      localStorage.setItem('latestReceivedKey', JSON.stringify(data));
    } else if (!activeData && purchases && purchases.length > 0) {
      const latest = purchases[0];
      const fallbackData: KeyReceivedData = {
        keys: latest.keys,
        productName: resolveProductName(latest.category, settings.categories, items),
        durationLabel: latest.label,
        date: latest.date,
        amount: latest.amount,
        orderId: latest.id
      };
      setActiveData(fallbackData);
    }
  }, [data, purchases, settings.categories, items]);

  useEffect(() => {
    if (activeData && activeData.productName && /^category_/i.test(activeData.productName)) {
      const resolved = resolveProductName(activeData.productName, settings.categories, items);
      if (resolved !== activeData.productName) {
        const updated = { ...activeData, productName: resolved };
        setActiveData(updated);
        try {
          localStorage.setItem('latestReceivedKey', JSON.stringify(updated));
        } catch (e) {}
      }
    }
  }, [activeData, settings.categories, items]);

  const handleCopySingle = (key: string, index: number) => {
    navigator.clipboard.writeText(key);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2500);
  };

  const handleCopyAll = () => {
    if (!activeData || activeData.keys.length === 0) return;
    navigator.clipboard.writeText(activeData.keys.join('\n'));
    setAllCopied(true);
    setTimeout(() => setAllCopied(false), 2500);
  };

  const keyCount = activeData?.keys?.length || 0;
  const productName = resolveProductName(activeData?.productName, settings.categories, items);
  const formattedDate = activeData?.date 
    ? new Date(activeData.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#050508] text-zinc-100 selection:bg-purple-500/30 selection:text-purple-200 relative overflow-hidden flex flex-col justify-between pt-20 pb-16 px-4 sm:px-6">
      <Helmet 
        title={`Key Received - ${settings?.siteName || 'Arman X Store'}`}
        description={`Your VIP digital activation license key is ready to copy on ${settings?.siteName || 'Arman X Store'}. Instant delivery completed.`}
      />
      
      {/* Background Ambient Glow Accents */}
      <div className="pointer-events-none fixed inset-0 z-0">
        {/* Top-Right Neon Purple Glow */}
        <div className="absolute -top-32 -right-32 w-96 h-96 sm:w-[520px] sm:h-[520px] bg-purple-600/15 rounded-full blur-[120px]" />
        {/* Bottom-Left Subtle Emerald Glow */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 sm:w-[500px] sm:h-[500px] bg-emerald-500/10 rounded-full blur-[130px]" />
        {/* Center Subtle Violet Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-600/10 rounded-full blur-[100px]" />
        {/* Micro Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <div className="relative z-10 max-w-xl mx-auto w-full space-y-5">
        
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={onBackToHome}
            className="group inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] transition-all cursor-pointer backdrop-blur-md"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Store</span>
          </button>

          <div className="flex items-center gap-2">
            {onViewKeyHistory && (
              <button
                onClick={onViewKeyHistory}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] transition-all cursor-pointer backdrop-blur-md"
              >
                <Key className="w-3 h-3 text-purple-400" />
                <span>History</span>
              </button>
            )}
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-300 hover:text-white px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 transition-all cursor-pointer backdrop-blur-md"
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Catalog</span>
            </button>
          </div>
        </div>

        {/* Main Glassmorphism Delivery Card */}
        <div className="relative bg-[#0c0c12]/80 backdrop-blur-2xl border border-white/[0.09] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.7)] space-y-6 overflow-hidden">
          
          {/* Subtle Top Border Gradient Accent */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />
          
          {/* Header Status & Order Meta */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[11px] font-semibold tracking-wide uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
                <span>Order Completed</span>
              </div>

              {activeData?.orderId && (
                <span className="text-[11px] font-mono text-zinc-500 bg-white/[0.02] border border-white/[0.06] px-2.5 py-0.5 rounded-md">
                  #{activeData.orderId.slice(-8).toUpperCase()}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white font-display">
                {productName}
              </h1>
              <div className="flex items-center gap-3 text-xs text-zinc-400 font-normal">
                {activeData?.durationLabel && (
                  <span className="text-purple-300 font-medium">{activeData.durationLabel}</span>
                )}
                {activeData?.durationLabel && <span className="text-zinc-600">•</span>}
                {activeData?.amount !== undefined && (
                  <span className="font-mono text-zinc-200">₹{activeData.amount}</span>
                )}
                <span className="text-zinc-600">•</span>
                <span className="text-zinc-500">{formattedDate}</span>
              </div>
            </div>
          </div>

          {/* License Key Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium uppercase tracking-wider text-[10px]">
                {keyCount > 1 ? `License Keys (${keyCount})` : 'License Key'}
              </span>
              {keyCount > 1 && (
                <button
                  onClick={handleCopyAll}
                  className="text-[11px] text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {allCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{allCopied ? 'All Copied' : 'Copy All'}</span>
                </button>
              )}
            </div>

            {/* Keys Display Box */}
            {activeData && activeData.keys && activeData.keys.length > 0 ? (
              <div className="space-y-2.5">
                {activeData.keys.map((licenseKey, index) => {
                  const isCopied = copiedIndex === index;
                  return (
                    <div 
                      key={index}
                      className="group relative flex items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl bg-[#07070b]/90 border border-white/[0.08] hover:border-purple-500/40 transition-all duration-200 shadow-inner"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                          <Terminal className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm sm:text-base font-semibold text-emerald-400 tracking-wider truncate select-all">
                            {licenseKey}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleCopySingle(licenseKey, index)}
                        className={`shrink-0 inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                          isCopied 
                            ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                            : 'bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white border border-white/[0.1]'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Copy Key</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-2xl bg-[#07070b]/90 border border-white/[0.08] text-center space-y-2">
                <p className="text-xs text-zinc-500">No active license found in current session.</p>
                <button
                  onClick={onBackToHome}
                  className="text-xs text-purple-400 hover:underline font-medium"
                >
                  Return to Store Catalog
                </button>
              </div>
            )}
          </div>

          {/* Daily Free Lucky Spin Banner */}
          <div className={`relative overflow-hidden rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 ${
            spinBalance > 0
              ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.15)]'
              : 'bg-zinc-900/60 border-zinc-800'
          }`}>
            <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
              <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${
                spinBalance > 0
                  ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-zinc-800/80 border-zinc-700 text-zinc-500'
              }`}>
                <Gift className={`w-6 h-6 ${spinBalance > 0 ? 'text-amber-400 animate-bounce' : 'text-zinc-500'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] uppercase tracking-wider ${
                    spinBalance > 0 ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}>
                    {spinBalance > 0 ? '1 Free Available' : 'Daily Spin Used'}
                  </span>
                  <span className="text-xs text-amber-300 font-semibold">24h Free Lucky Spin</span>
                </div>
                <h3 className="text-white font-bold text-sm sm:text-base mt-0.5">
                  {spinBalance > 0 ? '🎡 Try Your Daily Free Lucky Wheel Spin!' : '⏰ Aaj Ka Daily Spin Use Ho Chuka Hai'}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {spinBalance > 0 
                    ? 'Har 24 ghante (roz 12:01 AM) me 1 free spin milta hai. Wheel ghumayein aur next key order par discounts jeetein!'
                    : `Har 24 ghante me ek baar spin milta hai. Agla spin 12:01 AM pe unlock hoga (Next reset: ${countdown}).`
                  }
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowSpinModal(true)}
              className={`w-full sm:w-auto shrink-0 px-5 py-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                spinBalance > 0
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.35)]'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{spinBalance > 0 ? 'Spin Wheel Now' : 'Check Spin Status'}</span>
            </button>
          </div>

          {/* Primary Action Button: Download Application */}
          <div className="pt-2">
            <a
              href={apkDownloadLink}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group w-full flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:via-indigo-500 hover:to-purple-500 text-white font-medium text-sm sm:text-base shadow-[0_0_30px_rgba(147,51,234,0.35)] hover:shadow-[0_0_40px_rgba(147,51,234,0.5)] transition-all duration-200 cursor-pointer overflow-hidden active:scale-[0.99]"
            >
              <Download className="w-4 h-4 text-purple-200 transition-transform group-hover:translate-y-0.5" />
              <span className="tracking-wide">Download Application</span>
              <ExternalLink className="w-3.5 h-3.5 text-purple-200/70 ml-1" />
            </a>
          </div>

          {/* Quick Setup Checklist */}
          <div className="pt-2 border-t border-white/[0.07] space-y-3">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instant Activation Guide</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left">
              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                <span className="text-[10px] font-mono text-purple-400">01</span>
                <p className="text-xs font-medium text-zinc-200">Download App</p>
                <p className="text-[11px] text-zinc-500 leading-normal">Get the latest build file</p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                <span className="text-[10px] font-mono text-emerald-400">02</span>
                <p className="text-xs font-medium text-zinc-200">Paste License</p>
                <p className="text-[11px] text-zinc-500 leading-normal">Enter key during login</p>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-1">
                <span className="text-[10px] font-mono text-indigo-400">03</span>
                <p className="text-xs font-medium text-zinc-200">Access Granted</p>
                <p className="text-[11px] text-zinc-500 leading-normal">VIP access unlocked</p>
              </div>
            </div>
          </div>

        </div>

        {/* Minimal VIP Support Link Footer */}
        <div className="flex items-center justify-between px-3 text-xs text-zinc-500">
          <span className="text-[11px]">Need assistance with setup?</span>
          <a
            href="https://t.me/FATHERXSIR"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] text-zinc-400 hover:text-purple-300 transition-colors"
          >
            <Send className="w-3 h-3 text-purple-400" />
            <span>Support Channel</span>
          </a>
        </div>

      </div>

      {showSpinModal && (
        <SpinWheelModal 
          isOpen={showSpinModal} 
          onClose={() => setShowSpinModal(false)} 
          onNavigateToBuyKey={onBackToHome} 
        />
      )}
    </div>
  );
}
