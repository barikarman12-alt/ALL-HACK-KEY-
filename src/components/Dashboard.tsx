import { 
  Users, 
  DollarSign, 
  Activity, 
  Package, 
  ArrowUpRight, 
  Settings, 
  Bell, 
  Search, 
  ShoppingCart, 
  Trash2, 
  Check, 
  X, 
  ArrowRight, 
  ArrowLeft, 
  Tag, 
  Percent, 
  Plus, 
  Copy, 
  Sparkles, 
  ToggleLeft, 
  ToggleRight, 
  AlertCircle, 
  Clock,
  Mail,
  Shield,
  Eye,
  Key,
  Wallet,
  Calendar,
  Filter,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  UserCheck,
  CreditCard,
  Info,
  History,
  ArrowDownLeft,
  RefreshCw
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useInventory, useCoupons, useUsers, useWalletTransactions, WalletTransaction, UserWithStats, getCouponRemainingTime, resolveProductName } from '../store';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('menu');
  const { items: inventory, addKeys, removeKey, settings, updateSettings, purchases, balances, addProduct, deleteProduct } = useInventory();
  const { coupons, addCoupon, updateCoupon, deleteCoupon, toggleCoupon } = useCoupons();
  const { users, updateUserBalance, issueRefund } = useUsers();
  const { allTransactions: allWalletTransactions } = useWalletTransactions();
  const [newKeysInput, setNewKeysInput] = useState<{ [key: string]: string }>({});
  const [manageKeysProduct, setManageKeysProduct] = useState<string | null>(null);
  const [deleteKeyConfirmIdx, setDeleteKeyConfirmIdx] = useState<number | null>(null);

  // User Management & Details States
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'buyers' | 'leads' | 'balance' | 'vip'>('all');
  const [userSortBy, setUserSortBy] = useState<'recent' | 'spent' | 'orders' | 'balance' | 'name'>('recent');
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserWithStats | null>(null);
  const [userModalTab, setUserModalTab] = useState<'deposits' | 'orders'>('deposits');
  const [balanceAdjustUser, setBalanceAdjustUser] = useState<UserWithStats | null>(null);
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct'>('add');
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceNote, setBalanceNote] = useState('');
  const [balanceSuccessMsg, setBalanceSuccessMsg] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Dedicated Refund Modal State
  const [refundModalOrder, setRefundModalOrder] = useState<{
    orderId?: string;
    userId: string;
    userEmail?: string;
    amount: number;
    productName: string;
  } | null>(null);
  const [refundAmountInput, setRefundAmountInput] = useState('');
  const [refundReasonInput, setRefundReasonInput] = useState('');
  const [refundSuccessMsg, setRefundSuccessMsg] = useState('');
  const [isProcessingRefund, setIsProcessingRefund] = useState(false);

  const handleCopyText = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const formatUserDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch(e) {
      return dateStr;
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      if (isNaN(diff)) return 'Recently';
      const mins = Math.floor(diff / (1000 * 60));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `${days}d ago`;
      return `${Math.floor(days / 30)}mo ago`;
    } catch(e) {
      return 'Recently';
    }
  };

  // Coupon Management States
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newDiscountType, setNewDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [newDiscountValue, setNewDiscountValue] = useState('20');
  const [newMinSpend, setNewMinSpend] = useState('0');
  const [newValidHours, setNewValidHours] = useState('0'); // 0 = Lifetime (Never expires)
  const [newMaxUses, setNewMaxUses] = useState('0'); // 0 = unlimited
  const [newApplicableScope, setNewApplicableScope] = useState<'all' | 'specific'>('all');
  const [newSelectedProducts, setNewSelectedProducts] = useState<string[]>([]);
  const [newDescription, setNewDescription] = useState('');
  const [couponFormError, setCouponFormError] = useState('');
  const [couponSuccessMsg, setCouponSuccessMsg] = useState('');
  const [deleteCouponConfirmId, setDeleteCouponConfirmId] = useState<string | null>(null);
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);
  
  // Dynamic Stats Calculation
  const totalRevenue = purchases.reduce((acc, order) => {
    const item = inventory.find(i => i.value === order.value);
    const price = item ? item.price : 0;
    return acc + (order.keys.length * price);
  }, 0);

  const activeCustomers = new Set(purchases.map(p => p.userId)).size;
  const totalKeysSold = purchases.reduce((acc, order) => acc + order.keys.length, 0);
  const outOfStockItems = inventory.filter(item => item.stock === 0);

  const stats = [
    { name: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, change: '+100%', trend: 'up', icon: DollarSign },
    { name: 'Active Customers', value: activeCustomers.toString(), change: 'All time', trend: 'up', icon: Users },
    { name: 'Total Keys Sold', value: totalKeysSold.toString(), change: 'All time', trend: 'up', icon: ShoppingCart },
    { 
      name: 'Stock Alerts', 
      value: outOfStockItems.length.toString(), 
      change: outOfStockItems.length > 0 ? `${outOfStockItems.length} items empty` : 'All stocked', 
      trend: outOfStockItems.length > 0 ? 'down' : 'up', 
      icon: Package 
    },
  ];

  const handleAddKeys = (value: string) => {
    const text = newKeysInput[value] || '';
    const keysArray = text.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    if (keysArray.length > 0) {
      addKeys(value, keysArray);
      setNewKeysInput({ ...newKeysInput, [value]: '' });
    }
  };

  const [newProduct, setNewProduct] = useState<{
    category: string;
    label: string;
    price: string;
  }>({ category: 'ARMAN X STORE NON-ROOT', label: '', price: '' });

  const [deleteCategoryConfirmId, setDeleteCategoryConfirmId] = useState<string | null>(null);

  const [deleteProductConfirmId, setDeleteProductConfirmId] = useState<string | null>(null);

  const [draftCategories, setDraftCategories] = useState(settings.categories);
  const [draftSiteName, setDraftSiteName] = useState(settings.siteName || 'ARMAN X STORE');
  const [draftSiteLogoUrl, setDraftSiteLogoUrl] = useState(settings.siteLogoUrl || '/logo.png');
  const [hasChanges, setHasChanges] = useState(false);

  // Sync drafts with global settings if no unsaved changes
  useEffect(() => {
    if (!hasChanges) {
      setDraftCategories(settings.categories);
      setDraftSiteName(settings.siteName || 'ARMAN X STORE');
      setDraftSiteLogoUrl(settings.siteLogoUrl || '/logo.png');
    }
  }, [settings, hasChanges]);

  const handleSaveSettings = () => {
    updateSettings({ 
      categories: draftCategories,
      siteName: draftSiteName,
      siteLogoUrl: draftSiteLogoUrl
    });
    setHasChanges(false);
  };

  const handleDiscardChanges = () => {
    setDraftCategories(settings.categories);
    setDraftSiteName(settings.siteName || 'ARMAN X STORE');
    setDraftSiteLogoUrl(settings.siteLogoUrl || '/logo.png');
    setHasChanges(false);
    setDeleteCategoryConfirmId(null);
  };

  const handleCreateProduct = () => {
    if (newProduct.label && newProduct.price) {
      const value = newProduct.category.toLowerCase().replace(/\s+/g, '_') + '_' + newProduct.label.toLowerCase().replace(/\s+/g, '');
      addProduct(newProduct.category, newProduct.label, value, parseInt(newProduct.price) || 0);
      setNewProduct({ ...newProduct, label: '', price: '' });
    }
  };

  const handleLogoUpload = (categoryId: string, file: File | null) => {
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const updatedCategories = draftCategories.map(c => 
          c.id === categoryId ? { ...c, logoUrl: reader.result as string } : c
        );
        setDraftCategories(updatedCategories);
        setHasChanges(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateCategory = () => {
    const newCategory = {
      id: `CATEGORY_${Date.now()}`,
      name: 'New Product',
      logoUrl: 'https://images.unsplash.com/photo-1614064641936-732732f1a63c?auto=format&fit=crop&q=80&w=200',
      theme: 'light' as const
    };
    setDraftCategories([...draftCategories, newCategory]);
    setHasChanges(true);
  };

  const handleCreateCoupon = () => {
    const code = newCouponCode.trim().toUpperCase();
    if (!code) {
      setCouponFormError('Coupon code is required.');
      return;
    }
    const val = parseFloat(newDiscountValue);
    if (isNaN(val) || val <= 0) {
      setCouponFormError('Please enter a valid discount value greater than 0.');
      return;
    }
    if (newDiscountType === 'percentage' && val > 90) {
      setCouponFormError('Percentage discount cannot exceed 90%.');
      return;
    }
    if (coupons.some(c => c.code.toUpperCase() === code)) {
      setCouponFormError(`Coupon code "${code}" already exists.`);
      return;
    }

    if (newApplicableScope === 'specific' && newSelectedProducts.length === 0) {
      setCouponFormError('Please select at least one product for Specific Products scope.');
      return;
    }

    const hoursNum = parseFloat(newValidHours);
    const validHours = (!isNaN(hoursNum) && hoursNum > 0) ? hoursNum : undefined;
    const expiresAt = validHours ? new Date(Date.now() + validHours * 60 * 60 * 1000).toISOString() : null;

    const maxUsesNum = parseInt(newMaxUses);
    const maxUses = (!isNaN(maxUsesNum) && maxUsesNum > 0) ? maxUsesNum : undefined;

    addCoupon({
      code,
      discountType: newDiscountType,
      discountValue: val,
      minSpend: parseFloat(newMinSpend) || 0,
      description: newDescription.trim() || `${val}${newDiscountType === 'percentage' ? '% Off' : '₹ Flat Off'}`,
      active: true,
      validHours,
      expiresAt,
      maxUses,
      applicableScope: newApplicableScope,
      applicableProducts: newApplicableScope === 'specific' ? newSelectedProducts : undefined
    });

    setNewCouponCode('');
    setNewDiscountValue('20');
    setNewMinSpend('0');
    setNewValidHours('24');
    setNewMaxUses('0');
    setNewApplicableScope('all');
    setNewSelectedProducts([]);
    setNewDescription('');
    setCouponFormError('');
    setCouponSuccessMsg(`Coupon "${code}" created successfully! ${validHours ? `(${validHours}h validity)` : '(Lifetime)'} ${maxUses ? `(${maxUses} uses max)` : '(Unlimited uses)'}`);
    setTimeout(() => setCouponSuccessMsg(''), 3000);
  };

  const handleApplyPreset = (code: string, type: 'percentage' | 'flat', val: number, desc: string, hours: number = 0, maxUses: number = 0) => {
    setNewCouponCode(code);
    setNewDiscountType(type);
    setNewDiscountValue(val.toString());
    setNewDescription(desc);
    setNewValidHours(hours.toString());
    setNewMaxUses(maxUses.toString());
    setNewApplicableScope('all');
    setNewSelectedProducts([]);
    setCouponFormError('');
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {activeTab === 'menu' ? (
          <div>
            <h1 className="text-3xl font-display font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] mb-8">
              Owner Dashboard
            </h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {['Overview', 'Inventory', 'Orders', 'Coupons', 'Customers', 'Analytics', 'Settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase().replace(' ', '-'))}
                  className="p-8 bg-zinc-900 border border-zinc-800 rounded-2xl text-left hover:border-fuchsia-500/50 hover:bg-zinc-800 transition-all shadow-[0_0_15px_rgba(224,0,255,0.05)] hover:shadow-[0_0_20px_rgba(224,0,255,0.15)] flex justify-between items-center group"
                >
                  <span className="text-xl font-bold text-white">{tab}</span>
                  <ArrowRight className="w-6 h-6 text-zinc-600 group-hover:text-fuchsia-400 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center mb-8">
              <button
                onClick={() => setActiveTab('menu')}
                className="mr-4 p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all shadow-[0_0_10px_rgba(224,0,255,0.05)]"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-3xl font-display font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' ')}
              </h1>
            </div>

            {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="bg-zinc-900 border border-zinc-800 hover:border-fuchsia-500/30 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] hover:shadow-[0_0_20px_rgba(224,0,255,0.15)] relative overflow-hidden group transition-all">
                  <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                    <stat.icon className="w-16 h-16 text-fuchsia-500 -mt-4 -mr-4 transform rotate-12 drop-shadow-[0_0_10px_rgba(224,0,255,0.8)]" />
                  </div>
                  <div className="relative z-10 flex justify-between items-start mb-4">
                    <div className="p-2 bg-fuchsia-500/10 text-fuchsia-400 rounded-lg shadow-[0_0_10px_rgba(224,0,255,0.2)]">
                      <stat.icon className="w-5 h-5" />
                    </div>
                  </div>
                  <div className="relative z-10">
                    <h3 className="text-zinc-400 font-medium text-sm mb-1">{stat.name}</h3>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-3xl font-display font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">{stat.value}</span>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className={stat.trend === 'up' ? 'text-green-400 font-medium drop-shadow-[0_0_3px_rgba(74,222,128,0.5)]' : 'text-red-400 font-medium drop-shadow-[0_0_3px_rgba(248,113,113,0.5)]'}>
                        {stat.change}
                      </span>
                      <span className="text-zinc-500 ml-1">vs last month</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Recent Orders */}
              <div className="lg:col-span-2 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] overflow-hidden flex flex-col max-h-[500px]">
                <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center shrink-0">
                  <h2 className="text-lg font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">Recent Transactions</h2>
                  <button className="text-sm text-fuchsia-400 font-medium hover:text-fuchsia-300 flex items-center transition-colors">
                    View All <ArrowUpRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="overflow-x-auto overflow-y-auto flex-1">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-zinc-950">
                      <tr>
                        <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">Order/Txn ID</th>
                        <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">User</th>
                        <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">Product</th>
                        <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">Status</th>
                        <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 text-right">Keys</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {purchases.slice(0, 10).map((order) => (
                        <tr key={order.id} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4 px-6 text-sm font-medium text-zinc-300">
                            <div>{order.id}</div>
                          </td>
                          <td className="py-4 px-6 text-sm text-zinc-400">
                            <div>{order.userId === 'anonymous' ? 'Guest' : order.userId}</div>
                            <div className="text-xs text-zinc-500">{new Date(order.date).toLocaleString()}</div>
                          </td>
                          <td className="py-4 px-6 text-sm text-zinc-400">{resolveProductName(order.category, settings.categories, inventory)} - {order.label}</td>
                          <td className="py-4 px-6 text-sm">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]`}>
                              Completed
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm font-medium text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.3)] text-right">{order.keys.length}</td>
                        </tr>
                      ))}
                      {purchases.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-500 text-sm">No recent transactions.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Inventory Overview */}
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] overflow-hidden flex flex-col">
                <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">Live Inventory</h2>
                  <Activity className="w-5 h-5 text-zinc-500" />
                </div>
                <div className="p-6 flex-1 flex flex-col justify-between overflow-y-auto max-h-96">
                  <div className="space-y-6">
                    {settings.categories.map(category => (
                      <div key={category.id}>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">{category.name}</h3>
                        <div className="space-y-4">
                          {inventory.filter(i => i.category === category.id).map((item, i) => (
                            <div key={i} className="flex justify-between items-center bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50 hover:border-fuchsia-500/20 hover:shadow-[0_0_10px_rgba(224,0,255,0.05)] transition-all">
                              <div>
                                <div className="text-sm font-bold text-white">{item.label}</div>
                                <div className="text-xs text-zinc-500">Mon, Wed, Fri</div>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-bold ${item.stock > 0 ? 'text-green-400 drop-shadow-[0_0_3px_rgba(74,222,128,0.5)]' : 'text-red-400 drop-shadow-[0_0_3px_rgba(248,113,113,0.5)]'}`}>
                                  {item.stock > 0 ? `${item.stock} in stock` : 'Out of Stock'}
                                </div>
                                <div className="text-xs text-zinc-400">₹{item.price}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActiveTab('inventory')} className="w-full mt-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-fuchsia-400 text-sm font-semibold rounded-xl border border-zinc-800 transition-colors shrink-0 shadow-[0_0_10px_rgba(224,0,255,0.05)]">
                    Manage Stock Levels
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventory' && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] p-6 overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-6 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">Manage Inventory</h2>
            <div className="space-y-8">
              {settings.categories.map((category) => (
                <div key={category.id}>
                  <h3 className="text-lg font-bold text-fuchsia-400 mb-4 drop-shadow-[0_0_5px_rgba(224,0,255,0.5)]">{category.name}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-950/50">
                          <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">Product</th>
                          <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 text-center">Price</th>
                          <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 text-center">Current Stock</th>
                          <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {inventory.filter(i => i.category === category.id).map((item) => (
                          <tr key={item.value} className="hover:bg-zinc-800/50 transition-colors">
                            <td className="py-4 px-6 text-sm font-medium text-zinc-300">{item.label}</td>
                            <td className="py-4 px-6 text-sm text-zinc-400 text-center font-medium">₹{item.price}</td>
                            <td className="py-4 px-6 text-sm text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${item.stock > 0 ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]' : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]'}`}>
                                {item.stock} Available
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-start justify-end space-x-2">
                                <textarea
                                  rows={1}
                                  value={newKeysInput[item.value] || ''}
                                  onChange={(e) => setNewKeysInput({...newKeysInput, [item.value]: e.target.value})}
                                  placeholder="Paste keys (1/line)"
                                  className="w-48 px-3 py-2 bg-zinc-950 text-white placeholder-zinc-600 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-fuchsia-500 focus:ring-fuchsia-500/20 resize-y min-h-[38px]"
                                />
                                <button
                                  onClick={() => handleAddKeys(item.value)}
                                  disabled={!newKeysInput[item.value]?.trim()}
                                  className="px-4 py-2 bg-fuchsia-600 text-white text-sm font-medium rounded-lg hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_10px_rgba(224,0,255,0.3)] shrink-0 h-[38px]"
                                >
                                  Add Keys
                                </button>
                                <button
                                  onClick={() => setManageKeysProduct(item.value)}
                                  className="px-4 py-2 bg-zinc-800 text-white text-sm font-medium rounded-lg hover:bg-zinc-700 transition-colors shadow-[0_0_10px_rgba(255,255,255,0.05)] shrink-0 h-[38px]"
                                >
                                  Manage Keys
                                </button>
                                {deleteProductConfirmId === item.value ? (
                                  <div className="flex flex-col items-end gap-1 ml-2">
                                    <span className="text-xs text-zinc-400">Are you sure?</span>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          deleteProduct(item.value);
                                          setDeleteProductConfirmId(null);
                                        }}
                                        className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs transition-colors"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => setDeleteProductConfirmId(null)}
                                        className="px-2 py-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded text-xs transition-colors"
                                      >
                                        No
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setDeleteProductConfirmId(item.value)}
                                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors ml-2"
                                    title="Delete Product"
                                  >
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 border-t border-zinc-800 pt-6">
              <h3 className="text-lg font-bold text-white mb-4">Add New Product</h3>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <select
                  value={newProduct.category}
                  onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full sm:w-auto px-4 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-fuchsia-500 focus:ring-fuchsia-500/20"
                >
                  <option value="" disabled>Select Product</option>
                  {settings.categories.map(c => (
                     <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Plan / Duration (e.g. 1 Day, 30 Days)"
                  value={newProduct.label}
                  onChange={(e) => setNewProduct({ ...newProduct, label: e.target.value })}
                  className="w-full sm:w-64 px-4 py-2 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-fuchsia-500 focus:ring-fuchsia-500/20"
                />
                <div className="relative w-full sm:w-48">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">₹</span>
                  <input
                    type="number"
                    placeholder="Price"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                    className="w-full pl-8 pr-4 py-2 bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-fuchsia-500 focus:ring-fuchsia-500/20"
                  />
                </div>
                <button
                  onClick={handleCreateProduct}
                  disabled={!newProduct.label || !newProduct.price}
                  className="w-full sm:w-auto px-6 py-2 bg-fuchsia-600 text-white text-sm font-medium rounded-xl hover:bg-fuchsia-500 disabled:opacity-50 transition-colors shadow-[0_0_15px_rgba(224,0,255,0.4)] hover:shadow-[0_0_20px_rgba(224,0,255,0.6)]"
                >
                  Create Product
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'settings' && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] p-6 overflow-hidden">
            <h2 className="text-xl font-bold text-white mb-6 drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">Store Settings</h2>
            
            <div className="space-y-8 max-w-2xl">
              <div className="border-b border-zinc-800 pb-8 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Site Name</label>
                  <input
                    type="text"
                    value={draftSiteName}
                    onChange={(e) => {
                      setDraftSiteName(e.target.value);
                      setHasChanges(true);
                    }}
                    className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-fuchsia-500 focus:ring-fuchsia-500/20 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-1">Site Logo URL (or upload)</label>
                  <div className="flex items-center gap-3">
                    {draftSiteLogoUrl && <img src={draftSiteLogoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-zinc-800 shrink-0" />}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setDraftSiteLogoUrl(reader.result as string);
                            setHasChanges(true);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-fuchsia-500/10 file:text-fuchsia-400 hover:file:bg-fuchsia-500/20 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-300">Products (Catalog)</h3>
                  <p className="text-xs text-zinc-500">Configure product names, logos, and appearances</p>
                </div>
                <button
                  onClick={handleCreateCategory}
                  className="px-4 py-2 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 text-sm font-medium rounded-xl hover:bg-fuchsia-500/20 transition-colors shadow-[0_0_10px_rgba(224,0,255,0.1)]"
                >
                  + Add Product
                </button>
              </div>

              {draftCategories.map((category, index) => (
                <div key={category.id} className={index > 0 ? "border-t border-zinc-800 pt-8" : ""}>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-white">{category.name || 'New Product'}</h4>
                    {deleteCategoryConfirmId === category.id ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-zinc-400">Are you sure?</span>
                        <button
                          onClick={() => {
                            const updated = draftCategories.filter(c => c.id !== category.id);
                            setDraftCategories(updated);
                            setHasChanges(true);
                            setDeleteCategoryConfirmId(null);
                          }}
                          className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                        >
                          Yes, Delete
                        </button>
                        <button
                          onClick={() => setDeleteCategoryConfirmId(null)}
                          className="px-3 py-1 bg-zinc-800 text-zinc-300 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteCategoryConfirmId(category.id)}
                        className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Product Name</label>
                      <input
                        type="text"
                        value={category.name}
                        onChange={(e) => {
                          const updated = draftCategories.map(c => c.id === category.id ? { ...c, name: e.target.value } : c);
                          setDraftCategories(updated);
                          setHasChanges(true);
                        }}
                        className="w-full px-4 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-fuchsia-500 focus:ring-fuchsia-500/20 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Logo (Upload / File)</label>
                      <div className="flex items-center gap-3">
                        {category.logoUrl && <img src={category.logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover border border-zinc-800 shrink-0" />}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleLogoUpload(category.id, e.target.files?.[0] || null)}
                          className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-fuchsia-500/10 file:text-fuchsia-400 hover:file:bg-fuchsia-500/20 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {hasChanges && (
                <div className="mt-8 pt-6 border-t border-zinc-800 flex items-center justify-end gap-4 relative z-10">
                  <button
                    onClick={handleDiscardChanges}
                    className="px-6 py-2 bg-zinc-800 text-zinc-300 font-medium rounded-xl hover:bg-zinc-700 transition-colors"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSaveSettings}
                    className="px-6 py-2 bg-fuchsia-600 text-white font-medium rounded-xl hover:bg-fuchsia-500 transition-colors shadow-[0_0_15px_rgba(224,0,255,0.4)] hover:shadow-[0_0_20px_rgba(224,0,255,0.6)]"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'orders' && (
          <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] overflow-hidden flex flex-col min-h-[500px]">
            <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">All Transactions</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-zinc-950/50">
                  <tr>
                    <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">Order/Txn ID</th>
                    <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">User</th>
                    <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">Product</th>
                    <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">Status</th>
                    <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 text-right">Keys</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {purchases.map((order) => (
                    <tr key={order.id} className="hover:bg-zinc-800/50 transition-colors">
                      <td className="py-4 px-6 text-sm font-medium text-zinc-300">
                        <div>{order.id}</div>
                      </td>
                      <td className="py-4 px-6 text-sm text-zinc-400">
                        <div>{order.userId === 'anonymous' ? 'Guest' : order.userId}</div>
                        <div className="text-xs text-zinc-500">{new Date(order.date).toLocaleString()}</div>
                      </td>
                      <td className="py-4 px-6 text-sm text-zinc-400">{resolveProductName(order.category, settings.categories, inventory)} - {order.label}</td>
                      <td className="py-4 px-6 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]">
                          Completed
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm font-medium text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.3)] text-right">{order.keys.length}</td>
                    </tr>
                  ))}
                  {purchases.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-zinc-500 text-sm">No transactions found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="space-y-8">
            {/* Top User Statistics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Total Users</p>
                  <p className="text-3xl font-bold font-display text-white">{users.length}</p>
                  <p className="text-xs text-zinc-500 mt-1">All registered accounts</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Active Buyers</p>
                  <p className="text-3xl font-bold font-display text-emerald-400">{users.filter(u => u.totalOrders > 0).length}</p>
                  <p className="text-xs text-zinc-500 mt-1">Users with completed orders</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <ShoppingCart className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Total Customer Spend</p>
                  <p className="text-3xl font-bold font-display text-white">₹{users.reduce((sum, u) => sum + (u.totalSpent || 0), 0).toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 mt-1">Lifetime user purchases</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Total Wallet Funds</p>
                  <p className="text-3xl font-bold font-display text-fuchsia-400">₹{users.reduce((sum, u) => sum + (u.balance || 0), 0).toLocaleString()}</p>
                  <p className="text-xs text-zinc-500 mt-1">Circulating user balances</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <Wallet className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Main Users Table Container */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] overflow-hidden flex flex-col">
              {/* Table Toolbar */}
              <div className="p-6 border-b border-zinc-800 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                      User Accounts & Customer Details
                    </h2>
                    <p className="text-sm text-zinc-400 mt-0.5">
                      View all user profiles, emails, joined dates, balances, and inspect complete order histories.
                    </p>
                  </div>
                  <div className="text-xs text-zinc-400 font-mono bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800 self-start md:self-auto">
                    Showing <span className="text-fuchsia-400 font-bold">{
                      users.filter(u => {
                        const q = userSearchQuery.trim().toLowerCase();
                        const matchesQuery = !q || 
                          (u.displayName && u.displayName.toLowerCase().includes(q)) ||
                          (u.email && u.email.toLowerCase().includes(q)) ||
                          (u.customId && u.customId.toLowerCase().includes(q)) ||
                          (u.uid && u.uid.toLowerCase().includes(q));
                        if (!matchesQuery) return false;
                        if (userFilter === 'buyers') return u.totalOrders > 0;
                        if (userFilter === 'leads') return u.totalOrders === 0;
                        if (userFilter === 'balance') return (u.balance || 0) > 0;
                        if (userFilter === 'vip') return (u.totalSpent || 0) >= 1000;
                        return true;
                      }).length
                    }</span> of {users.length} users
                  </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                  {/* Search Input */}
                  <div className="md:col-span-6 relative">
                    <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      placeholder="Search by name, email, custom ID, or UID..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
                    />
                    {userSearchQuery && (
                      <button
                        onClick={() => setUserSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Filter Pills */}
                  <div className="md:col-span-3 flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-fuchsia-500"
                    >
                      <option value="all">All Users ({users.length})</option>
                      <option value="buyers">Active Buyers ({users.filter(u => u.totalOrders > 0).length})</option>
                      <option value="leads">Zero Orders ({users.filter(u => u.totalOrders === 0).length})</option>
                      <option value="balance">Has Balance ({users.filter(u => (u.balance || 0) > 0).length})</option>
                      <option value="vip">VIP Spenders ₹1k+ ({users.filter(u => (u.totalSpent || 0) >= 1000).length})</option>
                    </select>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="md:col-span-3">
                    <select
                      value={userSortBy}
                      onChange={(e) => setUserSortBy(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-fuchsia-500"
                    >
                      <option value="recent">Sort: Most Recent Activity</option>
                      <option value="spent">Sort: Highest Spent (₹)</option>
                      <option value="orders">Sort: Most Orders</option>
                      <option value="balance">Sort: Highest Balance (₹)</option>
                      <option value="name">Sort: Name (A-Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-950/60">
                    <tr>
                      <th className="py-3.5 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">User Profile</th>
                      <th className="py-3.5 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Contact / Email</th>
                      <th className="py-3.5 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Dates & Activity</th>
                      <th className="py-3.5 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">Orders & Spend</th>
                      <th className="py-3.5 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-right">Wallet Balance</th>
                      <th className="py-3.5 px-6 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80">
                    {(() => {
                      const userList = users.filter(u => {
                        const q = userSearchQuery.trim().toLowerCase();
                        const matchesQuery = !q || 
                          (u.displayName && u.displayName.toLowerCase().includes(q)) ||
                          (u.email && u.email.toLowerCase().includes(q)) ||
                          (u.customId && u.customId.toLowerCase().includes(q)) ||
                          (u.uid && u.uid.toLowerCase().includes(q));

                        if (!matchesQuery) return false;

                        if (userFilter === 'buyers') return u.totalOrders > 0;
                        if (userFilter === 'leads') return u.totalOrders === 0;
                        if (userFilter === 'balance') return (u.balance || 0) > 0;
                        if (userFilter === 'vip') return (u.totalSpent || 0) >= 1000;
                        return true;
                      }).sort((a, b) => {
                        if (userSortBy === 'spent') return (b.totalSpent || 0) - (a.totalSpent || 0);
                        if (userSortBy === 'orders') return (b.totalOrders || 0) - (a.totalOrders || 0);
                        if (userSortBy === 'balance') return (b.balance || 0) - (a.balance || 0);
                        if (userSortBy === 'name') return (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '');
                        const timeA = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
                        const timeB = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
                        return timeB - timeA;
                      });

                      if (userList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="py-16 text-center text-zinc-500">
                              <Users className="w-12 h-12 mx-auto mb-3 opacity-30 text-zinc-400" />
                              <p className="text-base font-medium text-zinc-300">No users found</p>
                              <p className="text-xs text-zinc-500 mt-1">Try adjusting your search query or filter options.</p>
                            </td>
                          </tr>
                        );
                      }

                      return userList.map((user) => {
                        const isOwner = user.role === 'owner' || user.email === 'barikarman12@gmail.com' || user.email === 'barikarman207@gmail.com';
                        const isVip = (user.totalSpent || 0) >= 1000;
                        const initialLetter = (user.displayName || user.email || 'U').charAt(0).toUpperCase();

                        return (
                          <tr key={user.uid} className="hover:bg-zinc-800/40 transition-colors group">
                            {/* Profile Info */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                                  isOwner 
                                    ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-[0_0_12px_rgba(234,179,8,0.4)]' 
                                    : isVip 
                                    ? 'bg-gradient-to-tr from-fuchsia-600 to-purple-400 text-white shadow-[0_0_10px_rgba(224,0,255,0.3)]'
                                    : 'bg-zinc-800 border border-zinc-700 text-zinc-300'
                                }`}>
                                  {initialLetter}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-white text-sm truncate max-w-[180px]">
                                      {user.displayName || user.customId || 'Store User'}
                                    </span>
                                    {isOwner ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                                        👑 Owner
                                      </span>
                                    ) : isVip ? (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/30">
                                        💎 VIP
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                                        Customer
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-zinc-400 flex items-center gap-1 font-mono mt-0.5">
                                    <span>@{user.customId || user.email?.split('@')[0] || 'user'}</span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Contact / Email */}
                            <td className="py-4 px-6 text-sm">
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                                  <span className="text-zinc-300 text-xs font-mono truncate max-w-[190px]">
                                    {user.email || 'No email associated'}
                                  </span>
                                  {user.email && (
                                    <button
                                      onClick={() => handleCopyText(user.email, `email_${user.uid}`)}
                                      className="text-zinc-500 hover:text-fuchsia-400 transition-colors p-0.5"
                                      title="Copy email"
                                    >
                                      {copiedText === `email_${user.uid}` ? (
                                        <Check className="w-3 h-3 text-green-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 font-mono">
                                  <span>UID:</span>
                                  <span className="truncate max-w-[120px]">{user.uid}</span>
                                  <button
                                    onClick={() => handleCopyText(user.uid, `uid_${user.uid}`)}
                                    className="hover:text-fuchsia-400 transition-colors"
                                    title="Copy UID"
                                  >
                                    {copiedText === `uid_${user.uid}` ? (
                                      <Check className="w-2.5 h-2.5 text-green-400" />
                                    ) : (
                                      <Copy className="w-2.5 h-2.5" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            </td>

                            {/* Dates & Activity */}
                            <td className="py-4 px-6 text-sm">
                              <div className="space-y-1 text-xs">
                                <div className="text-zinc-300 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-zinc-500 shrink-0" />
                                  <span>Active: <strong className="text-zinc-200 font-normal">{formatTimeAgo(user.lastLoginAt)}</strong></span>
                                </div>
                                <div className="text-zinc-500 flex items-center gap-1 text-[11px]">
                                  <Calendar className="w-3 h-3 text-zinc-600 shrink-0" />
                                  <span>Joined: {formatUserDate(user.createdAt).split(',')[0]}</span>
                                </div>
                              </div>
                            </td>

                            {/* Orders & Total Spend */}
                            <td className="py-4 px-6 text-sm">
                              <div>
                                <div className="text-white font-medium text-xs flex items-center gap-1.5">
                                  <span>{user.totalOrders} {user.totalOrders === 1 ? 'order' : 'orders'}</span>
                                  <span className="text-zinc-600">•</span>
                                  <span className="text-zinc-400">{user.totalKeys} keys</span>
                                </div>
                                <div className="text-xs font-semibold text-emerald-400 mt-0.5">
                                  ₹{user.totalSpent.toLocaleString()} spent
                                </div>
                              </div>
                            </td>

                            {/* Wallet Balance */}
                            <td className="py-4 px-6 text-sm text-right">
                              <div className="inline-flex flex-col items-end">
                                <span className="font-bold text-base text-fuchsia-400 drop-shadow-[0_0_8px_rgba(224,0,255,0.3)]">
                                  ₹{(user.balance || 0).toLocaleString()}
                                </span>
                                <button
                                  onClick={() => {
                                    setBalanceAdjustUser(user);
                                    setBalanceAction('add');
                                    setBalanceAmount('');
                                    setBalanceNote('');
                                    setBalanceSuccessMsg('');
                                  }}
                                  className="text-[11px] text-zinc-400 hover:text-fuchsia-300 underline underline-offset-2 transition-colors mt-0.5 flex items-center gap-0.5"
                                >
                                  <Wallet className="w-2.5 h-2.5" />
                                  Adjust
                                </button>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => setSelectedUserDetail(user)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-fuchsia-600/20 hover:border-fuchsia-500/40 border border-zinc-700 text-xs font-medium text-white transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)] hover:shadow-[0_0_15px_rgba(224,0,255,0.2)] group-hover:border-zinc-600"
                              >
                                <Eye className="w-3.5 h-3.5 text-fuchsia-400" />
                                <span>All Details</span>
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* CUSTOMER 360° ALL DETAILS MODAL */}
            {selectedUserDetail && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-4xl w-full my-8 overflow-hidden shadow-[0_0_50px_rgba(224,0,255,0.15)] flex flex-col max-h-[90vh]">
                  
                  {/* Modal Header */}
                  <div className="p-6 border-b border-zinc-800 flex items-start justify-between bg-zinc-950/70 shrink-0">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold ${
                        selectedUserDetail.role === 'owner' || selectedUserDetail.email === 'barikarman12@gmail.com'
                          ? 'bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-[0_0_20px_rgba(234,179,8,0.4)]'
                          : 'bg-gradient-to-tr from-fuchsia-600 to-purple-600 text-white shadow-[0_0_20px_rgba(224,0,255,0.3)]'
                      }`}>
                        {(selectedUserDetail.displayName || selectedUserDetail.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-xl font-bold text-white">
                            {selectedUserDetail.displayName || selectedUserDetail.customId || 'User Profile'}
                          </h3>
                          {selectedUserDetail.role === 'owner' || selectedUserDetail.email === 'barikarman12@gmail.com' ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                              👑 Store Owner
                            </span>
                          ) : (selectedUserDetail.totalSpent || 0) >= 1000 ? (
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-fuchsia-500/10 text-fuchsia-300 border border-fuchsia-500/30">
                              💎 VIP Customer
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                              Customer
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Active Account
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 font-mono mt-1">
                          @{selectedUserDetail.customId || selectedUserDetail.email?.split('@')[0] || 'user'} • UID: {selectedUserDetail.uid}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedUserDetail(null)}
                      className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Modal Body (Scrollable) */}
                  <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    
                    {/* User KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl">
                        <span className="text-xs text-zinc-400 block mb-1">Wallet Balance</span>
                        <div className="text-2xl font-bold text-fuchsia-400">₹{(selectedUserDetail.balance || 0).toLocaleString()}</div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <button
                            onClick={() => {
                              setBalanceAdjustUser(selectedUserDetail);
                              setBalanceAction('add');
                              setBalanceAmount('');
                              setBalanceNote('');
                              setBalanceSuccessMsg('');
                            }}
                            className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 font-medium underline"
                          >
                            + Add / - Deduct
                          </button>
                          <span className="text-zinc-600 text-xs">•</span>
                          <button
                            onClick={() => {
                              setRefundModalOrder({
                                userId: selectedUserDetail.uid,
                                userEmail: selectedUserDetail.email,
                                amount: 100,
                                productName: 'Direct Wallet Refund'
                              });
                              setRefundAmountInput('');
                              setRefundReasonInput('');
                              setRefundSuccessMsg('');
                            }}
                            className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-0.5"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            Refund
                          </button>
                        </div>
                      </div>

                      <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl">
                        <span className="text-xs text-zinc-400 block mb-1">Total Orders</span>
                        <div className="text-2xl font-bold text-white">{selectedUserDetail.totalOrders}</div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">Completed purchases</span>
                      </div>

                      <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl">
                        <span className="text-xs text-zinc-400 block mb-1">Total Spent</span>
                        <div className="text-2xl font-bold text-emerald-400">₹{selectedUserDetail.totalSpent.toLocaleString()}</div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">Lifetime value</span>
                      </div>

                      <div className="bg-zinc-950/60 border border-zinc-800/80 p-4 rounded-2xl">
                        <span className="text-xs text-zinc-400 block mb-1">Keys Purchased</span>
                        <div className="text-2xl font-bold text-cyan-400">{selectedUserDetail.totalKeys}</div>
                        <span className="text-[11px] text-zinc-500 mt-1 block">License keys issued</span>
                      </div>
                    </div>

                    {/* Detailed Information Grid */}
                    <div className="bg-zinc-950/40 border border-zinc-800 rounded-2xl p-5">
                      <h4 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4 text-fuchsia-400" />
                        Account & Identity Details
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60">
                          <span className="text-zinc-500 font-medium block">Full User ID (UID)</span>
                          <div className="flex items-center justify-between font-mono text-zinc-300">
                            <span className="break-all">{selectedUserDetail.uid}</span>
                            <button
                              onClick={() => handleCopyText(selectedUserDetail.uid, 'modal_uid')}
                              className="text-zinc-500 hover:text-fuchsia-400 ml-2 shrink-0 p-1"
                              title="Copy UID"
                            >
                              {copiedText === 'modal_uid' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60">
                          <span className="text-zinc-500 font-medium block">Email Address</span>
                          <div className="flex items-center justify-between font-mono text-zinc-300">
                            <span className="break-all">{selectedUserDetail.email || 'None'}</span>
                            {selectedUserDetail.email && (
                              <button
                                onClick={() => handleCopyText(selectedUserDetail.email, 'modal_email')}
                                className="text-zinc-500 hover:text-fuchsia-400 ml-2 shrink-0 p-1"
                                title="Copy Email"
                              >
                                {copiedText === 'modal_email' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60">
                          <span className="text-zinc-500 font-medium block">Registration / Joined Date</span>
                          <div className="text-zinc-300 font-mono">
                            {formatUserDate(selectedUserDetail.createdAt)}
                          </div>
                        </div>

                        <div className="space-y-1 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/60">
                          <span className="text-zinc-500 font-medium block">Last Login / Activity</span>
                          <div className="text-zinc-300 font-mono flex items-center justify-between">
                            <span>{formatUserDate(selectedUserDetail.lastLoginAt)}</span>
                            <span className="text-zinc-500 text-[11px]">({formatTimeAgo(selectedUserDetail.lastLoginAt)})</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* User Activity & Transaction Navigation Tabs */}
                    <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
                      <button
                        onClick={() => setUserModalTab('deposits')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                          userModalTab === 'deposits'
                            ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/40 shadow-[0_0_15px_rgba(224,0,255,0.15)]'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                        }`}
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        Money Added & Payment Sources
                        {(() => {
                          const userTxCount = allWalletTransactions.filter(
                            t => t.userId === selectedUserDetail.uid || (selectedUserDetail.email && t.userEmail === selectedUserDetail.email)
                          ).length;
                          return userTxCount > 0 ? (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-fuchsia-500/30 text-fuchsia-200">
                              {userTxCount}
                            </span>
                          ) : null;
                        })()}
                      </button>

                      <button
                        onClick={() => setUserModalTab('orders')}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                          userModalTab === 'orders'
                            ? 'bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/40 shadow-[0_0_15px_rgba(224,0,255,0.15)]'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent'
                        }`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        Orders & Delivered Keys
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
                          {purchases.filter(p => p.userId === selectedUserDetail.uid).length}
                        </span>
                      </button>
                    </div>

                    {/* TAB 1: MONEY ADDED & PAYMENT SOURCES (Payment history, UPI/Gateway, Reference/UTR, Note, Refunds) */}
                    {userModalTab === 'deposits' && (
                      <div className="space-y-4">
                        {(() => {
                          const userTxList = allWalletTransactions.filter(
                            t => t.userId === selectedUserDetail.uid || (selectedUserDetail.email && t.userEmail === selectedUserDetail.email)
                          );
                          const totalDeposited = userTxList
                            .filter(t => t.type === 'deposit')
                            .reduce((acc, t) => acc + (t.amount || 0), 0);
                          const totalRefunded = userTxList
                            .filter(t => t.type === 'refund')
                            .reduce((acc, t) => acc + (t.amount || 0), 0);

                          return (
                            <>
                              {/* Source Summary Ribbon */}
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
                                  <span className="text-[11px] text-zinc-400 font-medium block">Total Money Deposited</span>
                                  <div className="text-lg font-bold text-emerald-400 mt-0.5">₹{totalDeposited.toLocaleString()}</div>
                                  <span className="text-[10px] text-zinc-500">From UPI / QR / Payment gateway</span>
                                </div>
                                <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl">
                                  <span className="text-[11px] text-zinc-400 font-medium block">Total Refunded to Wallet</span>
                                  <div className="text-lg font-bold text-amber-400 mt-0.5">₹{totalRefunded.toLocaleString()}</div>
                                  <span className="text-[10px] text-zinc-500">Auto stock refunds & admin refunds</span>
                                </div>
                                <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl flex flex-col justify-between">
                                  <div>
                                    <span className="text-[11px] text-zinc-400 font-medium block">Total Recorded Logs</span>
                                    <div className="text-lg font-bold text-white mt-0.5">{userTxList.length} Transactions</div>
                                  </div>
                                  <div className="flex items-center gap-2 mt-2">
                                    <button
                                      onClick={() => {
                                        setBalanceAdjustUser(selectedUserDetail);
                                        setBalanceAction('add');
                                        setBalanceAmount('');
                                        setBalanceNote('Manual deposit verification');
                                        setBalanceSuccessMsg('');
                                      }}
                                      className="text-[10px] font-semibold text-fuchsia-400 hover:text-fuchsia-300 underline"
                                    >
                                      + Add Money
                                    </button>
                                    <span className="text-zinc-600 text-xs">•</span>
                                    <button
                                      onClick={() => {
                                        setRefundModalOrder({
                                          userId: selectedUserDetail.uid,
                                          userEmail: selectedUserDetail.email,
                                          amount: 100,
                                          productName: 'Direct Wallet Credit'
                                        });
                                        setRefundAmountInput('');
                                        setRefundReasonInput('');
                                        setRefundSuccessMsg('');
                                      }}
                                      className="text-[10px] font-semibold text-amber-400 hover:text-amber-300 underline"
                                    >
                                      + Issue Refund
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Transaction list */}
                              {userTxList.length === 0 ? (
                                <div className="bg-zinc-950/30 border border-zinc-800/80 rounded-2xl p-8 text-center text-zinc-500">
                                  <ArrowDownLeft className="w-10 h-10 mx-auto mb-2 opacity-30 text-emerald-400" />
                                  <p className="text-sm text-zinc-400 font-medium">No payment or deposit records yet</p>
                                  <p className="text-xs text-zinc-600 mt-1 max-w-md mx-auto">
                                    When this user adds money via UPI QR, payment gateways, or receives an auto-refund, the payment source, through method, UTR reference number, and timestamp will be logged here.
                                  </p>
                                  <button
                                    onClick={() => {
                                      setBalanceAdjustUser(selectedUserDetail);
                                      setBalanceAction('add');
                                      setBalanceAmount('');
                                      setBalanceNote('UPI Deposit verification');
                                      setBalanceSuccessMsg('');
                                    }}
                                    className="mt-4 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-colors"
                                  >
                                    + Add Money to User
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {userTxList.map((tx) => {
                                    const isDeposit = tx.type === 'deposit';
                                    const isRefund = tx.type === 'refund';
                                    const isAdjustment = tx.type === 'adjustment';

                                    return (
                                      <div
                                        key={tx.id}
                                        className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 space-y-3 hover:border-zinc-700 transition-colors"
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                                          <div className="flex items-center gap-2">
                                            {isDeposit && (
                                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                                                <ArrowDownLeft className="w-3.5 h-3.5" />
                                                Money Added / Deposit
                                              </span>
                                            )}
                                            {isRefund && (
                                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                Refund Credited
                                              </span>
                                            )}
                                            {isAdjustment && (
                                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30 flex items-center gap-1.5">
                                                <Wallet className="w-3.5 h-3.5" />
                                                Balance Adjustment
                                              </span>
                                            )}
                                            {!isDeposit && !isRefund && !isAdjustment && (
                                              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5">
                                                <ShoppingCart className="w-3.5 h-3.5" />
                                                Purchase / Deduct
                                              </span>
                                            )}

                                            <span className="text-xs text-zinc-500 font-mono">
                                              {formatUserDate(tx.date)}
                                            </span>
                                          </div>

                                          <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
                                            <div className={`text-base font-bold font-mono ${
                                              isDeposit || isRefund || (isAdjustment && tx.amount > 0)
                                                ? 'text-emerald-400'
                                                : 'text-rose-400'
                                            }`}>
                                              {isDeposit || isRefund || (isAdjustment && tx.amount > 0) ? '+' : '-'}₹{Math.abs(tx.amount).toLocaleString()}
                                            </div>
                                            {typeof tx.balanceAfter === 'number' && (
                                              <span className="text-[10px] text-zinc-500 font-mono">
                                                Bal after: ₹{tx.balanceAfter.toLocaleString()}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Method & Source Breakdown */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/40 space-y-0.5">
                                            <span className="text-[10px] text-zinc-500 font-medium block">
                                              Payment Source / Through Method:
                                            </span>
                                            <span className="font-semibold text-white flex items-center gap-1.5">
                                              <CreditCard className="w-3.5 h-3.5 text-fuchsia-400" />
                                              {tx.method || (isDeposit ? 'UPI / QR Payment' : isRefund ? 'Auto Refund System' : 'Internal System')}
                                            </span>
                                          </div>

                                          <div className="bg-zinc-900/60 p-2.5 rounded-xl border border-zinc-800/40 space-y-0.5">
                                            <span className="text-[10px] text-zinc-500 font-medium block">
                                              Transaction / Reference ID:
                                            </span>
                                            <div className="flex items-center justify-between font-mono text-zinc-300">
                                              <span className="break-all text-[11px] select-all">
                                                {tx.referenceId || tx.id}
                                              </span>
                                              <button
                                                onClick={() => handleCopyText(tx.referenceId || tx.id, `tx_${tx.id}`)}
                                                className="text-zinc-500 hover:text-white ml-1.5 p-1 shrink-0"
                                                title="Copy Reference ID"
                                              >
                                                {copiedText === `tx_${tx.id}` ? (
                                                  <Check className="w-3 h-3 text-green-400" />
                                                ) : (
                                                  <Copy className="w-3 h-3" />
                                                )}
                                              </button>
                                            </div>
                                          </div>
                                        </div>

                                        {/* Notes & Reason */}
                                        {tx.note && (
                                          <div className="text-xs bg-zinc-900/40 px-3 py-2 rounded-xl border border-zinc-800/30 text-zinc-300 flex items-start gap-2">
                                            <Info className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                                            <span>{tx.note}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    )}

                    {/* TAB 2: ORDER HISTORY & DELIVERED KEYS */}
                    {userModalTab === 'orders' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                            <History className="w-4 h-4 text-fuchsia-400" />
                            Order History & Delivered Keys ({
                              purchases.filter(p => p.userId === selectedUserDetail.uid).length
                            })
                          </h4>
                          <span className="text-xs text-zinc-500">
                            Refund an order with 1 click to notify user
                          </span>
                        </div>

                        {(() => {
                          const userOrders = purchases.filter(p => p.userId === selectedUserDetail.uid);
                          if (userOrders.length === 0) {
                            return (
                              <div className="bg-zinc-950/30 border border-zinc-800/80 rounded-2xl p-8 text-center text-zinc-500">
                                <Package className="w-10 h-10 mx-auto mb-2 opacity-30 text-zinc-400" />
                                <p className="text-sm text-zinc-400">No orders placed by this user yet.</p>
                                <p className="text-xs text-zinc-600 mt-1">When this user buys keys or redeems balances, their full order logs will appear here.</p>
                              </div>
                            );
                          }

                          return (
                            <div className="space-y-3">
                              {userOrders.map((order, idx) => {
                                const item = inventory.find(i => i.value === order.value);
                                const orderPrice = typeof order.amount === 'number' 
                                  ? order.amount 
                                  : (item ? item.price : 0) * (order.keys?.length || 1);
                                const isOrderRefunded = (order as any).refunded;
                                const refundAmt = (order as any).refundAmount || orderPrice;

                                return (
                                  <div key={order.id || idx} className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 space-y-3">
                                    {/* Order Header */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-semibold text-white text-sm">
                                            {resolveProductName(order.category, settings.categories, inventory)} • {order.label}
                                          </span>
                                          {isOrderRefunded ? (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                              <RefreshCw className="w-3 h-3" />
                                              Refunded (₹{refundAmt})
                                            </span>
                                          ) : (
                                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                              Completed
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-xs text-zinc-400 font-mono mt-0.5 flex items-center gap-2">
                                          <span>Order #{order.id}</span>
                                          <span>•</span>
                                          <span>{formatUserDate(order.date)}</span>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-3">
                                        <div className="text-right">
                                          <div className="text-sm font-bold text-emerald-400">
                                            ₹{orderPrice.toLocaleString()}
                                          </div>
                                          <div className="text-[11px] text-zinc-500">
                                            {order.keys.length} {order.keys.length === 1 ? 'key' : 'keys'} delivered
                                          </div>
                                        </div>

                                        {/* Refund Order Button */}
                                        {!isOrderRefunded ? (
                                          <button
                                            onClick={() => {
                                              setRefundModalOrder({
                                                orderId: order.id,
                                                userId: selectedUserDetail.uid,
                                                userEmail: selectedUserDetail.email,
                                                amount: orderPrice,
                                                productName: `${resolveProductName(order.category, settings.categories, inventory)} (${order.label})`
                                              });
                                              setRefundAmountInput(orderPrice.toString());
                                              setRefundReasonInput('Key issue / customer refund request');
                                              setRefundSuccessMsg('');
                                            }}
                                            className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 shrink-0"
                                            title="Issue refund and notify customer"
                                          >
                                            <RefreshCw className="w-3 h-3" />
                                            Refund Order
                                          </button>
                                        ) : (
                                          <div className="text-[11px] text-zinc-500 font-mono italic">
                                            {(order as any).refundReason ? `Reason: ${(order as any).refundReason}` : 'Refund processed'}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Keys Display */}
                                    <div>
                                      <div className="flex items-center justify-between text-xs text-zinc-400 mb-1.5">
                                        <span className="flex items-center gap-1 font-medium text-zinc-300">
                                          <Key className="w-3.5 h-3.5 text-cyan-400" />
                                          Delivered Keys ({order.keys.length}):
                                        </span>
                                        {order.keys.length > 1 && (
                                          <button
                                            onClick={() => handleCopyText(order.keys.join('\n'), `all_keys_${order.id}`)}
                                            className="text-[11px] text-fuchsia-400 hover:text-fuchsia-300 transition-colors flex items-center gap-1 font-mono"
                                          >
                                            {copiedText === `all_keys_${order.id}` ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                            Copy All Keys
                                          </button>
                                        )}
                                      </div>
                                      <div className="space-y-1.5">
                                        {order.keys.map((keyStr, kIdx) => (
                                          <div
                                            key={kIdx}
                                            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 flex items-center justify-between font-mono text-xs text-zinc-200 hover:border-zinc-700 transition-colors"
                                          >
                                            <span className="break-all select-all text-fuchsia-300 font-semibold">{keyStr}</span>
                                            <button
                                              onClick={() => handleCopyText(keyStr, `key_${order.id}_${kIdx}`)}
                                              className="text-zinc-500 hover:text-white p-1 ml-2 shrink-0 transition-colors"
                                              title="Copy Key"
                                            >
                                              {copiedText === `key_${order.id}_${kIdx}` ? (
                                                <Check className="w-3.5 h-3.5 text-green-400" />
                                              ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    <div className="text-xs text-zinc-500">
                      Viewing profile data for <span className="text-zinc-300 font-medium">{selectedUserDetail.email || selectedUserDetail.uid}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const summary = `USER PROFILE:\nName: ${selectedUserDetail.displayName}\nUsername: @${selectedUserDetail.customId}\nEmail: ${selectedUserDetail.email}\nUID: ${selectedUserDetail.uid}\nBalance: ₹${selectedUserDetail.balance}\nOrders: ${selectedUserDetail.totalOrders}\nTotal Spent: ₹${selectedUserDetail.totalSpent}\nJoined: ${selectedUserDetail.createdAt}`;
                          handleCopyText(summary, 'user_summary');
                        }}
                        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl text-xs font-medium text-white transition-colors flex items-center gap-1.5"
                      >
                        {copiedText === 'user_summary' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                        Copy User Summary
                      </button>
                      <button
                        onClick={() => setSelectedUserDetail(null)}
                        className="px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl text-xs font-medium text-white transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* QUICK ADJUST WALLET BALANCE MODAL */}
            {balanceAdjustUser && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full overflow-hidden shadow-[0_0_40px_rgba(224,0,255,0.15)] p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">Adjust Customer Balance</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        User: <span className="text-zinc-200 font-medium">{balanceAdjustUser.displayName || balanceAdjustUser.email}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setBalanceAdjustUser(null)}
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Current Balance */}
                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 flex justify-between items-center">
                    <span className="text-xs text-zinc-400">Current Balance:</span>
                    <span className="text-xl font-bold text-fuchsia-400">₹{(balanceAdjustUser.balance || 0).toLocaleString()}</span>
                  </div>

                  {/* Action Mode (Add vs Deduct) */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setBalanceAction('add')}
                      className={`py-2.5 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 border transition-all ${
                        balanceAction === 'add'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Balance (+)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBalanceAction('deduct')}
                      className={`py-2.5 rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 border transition-all ${
                        balanceAction === 'deduct'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800 hover:bg-zinc-800'
                      }`}
                    >
                      <span className="font-bold text-sm">−</span>
                      Deduct Balance (−)
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Amount (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={balanceAmount}
                        onChange={(e) => setBalanceAmount(e.target.value)}
                        placeholder="e.g. 500"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500"
                      />
                    </div>
                  </div>

                  {/* Note / Reason */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Reason / Reference Note (Optional)</label>
                    <input
                      type="text"
                      value={balanceNote}
                      onChange={(e) => setBalanceNote(e.target.value)}
                      placeholder="e.g. UPI Deposit Verification / Bonus / Refund"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-fuchsia-500"
                    />
                  </div>

                  {/* Computed New Balance Preview */}
                  {balanceAmount && parseFloat(balanceAmount) > 0 && (
                    <div className="bg-zinc-950/80 p-3 rounded-xl border border-zinc-800 text-xs flex justify-between items-center font-mono">
                      <span className="text-zinc-400">New Balance after update:</span>
                      <span className="font-bold text-white text-sm">
                        ₹{Math.max(0, (balanceAdjustUser.balance || 0) + (balanceAction === 'add' ? parseFloat(balanceAmount) : -parseFloat(balanceAmount))).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Notification confirmation badge */}
                  <div className="bg-fuchsia-950/30 border border-fuchsia-500/20 rounded-xl p-2.5 text-[11px] text-fuchsia-300 flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-fuchsia-400 shrink-0" />
                    <span>
                      {balanceAction === 'add' ? 'User will receive a notification of +₹' + (balanceAmount || '0') + ' added to wallet.' : 'User will receive a notification of -₹' + (balanceAmount || '0') + ' deducted from wallet.'}
                    </span>
                  </div>

                  {balanceSuccessMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{balanceSuccessMsg}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setBalanceAdjustUser(null)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!balanceAmount || parseFloat(balanceAmount) <= 0}
                      onClick={async () => {
                        const amt = parseFloat(balanceAmount);
                        if (isNaN(amt) || amt <= 0) return;
                        const current = balanceAdjustUser.balance || 0;
                        const target = balanceAction === 'add' ? current + amt : Math.max(0, current - amt);
                        await updateUserBalance(balanceAdjustUser.uid, target, balanceNote, {
                          action: balanceAction,
                          amount: amt,
                          method: balanceAction === 'add' ? 'Manual Admin Credit' : 'Manual Admin Debit',
                          referenceId: `adj_${Date.now()}`
                        });
                        
                        // Update selected modal user if open
                        if (selectedUserDetail && selectedUserDetail.uid === balanceAdjustUser.uid) {
                          setSelectedUserDetail(prev => prev ? { ...prev, balance: target } : null);
                        }

                        setBalanceSuccessMsg(`Balance updated to ₹${target} & user notified!`);
                        setTimeout(() => {
                          setBalanceAdjustUser(null);
                        }, 1200);
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(224,0,255,0.3)]"
                    >
                      Confirm & Send Notification
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* DEDICATED REFUND ORDER & NOTIFICATION MODAL */}
            {refundModalOrder && (
              <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl max-w-md w-full overflow-hidden shadow-[0_0_50px_rgba(245,158,11,0.2)] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">Issue Refund to Customer</h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Instant wallet credit + real-time notification
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (!isProcessingRefund) setRefundModalOrder(null);
                      }}
                      className="p-1 text-zinc-500 hover:text-white rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Customer Info Card */}
                  <div className="bg-zinc-950/80 border border-zinc-800/80 p-3.5 rounded-2xl space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Customer:</span>
                      <span className="font-semibold text-zinc-200">{refundModalOrder.userEmail || refundModalOrder.userId}</span>
                    </div>
                    {refundModalOrder.orderId && (
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-500">Order Reference:</span>
                        <span className="font-mono text-fuchsia-300">#{refundModalOrder.orderId}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-zinc-500">Product / Plan:</span>
                      <span className="font-medium text-white">{refundModalOrder.productName}</span>
                    </div>
                  </div>

                  {/* Refund Amount Input */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-semibold text-zinc-300">Refund Amount (₹)</label>
                      {refundModalOrder.amount > 0 && (
                        <button
                          type="button"
                          onClick={() => setRefundAmountInput(refundModalOrder.amount.toString())}
                          className="text-[11px] text-amber-400 hover:underline font-medium"
                        >
                          Fill Full Amount (₹{refundModalOrder.amount})
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="any"
                        value={refundAmountInput}
                        onChange={(e) => setRefundAmountInput(e.target.value)}
                        placeholder={refundModalOrder.amount ? refundModalOrder.amount.toString() : "Enter amount"}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white font-mono placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  {/* Refund Reason / Note */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-300">
                      Reason / Message for User
                    </label>
                    <input
                      type="text"
                      value={refundReasonInput}
                      onChange={(e) => setRefundReasonInput(e.target.value)}
                      placeholder="e.g. License key defective, Out of stock, Customer request"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                    />
                    <p className="text-[11px] text-zinc-500">
                      This note will be sent directly in the user's notification bell.
                    </p>
                  </div>

                  {refundSuccessMsg && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{refundSuccessMsg}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      disabled={isProcessingRefund}
                      onClick={() => setRefundModalOrder(null)}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isProcessingRefund || !refundAmountInput || parseFloat(refundAmountInput) <= 0}
                      onClick={async () => {
                        const amt = parseFloat(refundAmountInput);
                        if (isNaN(amt) || amt <= 0) return;
                        setIsProcessingRefund(true);
                        try {
                          await issueRefund({
                            orderId: refundModalOrder.orderId || `dir_ref_${Date.now()}`,
                            userId: refundModalOrder.userId,
                            amount: amt,
                            reason: refundReasonInput.trim() || 'Order Refund Processed',
                            productName: refundModalOrder.productName
                          });

                          // Update selected modal user if open
                          if (selectedUserDetail && selectedUserDetail.uid === refundModalOrder.userId) {
                            setSelectedUserDetail(prev => prev ? { ...prev, balance: (prev.balance || 0) + amt } : null);
                          }

                          setRefundSuccessMsg(`₹${amt} refunded to wallet and user notified!`);
                          setTimeout(() => {
                            setRefundModalOrder(null);
                            setRefundSuccessMsg('');
                            setIsProcessingRefund(false);
                          }, 1400);
                        } catch(err) {
                          console.error(err);
                          setIsProcessingRefund(false);
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)] flex items-center gap-2"
                    >
                      {isProcessingRefund ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          Confirm Refund & Send Notification
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'coupons' && (
          <div className="space-y-8">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Total Coupons</p>
                  <p className="text-3xl font-bold font-display text-white">{coupons.length}</p>
                </div>
                <div className="p-3 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl">
                  <Tag className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Active Coupons</p>
                  <p className="text-3xl font-bold font-display text-emerald-400">{coupons.filter(c => c.active).length}</p>
                </div>
                <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Sparkles className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-[0_0_15px_rgba(224,0,255,0.05)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-400 mb-1">Total Times Used</p>
                  <p className="text-3xl font-bold font-display text-fuchsia-400">
                    {coupons.reduce((acc, c) => acc + (c.usageCount || 0), 0)}
                  </p>
                </div>
                <div className="p-3 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl">
                  <Percent className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Create Coupon Card */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Tag className="w-5 h-5 text-fuchsia-400" />
                    Create New Coupon
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Generate promotional discount codes (percentage or flat discount) applicable at checkout.
                  </p>
                </div>

                {/* Quick 1-Click Presets */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-zinc-500">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('SAVE20', 'percentage', 20, '20% Off on all products')}
                    className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-fuchsia-300 border border-zinc-700 rounded-lg transition-colors font-mono"
                  >
                    20% OFF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('SAVE30', 'percentage', 30, '30% Off special discount')}
                    className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-fuchsia-300 border border-zinc-700 rounded-lg transition-colors font-mono"
                  >
                    30% OFF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('MEGA50', 'percentage', 50, '50% Off mega sale')}
                    className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-fuchsia-300 border border-zinc-700 rounded-lg transition-colors font-mono"
                  >
                    50% OFF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('FLAT50', 'flat', 50, '₹50 Flat discount')}
                    className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-fuchsia-300 border border-zinc-700 rounded-lg transition-colors font-mono"
                  >
                    ₹50 FLAT
                  </button>
                </div>
              </div>

              {couponSuccessMsg && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 text-emerald-400 text-sm rounded-xl flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{couponSuccessMsg}</span>
                </div>
              )}

              {couponFormError && (
                <div className="p-3 bg-rose-950/30 border border-rose-500/40 text-rose-400 text-sm rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{couponFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                {/* Coupon Code */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                    Coupon Code *
                  </label>
                  <input
                    type="text"
                    value={newCouponCode}
                    onChange={(e) => {
                      setNewCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                      if (couponFormError) setCouponFormError('');
                    }}
                    placeholder="e.g. DISCOUNT20"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono tracking-wider focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                {/* Discount Type */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                    Discount Type
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1">
                    <button
                      type="button"
                      onClick={() => setNewDiscountType('percentage')}
                      className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                        newDiscountType === 'percentage'
                          ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(224,0,255,0.3)]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      % Percent
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewDiscountType('flat')}
                      className={`py-1.5 text-xs font-medium rounded-lg transition-all ${
                        newDiscountType === 'flat'
                          ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(224,0,255,0.3)]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      ₹ Flat
                    </button>
                  </div>
                </div>

                {/* Discount Value */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                    Discount Value {newDiscountType === 'percentage' ? '(%)' : '(₹)'} *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={newDiscountType === 'percentage' ? '90' : '99999'}
                    value={newDiscountValue}
                    onChange={(e) => setNewDiscountValue(e.target.value)}
                    placeholder={newDiscountType === 'percentage' ? '20' : '50'}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                {/* Validity Hours (Kitne Hours Kaam Karega) */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-fuchsia-400" />
                    Valid Hours *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newValidHours}
                    onChange={(e) => setNewValidHours(e.target.value)}
                    placeholder="24 (0 = Lifetime)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                {/* Max Uses Limit (Kitni Baar Use Ho Sakta Hai) */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-fuchsia-400" />
                    Max Uses Limit *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newMaxUses}
                    onChange={(e) => setNewMaxUses(e.target.value)}
                    placeholder="0 (Unlimited)"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                {/* Min Spend */}
                <div className="lg:col-span-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                    Min Spend (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newMinSpend}
                    onChange={(e) => setNewMinSpend(e.target.value)}
                    placeholder="0"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  />
                </div>
              </div>

              {/* Presets Bar: Hours & Usage Limits */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                {/* Hours Presets */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-zinc-400 font-medium mr-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-fuchsia-400" />
                      Hours Presets:
                    </span>
                    {[
                      { label: '1 Hour', val: '1' },
                      { label: '6 Hours', val: '6' },
                      { label: '12 Hours', val: '12' },
                      { label: '24 Hours (1 Day)', val: '24' },
                      { label: '48 Hours (2 Days)', val: '48' },
                      { label: '7 Days (168h)', val: '168' },
                      { label: '♾️ Lifetime', val: '0' }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setNewValidHours(preset.val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          newValidHours === preset.val
                            ? 'bg-fuchsia-600 text-white shadow-[0_0_8px_rgba(224,0,255,0.3)]'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-right">
                    {parseFloat(newValidHours) > 0 ? (
                      <span className="text-amber-300">
                        ⏳ Expire in <strong>{newValidHours}h</strong> on{' '}
                        <span className="text-white font-medium">
                          {new Date(Date.now() + parseFloat(newValidHours) * 3600 * 1000).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'short'
                          })}
                        </span>
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium">
                        ♾️ Lifetime validity (Never expires)
                      </span>
                    )}
                  </div>
                </div>

                {/* Usage Limits Presets (How Many Times Use Kar Sakte Hain) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-zinc-400 font-medium mr-1 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-fuchsia-400" />
                      Usage Limit Presets:
                    </span>
                    {[
                      { label: '♾️ Unlimited', val: '0' },
                      { label: '1 Time (Single Use)', val: '1' },
                      { label: '5 Times', val: '5' },
                      { label: '10 Times', val: '10' },
                      { label: '25 Times', val: '25' },
                      { label: '50 Times', val: '50' },
                      { label: '100 Times', val: '100' }
                    ].map((preset) => (
                      <button
                        key={preset.val}
                        type="button"
                        onClick={() => setNewMaxUses(preset.val)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                          newMaxUses === preset.val
                            ? 'bg-fuchsia-600 text-white shadow-[0_0_8px_rgba(224,0,255,0.3)]'
                            : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="text-xs text-right">
                    {parseInt(newMaxUses) > 0 ? (
                      <span className="text-amber-300 font-medium">
                        🎯 Can be redeemed maximum <strong>{newMaxUses} time{parseInt(newMaxUses) > 1 ? 's' : ''}</strong>
                      </span>
                    ) : (
                      <span className="text-emerald-400 font-medium">
                        ♾️ Unlimited redeems allowed
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Scope: Specific Products ya All Products */}
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-zinc-300 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-fuchsia-400" />
                      Product Scope (Applicable Products)
                    </label>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Coupon all products par chalega ya sirf specific selected products par.
                    </p>
                  </div>

                  {/* Segmented button */}
                  <div className="inline-flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setNewApplicableScope('all');
                        setCouponFormError('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        newApplicableScope === 'all'
                          ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(224,0,255,0.3)]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      🌐 All Products
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewApplicableScope('specific');
                        if (newSelectedProducts.length === 0 && inventory.length > 0) {
                          setNewSelectedProducts([inventory[0].value]);
                        }
                        setCouponFormError('');
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        newApplicableScope === 'specific'
                          ? 'bg-fuchsia-600 text-white shadow-[0_0_10px_rgba(224,0,255,0.3)]'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      🎯 Specific Products ({newSelectedProducts.length})
                    </button>
                  </div>
                </div>

                {/* If Specific Products is selected, show item selector */}
                {newApplicableScope === 'specific' && (
                  <div className="pt-3 border-t border-zinc-800/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-zinc-300 font-medium">
                        Select which products this coupon can be applied to ({newSelectedProducts.length} selected):
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNewSelectedProducts(inventory.map(i => i.value))}
                          className="text-xs text-fuchsia-400 hover:text-fuchsia-300 underline"
                        >
                          Select All ({inventory.length})
                        </button>
                        <span className="text-zinc-600 text-xs">•</span>
                        <button
                          type="button"
                          onClick={() => setNewSelectedProducts([])}
                          className="text-xs text-zinc-400 hover:text-white underline"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                      {inventory.map((item) => {
                        const isSelected = newSelectedProducts.includes(item.value);
                        return (
                          <div
                            key={item.value}
                            onClick={() => {
                              if (isSelected) {
                                setNewSelectedProducts(newSelectedProducts.filter(v => v !== item.value));
                              } else {
                                setNewSelectedProducts([...newSelectedProducts, item.value]);
                              }
                              setCouponFormError('');
                            }}
                            className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 transition-all ${
                              isSelected
                                ? 'bg-fuchsia-950/40 border-fuchsia-500 shadow-[0_0_10px_rgba(224,0,255,0.15)] text-white'
                                : 'bg-zinc-900/70 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white truncate">{resolveProductName(item.category, settings.categories, inventory)}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-zinc-400">{item.label}</span>
                                <span className="text-[11px] font-semibold text-emerald-400">₹{item.price}</span>
                              </div>
                            </div>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                              isSelected ? 'bg-fuchsia-600 border-fuchsia-500 text-white' : 'border-zinc-700 bg-zinc-950'
                            }`}>
                              {isSelected && <Check className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Description and Submit */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div className="flex-1">
                  <label className="block text-xs font-semibold uppercase text-zinc-400 mb-1.5">
                    Description / Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="e.g. Special weekend deal for BGMI keys"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                  />
                </div>

                <div className="sm:self-end">
                  <button
                    type="button"
                    onClick={handleCreateCoupon}
                    className="w-full sm:w-auto px-6 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-medium text-sm rounded-xl transition-all shadow-[0_0_15px_rgba(224,0,255,0.4)] flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Coupon Code
                  </button>
                </div>
              </div>
            </div>

            {/* Coupons List */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] overflow-hidden">
              <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Active & Configured Coupons</h2>
                <span className="text-xs text-zinc-400 font-medium">{coupons.length} total coupons</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-950">
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Coupon Code</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Discount</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Scope / Products</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Validity / Time Left</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Usage / Limit</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Min Spend</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Description</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                      <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {coupons.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-4 px-6 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white text-base tracking-wider bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-lg">
                              {coupon.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(coupon.code);
                                setCopiedCouponCode(coupon.code);
                                setTimeout(() => setCopiedCouponCode(null), 2000);
                              }}
                              className="p-1.5 text-zinc-500 hover:text-white rounded hover:bg-zinc-800 transition-colors"
                              title="Copy Code"
                            >
                              {copiedCouponCode === coupon.code ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-4 px-6 text-sm">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                            coupon.discountType === 'percentage'
                              ? 'bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} FLAT`}
                          </span>
                        </td>

                        {/* Scope / Products Column */}
                        <td className="py-4 px-6 text-sm">
                          {coupon.applicableScope === 'specific' && coupon.applicableProducts && coupon.applicableProducts.length > 0 ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 w-max">
                                🎯 {coupon.applicableProducts.length} Product{coupon.applicableProducts.length > 1 ? 's' : ''}
                              </span>
                              <span 
                                className="text-[11px] text-zinc-400 mt-1 max-w-[150px] truncate"
                                title={coupon.applicableProducts.map(pVal => {
                                  const item = inventory.find(i => i.value === pVal);
                                  return item ? `${resolveProductName(item.category, settings.categories, inventory)} (${item.label})` : pVal;
                                }).join(', ')}
                              >
                                {coupon.applicableProducts.map(pVal => {
                                  const item = inventory.find(i => i.value === pVal);
                                  return item ? resolveProductName(item.category, settings.categories, inventory) : pVal;
                                }).slice(0, 2).join(', ')}{coupon.applicableProducts.length > 2 ? '...' : ''}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                              🌐 All Products
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-sm">
                          {(() => {
                            const remaining = getCouponRemainingTime(coupon.expiresAt);
                            if (!coupon.expiresAt) {
                              return (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800 text-zinc-400 border border-zinc-700">
                                  <span>♾️ Lifetime</span>
                                </span>
                              );
                            }
                            if (remaining.expired) {
                              return (
                                <div className="flex flex-col">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 w-max">
                                    Expired
                                  </span>
                                  <span className="text-[11px] text-zinc-500 mt-0.5">
                                    {new Date(coupon.expiresAt).toLocaleDateString('en-IN')}
                                  </span>
                                </div>
                              );
                            }
                            return (
                              <div className="flex flex-col">
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30 w-max">
                                  <Clock className="w-3 h-3 text-amber-400" />
                                  {remaining.text}
                                </span>
                                <span className="text-[10px] text-zinc-400 mt-0.5" title={new Date(coupon.expiresAt).toLocaleString('en-IN')}>
                                  Ends: {new Date(coupon.expiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ({new Date(coupon.expiresAt).toLocaleDateString('en-IN')})
                                </span>
                              </div>
                            );
                          })()}
                        </td>

                        {/* Usage / Limit Column */}
                        <td className="py-4 px-6 text-sm">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-white">
                              {coupon.usageCount || 0} / {coupon.maxUses && coupon.maxUses > 0 ? coupon.maxUses : '∞'}
                            </span>
                            {coupon.maxUses && coupon.maxUses > 0 && (coupon.usageCount || 0) >= coupon.maxUses ? (
                              <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded w-max mt-0.5">
                                Limit Reached
                              </span>
                            ) : coupon.maxUses && coupon.maxUses > 0 ? (
                              <span className="text-[10px] text-amber-400 mt-0.5">
                                {Math.max(0, coupon.maxUses - (coupon.usageCount || 0))} left
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500 mt-0.5">
                                Unlimited
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-6 text-sm text-zinc-400">
                          {coupon.minSpend && coupon.minSpend > 0 ? `₹${coupon.minSpend}` : 'No min.'}
                        </td>

                        <td className="py-4 px-6 text-sm text-zinc-300">
                          {coupon.description || '—'}
                        </td>

                        <td className="py-4 px-6 text-sm">
                          <button
                            type="button"
                            onClick={() => toggleCoupon(coupon.id)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                              coupon.active
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-500 border border-zinc-700 hover:bg-zinc-700'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${coupon.active ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
                            {coupon.active ? 'Active' : 'Disabled'}
                          </button>
                        </td>

                        <td className="py-4 px-6 text-sm text-right">
                          {deleteCouponConfirmId === coupon.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-rose-400">Delete?</span>
                              <button
                                type="button"
                                onClick={() => {
                                  deleteCoupon(coupon.id);
                                  setDeleteCouponConfirmId(null);
                                }}
                                className="px-2 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded text-xs font-semibold transition-colors"
                              >
                                Yes
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteCouponConfirmId(null)}
                                className="px-2 py-1 bg-zinc-800 text-zinc-400 hover:bg-zinc-700 rounded text-xs transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteCouponConfirmId(coupon.id)}
                              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg transition-colors"
                              title="Delete Coupon"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}

                    {coupons.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-zinc-500 text-sm">
                          No coupons created yet. Create one above to give discounts to your customers!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="py-12 text-center bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)]">
            <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Analytics Module</h3>
            <p className="text-zinc-500">Advanced analytics and revenue charts are being configured.</p>
          </div>
        )}
        
        {activeTab !== 'overview' && activeTab !== 'inventory' && activeTab !== 'settings' && activeTab !== 'orders' && activeTab !== 'customers' && activeTab !== 'coupons' && activeTab !== 'analytics' && activeTab !== 'menu' && (
          <div className="py-12 text-center bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)]">
            <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h3>
            <p className="text-zinc-500">This module is currently under development.</p>
          </div>
        )}
          </div>
        )}

      </div>
      
      {/* Unsaved Changes Banner */}
      {hasChanges && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-900 border-t border-fuchsia-500/50 shadow-[0_-5px_30px_rgba(224,0,255,0.2)] z-50 animate-in slide-in-from-bottom flex justify-between items-center px-8">
          <div>
            <h4 className="text-white font-bold drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">You have unsaved changes</h4>
            <p className="text-sm text-zinc-400">Do you want to save the changes made to your settings?</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={handleDiscardChanges}
              className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors border border-zinc-700"
            >
              Discard
            </button>
            <button 
              onClick={handleSaveSettings}
              className="px-6 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg transition-colors shadow-[0_0_15px_rgba(224,0,255,0.4)]"
            >
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Manage Keys Modal */}
      {manageKeysProduct && (() => {
        const product = inventory.find(i => i.value === manageKeysProduct);
        if (!product) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => {
              setManageKeysProduct(null);
              setDeleteKeyConfirmIdx(null);
            }}></div>
            <div className="relative bg-zinc-950 border border-fuchsia-500/30 shadow-[0_0_30px_rgba(224,0,255,0.2)] rounded-3xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center p-6 border-b border-fuchsia-500/20">
                <div>
                  <h3 className="text-2xl font-bold text-white font-display drop-shadow-[0_0_8px_rgba(255,255,255,0.4)]">
                    Manage Keys
                  </h3>
                  <p className="text-sm text-zinc-400 mt-1">{resolveProductName(product.category, settings.categories, inventory)} - {product.label}</p>
                </div>
                <button 
                  onClick={() => {
                    setManageKeysProduct(null);
                    setDeleteKeyConfirmIdx(null);
                  }}
                  className="text-zinc-400 hover:text-white hover:bg-fuchsia-500/20 transition-all p-2 rounded-full"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-4 flex justify-between items-center">
                  <span className="text-zinc-300 font-medium">Total Unsold Keys: <span className="text-fuchsia-400 font-bold">{product.keys.length}</span></span>
                </div>
                
                {product.keys.length === 0 ? (
                  <div className="text-center py-12 border border-zinc-800 border-dashed rounded-xl bg-zinc-900/30">
                    <p className="text-zinc-500">No available keys in this product.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {product.keys.map((key, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-zinc-900 border border-zinc-800 p-3 rounded-lg hover:border-fuchsia-500/30 transition-all">
                        <code className="text-sm text-zinc-300 font-mono break-all">{key}</code>
                        {deleteKeyConfirmIdx === idx ? (
                          <div className="flex items-center gap-2 ml-4 shrink-0">
                            <span className="text-xs text-zinc-400">Delete?</span>
                            <button
                              onClick={() => {
                                removeKey(product.value, key);
                                setDeleteKeyConfirmIdx(null);
                              }}
                              className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded hover:bg-red-500/30 transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeleteKeyConfirmIdx(null)}
                              className="px-2 py-1 bg-zinc-800 text-zinc-300 text-xs font-medium rounded hover:bg-zinc-700 transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteKeyConfirmIdx(idx)}
                            className="ml-4 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                            title="Remove Key"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-6 border-t border-fuchsia-500/20 bg-zinc-950">
                <button
                  onClick={() => {
                    setManageKeysProduct(null);
                    setDeleteKeyConfirmIdx(null);
                  }}
                  className="w-full px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all font-medium border border-zinc-700"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

