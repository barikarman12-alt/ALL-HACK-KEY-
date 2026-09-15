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
  Trash2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useInventory } from '../store';

const stats = [
  { name: 'Total Revenue', value: '₹45,231', change: '+20.1%', trend: 'up', icon: DollarSign },
  { name: 'Active Subscriptions', value: '2,314', change: '+15.2%', trend: 'up', icon: Users },
  { name: 'Keys Sold (Today)', value: '143', change: '+5.4%', trend: 'up', icon: ShoppingCart },
  { name: 'Stock Alerts', value: '4', change: 'Day 3, 7, 15, 30 Out', trend: 'down', icon: Package },
];

const recentOrders = [
  { id: '#1024', user: 'johndoe@example.com', product: 'Day 1 Key', status: 'Completed', amount: '₹100', time: '2 mins ago' },
  { id: '#1023', user: 'alex99@gmail.com', product: 'Day 1 Key', status: 'Completed', amount: '₹100', time: '15 mins ago' },
  { id: '#1022', user: 'sam.smith@hotmail.com', product: 'Day 3 Key', status: 'Failed', amount: '₹200', time: '1 hour ago' },
  { id: '#1021', user: 'mike_r@example.com', product: 'Day 1 Key', status: 'Completed', amount: '₹100', time: '3 hours ago' },
  { id: '#1020', user: 'sarah.t@example.com', product: 'Day 1 Key', status: 'Completed', amount: '₹100', time: '5 hours ago' },
];

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const { items: inventory, addKeys, settings, updateSettings } = useInventory();
  const [newKeysInput, setNewKeysInput] = useState<{ [key: string]: string }>({});
  
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
  }>({ category: 'DRIPCLINT NON-ROOT', label: '', price: '' });
  const { addProduct, deleteProduct } = useInventory();

  const [deleteCategoryConfirmId, setDeleteCategoryConfirmId] = useState<string | null>(null);

  const [deleteProductConfirmId, setDeleteProductConfirmId] = useState<string | null>(null);

  const [draftCategories, setDraftCategories] = useState(settings.categories);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync draftCategories with global settings if no unsaved changes
  useEffect(() => {
    if (!hasChanges) {
      setDraftCategories(settings.categories);
    }
  }, [settings.categories, hasChanges]);

  const handleSaveSettings = () => {
    updateSettings({ categories: draftCategories });
    setHasChanges(false);
  };

  const handleDiscardChanges = () => {
    setDraftCategories(settings.categories);
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
      name: 'New Product Category',
      logoUrl: 'https://images.unsplash.com/photo-1614064641936-732732f1a63c?auto=format&fit=crop&q=80&w=200',
      theme: 'light' as const
    };
    setDraftCategories([...draftCategories, newCategory]);
    setHasChanges(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-display font-bold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Owner Dashboard</h1>
            <p className="text-zinc-400 mt-1">Welcome back, Arman. Here's what's happening with DRIPCLINT today.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Search orders..." 
                className="pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-fuchsia-500/50 focus:border-fuchsia-500 w-64 text-white placeholder-zinc-500 transition-all shadow-[0_0_10px_rgba(224,0,255,0.05)]"
              />
            </div>
            <button className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:border-fuchsia-500/50 hover:text-fuchsia-400 transition-all shadow-[0_0_10px_rgba(224,0,255,0.05)]">
              <Bell className="w-5 h-5" />
            </button>
            <button className="p-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-xl hover:bg-zinc-800 hover:border-fuchsia-500/50 hover:text-fuchsia-400 transition-all shadow-[0_0_10px_rgba(224,0,255,0.05)]">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 border-b border-zinc-800 mb-8 overflow-x-auto">
          {['Overview', 'Inventory', 'Orders', 'Customers', 'Analytics', 'Settings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.toLowerCase()
                  ? 'border-fuchsia-500 text-fuchsia-400 drop-shadow-[0_0_5px_rgba(224,0,255,0.5)]'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Stats Grid */}
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
              <div className="lg:col-span-2 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)] overflow-hidden">
                <div className="px-6 py-5 border-b border-zinc-800 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">Recent Transactions</h2>
                  <button className="text-sm text-fuchsia-400 font-medium hover:text-fuchsia-300 flex items-center transition-colors">
                    View All <ArrowUpRight className="w-4 h-4 ml-1" />
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-950/50">
                        <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">Order ID</th>
                        <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">User</th>
                        <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">Product</th>
                        <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800">Status</th>
                        <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {recentOrders.map((order, i) => (
                        <tr key={i} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="py-4 px-6 text-sm font-medium text-zinc-300">{order.id}</td>
                          <td className="py-4 px-6 text-sm text-zinc-400">
                            <div>{order.user}</div>
                            <div className="text-xs text-zinc-500">{order.time}</div>
                          </td>
                          <td className="py-4 px-6 text-sm text-zinc-400">{order.product}</td>
                          <td className="py-4 px-6 text-sm">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                              order.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]' : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]'
                            }`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-sm font-medium text-white drop-shadow-[0_0_3px_rgba(255,255,255,0.3)] text-right">{order.amount}</td>
                        </tr>
                      ))}
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
                          <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 text-center">Current Stock</th>
                          <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-800 text-right">Add Keys</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {inventory.filter(i => i.category === category.id).map((item) => (
                          <tr key={item.value} className="hover:bg-zinc-800/50 transition-colors">
                            <td className="py-4 px-6 text-sm font-medium text-zinc-300">{item.label}</td>
                            <td className="py-4 px-6 text-sm text-center">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${item.stock > 0 ? 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(74,222,128,0.1)]' : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(248,113,113,0.1)]'}`}>
                                {item.stock} Available
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-start justify-end space-x-2">
                                <textarea
                                  rows={2}
                                  value={newKeysInput[item.value] || ''}
                                  onChange={(e) => setNewKeysInput({...newKeysInput, [item.value]: e.target.value})}
                                  placeholder="Paste keys (1 per line)"
                                  className="w-48 px-3 py-1.5 bg-zinc-950 text-white placeholder-zinc-600 border border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-fuchsia-500 focus:ring-fuchsia-500/20 resize-y"
                                />
                                <button
                                  onClick={() => handleAddKeys(item.value)}
                                  disabled={!newKeysInput[item.value]?.trim()}
                                  className="px-3 py-1.5 bg-fuchsia-600 text-white text-sm font-medium rounded-lg hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_0_10px_rgba(224,0,255,0.3)] shrink-0"
                                >
                                  Add
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
                  <option value="" disabled>Select Category</option>
                  {settings.categories.map(c => (
                     <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Product Name (e.g. Day 60)"
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
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-zinc-300">Product Categories</h3>
                <button
                  onClick={handleCreateCategory}
                  className="px-4 py-2 bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/30 text-sm font-medium rounded-xl hover:bg-fuchsia-500/20 transition-colors shadow-[0_0_10px_rgba(224,0,255,0.1)]"
                >
                  + Add Category
                </button>
              </div>

              {draftCategories.map((category, index) => (
                <div key={category.id} className={index > 0 ? "border-t border-zinc-800 pt-8" : ""}>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-md font-medium text-white">{category.name || 'New Category'}</h4>
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
                        title="Delete Category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-400 mb-1">Category Name</label>
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
        
        {activeTab !== 'overview' && activeTab !== 'inventory' && activeTab !== 'settings' && (
          <div className="py-12 text-center bg-zinc-900 rounded-2xl border border-zinc-800 shadow-[0_0_15px_rgba(224,0,255,0.05)]">
            <Activity className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h3>
            <p className="text-zinc-500">This module is currently under development.</p>
          </div>
        )}

      </div>
    </div>
  );
}
