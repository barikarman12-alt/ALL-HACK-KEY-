import React, { useState } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';
import { InstallAppModal } from './InstallAppModal';

interface InstallAppButtonProps {
  className?: string;
  variant?: 'header' | 'mobile-menu' | 'card' | 'pill';
  siteName?: string;
}

export const InstallAppButton: React.FC<InstallAppButtonProps> = ({
  className = '',
  variant = 'header',
  siteName = 'ARMAN X STORE'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // If already running in standalone/installed mode, don't show prompt
  if (isInstalled) {
    return null;
  }

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isInstallable) {
      const res = await install();
      if (res === 'manual_needed') {
        setIsModalOpen(true);
      }
    } else {
      setIsModalOpen(true);
    }
  };

  if (variant === 'header') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-fuchsia-600/90 to-pink-600/90 hover:from-fuchsia-500 hover:to-pink-500 text-white shadow-[0_0_12px_rgba(224,0,255,0.4)] border border-fuchsia-400/40 transition-all transform hover:scale-105 active:scale-95 cursor-pointer ${className}`}
          title="Install ARMAN X STORE App"
        >
          <Download className="w-3.5 h-3.5 animate-pulse" />
          <span>Install App</span>
        </button>
        <InstallAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} siteName={siteName} />
      </>
    );
  }

  if (variant === 'mobile-menu') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-fuchsia-600/30 to-purple-600/30 hover:from-fuchsia-600/50 hover:to-purple-600/50 border border-fuchsia-500/40 rounded-xl transition-all ${className}`}
        >
          <span className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-fuchsia-400" />
            <span>Install Store App</span>
          </span>
          <span className="px-2 py-0.5 rounded-md bg-fuchsia-500 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
            Free
          </span>
        </button>
        <InstallAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} siteName={siteName} />
      </>
    );
  }

  if (variant === 'card') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-sm shadow-[0_0_15px_rgba(224,0,255,0.3)] transition-all cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>Install Web App</span>
        </button>
        <InstallAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} siteName={siteName} />
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-fuchsia-500/40 text-xs font-semibold text-zinc-200 hover:text-white hover:border-fuchsia-500 transition-all ${className}`}
      >
        <Download className="w-3.5 h-3.5 text-fuchsia-400" />
        <span>Install App</span>
      </button>
      <InstallAppModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} siteName={siteName} />
    </>
  );
};
