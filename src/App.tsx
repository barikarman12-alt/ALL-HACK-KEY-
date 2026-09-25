import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Pricing, PurchaseSuccessPayload } from './components/Pricing';
import { OwnerProfile } from './components/OwnerProfile';
import { Footer } from './components/Footer';
import { SupportChat } from './components/SupportChat';
import { Dashboard } from './components/Dashboard';
import { Login } from './components/Login';
import { KeyReceivedPage, KeyReceivedData } from './components/KeyReceivedPage';
import { VerifyPaymentPage } from './components/VerifyPaymentPage';
import { KeyHistoryPage } from './components/KeyHistoryPage';
import { PaymentWatcher } from './components/PaymentWatcher';
import { useAuth } from './lib/useAuth';
import { ThemeProvider } from './lib/theme';

export type PageRoute = 'home' | 'key-history' | 'dashboard' | 'login' | 'key-received' | 'verify-payment';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageRoute>(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (path === '/verify-payment' || path === '/success' || params.get('order_id') || params.get('orderId')) {
      return 'verify-payment';
    }
    if (path === '/key-history' || path === '/keys' || path === '/my-keys') {
      return 'key-history';
    }
    if (path === '/login' || path === '/register' || path === '/signup') {
      return 'login';
    }
    if (path === '/dashboard') {
      return 'dashboard';
    }
    return 'home';
  });

  const [receivedKeyData, setReceivedKeyData] = useState<KeyReceivedData | null>(null);
  const { currentUser } = useAuth();
  
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

  const isOwner = Boolean(
    currentUser?.email?.includes('barikarman') || 
    currentUser?.email === 'barikarman12@gmail.com' ||
    currentUser?.email === 'barikarman207@gmail.com' ||
    currentUser?.customId?.toLowerCase().includes('barikarman') ||
    currentUser?.displayName?.toLowerCase().includes('arman')
  );

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
    const targetPath = route === 'home' ? '/' : `/${route}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setCurrentPage(route);
  };

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      <Header 
        currentPage={currentPage} 
        onNavigate={navigateTo}
        onShowPurchases={() => navigateTo('key-history')}
      />
      
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
      ) : currentPage === 'home' || (!isOwner && currentPage === 'dashboard') ? (
        <main className="pt-20">
          <Pricing 
            onPurchaseSuccess={handlePurchaseSuccess} 
            onRequiresLogin={() => navigateTo('login')} 
          />
          <OwnerProfile />
        </main>
      ) : currentPage === 'login' ? (
        <main>
          <Login 
            onBack={navigateToHome} 
            defaultView="register"
          />
        </main>
      ) : (
        <main>
          <Dashboard />
        </main>
      )}
      
      {(currentPage === 'home' || currentPage === 'key-history' || currentPage === 'key-received' || currentPage === 'verify-payment' || (!isOwner && currentPage === 'dashboard')) && <Footer />}
      <SupportChat />
      <PaymentWatcher onKeyReceived={handlePurchaseSuccess} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
