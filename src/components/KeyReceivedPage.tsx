import { useState, useEffect } from 'react';
import { 
  Key, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  ArrowLeft, 
  Send, 
  ShieldCheck, 
  Smartphone, 
  AlertCircle,
  HelpCircle,
  Clock,
  Sparkles,
  ShoppingBag
} from 'lucide-react';
import { useInventory, resolveProductName } from '../store';
import { useAuth } from '../lib/useAuth';
import { InstallAppButton } from './InstallAppButton';

export interface KeyReceivedData {
  keys: string[];
  productName?: string;
  durationLabel?: string;
  amount?: number;
  date?: string;
}

interface KeyReceivedPageProps {
  data?: KeyReceivedData | null;
  onBackToHome: () => void;
}

export function KeyReceivedPage({ data, onBackToHome }: KeyReceivedPageProps) {
  const { currentUser } = useAuth();
  const { purchases, settings, items } = useInventory(currentUser?.uid);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  
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
      // Pick latest purchase if no explicit active data
      const latest = purchases[0];
      const fallbackData: KeyReceivedData = {
        keys: latest.keys,
        productName: resolveProductName(latest.category, settings.categories, items),
        durationLabel: latest.label,
        date: latest.date
      };
      setActiveData(fallbackData);
    }
  }, [data, purchases, settings.categories, items]);

  // Auto-normalize any raw category IDs stored in previous sessions to the real product name
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

  const apkLink = "https://t.me/allfileupdatehack";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pt-24 pb-20 px-4 sm:px-6 lg:px-8 selection:bg-fuchsia-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-zinc-900 px-3 py-1.5 rounded-lg transition-colors text-sm font-medium mb-2 border border-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Store
            </button>
            <h1 className="text-3xl sm:text-4xl font-bold font-display text-white tracking-tight flex items-center gap-3">
              <span>Order Completed</span>
              <span className="text-xs sm:text-sm font-sans font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" />
                Key Ready
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <InstallAppButton variant="header" siteName={settings.siteName} />
            <button
              onClick={onBackToHome}
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-sm font-medium rounded-xl border border-zinc-800 transition-colors flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-fuchsia-400" />
              Buy More
            </button>
          </div>
        </div>

        {/* Top Product Summary if available */}
        {activeData && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">Product Name</p>
                <h3 className="text-lg font-bold text-white">
                  {resolveProductName(activeData.productName, settings.categories, items)} {activeData.durationLabel ? `• ${activeData.durationLabel}` : ''}
                </h3>
              </div>
            </div>
            {activeData.date && (
              <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800/80">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>{new Date(activeData.date).toLocaleDateString()} at {new Date(activeData.date).toLocaleTimeString()}</span>
              </div>
            )}
          </div>
        )}

        {/* SECTION 1: APK FILE LINK */}
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border-2 border-fuchsia-500/40 rounded-2xl p-6 sm:p-7 shadow-[0_0_25px_rgba(224,0,255,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-fuchsia-400 bg-fuchsia-500/10 border border-fuchsia-500/30 px-3 py-1 rounded-full">
                <Smartphone className="w-3.5 h-3.5" />
                Step 1: Download Required App
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                1. Apk File Link
              </h2>
              <p className="text-zinc-300 text-sm sm:text-base leading-relaxed">
                Key use karne ke liye pehle official APK file download karein. Saare latest update files aur updates hamare official Telegram channel par available hain:
              </p>
              <div className="text-xs text-zinc-400 font-mono bg-zinc-950/80 px-3 py-1.5 rounded-lg border border-zinc-800 inline-block break-all">
                {apkLink}
              </div>
            </div>

            <div className="flex-shrink-0">
              <a
                href={apkLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-base rounded-xl shadow-[0_0_25px_rgba(224,0,255,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <Download className="w-5 h-5 animate-bounce" />
                <span>Download APK File</span>
                <ExternalLink className="w-4 h-4 opacity-80" />
              </a>
            </div>
          </div>
        </div>

        {/* BONUS: INSTALL STORE APP / CREATE SHORTCUT */}
        <div className="bg-zinc-900/80 border border-fuchsia-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(224,0,255,0.08)]">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 p-1 flex items-center justify-center flex-shrink-0">
              <img src="/pwa-192x192.png" alt="App Icon" className="w-full h-full object-cover rounded-lg" onError={(e) => {
                (e.target as HTMLImageElement).src = '/icon.svg';
              }} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Install {settings.siteName || 'ARMAN X STORE'} App</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40 px-2 py-0.5 rounded-full">
                  Fast 1-Tap
                </span>
              </h3>
              <p className="text-xs text-zinc-400">
                Apne mobile home screen par app icon add karein taaki direct 1-tap me access mile!
              </p>
            </div>
          </div>

          <div className="flex-shrink-0 w-full sm:w-auto">
            <InstallAppButton variant="card" siteName={settings.siteName} className="w-full sm:w-auto !py-2.5 !px-4" />
          </div>
        </div>

        {/* SECTION 2: KEY BOX (YOUR KEY 🗝️🔐) */}
        <div className="bg-zinc-900 border-2 border-emerald-500/40 rounded-2xl p-6 sm:p-7 shadow-[0_0_25px_rgba(16,185,129,0.15)] space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full inline-block mb-1">
                Step 2: Copy License Key
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>YOUR KEY 🗝️🔐</span>
              </h2>
            </div>
            
            {activeData && activeData.keys.length > 1 && (
              <button
                onClick={handleCopyAll}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
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
                    className="bg-zinc-950 border border-emerald-500/30 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 shadow-[0_0_15px_rgba(0,0,0,0.5)] group hover:border-emerald-500/60 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0 border border-emerald-500/20">
                        <Key className="w-5 h-5" />
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-[11px] text-zinc-400 uppercase font-semibold tracking-wider">
                          License Key {activeData.keys.length > 1 ? `#${index + 1}` : ''}
                        </p>
                        <p className="font-mono text-base sm:text-xl font-bold text-emerald-400 tracking-wider break-all select-all">
                          {key}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopySingle(key, index)}
                      className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer flex-shrink-0 ${
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
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-8 text-center space-y-3">
              <Key className="w-10 h-10 text-zinc-600 mx-auto" />
              <p className="text-zinc-400 font-medium">No active key found in current session.</p>
              <button
                onClick={onBackToHome}
                className="px-5 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl font-medium text-sm transition-colors"
              >
                Go to Store to Purchase
              </button>
            </div>
          )}
        </div>

        {/* SECTION 3: SOME DESCRIPTION */}
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-6 sm:p-7 space-y-6">
          <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
            <HelpCircle className="w-5 h-5 text-fuchsia-400" />
            <h3 className="text-xl font-bold text-white tracking-tight">
              Instructions & Description (How to use)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-fuchsia-500/10 text-fuchsia-400 font-bold flex items-center justify-center text-sm">
                1
              </div>
              <h4 className="font-semibold text-white text-base">APK Install Karein</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Upar diye gaye <strong>APK File Link</strong> par click karke Telegram channel se official APK download karein aur apne phone me install karein.
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-sm">
                2
              </div>
              <h4 className="font-semibold text-white text-base">Key Paste Karein</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                App open karne ke baad license/key box me upar se copy ki hui <strong>YOUR KEY 🗝️🔐</strong> ko paste karein aur Login/Activate button dabayein.
              </p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800/80 space-y-2">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center text-sm">
                3
              </div>
              <h4 className="font-semibold text-white text-base">Enjoy Premium Access</h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Key activate hote hi aapka VIP hack/feature start ho jayega. Key ko kisi aur ke sath share na karein taaki device block na ho.
              </p>
            </div>
          </div>

          {/* Important Security Warnings & Details */}
          <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3 text-amber-300 text-xs sm:text-sm">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-amber-200">Zaroori Soochana (Important Notice):</strong>
              <p className="text-amber-300/90 leading-relaxed">
                1 key sirf ek single device ke liye valid hoti hai. Is key ko apne paas screenshot ya copy karke surakshit rakh lein. Kisi dusre user ko key share karne par key invalidate ho sakti hai.
              </p>
            </div>
          </div>

          {/* Support Banner */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-semibold text-white text-sm">Koi samasya ya issue aa raha hai?</h5>
                <p className="text-xs text-zinc-400">Hamara support team 24/7 Telegram par uplabdh hai.</p>
              </div>
            </div>
            <a
              href="https://t.me/FATHERXSIR"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              Contact Owner Support (@FATHERXSIR)
            </a>
          </div>
        </div>

        {/* SECTION 4: ALL PREVIOUS KEYS (If user has past purchases) */}
        {purchases && purchases.length > 1 && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-fuchsia-400" />
                Previous Purchased Keys ({purchases.length})
              </h3>
            </div>
            
            <div className="space-y-3">
              {purchases.slice(1).map((p, pIndex) => (
                <div key={p.id || pIndex} className="bg-zinc-950 border border-zinc-800/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{resolveProductName(p.category, settings.categories, items)}</span>
                      <span className="text-xs text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded border border-fuchsia-500/20">{p.label}</span>
                    </div>
                    <span className="text-[11px] text-zinc-500">
                      {new Date(p.date).toLocaleDateString()}
                    </span>
                    <div className="mt-2 space-y-1">
                      {p.keys.map((k, kIdx) => (
                        <div key={kIdx} className="font-mono text-xs text-zinc-300 select-all">
                          {k}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(p.keys.join('\n'));
                      alert('Past key(s) copied to clipboard!');
                    }}
                    className="self-start sm:self-center px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs rounded-lg border border-zinc-700 transition-colors flex items-center gap-1.5"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
