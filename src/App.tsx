import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from './components/Header';
import { Pricing, PurchaseSuccessPayload } from './components/Pricing';
import { FAQSection } from './components/FAQSection';
import { OwnerProfile } from './components/OwnerProfile';
import { Footer } from './components/Footer';
import { SupportChat } from './components/SupportChat';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { KeyReceivedPage, KeyReceivedData } from './components/KeyReceivedPage';
import { VerifyPaymentPage } from './components/VerifyPaymentPage';
import { KeyHistoryPage } from './components/KeyHistoryPage';
import { PaymentWatcher } from './components/PaymentWatcher';
import { GlobalLoadingBar } from './components/Skeletons';
import { Helmet } from './components/Helmet';
import { useAuth } from './lib/useAuth';
import { useInventory } from './store';
import { ThemeProvider } from './lib/theme';
import { ErrorBoundary } from './components/ErrorBoundary';

export type PageRoute = 'home' | 'key-history' | 'dashboard' | 'login' | 'key-received' | 'verify-payment';

function AppContent() {
  const { currentUser, loading: authLoading, isAdmin, isOwner } = useAuth();
  const { settings } = useInventory();
  const siteName = settings?.siteName || 'Arman X Store';

  const [currentPage, setCurrentPage] = useState<PageRoute>(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (path === '/verify-payment' || path === '/success' || params.get('order_id') || params.get('orderId')) {
      return 'verify-payment';
    }
    if (path === '/key-history' || path === '/keys' || path === '/my-keys') {
      return 'key-history';
    }
    if (path === '/dashboard') {
      return 'dashboard';
    }
    if (path === '/login' || path === '/register' || path === '/signup') {
      return 'login';
    }
    return 'home';
  });

  const [receivedKeyData, setReceivedKeyData] = useState<KeyReceivedData | null>(null);

  // Dynamic SEO Configuration for Current Page View
  const seoData = useMemo(() => {
    switch (currentPage) {
      case 'dashboard':
        return {
          title: `Dashboard - ${siteName}`,
          description: `${siteName} Administrator Dashboard: Real-time sales analytics, QR order verification, license inventory, and customer bookkeeping.`,
          keywords: `dashboard, admin, store manager, sales analytics, ${siteName}`
        };
      case 'key-history':
        return {
          title: `Your Keys - ${siteName}`,
          description: `View your purchased VIP activation keys, license codes, and order history on ${siteName}.`,
          keywords: `my keys, your keys, license history, digital keys, activation codes, ${siteName}`
        };
      case 'verify-payment':
        return {
          title: `Verify Payment - ${siteName}`,
          description: `Live UPI payment verification, receipt download, and digital key delivery on ${siteName}.`,
          keywords: `payment verify, UPI receipt, instant key delivery, order status, ${siteName}`
        };
      case 'key-received':
        return {
          title: `Key Received - ${siteName}`,
          description: `Your digital activation license key is ready to copy on ${siteName}. Fast, verified VIP key delivery.`,
          keywords: `key received, digital license, game key, ${siteName}`
        };
      case 'login':
        return {
          title: `Login - ${siteName}`,
          description: `Sign in or register for ${siteName} to access VIP keys, wallet top-ups, and daily spin rewards.`,
          keywords: `login, sign in, register, member access, ${siteName}`
        };
      case 'home':
      default:
        return {
          title: `${siteName} – VIP Digital Keys & Instant UPI Delivery`,
          description: `Buy premium VIP keys, game activation licenses, and instant digital delivery with automatic UPI payment support on ${siteName}.`,
          keywords: `VIP keys, game activation key, UPI game shop, ${siteName}, BGMI key, digital license keys`
        };
    }
  }, [currentPage, siteName]);
  
  useEffect(() => {
    const syncRouteFromLocation = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (path === '/verify-payment' || path === '/success' || params.get('order_id') || params.get('orderId')) {
        setCurrentPage('verify-payment');
      } else if (path === '/key-history' || path === '/keys' || path === '/my-keys') {
        setCurrentPage('key-history');
      } else if (path === '/dashboard') {
        setCurrentPage('dashboard');
      } else if (path === '/login' || path === '/register' || path === '/signup') {
        setCurrentPage('login');
      } else if (path === '/key-received') {
        setCurrentPage('key-received');
      } else {
        setCurrentPage('home');
      }
    };

    syncRouteFromLocation();
    window.addEventListener('popstate', syncRouteFromLocation);
    return () => window.removeEventListener('popstate', syncRouteFromLocation);
  }, []);

  // Strict route guard: Force non-admin users away from the dashboard route
  useEffect(() => {
    if (!authLoading && currentUser && !isAdmin && currentPage === 'dashboard') {
      if (window.location.pathname === '/dashboard') {
        window.history.replaceState({}, '', '/');
      }
      setCurrentPage('home');
    }
  }, [authLoading, currentUser, isAdmin, currentPage]);

  const handlePurchaseSuccess = useCallback((payload: PurchaseSuccessPayload) => {
    const firstKey = payload.keys && payload.keys.length > 0 ? payload.keys[0] : '';
    setReceivedKeyData({
      key: firstKey,
      keys: payload.keys,
      productName: payload.productName,
      durationLabel: payload.durationLabel,
      amount: payload.amount,
      date: payload.date || new Date().toISOString(),
      orderId: payload.orderId
    });
    setCurrentPage('key-received');
  }, []);

  const navigateToHome = () => {
    if (window.location.pathname !== '/' || window.location.search) {
      window.history.pushState({}, '', '/');
    }
    setCurrentPage('home');
  };

  const navigateTo = (route: PageRoute) => {
    // Prevent non-admin users from navigating to dashboard
    if (route === 'dashboard' && !isAdmin) {
      navigateToHome();
      return;
    }
    const targetPath = route === 'home' ? '/' : `/${route}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setCurrentPage(route);
  };

  // 1. Loading Splash Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <Helmet 
          title={`Loading - ${siteName}`}
          description={`Loading ${siteName}...`}
        />
        <GlobalLoadingBar isLoading={true} />
        {/* Ambient Glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(99,102,241,0.35)] relative z-10">
          <div className="w-7 h-7 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-white font-bold text-sm tracking-wide relative z-10">Loading {siteName}...</p>
        <p className="text-zinc-500 text-xs mt-1 relative z-10">Initializing VIP digital store & secure session</p>
      </div>
    );
  }

  // 2. STRICT AUTHENTICATION GUARD: Unauthenticated users MUST authenticate before mounting main store
  if (!currentUser) {
    if (currentPage === 'verify-payment') {
      return (
        <div className="min-h-screen font-sans">
          <Helmet 
            title={`Verify Payment - ${siteName}`}
            description={`Verify your UPI payment order and download your official key receipt on ${siteName}.`}
          />
          <VerifyPaymentPage 
            onBackToHome={navigateToHome}
            onViewPurchases={() => navigateTo('key-history')}
          />
          <SupportChat />
        </div>
      );
    }

    return (
      <div className="min-h-screen font-sans bg-[#09090b]">
        <Helmet 
          title={`Login - ${siteName}`}
          description={`Member VIP Access: Sign in or register to enter ${siteName}.`}
        />
        <Login 
          onBack={navigateToHome} 
          isMandatoryGate={true}
          defaultView="login"
        />
        <SupportChat />
      </div>
    );
  }

  // 3. AUTHENTICATED USER FLOW: Main application state is mounted only here
  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      <Helmet 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
      />
      <GlobalLoadingBar isLoading={authLoading} />
      <Header 
        currentPage={currentPage} 
        onNavigate={navigateTo}
        onShowPurchases={() => navigateTo('key-history')}
      />
      
      {/* Live Announcement Banner from Dashboard Settings */}
      {settings?.announcementEnabled && settings?.announcementText && currentPage === 'home' && (
        <div className="pt-20 px-4 max-w-7xl mx-auto">
          <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-indigo-600/20 via-violet-600/20 to-indigo-600/20 border border-indigo-500/30 text-zinc-100 flex items-center justify-between gap-3 shadow-[0_0_25px_rgba(99,102,241,0.15)] animate-in fade-in">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white shadow-sm shrink-0">
                Notice
              </span>
              <p className="text-xs sm:text-sm font-medium text-white truncate">
                {settings.announcementText}
              </p>
            </div>
            {settings?.whatsappSupportNumber && (
              <a 
                href={`https://wa.me/${settings.whatsappSupportNumber.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 px-3 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center gap-1.5 cursor-pointer"
              >
                <span>Support</span>
              </a>
            )}
          </div>
        </div>
      )}
      
      {currentPage === 'verify-payment' ? (
        <main>
          <VerifyPaymentPage 
            onBackToHome={navigateToHome}
            onViewPurchases={() => navigateTo('key-history')}
          />
        </main>
      ) : currentPage === 'key-received' ? (
        <main>
          <KeyReceivedPage 
            data={receivedKeyData}
            onBackToHome={navigateToHome}
            onViewKeyHistory={() => navigateTo('key-history')}
          />
        </main>
      ) : currentPage === 'key-history' ? (
        <main>
          <KeyHistoryPage 
            onBackToHome={navigateToHome}
            onBuyMore={navigateToHome}
          />
        </main>
      ) : currentPage === 'dashboard' && isAdmin ? (
        <main>
          <Dashboard onNavigateHome={navigateToHome} />
        </main>
      ) : (
        <main className="pt-20">
          <Pricing 
            onPurchaseSuccess={handlePurchaseSuccess} 
            onRequiresLogin={() => navigateTo('login')} 
          />
          <FAQSection onManageFAQs={() => {
            if (isAdmin) {
              window.history.pushState({}, '', '/dashboard?tab=faqs');
              navigateTo('dashboard');
            }
          }} />
          <OwnerProfile />
        </main>
      )}
      
      {currentPage !== 'dashboard' && <Footer />}
      <SupportChat />
      <PaymentWatcher onKeyReceived={handlePurchaseSuccess} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

