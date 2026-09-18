import { useState } from 'react';
import { X, Key, Calendar, Copy, Check, Search, ShieldCheck, Tag, Sparkles } from 'lucide-react';
import { useInventory, PurchaseRecord, resolveProductName } from '../store';
import { useAuth } from '../lib/useAuth';

interface PurchaseHistoryModalProps {
  onClose: () => void;
}

export function PurchaseHistoryModal({ onClose }: PurchaseHistoryModalProps) {
  const { currentUser } = useAuth();
  const { purchases, allPurchases, settings, items } = useInventory(currentUser?.uid);
  
  const isOwner = currentUser?.email?.includes('barikarman') || 
    ['admin', 'owner', 'arman_123'].includes(currentUser?.customId || '') || 
    currentUser?.customId?.includes('barikarman');

  const [activeTab, setActiveTab] = useState<'my' | 'all'>(isOwner ? 'all' : 'my');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedOrderId, setCopiedOrderId] = useState<string | null>(null);

  const displayList = activeTab === 'all' && isOwner ? allPurchases : purchases;

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="bg-zinc-950 border border-fuchsia-500/30 rounded-3xl w-full max-w-3xl text-left shadow-[0_0_40px_rgba(224,0,255,0.15)] relative max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-950/90">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-fuchsia-500/10 text-fuchsia-400 rounded-xl border border-fuchsia-500/20">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-bold font-display text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                Key History
              </h3>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              View and copy all your purchased activation keys
            </p>
          </div>
          
          <button 
            onClick={onClose}
            className="text-zinc-400 hover:text-white hover:bg-zinc-900 p-2 rounded-full transition-colors border border-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection for Owner */}
        {isOwner && (
          <div className="px-6 pt-4 pb-1 border-b border-zinc-850 flex gap-2 shrink-0 bg-zinc-900/40">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
                activeTab === 'all'
                  ? 'bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(224,0,255,0.4)]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              All Key History (Owner: {allPurchases.length})
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 ${
                activeTab === 'my'
                  ? 'bg-fuchsia-600 text-white shadow-[0_0_12px_rgba(224,0,255,0.4)]'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Key className="w-4 h-4" />
              My Keys ({purchases.length})
            </button>
          </div>
        )}

        {/* Search Bar */}
        <div className="px-6 py-3 border-b border-zinc-850 shrink-0 bg-zinc-950/60">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by product, key code, or order ID..."
              className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-fuchsia-500 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 divide-y-0">
          {filteredList.length === 0 ? (
            <div className="text-center py-16 text-zinc-500">
              <Key className="w-14 h-14 mx-auto mb-3 opacity-20 text-fuchsia-400" />
              <p className="text-lg font-medium text-zinc-400">
                {searchQuery ? 'No keys matching your search.' : 'No key history found.'}
              </p>
              <p className="text-xs text-zinc-600 mt-1">
                Keys purchased will be permanently stored here for instant access.
              </p>
            </div>
          ) : (
            filteredList.map((purchase) => (
              <div 
                key={purchase.id} 
                className="bg-zinc-900/90 border border-zinc-800 hover:border-fuchsia-500/30 rounded-2xl p-4 sm:p-5 shadow-sm transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-zinc-800">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-white text-base">
                        {resolveProductName(purchase.category, settings.categories, items)}
                      </h4>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-fuchsia-950/60 border border-fuchsia-500/30 text-fuchsia-300">
                        {purchase.label}
                      </span>
                      {purchase.couponCode && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          Coupon: {purchase.couponCode}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-xs text-zinc-400 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        {new Date(purchase.date).toLocaleDateString()} at {new Date(purchase.date).toLocaleTimeString()}
                      </span>
                      {purchase.amount && (
                        <span className="text-zinc-300 font-medium">
                          Paid: ₹{purchase.amount}
                        </span>
                      )}
                      {activeTab === 'all' && isOwner && (
                        <span className="text-zinc-500 text-[11px]">
                          User: {purchase.userEmail || purchase.userId || 'Guest'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <span className="bg-zinc-800 text-zinc-300 text-xs px-2.5 py-1 rounded-lg border border-zinc-700 font-medium">
                      {purchase.keys.length} {purchase.keys.length === 1 ? 'Key' : 'Keys'}
                    </span>
                    {purchase.keys.length > 1 && (
                      <button
                        onClick={() => handleCopyAllOrderKeys(purchase.id, purchase.keys)}
                        className="text-xs bg-fuchsia-600/20 hover:bg-fuchsia-600/30 border border-fuchsia-500/30 text-fuchsia-300 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                      >
                        {copiedOrderId === purchase.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied All!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy All
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* Keys List */}
                <div className="space-y-2">
                  {purchase.keys.map((key, i) => (
                    <div 
                      key={i} 
                      className="flex items-center justify-between bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 rounded-xl px-3.5 py-2.5 transition-colors gap-3"
                    >
                      <code className="text-xs sm:text-sm font-mono text-fuchsia-300 tracking-wider break-all select-all">
                        {key}
                      </code>
                      <button
                        onClick={() => handleCopySingleKey(key)}
                        className="shrink-0 p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg border border-zinc-800 transition-colors flex items-center gap-1 text-xs"
                        title="Copy Key"
                      >
                        {copiedKey === key ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400 text-[11px]">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span className="text-[11px]">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-850 bg-zinc-950 flex justify-between items-center text-xs text-zinc-500 shrink-0">
          <span>Total Records: {filteredList.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-xl border border-zinc-800 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

