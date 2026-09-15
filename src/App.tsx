import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Pricing } from './components/Pricing';
import { OwnerProfile } from './components/OwnerProfile';
import { Footer } from './components/Footer';
import { SupportChat } from './components/SupportChat';
import { Dashboard } from './components/Dashboard';
import { PurchaseHistoryModal } from './components/PurchaseHistoryModal';
import { Login } from './components/Login';
import { useAuth } from './lib/useAuth';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'dashboard' | 'login'>('home');
  const [showPurchases, setShowPurchases] = useState(false);
  const { currentUser } = useAuth();
  
  useEffect(() => {
    // If user lands on /success or has a pending payment, make sure they are on the home page 
    // to view the pricing component's modal logic
    const path = window.location.pathname;
    if (path === '/success' || sessionStorage.getItem('pendingPayment')) {
      setCurrentPage('home');
      
      // Clean up the URL if it's just /success
      if (path === '/success') {
         sessionStorage.setItem('paymentRedirected', 'true');
         window.history.replaceState({}, document.title, '/');
      }
    }
  }, []);
  
  const isOwner = currentUser?.email?.includes('barikarman') || ['admin', 'owner', 'arman_123'].includes(currentUser?.customId || '') || currentUser?.customId?.includes('barikarman');

  return (
    <div className="min-h-screen bg-zinc-950 font-sans selection:bg-fuchsia-500 selection:text-white text-zinc-100">
      <Header 
        currentPage={currentPage} 
        onNavigate={setCurrentPage}
        onShowPurchases={() => setShowPurchases(true)}
      />
      
      {currentPage === 'home' || (!isOwner && currentPage === 'dashboard') ? (
        <main className="pt-20">
          <Pricing onPurchaseSuccess={() => setShowPurchases(true)} onRequiresLogin={() => setCurrentPage('login')} />
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
      
      {(currentPage === 'home' || (!isOwner && currentPage === 'dashboard')) && <Footer />}
      <SupportChat />
      {showPurchases && (
        <PurchaseHistoryModal onClose={() => setShowPurchases(false)} />
      )}
    </div>
  );
}


