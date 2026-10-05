import React, { useState, useEffect, useMemo } from 'react';
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
  RefreshCw,
  Filter,
  X,
  ArrowUpDown,
  CalendarRange,
  RotateCcw,
  SlidersHorizontal,
  CreditCard
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

  // Tab & Filters state
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductFilter, setSelectedProductFilter] = useState('all');
  const [dateFilterPreset, setDateFilterPreset] = useState<'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'this_month' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'amount_desc' | 'amount_asc' | 'product_asc'>('newest');
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  // User personal purchases strictly for this user account / device
  const userPurchases = purchases;

  // Effective list to display: 'all' is strictly reserved for Owner/Admin toggle, standard users ALWAYS see ONLY their own keys
  const rawDisplayList = (isOwner && activeTab === 'all') 
    ? allPurchases 
    : userPurchases;

  // Unique products available in current list for dropdown
  const uniqueProducts = useMemo(() => {
    const set = new Set<string>();
    rawDisplayList.forEach(p => {
      const name = resolveProductName(p.category, settings.categories, items);
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [rawDisplayList, settings.categories, items]);

  // Filter and sort the display list
  const filteredList = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - (24 * 60 * 60 * 1000);
    const startOfLast7Days = startOfToday - (7 * 24 * 60 * 60 * 1000);
    const startOfLast30Days = startOfToday - (30 * 24 * 60 * 60 * 1000);
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let customStartTs = customStartDate ? new Date(customStartDate + 'T00:00:00').getTime() : 0;
    let customEndTs = customEndDate ? new Date(customEndDate + 'T23:59:59').getTime() : Infinity;

    return rawDisplayList.filter(p => {
      const prodDisplayName = resolveProductName(p.category, settings.categories, items);
      const timestamp = getOrderTimestamp(p.date);

      // 1. Product Filter
      if (selectedProductFilter !== 'all' && prodDisplayName !== selectedProductFilter) {
        return false;
      }

      // 2. Date Filter
      if (dateFilterPreset === 'today') {
        if (timestamp < startOfToday) return false;
      } else if (dateFilterPreset === 'yesterday') {
        if (timestamp < startOfYesterday || timestamp >= startOfToday) return false;
      } else if (dateFilterPreset === 'last7') {
        if (timestamp < startOfLast7Days) return false;
      } else if (dateFilterPreset === 'last30') {
        if (timestamp < startOfLast30Days) return false;
      } else if (dateFilterPreset === 'this_month') {
        if (timestamp < startOfThisMonth) return false;
      } else if (dateFilterPreset === 'custom') {
        if (customStartDate && timestamp < customStartTs) return false;
        if (customEndDate && timestamp > customEndTs) return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesProduct = prodDisplayName.toLowerCase().includes(query) || p.category?.toLowerCase().includes(query) || p.label?.toLowerCase().includes(query);
        const matchesId = p.id?.toLowerCase().includes(query) || (p.orderId && p.orderId.toLowerCase().includes(query));
        const matchesUser = p.userEmail?.toLowerCase().includes(query) || p.userId?.toLowerCase().includes(query);
        const matchesPhone = p.customerPhone?.replace(/[^0-9]/g, '').includes(query.replace(/[^0-9]/g, ''));
        const matchesCustomer = p.customerName?.toLowerCase().includes(query);
        const matchesKey = p.keys?.some(k => k.toLowerCase().includes(query));
        const matchesCoupon = p.couponCode?.toLowerCase().includes(query);
        const matchesAmount = p.amount !== undefined && String(p.amount).includes(query);

        if (!(matchesProduct || matchesId || matchesUser || matchesPhone || matchesCustomer || matchesKey || matchesCoupon || matchesAmount)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      const timeA = getOrderTimestamp(a.date);
      const timeB = getOrderTimestamp(b.date);

      if (sortBy === 'newest') return timeB - timeA;
      if (sortBy === 'oldest') return timeA - timeB;
      if (sortBy === 'amount_desc') return (b.amount || 0) - (a.amount || 0);
      if (sortBy === 'amount_asc') return (a.amount || 0) - (b.amount || 0);
      if (sortBy === 'product_asc') {
        const nameA = resolveProductName(a.category, settings.categories, items);
        const nameB = resolveProductName(b.category, settings.categories, items);
        return nameA.localeCompare(nameB);
      }
      return timeB - timeA;
    });
  }, [rawDisplayList, selectedProductFilter, dateFilterPreset, customStartDate, customEndDate, searchQuery, sortBy, settings.categories, items]);

  // Aggregate stats of current filtered list
  const totalKeysCount = useMemo(() => {
    return filteredList.reduce((sum, p) => sum + (p.keys?.length || 1), 0);
  }, [filteredList]);

  const totalAmountSpent = useMemo(() => {
    return filteredList.reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [filteredList]);

  const isAnyFilterActive = searchQuery.trim() !== '' || selectedProductFilter !== 'all' || dateFilterPreset !== 'all' || sortBy !== 'newest';

  const resetAllFilters = () => {
    setSearchQuery('');
    setSelectedProductFilter('all');
    setDateFilterPreset('all');
    setCustomStartDate('');
    setCustomEndDate('');
    setSortBy('newest');
  };

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
        description={`View, filter, and search your purchased activation keys, license codes, and order history on ${settings?.siteName || 'Arman X Store'}.`}
      />
      <div className="max-w-5xl mx-auto space-y-6">
        
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
                ? `Showing keys for ${currentUser.email || currentUser.displayName || currentUser.customId}`
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

        {/* Search & Filter Control Bar */}
        <div className="bg-[#121215]/95 border border-white/10 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4 backdrop-blur-xl">
          
          {/* Top Row: Tab Switcher (for Owner) & Search Input */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Owner Tab Switcher or Customer Key Pill */}
            {isOwner ? (
              <div className="flex items-center gap-1.5 p-1 bg-zinc-900/90 border border-white/10 rounded-2xl shrink-0">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
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
              <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/60 border border-white/10 px-3.5 py-2 rounded-xl shrink-0">
                <Key className="w-4 h-4 text-indigo-400" />
                <span>Orders: <strong className="text-white font-mono">{filteredList.length}</strong></span>
                <span className="text-zinc-600">•</span>
                <span>Keys: <strong className="text-white font-mono">{totalKeysCount}</strong></span>
                {totalAmountSpent > 0 && (
                  <>
                    <span className="text-zinc-600">•</span>
                    <span className="text-emerald-400 font-bold font-mono">₹{totalAmountSpent}</span>
                  </>
                )}
              </div>
            )}

            {/* Search Input with 1-Click Clear */}
            <div className="relative flex-1 max-w-full md:max-w-md">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Product, Order ID, Key, Phone, Gmail..."
                className="w-full bg-zinc-900/90 border border-white/10 focus:border-indigo-500 rounded-2xl pl-10 pr-9 py-2.5 text-xs text-white placeholder-zinc-500 outline-none transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white p-0.5 rounded-full hover:bg-zinc-800 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Mobile Filter Toggle Button */}
            <button
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              className="md:hidden flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
              <span>Filters & Sort</span>
              {isAnyFilterActive && (
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              )}
            </button>
          </div>

          {/* Filter Controls Row: Product, Date Preset, Sort By */}
          <div className={`${showFiltersMobile ? 'block' : 'hidden md:grid'} grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/5`}>
            
            {/* 1. Product Filter Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                <Tag className="w-3 h-3 text-indigo-400" />
                <span>Filter by Product</span>
              </label>
              <select
                value={selectedProductFilter}
                onChange={(e) => setSelectedProductFilter(e.target.value)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="all">All Products ({rawDisplayList.length})</option>
                {uniqueProducts.map(prod => (
                  <option key={prod} value={prod}>{prod}</option>
                ))}
              </select>
            </div>

            {/* 2. Date Filter Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-cyan-400" />
                <span>Filter by Date</span>
              </label>
              <select
                value={dateFilterPreset}
                onChange={(e) => setDateFilterPreset(e.target.value as any)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="all">All Time History</option>
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="last7">Last 7 Days</option>
                <option value="last30">Last 30 Days</option>
                <option value="this_month">This Month</option>
                <option value="custom">Custom Date Range...</option>
              </select>
            </div>

            {/* 3. Sort Order Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-zinc-400 flex items-center gap-1.5">
                <ArrowUpDown className="w-3 h-3 text-fuchsia-400" />
                <span>Sort Orders</span>
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
              >
                <option value="newest">Newest Orders First</option>
                <option value="oldest">Oldest Orders First</option>
                <option value="amount_desc">Amount: High to Low (₹)</option>
                <option value="amount_asc">Amount: Low to High (₹)</option>
                <option value="product_asc">Product Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Custom Date Inputs (if 'custom' date preset is selected) */}
          {dateFilterPreset === 'custom' && (
            <div className="p-3 bg-zinc-900/80 border border-indigo-500/30 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-semibold block">From Date:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-zinc-400 font-semibold block">To Date:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
          )}

          {/* Active Filter Tags & Quick Reset */}
          {isAnyFilterActive && (
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 text-xs border-t border-white/5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-zinc-500 text-[11px]">Active Filters:</span>
                
                {selectedProductFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-[11px]">
                    Product: {selectedProductFilter}
                    <button onClick={() => setSelectedProductFilter('all')} className="hover:text-white ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {dateFilterPreset !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[11px]">
                    Date: {dateFilterPreset === 'custom' ? `${customStartDate || 'Start'} to ${customEndDate || 'End'}` : dateFilterPreset}
                    <button onClick={() => { setDateFilterPreset('all'); setCustomStartDate(''); setCustomEndDate(''); }} className="hover:text-white ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {searchQuery && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-[11px]">
                    Search: "{searchQuery}"
                    <button onClick={() => setSearchQuery('')} className="hover:text-white ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {sortBy !== 'newest' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px]">
                    Sort: {sortBy}
                    <button onClick={() => setSortBy('newest')} className="hover:text-white ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>

              <button
                onClick={resetAllFilters}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-2.5 py-1 rounded-lg border border-rose-500/20 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset All Filters</span>
              </button>
            </div>
          )}
        </div>

        {/* Guest prompt banner if not logged in */}
        {!currentUser && (
          <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <LogIn className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>Viewing keys on this device. Log in with Google to sync all your orders across all your devices.</span>
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
                  {isAnyFilterActive ? 'No matching keys found' : 'No license keys found'}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 theme-text-sub">
                  {isAnyFilterActive 
                    ? `No orders matched your current search and filter criteria. Try changing the product or date filter.` 
                    : `You have not purchased any keys yet. Enter your Order ID below or buy your first VIP key.`}
                </p>
              </div>

              {isAnyFilterActive ? (
                <button
                  onClick={resetAllFilters}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Clear All Filters</span>
                </button>
              ) : (
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={onBuyMore}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.35)] transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Buy a VIP Key Now</span>
                  </button>
                  {allPurchases.length > 0 && isOwner && (
                    <button
                      onClick={() => {
                        setActiveTab('all');
                        resetAllFilters();
                      }}
                      className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs rounded-xl border border-white/10 transition-colors cursor-pointer"
                    >
                      View All Store Orders ({allPurchases.length})
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            filteredList.map((purchase, idx) => {
              const prodName = resolveProductName(purchase.category, settings.categories, items);
              const isLatest = idx === 0 && !isAnyFilterActive;

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

                  {/* Delivered Keys Cards */}
                  <div className="space-y-2.5 pt-1">
                    <div className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 theme-text-sub">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Delivered VIP Activation Keys</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {purchase.keys.map((k, kIdx) => {
                        const isCopied = copiedKey === k;
                        return (
                          <div 
                            key={kIdx}
                            className="bg-black/60 border border-white/10 hover:border-indigo-500/50 rounded-2xl p-3 sm:p-3.5 flex items-center justify-between gap-3 group transition-all theme-key-card"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-white/10 text-zinc-400 flex items-center justify-center text-[10px] font-mono shrink-0">
                                {kIdx + 1}
                              </span>
                              <code className="text-xs sm:text-sm font-mono font-bold text-cyan-300 group-hover:text-cyan-200 tracking-wide select-all truncate">
                                {k}
                              </code>
                            </div>

                            <button
                              onClick={() => handleCopySingleKey(k)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 active:scale-95 ${
                                isCopied
                                  ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.5)]'
                                  : 'bg-zinc-900 hover:bg-indigo-600 text-zinc-300 hover:text-white border border-white/10'
                              }`}
                              title="Copy activation key"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied</span>
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
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
