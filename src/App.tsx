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
    // If user lands on /success or has a pending payment, make sure they are on the home page 
    // to view the pricing component's modal logic
    const path = window.location.pathname;
    if (path === '/success' || localStorage.getItem('pendingPayment')) {
      setCurrentPage('home');
      
      // Clean up the URL if it's just /success
      if (path === '/success') {
         localStorage.setItem('paymentRedirected', 'true');
         window.history.replaceState({}, document.title, '/');
         window.history.pushState({ paymentSuccess: true }, document.title, '/');
      }
    }
  }, []);
  
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


