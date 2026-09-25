import React, { useState, useEffect } from 'react';
import { 
  Key, 
  Calendar, 
  Copy, 
  Check, 
  Search, 
  ShieldCheck, 
  Tag, 
  ArrowLeft, 
  ShoppingBag,
  Clock,
  Sparkles,
  Layers,
  LogIn,
  AlertCircle
} from 'lucide-react';
import { useInventory, resolveProductName, PurchaseRecord } from '../store';
import { useAuth } from '../lib/useAuth';

interface KeyHistoryPageProps {
  onBackToHome: () => void;
  onBuyMore: () => void;
}

export function KeyHistoryPage({ onBackToHome, onBuyMore }: KeyHistoryPageProps) {
  const { currentUser } = useAuth();
  const { purchases, allPurchases, settings, items } = useInventory(currentUser?.uid, currentUser?.email || undefined);

  // Clean up legacy global cached order IDs on mount
  useEffect(() => {
    try {
      localStorage.removeItem('my_orders_ids');
    } catch {}
  }, []);

  const isOwner = Boolean(
    currentUser?.email?.includes('barikarman') || 
    ['admin', 'owner', 'arman_123'].includes(currentUser?.customId || '') || 
    currentUser?.customId?.includes('barikarman')
  );

  // Default tab is always 'my' so user strictly sees their own keys
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // Strictly filter by logged-in user
  const userPurchases = purchases.filter(p => {
    if (!currentUser) return false;
    const uidMatch = currentUser.uid && p.userId === currentUser.uid;
    const emailMatch = currentUser.email && p.userEmail && p.userEmail.toLowerCase() === currentUser.email.toLowerCase();
    return uidMatch || emailMatch;
  });

  const displayList = isOwner && activeTab === 'all' ? allPurchases : userPurchases;

  const filteredList = displayList.filter(p => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const prodDisplayName = resolveProductName(p.category, settings.categories, items);
    const matchesProduct = prodDisplayName.toLowerCase().includes(query) || p.category?.toLowerCase().includes(query) || p.label?.toLowerCase().includes(query);
    const matchesId = p.id?.toLowerCase().includes(query);
    const matchesUser = p.userEmail?.toLowerCase().includes(query) || p.userId?.toLowerCase().includes(query);
    const matchesKey = p.keys?.some(k => k.toLowerCase().includes(query));
    const matchesCoupon = p.couponCode?.toLowerCase().includes(query);
    return matchesProduct || matchesId || matchesUser || matchesKey || matchesCoupon;
  });

  const handleCopySingleKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyAllOrderKeys = (orderId: string, keys: string[]) => {
    navigator.clipboard.writeText(keys.join('\n'));
    setCopiedOrderId(orderId);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pt-24 pb-20 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white transition-colors duration-300 theme-section">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10 theme-modal-section">
          <div className="space-y-1">
            <button
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 text-zinc-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 transition-colors cursor-pointer mb-2 theme-pill"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store</span>
            </button>
            <h1 className="text-2xl sm:text-4xl font-bold font-display text-white tracking-tight flex items-center gap-3 theme-text-title">
              <Key className="w-7 h-7 text-indigo-400" />
              <span>Key History & Active Licenses</span>
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 theme-text-sub">
              {currentUser 
                ? `Showing keys purchased with your account (${currentUser.email || currentUser.displayName || currentUser.customId})`
                : 'Please log in to view your purchased activation keys.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBuyMore}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Buy Key</span>
            </button>
          </div>
        </div>

        {/* If user is not logged in */}
        {!currentUser ? (
          <div className="bg-[#121215]/80 border border-white/10 rounded-3xl p-12 text-center space-y-4 backdrop-blur-xl theme-card max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400">
              <LogIn className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white theme-text-title">
                Please Log In
              </h3>
              <p className="text-xs sm:text-sm text-zinc-400 max-w-sm mx-auto mt-1 theme-text-sub">
                To view your personal purchased keys and active license history, please log in with your account.
              </p>
            </div>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/login');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Log In to Your Account</span>
            </button>
          </div>
        ) : (
          <>
            {/* Search & Tabs */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
              {/* Owner Tab Switcher */}
              {isOwner ? (
                <div className="flex items-center gap-2 p-1 bg-zinc-900/90 border border-white/10 rounded-2xl theme-pill">
                  <button
                    onClick={() => setActiveTab('my')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'my'
                        ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>My Keys ({userPurchases.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('all')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'all'
                        ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>All Store Orders ({allPurchases.length})</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 border border-white/10 px-3.5 py-2 rounded-xl theme-pill">
                  <Key className="w-4 h-4 text-indigo-400" />
                  <span>My Active Keys: <strong className="text-white font-mono">{userPurchases.reduce((acc, p) => acc + (p.keys?.length || 1), 0)}</strong></span>
                </div>
              )}

              {/* Search Input */}
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search your keys, order ID..."
                  className="w-full bg-[#121215]/90 border border-white/10 focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all shadow-sm theme-input"
                />
              </div>
            </div>

            {/* Keys List Display */}
            <div className="space-y-4">
              {filteredList.length === 0 ? (
                <div className="bg-[#121215]/80 border border-white/10 rounded-3xl p-12 text-center space-y-4 backdrop-blur-xl theme-card">
                  <div className="w-14 h-14 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                    <Key className="w-7 h-7 text-indigo-400/50" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white theme-text-title">
                      {searchQuery ? 'No matching keys found' : 'No keys purchased with this ID yet'}
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 theme-text-sub">
                      {searchQuery 
                        ? `No keys matched "${searchQuery}". Try another keyword.` 
                        : `You haven't bought any license keys with this ID (${currentUser.email || currentUser.displayName}). Keys purchased with this account will show up here.`}
                    </p>
                  </div>
                  <button
                    onClick={onBuyMore}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Buy a License Key Now</span>
                  </button>
                </div>
              ) : (
                filteredList.map((purchase) => {
                  const prodName = resolveProductName(purchase.category, settings.categories, items);
                  return (
                    <div 
                      key={purchase.id} 
                      className="bg-[#121215]/90 border border-white/10 hover:border-white/20 rounded-3xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl space-y-4 transition-all theme-card"
                    >
                      {/* Item Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 theme-modal-section">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white text-base sm:text-lg theme-text-title">
                              {prodName}
                            </h3>
                            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 theme-pill">
                              {purchase.label}
                            </span>
                            {purchase.couponCode && (
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 theme-pill">
                                <Tag className="w-3 h-3" />
                                {purchase.couponCode}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-zinc-400 flex-wrap theme-text-sub">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                              {new Date(purchase.date).toLocaleDateString()} at {new Date(purchase.date).toLocaleTimeString()}
                            </span>
                            {purchase.amount && (
                              <span className="text-zinc-200 font-semibold theme-text-title">
                                Paid: ₹{purchase.amount}
                              </span>
                            )}
                            <span className="text-[11px] font-mono text-zinc-500">
                              Order ID: {purchase.id}
                            </span>
                            {isOwner && activeTab === 'all' && (
                              <span className="text-indigo-400 text-[11px]">
                                Account: {purchase.userEmail || purchase.userId || 'Guest'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center">
                          <span className="bg-zinc-900 text-zinc-300 text-xs px-3 py-1 rounded-xl border border-white/10 font-medium theme-pill">
                            {purchase.keys.length} {purchase.keys.length === 1 ? 'Key' : 'Keys'}
                          </span>
                          {purchase.keys.length > 1 && (
                            <button
                              onClick={() => handleCopyAllOrderKeys(purchase.id, purchase.keys)}
                              className="text-xs bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/30 text-indigo-300 px-3 py-1 rounded-xl transition-colors flex items-center gap-1 cursor-pointer theme-pill"
                            >
                              {copiedOrderId === purchase.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Copied All!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy All</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Individual Keys Box */}
                      <div className="space-y-2.5">
                        {purchase.keys.map((k, index) => {
                          const isCopied = copiedKey === k;
                          return (
                            <div
                              key={index}
                              className="p-3 sm:p-4 rounded-2xl bg-black/60 border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 group hover:border-indigo-500/40 transition-all theme-pill"
                            >
                              <div className="flex items-center gap-3 overflow-hidden">
                                <div className="w-8 h-8 rounded-xl bg-indigo-950/60 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                  <Key className="w-4 h-4" />
                                </div>
                                <div className="overflow-hidden">
                                  <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider">
                                    License Key {purchase.keys.length > 1 ? `#${index + 1}` : ''}
                                  </p>
                                  <p className="font-mono text-xs sm:text-sm font-bold text-emerald-400 tracking-wider break-all select-all">
                                    {k}
                                  </p>
                                </div>
                              </div>

                              <button
                                onClick={() => handleCopySingleKey(k)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer ${
                                  isCopied
                                    ? 'bg-emerald-500 text-zinc-950 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-white/10 hover:border-white/20'
                                }`}
                              >
                                {isCopied ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Copied! 🗝️</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}

      </div>
    </div>
  );
}
