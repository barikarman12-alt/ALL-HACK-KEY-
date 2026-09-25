import { useState, useEffect } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  ArrowLeft, 
  ShieldCheck, 
  HelpCircle, 
  Clock, 
  Sparkles, 
  ShoppingBag, 
  Download, 
  ExternalLink, 
  Send,
  Smartphone
} from 'lucide-react';
import { useInventory, resolveProductName } from '../store';
import { useAuth } from '../lib/useAuth';

export interface KeyReceivedData {
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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  
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

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pt-24 pb-20 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white transition-colors duration-300 theme-section">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10 theme-modal-section">
          <div>
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 px-3.5 py-1.5 rounded-xl transition-colors text-xs sm:text-sm font-semibold mb-2.5 border border-white/10 cursor-pointer theme-pill"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Store
            </button>
            <h1 className="text-2xl sm:text-4xl font-bold font-display text-white tracking-tight flex items-center gap-3 theme-text-title">
              <span>Order Completed</span>
              <span className="text-xs sm:text-sm font-sans font-semibold bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Key Ready
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {onViewKeyHistory && (
              <button
                onClick={onViewKeyHistory}
                className="px-4 py-2 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 text-xs sm:text-sm font-semibold rounded-xl border border-white/10 transition-colors flex items-center gap-2 cursor-pointer theme-pill"
              >
                <Key className="w-4 h-4 text-indigo-400" />
                My Keys History
              </button>
            )}
            <button
              onClick={onBackToHome}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.35)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              Buy More
            </button>
          </div>
        </div>

        {/* 1. TOP SUMMARY CARD */}
        {activeData && (
          <div className="bg-[#121215]/80 border border-white/10 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 backdrop-blur-xl theme-card">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-zinc-400 font-semibold theme-text-sub">Purchased Item</p>
                <h3 className="text-base sm:text-lg font-bold text-white theme-text-title">
                  {resolveProductName(activeData.productName, settings.categories, items)} {activeData.durationLabel ? `• ${activeData.durationLabel}` : ''}
                </h3>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {activeData.amount && (
                <div className="text-xs text-zinc-300 bg-black/50 px-3 py-1.5 rounded-lg border border-white/10 theme-pill">
                  <span>Amount: <strong className="text-white font-mono">₹{activeData.amount}</strong></span>
                </div>
              )}
              {activeData.date && (
                <div className="flex items-center gap-2 text-xs text-zinc-400 bg-black/50 px-3 py-1.5 rounded-lg border border-white/10 theme-pill">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{new Date(activeData.date).toLocaleDateString()} at {new Date(activeData.date).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. APK DOWNLOAD LINK SECTION */}
        <div className="bg-[#121215]/90 border border-indigo-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden theme-card">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/50 border border-indigo-500/30 px-3 py-1 rounded-full theme-pill">
                <Smartphone className="w-3.5 h-3.5" />
                Step 1: Download APK File
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight theme-text-title">
                Official APK Download Link
              </h2>
              <p className="text-zinc-300 text-xs sm:text-sm leading-relaxed theme-text-sub">
                Key use karne ke liye pehle official APK file download karein. Saare latest update files aur tools official Telegram channel par available hain:
              </p>
              <div className="text-xs text-indigo-300 font-mono bg-black/70 px-3 py-2 rounded-xl border border-white/10 inline-block break-all theme-pill">
                {apkDownloadLink}
              </div>
            </div>

            <div className="flex-shrink-0">
              <a
                href={apkDownloadLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm sm:text-base rounded-2xl shadow-[0_0_25px_rgba(99,102,241,0.45)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Download className="w-5 h-5 animate-bounce" />
                <span>Download APK File</span>
                <ExternalLink className="w-4 h-4 opacity-80" />
              </a>
            </div>
          </div>
        </div>

        {/* 3. YOUR KEY SECTION */}
        <div className="bg-[#121215]/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl space-y-6 theme-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 theme-modal-section">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-block mb-1">
                Step 2: Copy License Key
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2 theme-text-title">
                <span>YOUR KEY 🗝️🔐</span>
              </h2>
            </div>
            
            {activeData && activeData.keys.length > 1 && (
              <button
                onClick={handleCopyAll}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                {allCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {allCopied ? 'All Keys Copied!' : `Copy All (${activeData.keys.length}) Keys`}
              </button>
            )}
          </div>

          {/* Keys list */}
          {activeData && activeData.keys.length > 0 ? (
            <div className="space-y-3">
              {activeData.keys.map((key, index) => {
                const isCopied = copiedIndex === index;
                return (
                  <div 
                    key={index}
                    className="bg-black/60 border border-white/10 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.4)] group hover:border-emerald-500/50 transition-colors theme-pill"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-xl bg-emerald-950/60 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                        <Key className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[10px] sm:text-[11px] text-zinc-400 uppercase font-semibold tracking-wider theme-text-sub">
                          License Key {activeData.keys.length > 1 ? `#${index + 1}` : ''}
                        </p>
                        <p className="font-mono text-base sm:text-xl font-bold text-emerald-400 tracking-wider break-all select-all">
                          {key}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopySingle(key, index)}
                      className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer flex-shrink-0 ${
                        isCopied 
                          ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Copied! 🗝️</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-black/60 border border-white/10 rounded-xl p-8 text-center space-y-3 theme-pill">
              <Key className="w-10 h-10 text-zinc-500 mx-auto" />
              <p className="text-zinc-400 font-medium theme-text-sub">No active key found in current session.</p>
              <button
                onClick={onBackToHome}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl font-medium text-xs sm:text-sm transition-all cursor-pointer shadow-[0_0_15px_rgba(99,102,241,0.3)]"
              >
                Go to Store to Purchase
              </button>
            </div>
          )}
        </div>

        {/* 4. DESCRIPTION & ACTIVATION GUIDE SECTION */}
        <div className="bg-[#121215]/80 border border-white/10 rounded-3xl p-6 sm:p-7 space-y-6 backdrop-blur-xl theme-card">
          <div className="flex items-center gap-2.5 pb-3 border-b border-white/10 theme-modal-section">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight theme-text-title">
              Description & How to Use Key
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-black/50 p-4 rounded-2xl border border-white/10 space-y-2 theme-pill">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h4 className="font-semibold text-white text-sm theme-text-title">APK Install Karein</h4>
              <p className="text-xs text-zinc-400 leading-relaxed theme-text-sub">
                Upar diye gaye <strong>Download APK File</strong> button par click karke Telegram channel se official APK download karein aur phone me install karein.
              </p>
            </div>

            <div className="bg-black/50 p-4 rounded-2xl border border-white/10 space-y-2 theme-pill">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h4 className="font-semibold text-white text-sm theme-text-title">Key Paste Karein</h4>
              <p className="text-xs text-zinc-400 leading-relaxed theme-text-sub">
                App open karne ke baad license box me upar se copy ki hui <strong>YOUR KEY 🗝️🔐</strong> ko paste karein aur Login button dabayein.
              </p>
            </div>

            <div className="bg-black/50 p-4 rounded-2xl border border-white/10 space-y-2 theme-pill">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h4 className="font-semibold text-white text-sm theme-text-title">Enjoy VIP Access</h4>
              <p className="text-xs text-zinc-400 leading-relaxed theme-text-sub">
                Key activate hote hi aapka VIP access start ho jayega. Key ko kisi aur ke saath share na karein taaki lock na ho.
              </p>
            </div>
          </div>

          {/* Support Telegram Box */}
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 theme-pill">
            <div className="flex items-center gap-3">
              <Send className="w-5 h-5 text-sky-400 shrink-0" />
              <div className="text-xs">
                <span className="text-white font-semibold block theme-text-title">24/7 VIP Customer Support</span>
                <span className="text-zinc-400 theme-text-sub">Kisi bhi help ya setup ke liye directly connect karein: @FATHERXSIR</span>
              </div>
            </div>
            <a
              href="https://t.me/FATHERXSIR"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 cursor-pointer"
            >
              Contact Support
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
