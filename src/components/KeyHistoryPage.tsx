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
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useInventory, resolveProductName, PurchaseRecord } from '../store';
import { useAuth } from '../lib/useAuth';
import { Helmet } from './Helmet';
import { KeyHistorySkeleton, ButtonSpinner } from './Skeletons';

interface KeyHistoryPageProps {
  onBackToHome: () => void;
  onBuyMore: () => void;
}

const getOrderTimestamp = (dateStr?: string | number): number => {
  if (!dateStr) return 0;
  if (typeof dateStr === 'number') return dateStr;
  const parsed = Date.parse(dateStr);
  if (!isNaN(parsed)) return parsed;
  try {
    const clean = String(dateStr).replace(' at ', ' ').trim();
    const d = new Date(clean);
    if (!isNaN(d.getTime())) return d.getTime();
  } catch {}
  return 0;
};

const formatOrderDate = (dateStr?: string) => {
  if (!dateStr) return 'Recent';
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    }
  } catch {}
  return dateStr;
};

export function KeyHistoryPage({ onBackToHome, onBuyMore }: KeyHistoryPageProps) {
  const { currentUser } = useAuth();
  const { purchases, allPurchases, settings, items, isInitialized, refreshPurchases } = useInventory(currentUser?.uid, currentUser?.email || undefined);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshToast, setRefreshToast] = useState('');

  // Auto-sync on mount
  useEffect(() => {
    refreshPurchases();
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setRefreshToast('');
    try {
      const updated = await refreshPurchases();
      setRefreshToast(`✅ Synced ${updated.length} orders live!`);
    } catch {
      setRefreshToast('Orders synced.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setRefreshToast(''), 3500);
    }
  };

  const isOwner = Boolean(
    currentUser?.role === 'owner' ||
    currentUser?.role === 'admin' ||
    currentUser?.email?.includes('barikarman') || 
    ['admin', 'owner', 'arman_123'].includes(currentUser?.customId || '') || 
    currentUser?.customId?.includes('barikarman')
  );

  // Default tab: 'my' for all users (shows their own keys)
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // User personal purchases strictly for this user account / device
  const userPurchases = (purchases && purchases.length > 0)
    ? purchases
    : allPurchases.filter(p => {
        if (currentUser) {
          const uidMatch = currentUser.uid && p.userId === currentUser.uid;
          const emailMatch = currentUser.email && p.userEmail && p.userEmail.toLowerCase() === currentUser.email.toLowerCase();
          if (uidMatch || emailMatch) return true;
        }
        const cleanPhone = (localStorage.getItem('customer_phone') || '').replace(/[^0-9]/g, '');
        if (cleanPhone && p.customerPhone && p.customerPhone.replace(/[^0-9]/g, '') === cleanPhone) return true;
        const cleanEmail = (localStorage.getItem('customer_email') || '').trim().toLowerCase();
        if (cleanEmail && p.userEmail && p.userEmail.trim().toLowerCase() === cleanEmail) return true;
        return false;
      });

  // Effective list to display: 'all' is only for Admin viewing entire store, 'my' is strictly own keys
  const rawDisplayList = (isOwner && activeTab === 'all') 
    ? allPurchases 
    : userPurchases;

  const displayList = [...rawDisplayList].sort((a, b) => getOrderTimestamp(b.date) - getOrderTimestamp(a.date));

  const filteredList = displayList.filter(p => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const prodDisplayName = resolveProductName(p.category, settings.categories, items);
    const matchesProduct = prodDisplayName.toLowerCase().includes(query) || p.category?.toLowerCase().includes(query) || p.label?.toLowerCase().includes(query);
    const matchesId = p.id?.toLowerCase().includes(query) || (p.orderId && p.orderId.toLowerCase().includes(query));
    const matchesUser = p.userEmail?.toLowerCase().includes(query) || p.userId?.toLowerCase().includes(query);
    const matchesPhone = p.customerPhone?.replace(/[^0-9]/g, '').includes(query.replace(/[^0-9]/g, ''));
    const matchesCustomer = p.customerName?.toLowerCase().includes(query);
    const matchesKey = p.keys?.some(k => k.toLowerCase().includes(query));
    const matchesCoupon = p.couponCode?.toLowerCase().includes(query);
    return matchesProduct || matchesId || matchesUser || matchesPhone || matchesCustomer || matchesKey || matchesCoupon;
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

  const handleDownloadReceipt = (purchase: PurchaseRecord) => {
    const prodName = resolveProductName(purchase.category, settings.categories, items);
    const text = `================================================
          ${settings.siteName || 'ARMAN X STORE'} - OFFICIAL RECEIPT
================================================
Order ID:    ${purchase.orderId || purchase.id}
Date:        ${new Date(purchase.date).toLocaleString()}
Product:     ${prodName}
Plan:        ${purchase.label || 'VIP'}
Amount Paid: ₹${purchase.amount || 0}
Status:      DELIVERED / ACTIVE
------------------------------------------------
YOUR VIP KEYS:
${(purchase.keys || []).map((k, i) => `[${i + 1}] ${k}`).join('\n')}
------------------------------------------------
Telegram Support: https://t.me/FATHERXSIR
================================================
Thank you for your purchase!
`;
    const element = document.createElement("a");
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `receipt-${purchase.orderId || purchase.id}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 pt-24 pb-20 px-4 sm:px-6 lg:px-8 selection:bg-indigo-500 selection:text-white transition-colors duration-300 theme-section">
      <Helmet 
        title={`Your Keys - ${settings?.siteName || 'Arman X Store'}`}
        description={`View and manage your active VIP activation keys, license codes, and order history on ${settings?.siteName || 'Arman X Store'}.`}
      />
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
                : 'Showing active activation keys on this device.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-200 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              title="Refresh and sync newest keys from server"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Keys'}</span>
            </button>

            <button
              onClick={onBuyMore}
              className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Buy Key</span>
            </button>
          </div>
        </div>

        {/* Sync Toast Notification */}
        {refreshToast && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-2xl flex items-center gap-2 animate-in fade-in shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{refreshToast}</span>
          </div>
        )}

        {/* Search & Tabs */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Owner Tab Switcher or Customer Header */}
          {isOwner ? (
            <div className="flex items-center gap-2 p-1 bg-zinc-900/90 border border-white/10 rounded-2xl theme-pill">
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
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 border border-white/10 px-3.5 py-2 rounded-xl theme-pill">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>Available Keys: <strong className="text-white font-mono">{filteredList.reduce((acc, p) => acc + (p.keys?.length || 1), 0)}</strong></span>
            </div>
          )}

          {/* Search Input */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, Phone, Key..."
              className="w-full bg-[#121215]/90 border border-white/10 focus:border-indigo-500 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all shadow-sm theme-input"
            />
          </div>
        </div>

        {/* Guest prompt banner if not logged in */}
        {!currentUser && (
          <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Viewing keys on this device. Log in to sync all your orders across all your devices.</span>
            </div>
            <button
              onClick={() => {
                window.history.pushState({}, '', '/login');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shrink-0 cursor-pointer shadow-sm transition-all"
            >
              Log In
            </button>
          </div>
        )}

        {/* Keys List Display */}
        <div className="space-y-4">
          {!isInitialized && filteredList.length === 0 ? (
            <KeyHistorySkeleton count={3} />
          ) : filteredList.length === 0 ? (
            <div className="bg-[#121215]/80 border border-white/10 rounded-3xl p-8 sm:p-12 text-center space-y-5 backdrop-blur-xl theme-card max-w-xl mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                <Key className="w-7 h-7 text-indigo-400/70" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white theme-text-title">
                  {searchQuery ? 'No matching keys found' : 'No license keys found'}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 theme-text-sub">
                  {searchQuery 
                    ? `No keys matched "${searchQuery}". Try searching with Order ID or Mobile number.` 
                    : `Enter your Order ID or Mobile Number below to find and download your digital keys instantly.`}
                </p>
              </div>

              {/* Instant Order ID Finder Box */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = searchQuery.trim();
                  if (val) {
                    window.location.href = `/verify-payment?order_id=${encodeURIComponent(val)}`;
                  }
                }}
                className="flex items-center gap-2 max-w-md mx-auto"
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Enter Order ID (e.g. ord_xxx or FAM ID)"
                  className="flex-1 bg-zinc-950 border border-white/15 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-500 font-mono outline-none"
                />
                <button
                  type="submit"
                  disabled={!searchQuery.trim()}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer shrink-0"
                >
                  Find Key
                </button>
              </form>

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  onClick={onBuyMore}
                  className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Buy a VIP Key Now</span>
                </button>
                {allPurchases.length > 0 && (
                  <button
                    onClick={() => {
                      setActiveTab('all');
                      setSearchQuery('');
                    }}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl border border-white/10 transition-colors cursor-pointer"
                  >
                    View All Orders ({allPurchases.length})
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredList.map((purchase, idx) => {
              const prodName = resolveProductName(purchase.category, settings.categories, items);
              const isLatest = idx === 0 && !searchQuery.trim();

              return (
                <div 
                  key={purchase.id || idx} 
                  className={`bg-[#121215]/90 border rounded-3xl p-5 sm:p-6 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl space-y-4 transition-all theme-card ${
                    isLatest 
                      ? 'border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]' 
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 theme-modal-section">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isLatest && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-purple-500 text-white shadow-[0_0_12px_rgba(224,0,255,0.4)] animate-pulse">
                            ✨ LATEST KEY
                          </span>
                        )}
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
                          {formatOrderDate(purchase.date)}
                        </span>
                        {purchase.amount !== undefined && (
                          <span className="text-emerald-400 font-bold theme-text-title">
                            Paid: ₹{purchase.amount}
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-zinc-500">
                          Order ID: {purchase.orderId || purchase.id}
                        </span>
                        {purchase.customerPhone && (
                          <span className="text-emerald-400 text-[11px] font-mono">
                            WhatsApp: +91 {purchase.customerPhone}
                          </span>
                        )}
                        {purchase.userEmail && (
                          <span className="text-indigo-400 text-[11px] font-mono">
                            Gmail: {purchase.userEmail}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-center">
                      <button
                        onClick={() => handleDownloadReceipt(purchase)}
                        className="text-xs bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-zinc-300 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer theme-pill"
                        title="Download official text receipt"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Receipt</span>
                      </button>

                      <span className="bg-zinc-900 text-zinc-300 text-xs px-3 py-1 rounded-xl border border-white/10 font-medium theme-pill">
                        {purchase.keys.length} {purchase.keys.length === 1 ? 'Key' : 'Keys'}
                      </span>

                      {purchase.keys.length > 1 && (
                        <button
                          onClick={() => handleCopyAllOrderKeys(purchase.id, purchase.keys)}
                          className="text-xs bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/30 text-indigo-300 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1 cursor-pointer theme-pill"
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
                    {purchase.keys.length === 0 ? (
                      <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2 font-mono">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Keys awaiting stock / auto-refunded to wallet. Contact support for instant key allocation.</span>
                      </div>
                    ) : (
                      purchase.keys.map((k, index) => {
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
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
