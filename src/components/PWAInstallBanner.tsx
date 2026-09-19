import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';
import { InstallAppModal } from './InstallAppModal';

interface PWAInstallBannerProps {
  siteName?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ siteName = 'ARMAN X STORE' }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const isDismissed = sessionStorage.getItem('pwa_banner_dismissed');
    if (!isDismissed) {
      // Delay display slightly so it feels organic
      const timer = setTimeout(() => {
        setDismissed(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  const handleInstall = async () => {
    if (isInstallable) {
      const res = await install();
      if (res === 'manual_needed') {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-zinc-950/95 border-2 border-fuchsia-500/50 rounded-2xl p-3.5 shadow-[0_0_30px_rgba(224,0,255,0.3)] backdrop-blur-md animate-slideUp">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-fuchsia-500/40 p-1 flex-shrink-0 flex items-center justify-center relative overflow-hidden">
              <img src="/pwa-192x192.png" alt={siteName} className="w-full h-full object-cover rounded-lg" onError={(e) => {
                (e.target as HTMLImageElement).src = '/icon.svg';
              }} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                <span>Install {siteName}</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </p>
              <p className="text-[11px] text-zinc-400 truncate">
                Add to home screen for 1-tap instant access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-xs shadow-[0_0_12px_rgba(224,0,255,0.4)] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <InstallAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} siteName={siteName} />
    </>
  );
};
