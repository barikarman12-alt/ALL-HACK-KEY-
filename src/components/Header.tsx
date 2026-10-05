import { LayoutDashboard, Home, LogIn, LogOut, Wallet, Plus, Key, Bell, Sun, Moon, Menu, X, Sparkles, Gift, Crown, ShieldCheck, HelpCircle, MapPin, User } from 'lucide-react';
import { useState, useEffect } from 'react';
import { logOutMock } from '../lib/useAuth';
import { useAuth } from '../lib/useAuth';
import { useBalance, useInventory, useNotifications, useSpinBalance, useUsers } from '../store';
import { useTheme } from '../lib/theme';
import { AddBalanceModal } from './AddBalanceModal';
import { NotificationsModal } from './NotificationsModal';
import { SpinWheelModal } from './SpinWheelModal';
import { CustomerAddressModal } from './CustomerAddressModal';

interface HeaderProps {
  currentPage?: 'home' | 'key-history' | 'dashboard' | 'login' | 'key-received' | 'verify-payment';
  onNavigate?: (page: 'home' | 'key-history' | 'dashboard' | 'login' | 'key-received' | 'verify-payment') => void;
  onShowPurchases?: () => void;
}

export function Header({ currentPage = 'home', onNavigate, onShowPurchases }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSpinWheelOpen, setIsSpinWheelOpen] = useState(false);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const { currentUser, isAdmin } = useAuth();
  const { balance } = useBalance(currentUser?.uid);
  const { settings } = useInventory(currentUser?.uid, currentUser?.email || undefined);
  const { unreadCount } = useNotifications(currentUser?.uid);
  const { spinBalance: spinCount } = useSpinBalance(currentUser?.uid);
  const { users } = useUsers();
  const { isLight, toggleTheme } = useTheme();

  const isOwner = isAdmin;

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
            <div className="flex items-center gap-2">
              <span className="font-display font-semibold text-lg sm:text-xl tracking-tight text-white theme-text-title">
                {settings.siteName || "ARMAN X STORE"}
              </span>
              {isOwner && (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 text-amber-300 border border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]">
                  <Crown className="w-3 h-3 text-amber-400 fill-amber-400/40" />
                  <span>Admin</span>
                </span>
              )}
            </div>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Dashboard / Back button for owner */}
            {isOwner && (
              <button 
                onClick={() => onNavigate?.(currentPage === 'dashboard' ? 'home' : 'dashboard')}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 ${
                  currentPage === 'dashboard'
                    ? 'bg-amber-500 text-black border border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                    : 'text-amber-300 hover:text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 hover:border-amber-400/70 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                }`}
                title="Owner Taskbar & Dashboard"
              >
                <LayoutDashboard className="w-4 h-4 text-amber-400" />
                <span>{currentPage === 'dashboard' ? 'Back to Store' : 'Owner Taskbar'}</span>
                <span className="bg-amber-950/80 border border-amber-500/40 text-amber-200 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  {users.length} Users
                </span>
              </button>
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

            {/* Lucky Spin Wheel Button */}
            <button 
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border transition-all cursor-pointer active:scale-95 ${
                spinCount > 0
                  ? 'border-amber-400 bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-amber-500/25 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'border-zinc-700/60 bg-zinc-900/60 hover:border-amber-500/40 text-zinc-400 hover:text-amber-300'
              }`}
              onClick={() => setIsSpinWheelOpen(true)}
              title={spinCount > 0 ? "Daily Free Spin Available! (Resets daily at 12:01 AM)" : "Daily spin used. Resets at 12:01 AM"}
            >
              <Gift className={`w-3.5 h-3.5 ${spinCount > 0 ? 'text-amber-400 animate-pulse' : 'text-zinc-400'}`} />
              <span>{spinCount > 0 ? "Daily Spin" : "Lucky Spin"}</span>
              {spinCount > 0 ? (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-black text-[10px] font-black leading-none shadow-[0_0_8px_rgba(245,158,11,0.8)]">
                  FREE
                </span>
              ) : (
                <span className="text-[10px] text-zinc-500 font-mono ml-0.5">12:01 AM</span>
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

            {/* FAQ Button -> Scrolls to FAQ */}
            <button 
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full border text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900/80 border-white/10 hover:border-white/20 hover:bg-zinc-800 theme-pill transition-all cursor-pointer"
              onClick={() => {
                if (currentPage !== 'home') {
                  onNavigate?.('home');
                  setTimeout(() => {
                    const el = document.getElementById('faq');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }, 120);
                } else {
                  const el = document.getElementById('faq');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              title="Frequently Asked Questions (FAQ)"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
              <span>FAQ</span>
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
                <div className="flex items-center space-x-2.5 pl-1.5 py-1 px-2.5 rounded-2xl bg-zinc-900/70 border border-white/10">
                  {/* Avatar */}
                  <div 
                    className="relative cursor-pointer group shrink-0" 
                    onClick={() => isOwner && onNavigate?.('dashboard')}
                    title={isOwner ? "Owner Profile (Click for Dashboard)" : `Logged in as ${currentUser.email || currentUser.displayName || 'User'}`}
                  >
                    {currentUser.photoURL ? (
                      <img 
                        src={currentUser.photoURL} 
                        alt="Profile" 
                        className={`w-8 h-8 rounded-full object-cover transition-transform group-hover:scale-105 ${
                          isOwner 
                            ? 'ring-2 ring-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.6)]' 
                            : 'ring-1 ring-white/20'
                        }`} 
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold transition-transform group-hover:scale-105 ${
                        isOwner 
                          ? 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-black ring-2 ring-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.6)] font-black' 
                          : 'bg-indigo-600/80 text-white'
                      }`}>
                        {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                      </div>
                    )}
                    {isOwner && (
                      <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-black rounded-full flex items-center justify-center text-[8px] font-black shadow-md border border-black leading-none">
                        👑
                      </span>
                    )}
                  </div>

                  {/* Profile Info: Gmail ID, Display Name & Role */}
                  <div className="flex flex-col text-left max-w-[170px] sm:max-w-[240px]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white leading-tight truncate" title={currentUser.email || currentUser.displayName || 'Google Account'}>
                        {currentUser.email || currentUser.displayName || currentUser.customId || 'Google User'}
                      </span>
                      {isOwner ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/25 text-amber-300 border border-amber-500/40 shrink-0">
                          Admin
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                          {currentUser.email?.includes('@gmail.com') ? 'Gmail' : 'Customer'}
                        </span>
                      )}
                    </div>
                    {currentUser.displayName && currentUser.displayName !== currentUser.email ? (
                      <span className="text-[10px] text-zinc-400 leading-tight truncate" title={currentUser.displayName}>
                        {currentUser.displayName}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-mono leading-tight truncate">
                        {currentUser.email ? `ID: ${currentUser.email.split('@')[0]}` : `ID: ${currentUser.uid.substring(0, 10)}...`}
                      </span>
                    )}
                  </div>

                  {/* Profile Name & Number Button */}
                  <button
                    onClick={() => setIsAddressModalOpen(true)}
                    className="p-1.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-emerald-400 transition-colors border border-white/5 cursor-pointer ml-0.5"
                    title="Apna Naam & WhatsApp Number Update Karein"
                  >
                    <User className="w-3.5 h-3.5 text-cyan-400 hover:text-cyan-300" />
                  </button>

                  <button 
                    onClick={logOutMock} 
                    className="text-zinc-400 hover:text-rose-400 transition-colors p-1.5 hover:bg-white/5 rounded-full cursor-pointer ml-0.5" 
                    title="Log out"
                  >
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
              <div className="flex items-center gap-1.5">
                <div className="flex items-center space-x-1 bg-zinc-900/80 border border-white/10 px-2 py-1 rounded-full theme-pill">
                  <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="text-white font-mono font-bold text-xs theme-text-title">₹{balance}</span>
                  <button 
                    onClick={() => setIsAddBalanceOpen(true)}
                    className="ml-0.5 bg-white/10 text-white p-0.5 rounded-full transition-colors cursor-pointer"
                    title="Add Balance"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div 
                  className="w-7 h-7 rounded-full bg-zinc-800 border border-white/20 text-white flex items-center justify-center text-[10px] font-bold cursor-pointer shrink-0"
                  onClick={() => setIsMenuOpen(true)}
                  title={currentUser.email || 'User Account'}
                >
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()
                  )}
                </div>
              </div>
            )}

            {/* Mobile Owner Badge & Taskbar Button */}
            {isOwner && (
              <button 
                onClick={() => onNavigate?.(currentPage === 'dashboard' ? 'home' : 'dashboard')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-400/60 bg-gradient-to-r from-amber-500/25 via-yellow-500/20 to-amber-500/25 text-amber-300 text-xs font-black transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.35)] active:scale-95"
                title="Owner Taskbar & Dashboard"
              >
                <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40" />
                <span className="text-[11px] font-black uppercase tracking-wider">Owner</span>
                <span className="bg-amber-950/80 border border-amber-500/40 text-amber-200 px-1 rounded-full text-[9px] font-mono">
                  {users.length}
                </span>
              </button>
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
              <div className="space-y-2 border-b border-white/10 mb-2 pb-3">
                {/* Admin Status Banner for Mobile */}
                {isOwner && (
                  <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-950/60 via-amber-900/30 to-yellow-950/40 border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                        <Crown className="w-4 h-4 text-amber-400 fill-amber-400/30" />
                      </div>
                      <div>
                        <div className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                          <span>OWNER / ADMIN ACCESS</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        </div>
                        <div className="text-[10px] text-amber-200/70">Full Store Management Privileges</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => { onNavigate?.('dashboard'); setIsMenuOpen(false); }}
                      className="px-2.5 py-1 bg-amber-500 text-black rounded-lg text-xs font-bold transition-all shadow-[0_0_10px_rgba(245,158,11,0.3)] cursor-pointer hover:bg-amber-400"
                    >
                      Taskbar →
                    </button>
                  </div>
                )}

                <div className="p-3 rounded-2xl bg-zinc-900/90 border border-white/10 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        {currentUser.photoURL ? (
                          <img 
                            src={currentUser.photoURL} 
                            alt="" 
                            className={`w-9 h-9 rounded-full object-cover ${
                              isOwner ? 'ring-2 ring-amber-400' : 'ring-1 ring-white/20'
                            }`} 
                          />
                        ) : (
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-xs ${
                            isOwner ? 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-black ring-2 ring-amber-400 font-black' : 'bg-indigo-600'
                          }`}>
                            {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                          </div>
                        )}
                        {isOwner && (
                          <span className="absolute -bottom-1 -right-1 text-[10px] leading-none">👑</span>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white font-bold text-xs block truncate max-w-[170px]" title={currentUser.email || currentUser.displayName || 'Google Account'}>
                            {currentUser.email || currentUser.displayName || currentUser.customId || 'Google User'}
                          </span>
                          {isOwner ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-amber-500/25 text-amber-300 border border-amber-500/40">
                              Admin
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              {currentUser.email?.includes('@gmail.com') ? 'Gmail' : 'Customer'}
                            </span>
                          )}
                        </div>
                        {currentUser.displayName && currentUser.displayName !== currentUser.email && (
                          <span className="text-[11px] text-zinc-400 block truncate max-w-[190px]">
                            {currentUser.displayName}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-400 font-mono block truncate">
                          {currentUser.email ? `Gmail: ${currentUser.email}` : `ID: ${currentUser.uid.substring(0, 12)}...`}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => { logOutMock(); setIsMenuOpen(false); }} 
                      className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
                    >
                      Sign Out
                    </button>
                  </div>

                  {/* Wallet quick view in mobile menu */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Wallet className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Wallet: <strong className="text-white font-mono">₹{balance}</strong></span>
                    </div>
                    <button 
                      onClick={() => { setIsAddBalanceOpen(true); setIsMenuOpen(false); }}
                      className="text-[11px] text-indigo-300 hover:text-indigo-200 font-bold flex items-center gap-1 bg-indigo-500/20 px-2 py-0.5 rounded-md border border-indigo-500/30 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      Add Balance
                    </button>
                  </div>

                  {/* Customer Name & Phone Profile Quick Button */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                    <button
                      onClick={() => { setIsAddressModalOpen(true); setIsMenuOpen(false); }}
                      className="w-full py-1.5 px-3 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Mera Naam & Mobile Number</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <button 
              onClick={() => { setIsSpinWheelOpen(true); setIsMenuOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm font-semibold rounded-xl transition-colors cursor-pointer border ${
                spinCount > 0
                  ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                  : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center">
                <Gift className={`w-4 h-4 mr-3 ${spinCount > 0 ? 'text-amber-400 animate-pulse' : 'text-zinc-500'}`} />
                <span>Daily Lucky Spin</span>
              </div>
              {spinCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-xs font-black">
                  FREE
                </span>
              ) : (
                <span className="text-[11px] text-zinc-500 font-mono">
                  12:01 AM Reset
                </span>
              )}
            </button>

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

            <button 
              onClick={() => {
                setIsMenuOpen(false);
                if (currentPage !== 'home') {
                  onNavigate?.('home');
                  setTimeout(() => {
                    const el = document.getElementById('faq');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }, 120);
                } else {
                  const el = document.getElementById('faq');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }
              }}
              className="w-full flex items-center px-3 py-2 text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 mr-3 text-indigo-400" />
              Store FAQ & Help
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
    {isSpinWheelOpen && (
      <SpinWheelModal 
        isOpen={isSpinWheelOpen} 
        onClose={() => setIsSpinWheelOpen(false)} 
        onNavigateToBuyKey={() => onNavigate?.('home')} 
      />
    )}
    <CustomerAddressModal 
      isOpen={isAddressModalOpen} 
      onClose={() => setIsAddressModalOpen(false)} 
    />
    </>
  );
}
