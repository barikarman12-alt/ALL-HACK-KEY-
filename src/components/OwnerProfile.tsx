import { Send, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { useInventory } from '../store';

export function OwnerProfile() {
  const { settings } = useInventory();
  
  return (
    <section className="py-12 sm:py-16 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#121215]/80 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden theme-card">
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl border border-white/15 overflow-hidden bg-zinc-900 flex items-center justify-center p-1 relative shadow-[0_8px_20px_rgba(0,0,0,0.6)]">
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4" 
                  alt="Product Owner"
                  className="w-full h-full rounded-xl object-cover relative z-10 bg-zinc-900"
                />
              </div>
            </div>
            
            <div className="text-center md:text-left flex-grow">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-950/50 text-indigo-300 text-xs font-semibold mb-2 border border-indigo-500/30 theme-pill">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                Verified Product Owner
              </div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-1 tracking-tight theme-text-title">Arman Barik</h2>
              <p className="text-zinc-400 text-sm sm:text-base mb-4 font-medium theme-text-sub">Founder & Lead Developer @ {settings.siteName || "ARMAN X STORE"}</p>
              
              <p className="text-zinc-300 text-xs sm:text-sm mb-6 leading-relaxed max-w-2xl theme-text-sub">
                Hi! I'm the creator behind {settings.siteName || "ARMAN X STORE"}. I specialize in building high-performance 
                digital tools that help modern users streamline their experience. Instant, safe and verified key delivery 24/7.
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <a 
                  href="https://t.me/FATHERXSIR" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center gap-2 cursor-pointer active:scale-[0.98]"
                >
                  <Send className="w-4 h-4" />
                  Contact Owner (@FATHERXSIR)
                </a>
                <a 
                  href="mailto:barikarman12@gmail.com" 
                  className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-all border border-white/10 hover:border-white/20 theme-pill" 
                  title="Email Owner"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
