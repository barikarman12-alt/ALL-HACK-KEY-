import { ShoppingCart, Menu, X, LayoutDashboard, Home, History, LogIn, LogOut, Wallet, Plus, Key, Bell, Sparkles, Sun, Moon } from 'lucide-react';
import { useState } from 'react';
import { logOutMock } from '../lib/useAuth';
import { useAuth } from '../lib/useAuth';
import { useBalance, useInventory, useNotifications } from '../store';
import { useTheme } from '../lib/theme';
import { AddBalanceModal } from './AddBalanceModal';
import { NotificationsModal } from './NotificationsModal';

interface HeaderProps {
  currentPage?: 'home' | 'dashboard' | 'login' | 'key-received';
  onNavigate?: (page: 'home' | 'dashboard' | 'login' | 'key-received') => void;
  onShowPurchases?: () => void;
}

export function Header({ currentPage = 'home', onNavigate, onShowPurchases }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { currentUser } = useAuth();
  const { balance } = useBalance(currentUser?.uid);
  const { settings } = useInventory();
  const { unreadCount } = useNotifications(currentUser?.uid);
  const { theme, isLight, toggleTheme } = useTheme();

  const isOwner = Boolean(
    currentUser?.email?.includes('barikarman') || 
    ['admin', 'owner', 'arman_123'].includes(currentUser?.customId || '') || 
    currentUser?.customId?.includes('barikarman')
  );

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] theme-header transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate?.('home')}>
            <img 
              src={settings.siteLogoUrl || "/logo.png"} 
              alt={`${settings.siteName} Logo`}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-white/15 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="font-display font-semibold text-lg sm:text-xl tracking-tight text-white theme-text-title">
              {settings.siteName || "ARMAN X STORE"}
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            {(currentUser?.email?.includes('barikarman') || ['admin', 'owner', 'arman_123'].includes(currentUser?.customId || '') || currentUser?.customId?.includes('barikarman')) && (
              currentPage === 'home' ? (
                <button 
                  onClick={() => onNavigate?.('dashboard')}
                  className="inline-flex items-center text-zinc-300 hover:text-white theme-text-sub transition-colors text-sm font-medium cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 mr-1.5" />
                  Dashboard
                </button>
              ) : (
                <button 
                  onClick={() => onNavigate?.('home')}
                  className="inline-flex items-center text-zinc-300 hover:text-white theme-text-sub transition-colors text-sm font-medium cursor-pointer"
                >
                  <Home className="w-4 h-4 mr-1.5" />
                  Back to Site
                </button>
              )
            )}

            {/* Global Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/20 text-zinc-300 hover:text-white transition-all cursor-pointer theme-pill"
              title={isLight ? "Switch to Deep Space Black" : "Switch to Frosted Light"}
              aria-label="Toggle theme"
            >
              {isLight ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-300" />
              )}
            </button>

            {currentUser ? (
              <>
                <div className="flex items-center space-x-2 bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-full theme-pill">
                  <Wallet className="w-4 h-4 text-zinc-300 theme-text-sub" />
                  <span className="text-white font-medium text-xs theme-text-title">₹{balance}</span>
                  <button 
                    onClick={() => setIsAddBalanceOpen(true)}
                    className="ml-1.5 bg-white/10 hover:bg-white/20 text-white p-1 rounded-full transition-colors cursor-pointer"
                    title="Add Balance"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button 
                  className="flex items-center space-x-1.5 text-zinc-200 bg-zinc-900/80 border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-full hover:bg-zinc-800 transition-all cursor-pointer text-xs font-medium theme-pill"
                  onClick={onShowPurchases}
                  title={isOwner ? "All Key History" : "Key History"}
                >
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                  <span>
                    {isOwner ? "All Keys" : "Keys"}
                  </span>
                </button>

                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  className="relative p-2 rounded-full bg-zinc-900/80 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white transition-all theme-pill cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                <div className="flex items-center space-x-2 pl-1">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-6 h-6 rounded-full border border-white/20" />
                  ) : (
                    <div className="w-6 h-6 bg-zinc-700 rounded-full" />
                  )}
                  <button onClick={logOutMock} className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer" title="Log out">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <button 
                  className="flex items-center space-x-1.5 text-zinc-300 hover:text-white bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-full hover:border-white/20 transition-all text-xs font-medium theme-pill cursor-pointer"
                  onClick={onShowPurchases}
                  title="Key History"
                >
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Key History</span>
                </button>
                <button 
                  className="text-zinc-300 hover:text-white transition-colors flex items-center text-xs font-medium bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-full border border-white/10 theme-pill cursor-pointer"
                  onClick={() => onNavigate?.('login')}
                  title="Login"
                >
                  <LogIn className="w-3.5 h-3.5 mr-1" />
                  Login
                </button>
              </div>
            )}
            <a href="#pricing" onClick={() => onNavigate?.('home')} className="inline-flex items-center justify-center px-4 py-1.5 border border-white/10 text-xs font-semibold rounded-full text-white bg-zinc-800 hover:bg-zinc-700 transition-all theme-btn-primary cursor-pointer">
              Products
            </a>
          </div>

          <div className="flex md:hidden items-center space-x-2 sm:space-x-3">
            {/* Mobile Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-white transition-all theme-pill cursor-pointer"
              title={isLight ? "Switch to Deep Space Black" : "Switch to Frosted Light"}
              aria-label="Toggle theme"
            >
              {isLight ? (
                <Sun className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-300" />
              )}
            </button>

            {currentUser ? (
              <>
                <div className="flex items-center space-x-1.5 bg-zinc-900/80 border border-white/10 px-2.5 py-1 rounded-full theme-pill">
                  <Wallet className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-white font-medium text-xs theme-text-title">₹{balance}</span>
                  <button 
                    onClick={() => setIsAddBalanceOpen(true)}
                    className="ml-1 bg-white/10 hover:bg-white/20 text-white p-0.5 rounded-full transition-colors cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button 
                  className="flex items-center space-x-1 text-zinc-200 bg-zinc-900/80 border border-white/10 px-2.5 py-1 rounded-full hover:border-white/20 transition-all text-xs font-medium theme-pill cursor-pointer"
                  onClick={onShowPurchases}
                >
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{isOwner ? "Keys" : "Keys"}</span>
                </button>
                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  className="relative p-1.5 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-400 hover:text-white theme-pill cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-3.5 h-3.5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-0.5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-1.5">
                <button 
                  className="flex items-center space-x-1 text-zinc-300 hover:text-white bg-zinc-900/80 border border-white/10 px-2 py-1 rounded-full text-xs font-medium theme-pill cursor-pointer"
                  onClick={onShowPurchases}
                >
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Keys</span>
                </button>
                <button 
                  className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
                  onClick={() => {
                    onNavigate?.('login');
                    setIsMenuOpen(false);
                  }}
                >
                  <LogIn className="w-4 h-4" />
                </button>
              </div>
            )}
            <button 
              className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#09090b]/95 border-b border-white/10 backdrop-blur-xl">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {currentUser && (
              <div className="flex items-center px-3 py-2 text-base font-medium text-zinc-300 border-b border-zinc-800 mb-2 pb-3">
                {currentUser.photoURL && <img src={currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full mr-3 border border-white/10" />}
                <div className="flex flex-col">
                  <span className="text-white">{currentUser.displayName}</span>
                  <button onClick={logOutMock} className="text-xs text-zinc-400 hover:text-zinc-200 text-left mt-0.5">
                    Sign Out
                  </button>
                </div>
              </div>
            )}
            {(currentUser?.email?.includes('barikarman') || ['admin', 'owner', 'arman_123'].includes(currentUser?.customId || '') || currentUser?.customId?.includes('barikarman')) && (
              currentPage === 'home' ? (
                <button 
                  onClick={() => { onNavigate?.('dashboard'); setIsMenuOpen(false); }}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4 mr-3 text-zinc-400" />
                  Owner Dashboard
                </button>
              ) : (
                <button 
                  onClick={() => { onNavigate?.('home'); setIsMenuOpen(false); }}
                  className="w-full flex items-center px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
                >
                  <Home className="w-4 h-4 mr-3 text-zinc-400" />
                  Back to Store
                </button>
              )
            )}
            <div className="mt-4 px-3">
              <a href="#pricing" onClick={() => { onNavigate?.('home'); setIsMenuOpen(false); }} className="w-full flex items-center justify-center px-4 py-2 border border-transparent text-base font-medium rounded-full text-white bg-fuchsia-600 hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(224,0,255,0.4)] transition-all">
                View Products
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
    <AddBalanceModal isOpen={isAddBalanceOpen} onClose={() => setIsAddBalanceOpen(false)} />
    <NotificationsModal 
      isOpen={isNotificationsOpen} 
      onClose={() => setIsNotificationsOpen(false)} 
      userId={currentUser?.uid} 
      onViewPurchases={onShowPurchases} 
    />
    </>
  );
}
