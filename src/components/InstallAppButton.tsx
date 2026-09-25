import { useState, useEffect } from 'react';
import { Download, Smartphone, Check } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallAppButtonProps {
  variant?: 'header' | 'card' | 'banner';
  siteName?: string;
  className?: string;
}

export function InstallAppButton({ variant = 'header', siteName = 'Store', className = '' }: InstallAppButtonProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(`To add ${siteName} to your home screen:\n\n1. Tap your browser menu (⋮ or share icon)\n2. Tap "Add to Home screen" / "Install App"`);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold ${className}`}>
        <Check className="w-3.5 h-3.5" />
        App Installed
      </span>
    );
  }

  if (variant === 'header') {
    return (
      <button
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-white border border-indigo-500/30 text-xs font-semibold transition-all cursor-pointer ${className}`}
      >
        <Smartphone className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-[0_4px_15px_rgba(79,70,229,0.3)] cursor-pointer ${className}`}
    >
      <Download className="w-4 h-4" />
      <span>Install App on Phone</span>
    </button>
  );
}
