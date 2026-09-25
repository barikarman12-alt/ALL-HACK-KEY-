import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Pricing, PurchaseSuccessPayload } from './components/Pricing';
import { OwnerProfile } from './components/OwnerProfile';
import { Footer } from './components/Footer';
import { SupportChat } from './components/SupportChat';
import { Dashboard } from './components/Dashboard';
import { PurchaseHistoryModal } from './components/PurchaseHistoryModal';
import { Login } from './components/Login';
import { KeyReceivedPage, KeyReceivedData } from './components/KeyReceivedPage';
import { VerifyPaymentPage } from './components/VerifyPaymentPage';
import { PaymentWatcher } from './components/PaymentWatcher';
import { useAuth } from './lib/useAuth';
import { ThemeProvider } from './lib/theme';

export type PageRoute = 'home' | 'dashboard' | 'login' | 'key-received' | 'verify-payment';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageRoute>(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    if (path === '/verify-payment' || path === '/success' || params.get('order_id') || params.get('orderId')) {
      return 'verify-payment';
    }
    if (path === '/login' || path === '/register' || path === '/signup') {
      return 'login';
    }
    return 'home';
  });

  const [showPurchases, setShowPurchases] = useState(false);
  const [receivedKeyData, setReceivedKeyData] = useState<KeyReceivedData | null>(null);
  const { currentUser } = useAuth();
  
  useEffect(() => {
    const syncRouteFromLocation = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);
      if (path === '/verify-payment' || path === '/success' || params.get('order_id') || params.get('orderId')) {
        setCurrentPage('verify-payment');
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

  return (
    <div className="min-h-screen font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      <Header 
        currentPage={currentPage === 'verify-payment' ? 'home' : currentPage} 
        onNavigate={(p) => {
          if (p === 'home') navigateToHome();
          else setCurrentPage(p);
        }}
        onShowPurchases={() => setCurrentPage('key-received')}
      />
      
      {currentPage === 'verify-payment' ? (
        <main>
          <VerifyPaymentPage 
            onBackToHome={navigateToHome}
            onViewPurchases={() => setCurrentPage('key-received')}
          />
        </main>
      ) : currentPage === 'key-received' ? (
        <main>
          <KeyReceivedPage 
            data={receivedKeyData}
            onBackToHome={navigateToHome}
          />
        </main>
      ) : currentPage === 'home' || (!isOwner && currentPage === 'dashboard') ? (
        <main className="pt-20">
          <Pricing 
            onPurchaseSuccess={handlePurchaseSuccess} 
            onRequiresLogin={() => setCurrentPage('login')} 
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
      
      {(currentPage === 'home' || currentPage === 'key-received' || currentPage === 'verify-payment' || (!isOwner && currentPage === 'dashboard')) && <Footer />}
      <SupportChat />
      <PaymentWatcher onKeyReceived={handlePurchaseSuccess} />
      {showPurchases && (
        <PurchaseHistoryModal onClose={() => setShowPurchases(false)} />
      )}
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
