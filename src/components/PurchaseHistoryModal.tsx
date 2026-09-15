import { X, Key, Calendar } from 'lucide-react';
import { useInventory } from '../store';
import { useAuth } from '../lib/useAuth';

interface PurchaseHistoryModalProps {
  onClose: () => void;
}

export function PurchaseHistoryModal({ onClose }: PurchaseHistoryModalProps) {
  const { currentUser } = useAuth();
  const { purchases } = useInventory(currentUser?.uid);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-2xl w-full max-w-2xl text-left shadow-2xl relative max-h-[80vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-2xl font-bold text-white mb-6">My Purchases</h3>

        {purchases.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">
            <Key className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>You haven't made any purchases yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {purchases.map(purchase => (
              <div key={purchase.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3 border-b border-zinc-800 pb-3">
                  <div>
                    <h4 className="font-semibold text-white">{purchase.category} - {purchase.label}</h4>
                    <div className="flex items-center text-xs text-zinc-400 mt-1">
                      <Calendar className="w-3 h-3 mr-1" />
                      {new Date(purchase.date).toLocaleDateString()} at {new Date(purchase.date).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="bg-fuchsia-900/30 text-fuchsia-400 text-xs px-2 py-1 rounded border border-fuchsia-500/20">
                    {purchase.keys.length} {purchase.keys.length === 1 ? 'Key' : 'Keys'}
                  </div>
                </div>
                <div className="space-y-2">
                  {purchase.keys.map((key, i) => (
                    <div key={i} className="flex justify-between items-center bg-zinc-950 border border-zinc-800/50 rounded p-2">
                      <code className="text-sm font-mono text-fuchsia-300 tracking-wider">
                        {key}
                      </code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
