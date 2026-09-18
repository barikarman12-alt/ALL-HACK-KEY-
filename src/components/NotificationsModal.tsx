import React from 'react';
import { Bell, X, CheckCheck, Trash2, ArrowDownLeft, AlertCircle, ShoppingBag, Info, ExternalLink } from 'lucide-react';
import { useNotifications, UserNotification } from '../store';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  onViewPurchases?: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  userId,
  onViewPurchases
}) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications } = useNotifications(userId);

  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return isoString;
    }
  };

  const getNotificationIcon = (notif: UserNotification) => {
    if (notif.type === 'refund') {
      return (
        <div className="w-9 h-9 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <ArrowDownLeft className="w-5 h-5" />
        </div>
      );
    }
    if (notif.type === 'deposit') {
      return (
        <div className="w-9 h-9 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 shrink-0">
          <ArrowDownLeft className="w-5 h-5" />
        </div>
      );
    }
    if (notif.type === 'order') {
      return (
        <div className="w-9 h-9 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
          <ShoppingBag className="w-5 h-5" />
        </div>
      );
    }
    return (
      <div className="w-9 h-9 rounded-full bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
        <Info className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-zinc-950 border border-fuchsia-500/30 rounded-2xl shadow-[0_0_50px_rgba(224,0,255,0.2)] overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-900/60">
          <div className="flex items-center space-x-3">
            <div className="relative p-2 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/30 text-fuchsia-400">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-fuchsia-600 text-white text-[10px] font-bold flex items-center justify-center shadow-[0_0_8px_rgba(224,0,255,0.8)] animate-pulse">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                Notifications
                {unreadCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-medium border border-fuchsia-500/30">
                    {unreadCount} New
                  </span>
                )}
              </h3>
              <p className="text-xs text-zinc-400">Refund alerts & account activity</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {notifications.length > 0 && unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg text-xs transition-colors flex items-center gap-1"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4 text-fuchsia-400" />
                <span className="hidden sm:inline">Read all</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="p-1.5 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 rounded-lg text-xs transition-colors flex items-center gap-1"
                title="Clear all notifications"
              >
                <Trash2 className="w-4 h-4" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-zinc-800/40">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-3">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 mx-auto flex items-center justify-center text-zinc-600">
                <Bell className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-zinc-400">No notifications yet</p>
              <p className="text-xs text-zinc-600 max-w-xs mx-auto">
                When you receive a refund or make a wallet transaction, you'll be instantly alerted here.
              </p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div
                key={notif.id}
                onClick={() => {
                  if (!notif.read) markAsRead(notif.id);
                }}
                className={`pt-3 first:pt-0 p-3 rounded-xl transition-all cursor-pointer ${
                  notif.read
                    ? 'bg-zinc-900/30 hover:bg-zinc-900/60 border border-transparent'
                    : 'bg-fuchsia-950/20 hover:bg-fuchsia-950/30 border border-fuchsia-500/20 shadow-[0_0_12px_rgba(224,0,255,0.05)]'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {getNotificationIcon(notif)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`text-sm font-semibold truncate ${notif.read ? 'text-zinc-200' : 'text-white'}`}>
                        {notif.title}
                      </h4>
                      {notif.amount && (
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                          +₹{notif.amount}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed break-words">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between mt-2 pt-1 text-[11px] text-zinc-500">
                      <span>{formatDate(notif.date)}</span>

                      <div className="flex items-center space-x-2">
                        {notif.orderId && onViewPurchases && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onClose();
                              onViewPurchases();
                            }}
                            className="text-fuchsia-400 hover:text-fuchsia-300 font-medium inline-flex items-center gap-1 hover:underline"
                          >
                            <span>View Orders</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-fuchsia-500"></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-zinc-900/80 border-t border-zinc-800 text-center text-xs text-zinc-400">
          Need help with refunds? Contact support at{' '}
          <a
            href="https://t.me/FATHERXSIR"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fuchsia-400 hover:underline font-medium"
          >
            @FATHERXSIR
          </a>
        </div>
      </div>
    </div>
  );
};
