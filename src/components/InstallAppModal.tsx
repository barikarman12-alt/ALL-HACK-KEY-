import React, { useState } from 'react';
import { X, Download, Smartphone, Check, Sparkles, Share2, MoreVertical, PlusSquare, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteName?: string;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose, siteName = 'ARMAN X STORE' }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'pc'>(isIOS ? 'ios' : 'android');

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    setIsInstalling(true);
    const result = await install();
    setIsInstalling(false);
    if (result === 'accepted') {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-lg bg-zinc-950 border border-fuchsia-500/30 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(224,0,255,0.2)] overflow-hidden text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow backdrop effects */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border-2 border-fuchsia-500/50 p-2 shadow-[0_0_20px_rgba(224,0,255,0.4)] flex items-center justify-center relative overflow-hidden flex-shrink-0">
            <img src="/pwa-192x192.png" alt={siteName} className="w-full h-full object-cover rounded-xl" onError={(e) => {
              (e.target as HTMLImageElement).src = '/icon.svg';
            }} />
            <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500/20 to-transparent pointer-events-none" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3 h-3" /> Official Web App
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight">
              Install {siteName}
            </h2>
            <p className="text-xs text-zinc-400">
              Fast, lightweight & instant access on your home screen
            </p>
          </div>
        </div>

        {/* Success state */}
        {installSuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">App Installed Successfully!</h3>
            <p className="text-sm text-zinc-300">
              {siteName} is now added to your home screen / apps. You can open it directly anytime.
            </p>
          </div>
        ) : isInstalled ? (
          <div className="py-6 text-center space-y-3">
            <div className="w-14 h-14 bg-fuchsia-500/20 border border-fuchsia-500/40 rounded-full flex items-center justify-center mx-auto text-fuchsia-400">
              <Check className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white">Already Installed!</h3>
            <p className="text-sm text-zinc-300">
              This app is already running or installed on your device.
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-xl border border-zinc-700"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Benefits highlights */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3 text-center">
                <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-white">1-Tap Open</p>
                <p className="text-[10px] text-zinc-400">Zero loading delay</p>
              </div>
              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3 text-center">
                <Smartphone className="w-5 h-5 text-fuchsia-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-white">Full Screen</p>
                <p className="text-[10px] text-zinc-400">Native app feel</p>
              </div>
              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-3 text-center">
                <ShieldCheck className="w-5 h-5 text-emerald-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-white">Key Vault</p>
                <p className="text-[10px] text-zinc-400">Offline key access</p>
              </div>
            </div>

            {/* Direct 1-Click Install Button (if browser supports prompt) */}
            {isInstallable && (
              <button
                onClick={handleInstallClick}
                disabled={isInstalling}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-bold text-base shadow-[0_0_25px_rgba(224,0,255,0.4)] transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50"
              >
                <Download className="w-5 h-5 animate-bounce" />
                <span>{isInstalling ? 'Installing...' : 'Install App Now (1-Tap)'}</span>
              </button>
            )}

            {/* Device tabs for step-by-step instructions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  {isInstallable ? 'Or manual install steps:' : 'How to Install on your device:'}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('android')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      activeTab === 'android' 
                        ? 'bg-fuchsia-600 text-white shadow-sm' 
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    Android
                  </button>
                  <button
                    onClick={() => setActiveTab('ios')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      activeTab === 'ios' 
                        ? 'bg-fuchsia-600 text-white shadow-sm' 
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    iPhone / iPad
                  </button>
                  <button
                    onClick={() => setActiveTab('pc')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      activeTab === 'pc' 
                        ? 'bg-fuchsia-600 text-white shadow-sm' 
                        : 'bg-zinc-900 text-zinc-400 hover:text-white'
                    }`}
                  >
                    PC / Laptop
                  </button>
                </div>
              </div>

              {/* Android guide */}
              {activeTab === 'android' && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        Browser me <MoreVertical className="w-4 h-4 text-fuchsia-400 inline" /> (3-dots) menu par tap karein
                      </p>
                      <p className="text-xs text-zinc-400">Chrome ya kisi bhi browser ke top-right corner par 3 dots hote hain.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        <PlusSquare className="w-4 h-4 text-emerald-400 inline" /> <strong>"Install app"</strong> ya <strong>"Add to Home screen"</strong> chunein
                      </p>
                      <p className="text-xs text-zinc-400">Popup aane par "Install" ya "Add" dabayein. App turant phone me install ho jayega!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* iOS guide */}
              {activeTab === 'ios' && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        Safari toolbar me <Share2 className="w-4 h-4 text-fuchsia-400 inline" /> (Share button) tap karein
                      </p>
                      <p className="text-xs text-zinc-400">Safari ke bottom toolbar me center button share icon hai.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-white flex items-center gap-1.5">
                        Neeche scroll karke <PlusSquare className="w-4 h-4 text-emerald-400 inline" /> <strong>"Add to Home Screen"</strong> chunein
                      </p>
                      <p className="text-xs text-zinc-400">Phir top right me "Add" par tap karein. App Home screen par aa jayega.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* PC / Desktop guide */}
              {activeTab === 'pc' && (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        Address Bar me <Download className="w-4 h-4 text-fuchsia-400 inline" /> Install Icon par click karein
                      </p>
                      <p className="text-xs text-zinc-400">Chrome/Edge address bar ke right side me "Install ARMAN X STORE" ka icon hota hai.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-fuchsia-500/20 text-fuchsia-400 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-white">
                        "Install" confirm karein
                      </p>
                      <p className="text-xs text-zinc-400">App aapke Desktop/Taskbar me standalone window me open hoga.</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom action button if not 1-click install */}
            {!isInstallable && (
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-semibold text-sm rounded-xl border border-zinc-700 transition-colors"
              >
                Got It / Theek Hai
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
