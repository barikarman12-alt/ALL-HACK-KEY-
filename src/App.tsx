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
import { PaymentWatcher } from './components/PaymentWatcher';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { useAuth } from './lib/useAuth';
import { useInventory } from './store';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'dashboard' | 'login' | 'key-received'>('home');
  const [showPurchases, setShowPurchases] = useState(false);
  const [receivedKeyData, setReceivedKeyData] = useState<KeyReceivedData | null>(null);
  const { currentUser, loading } = useAuth();
  const { settings } = useInventory();
  
  useEffect(() => {
    // Check if user was redirected back from payment gateway
    try {
      const url = new URL(window.location.href);
      const path = url.pathname;
      const orderId = url.searchParams.get('order_id') || url.searchParams.get('orderId') || url.searchParams.get('client_txn_id') || url.searchParams.get('txn_id');
      const status = (url.searchParams.get('status') || url.searchParams.get('payment_status') || '').toLowerCase();
      const isSuccessRoute = path === '/success' || path.startsWith('/success') || path === '/payment-success';

      if (isSuccessRoute || orderId || status === 'success') {
        localStorage.setItem('paymentRedirected', 'true');
        
        // If orderId is in URL but not in localStorage (e.g. redirected to new window/browser)
        if (orderId) {
          const existingPending = localStorage.getItem('pendingPayment');
          if (!existingPending) {
            localStorage.setItem('pendingPayment', JSON.stringify({
              orderId: orderId,
              type: 'keys',
              amount: 0,
              userId: currentUser?.uid || '',
              timestamp: Date.now()
            }));
          }
        }

        // Clean up URL without reloading the page
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, '/');
        }
      }

      if (isSuccessRoute || localStorage.getItem('pendingPayment')) {
        setCurrentPage('home');
      }
    } catch(e) {}
  }, [currentUser]);
  
  const isOwner = currentUser?.email?.includes('barikarman') || ['admin', 'owner', 'arman_123'].includes(currentUser?.customId || '') || currentUser?.customId?.includes('barikarman');

  useEffect(() => {
    if (currentUser && currentPage === 'login') {
      setCurrentPage(isOwner ? 'dashboard' : 'home');
    }
  }, [currentUser, currentPage, isOwner]);

  const handlePurchaseSuccess = useCallback((payload?: PurchaseSuccessPayload) => {
    if (payload) {
      setReceivedKeyData(payload);
    }
    setCurrentPage('key-received');
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-fuchsia-500 selection:text-white text-zinc-100">
      <Header 
        currentPage={currentPage} 
        onNavigate={setCurrentPage}
        onShowPurchases={() => setCurrentPage('key-received')}
      />
      
      {currentPage === 'key-received' ? (
        <main>
          <KeyReceivedPage 
            data={receivedKeyData}
            onBackToHome={() => setCurrentPage('home')}
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
          <Login onBack={() => setCurrentPage('home')} />
        </main>
      ) : (
        <main>
          <Dashboard />
        </main>
      )}
      
      {(currentPage === 'home' || currentPage === 'key-received' || (!isOwner && currentPage === 'dashboard')) && <Footer />}
      <SupportChat />
      <PaymentWatcher onKeyReceived={handlePurchaseSuccess} />
      <PWAInstallBanner siteName={settings.siteName} />
      {showPurchases && (
        <PurchaseHistoryModal onClose={() => setShowPurchases(false)} />
      )}
    </div>
  );
}


