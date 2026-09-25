import { LayoutDashboard, Home, LogIn, LogOut, Wallet, Plus, Key, Bell, Sun, Moon, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { logOutMock } from '../lib/useAuth';
import { useAuth } from '../lib/useAuth';
import { useBalance, useInventory, useNotifications } from '../store';
import { useTheme } from '../lib/theme';
import { AddBalanceModal } from './AddBalanceModal';
import { NotificationsModal } from './NotificationsModal';

interface HeaderProps {
  currentPage?: 'home' | 'key-history' | 'dashboard' | 'login' | 'key-received';
  onNavigate?: (page: 'home' | 'key-history' | 'dashboard' | 'login' | 'key-received') => void;
  onShowPurchases?: () => void;
}

export function Header({ currentPage = 'home', onNavigate, onShowPurchases }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { currentUser } = useAuth();
  const { balance } = useBalance(currentUser?.uid);
  const { settings } = useInventory(currentUser?.uid, currentUser?.email || undefined);
  const { unreadCount } = useNotifications(currentUser?.uid);
  const { isLight, toggleTheme } = useTheme();

  const isOwner = Boolean(
    currentUser?.email?.includes('barikarman') || 
    ['admin', 'owner', 'arman_123'].includes(currentUser?.customId || '') || 
    currentUser?.customId?.includes('barikarman')
  );

  const handleKeyClick = () => {
    if (onNavigate) {
      onNavigate('key-history');
    } else if (onShowPurchases) {
      onShowPurchases();
    }
  };

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] theme-header transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Brand Name */}
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
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Dashboard / Back button for owner */}
            {isOwner && (
              currentPage !== 'dashboard' ? (
                <button 
                  onClick={() => onNavigate?.('dashboard')}
                  className="inline-flex items-center text-zinc-300 hover:text-white theme-text-sub transition-colors text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer"
                >
                  <LayoutDashboard className="w-4 h-4 mr-1.5 text-indigo-400" />
                  Dashboard
                </button>
              ) : (
                <button 
                  onClick={() => onNavigate?.('home')}
                  className="inline-flex items-center text-zinc-300 hover:text-white theme-text-sub transition-colors text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-white/5 cursor-pointer"
                >
                  <Home className="w-4 h-4 mr-1.5 text-indigo-400" />
                  Back to Store
                </button>
              )
            )}

            {/* Theme Toggle */}
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

            {/* Keys Button -> Opens Key History */}
            <button 
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                currentPage === 'key-history'
                  ? 'bg-indigo-600 text-white border-indigo-400/40 shadow-[0_0_15px_rgba(99,102,241,0.4)]'
                  : 'text-zinc-200 bg-zinc-900/80 border-white/10 hover:border-white/20 hover:bg-zinc-800 theme-pill'
              }`}
              onClick={handleKeyClick}
              title={isOwner ? "All Keys History" : "My Keys History"}
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isOwner ? "All Keys" : "Keys"}</span>
            </button>

            {/* User Session / Auth & Wallet */}
            {currentUser ? (
              <>
                {/* Wallet Balance Pill */}
                <div className="flex items-center space-x-2 bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-full theme-pill">
                  <Wallet className="w-4 h-4 text-indigo-400 theme-text-sub" />
                  <span className="text-white font-mono font-bold text-xs theme-text-title">₹{balance}</span>
                  <button 
                    onClick={() => setIsAddBalanceOpen(true)}
                    className="ml-1 bg-white/10 hover:bg-white/20 text-white p-1 rounded-full transition-colors cursor-pointer"
                    title="Add Balance"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Notifications */}
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

                {/* Profile & Logout */}
                <div className="flex items-center space-x-2 pl-1">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-6 h-6 rounded-full border border-white/20" />
                  ) : (
                    <div className="w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                      {currentUser.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <button onClick={logOutMock} className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer" title="Log out">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <button 
                className="text-zinc-300 hover:text-white transition-colors flex items-center text-xs font-semibold bg-white/10 hover:bg-white/15 px-3.5 py-1.5 rounded-full border border-white/10 theme-pill cursor-pointer"
                onClick={() => onNavigate?.('login')}
                title="Login"
              >
                <LogIn className="w-3.5 h-3.5 mr-1" />
                Login
              </button>
            )}
          </div>

          {/* Mobile Right Bar */}
          <div className="flex md:hidden items-center space-x-2">
            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-white transition-all theme-pill cursor-pointer"
              title="Toggle theme"
            >
              {isLight ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-indigo-300" />}
            </button>

            {/* Keys button -> Opens Key History */}
            <button 
              className={`flex items-center space-x-1 px-3 py-1 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                currentPage === 'key-history' 
                  ? 'bg-indigo-600 text-white border-indigo-400/40'
                  : 'text-zinc-200 bg-zinc-900/80 border-white/10 theme-pill'
              }`}
              onClick={handleKeyClick}
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Keys</span>
            </button>

            {/* Wallet for logged in user */}
            {currentUser && (
              <div className="flex items-center space-x-1 bg-zinc-900/80 border border-white/10 px-2 py-1 rounded-full theme-pill">
                <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-white font-mono font-bold text-xs theme-text-title">₹{balance}</span>
                <button 
                  onClick={() => setIsAddBalanceOpen(true)}
                  className="ml-0.5 bg-white/10 text-white p-0.5 rounded-full transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            )}

            {/* Mobile menu trigger */}
            <button 
              className="text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-[#09090b]/95 border-b border-white/10 backdrop-blur-xl">
          <div className="px-3 pt-3 pb-4 space-y-2">
            {currentUser && (
              <div className="flex items-center justify-between px-3 py-2 text-sm font-medium text-zinc-300 border-b border-white/10 mb-2 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white">
                    {currentUser.displayName?.[0] || 'U'}
                  </div>
                  <div>
                    <span className="text-white font-bold block">{currentUser.displayName}</span>
                    <span className="text-[11px] text-zinc-400">{currentUser.email}</span>
                  </div>
                </div>
                <button onClick={logOutMock} className="text-xs text-rose-400 hover:text-rose-300">
                  Sign Out
                </button>
              </div>
            )}

            <button 
              onClick={() => { onNavigate?.('home'); setIsMenuOpen(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
            >
              <Home className="w-4 h-4 mr-3 text-indigo-400" />
              Store Home
            </button>

            <button 
              onClick={() => { handleKeyClick(); setIsMenuOpen(false); }}
              className="w-full flex items-center px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
            >
              <Key className="w-4 h-4 mr-3 text-indigo-400" />
              {isOwner ? "All Key History" : "My Keys History"}
            </button>

            {isOwner && (
              <button 
                onClick={() => { onNavigate?.('dashboard'); setIsMenuOpen(false); }}
                className="w-full flex items-center px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-4 h-4 mr-3 text-indigo-400" />
                Owner Dashboard
              </button>
            )}

            {!currentUser && (
              <div className="pt-2">
                <button 
                  onClick={() => { onNavigate?.('login'); setIsMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In / Register
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>

    <AddBalanceModal isOpen={isAddBalanceOpen} onClose={() => setIsAddBalanceOpen(false)} />
    <NotificationsModal 
      isOpen={isNotificationsOpen} 
      onClose={() => setIsNotificationsOpen(false)} 
      userId={currentUser?.uid} 
      onViewPurchases={handleKeyClick} 
    />
    </>
  );
}
