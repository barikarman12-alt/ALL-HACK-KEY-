import { ShoppingCart, Menu, X, LayoutDashboard, Home, History, LogIn, LogOut, Wallet, Plus, Key } from 'lucide-react';
import { useState } from 'react';
import { logOutMock } from '../lib/useAuth';
import { useAuth } from '../lib/useAuth';
import { useBalance, useInventory } from '../store';
import { AddBalanceModal } from './AddBalanceModal';

interface HeaderProps {
  currentPage?: 'home' | 'dashboard' | 'login';
  onNavigate?: (page: 'home' | 'dashboard' | 'login') => void;
  onShowPurchases?: () => void;
}

export function Header({ currentPage = 'home', onNavigate, onShowPurchases }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddBalanceOpen, setIsAddBalanceOpen] = useState(false);
  const { currentUser } = useAuth();
  const { balance } = useBalance(currentUser?.uid);
  const { settings } = useInventory();

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-fuchsia-500/20 shadow-[0_0_15px_rgba(224,0,255,0.1)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate?.('home')}>
            <img 
              src={settings.siteLogoUrl || "/logo.png"} 
              alt={`${settings.siteName} Logo`}
              className="w-10 h-10 rounded-md shadow-[0_0_10px_rgba(224,0,255,0.4)] border border-fuchsia-500/30 object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <span className="font-display font-bold text-xl tracking-tight text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
              {settings.siteName || "ARMAN X STORE"}<span className="text-fuchsia-500 drop-shadow-[0_0_8px_rgba(224,0,255,0.8)]">.</span>
            </span>
          </div>
          
          <div className="hidden md:flex items-center space-x-4">
            {(currentUser?.email?.includes('barikarman') || ['admin', 'owner', 'arman_123'].includes(currentUser?.customId || '') || currentUser?.customId?.includes('barikarman')) && (
              currentPage === 'home' ? (
                <button 
                  onClick={() => onNavigate?.('dashboard')}
                  className="inline-flex items-center text-zinc-300 hover:text-fuchsia-400 transition-colors text-sm font-medium"
                >
                  <LayoutDashboard className="w-4 h-4 mr-1.5" />
                  Dashboard
                </button>
              ) : (
                <button 
                  onClick={() => onNavigate?.('home')}
                  className="inline-flex items-center text-zinc-300 hover:text-fuchsia-400 transition-colors text-sm font-medium"
                >
                  <Home className="w-4 h-4 mr-1.5" />
                  Back to Site
                </button>
              )
            )}

            {currentUser ? (
              <>
                <div className="flex items-center space-x-2 bg-zinc-900/80 border border-fuchsia-500/20 px-3 py-1.5 rounded-full shadow-[0_0_10px_rgba(224,0,255,0.1)]">
                  <Wallet className="w-4 h-4 text-fuchsia-400" />
                  <span className="text-white font-medium text-sm">₹{balance}</span>
                  <button 
                    onClick={() => setIsAddBalanceOpen(true)}
                    className="ml-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white p-1 rounded-full shadow-[0_0_8px_rgba(224,0,255,0.4)] transition-colors"
                    title="Add Balance"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button 
                  className="flex items-center space-x-1.5 text-zinc-300 hover:text-white bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-full hover:border-fuchsia-500/30 transition-all"
                  onClick={onShowPurchases}
                  title="My Purchases"
                >
                  <Key className="w-4 h-4 text-fuchsia-400" />
                  <span className="text-sm font-medium">My Keys</span>
                </button>
                <div className="flex items-center space-x-2">
                  {currentUser.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 bg-fuchsia-600 rounded-full" />
                  )}
                  <button onClick={logOutMock} className="text-zinc-300 hover:text-fuchsia-400 transition-colors" title="Log out">
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <button 
                className="text-zinc-300 hover:text-fuchsia-400 transition-colors flex items-center text-sm font-medium"
                onClick={() => onNavigate?.('login')}
                title="Login"
              >
                <LogIn className="w-4 h-4 mr-1.5" />
                Login
              </button>
            )}
            <a href="#pricing" onClick={() => onNavigate?.('home')} className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-white bg-fuchsia-600 hover:bg-fuchsia-500 shadow-[0_0_15px_rgba(224,0,255,0.4)] transition-all">
              View Products
            </a>
          </div>

          <div className="flex md:hidden items-center space-x-4">
            {currentUser ? (
              <>
                <div className="flex items-center space-x-1.5 bg-zinc-900/80 border border-fuchsia-500/20 px-2.5 py-1 rounded-full shadow-[0_0_10px_rgba(224,0,255,0.1)]">
                  <Wallet className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span className="text-white font-medium text-sm">₹{balance}</span>
                  <button 
                    onClick={() => setIsAddBalanceOpen(true)}
                    className="ml-1 bg-fuchsia-600 hover:bg-fuchsia-500 text-white p-1 rounded-full shadow-[0_0_8px_rgba(224,0,255,0.4)] transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <button 
                  className="flex items-center space-x-1.5 text-zinc-300 hover:text-white bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 rounded-full hover:border-fuchsia-500/30 transition-all"
                  onClick={onShowPurchases}
                >
                  <Key className="w-3.5 h-3.5 text-fuchsia-400" />
                  <span className="text-xs font-medium">My Keys</span>
                </button>
              </>
            ) : (
              <button 
                className="text-zinc-300 hover:text-fuchsia-400 transition-colors"
                onClick={() => {
                  onNavigate?.('login');
                  setIsMenuOpen(false);
                }}
              >
                <LogIn className="w-5 h-5" />
              </button>
            )}
            <button 
              className="text-zinc-300 hover:text-fuchsia-400 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-zinc-950/95 border-b border-fuchsia-500/30 backdrop-blur-md">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {currentUser && (
              <div className="flex items-center px-3 py-2 text-base font-medium text-zinc-300 border-b border-zinc-800 mb-2 pb-3">
                {currentUser.photoURL && <img src={currentUser.photoURL} alt="Profile" className="w-8 h-8 rounded-full mr-3" />}
                <div className="flex flex-col">
                  <span className="text-white">{currentUser.displayName}</span>
                  <button onClick={logOutMock} className="text-sm text-fuchsia-400 hover:text-fuchsia-300 text-left">
                    Sign Out
                  </button>
                </div>
              </div>
            )}
            {(currentUser?.email?.includes('barikarman') || ['admin', 'owner', 'arman_123'].includes(currentUser?.customId || '') || currentUser?.customId?.includes('barikarman')) && (
              currentPage === 'home' ? (
                <button 
                  onClick={() => { onNavigate?.('dashboard'); setIsMenuOpen(false); }}
                  className="w-full flex items-center px-3 py-2 text-base font-medium text-zinc-300 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 rounded-md transition-colors"
                >
                  <LayoutDashboard className="w-5 h-5 mr-3" />
                  Owner Dashboard
                </button>
              ) : (
                <button 
                  onClick={() => { onNavigate?.('home'); setIsMenuOpen(false); }}
                  className="w-full flex items-center px-3 py-2 text-base font-medium text-zinc-300 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 rounded-md transition-colors"
                >
                  <Home className="w-5 h-5 mr-3" />
                  Back to Site
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
    </>
  );
}
