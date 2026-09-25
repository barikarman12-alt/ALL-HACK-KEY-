import { useInventory } from '../store';
import { Send, Shield, Sparkles } from 'lucide-react';

export function Footer() {
  const { settings } = useInventory();
  
  return (
    <footer className="bg-black/90 border-t border-white/10 py-12 text-zinc-300 backdrop-blur-xl theme-header transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-8">
          <div className="text-center md:text-left flex flex-col md:items-start items-center">
            <div className="flex items-center space-x-3 mb-2">
              <img 
                src={settings.siteLogoUrl || "/logo.png"} 
                alt={`${settings.siteName || 'ARMAN X STORE'} Logo`} 
                className="w-9 h-9 rounded-xl shadow-sm border border-white/15 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="font-display font-bold text-xl tracking-tight text-white block theme-text-title">
                {settings.siteName || "ARMAN X STORE"}
              </span>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm max-w-sm theme-text-sub">
              Premium VIP digital tools, license keys & instant automated delivery.
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <a 
              href="https://t.me/FATHERXSIR" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 text-zinc-200 border border-white/10 hover:border-white/20 text-xs font-semibold transition-all cursor-pointer theme-pill"
            >
              <Send className="w-3.5 h-3.5 text-sky-400" />
              <span>Telegram Support: @FATHERXSIR</span>
            </a>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 text-center md:text-left text-zinc-500 text-xs flex flex-col md:flex-row justify-between items-center gap-3 theme-text-sub">
          <p>&copy; {new Date().getFullYear()} {settings.siteName || "ARMAN X STORE"}. All rights reserved.</p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-zinc-900/60 border border-white/10 text-zinc-400 theme-pill">
              <Shield className="w-3 h-3 text-emerald-400" />
              Secure 256-bit Encrypted Delivery
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

