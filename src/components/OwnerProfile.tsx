import { Github, Twitter, Linkedin, Mail } from 'lucide-react';
import { useInventory } from '../store';

export function OwnerProfile() {
  const { settings } = useInventory();
  
  return (
    <section className="py-24 bg-zinc-950 border-t border-fuchsia-500/20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-zinc-900 border border-fuchsia-500/20 backdrop-blur-sm rounded-3xl p-8 md:p-12 shadow-[0_0_30px_rgba(224,0,255,0.1)] relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-fuchsia-500/30 overflow-hidden bg-zinc-800 flex items-center justify-center p-1 relative shadow-[0_0_20px_rgba(224,0,255,0.3)]">
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-fuchsia-500 to-purple-400 absolute inset-0 opacity-20"></div>
                <img 
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4" 
                  alt="Product Owner"
                  className="w-full h-full rounded-full object-cover relative z-10 bg-zinc-900"
                />
              </div>
            </div>
            
            <div className="text-center md:text-left flex-grow">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-xs font-semibold mb-3 border border-fuchsia-500/30 shadow-[0_0_10px_rgba(224,0,255,0.2)]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-fuchsia-500"></span>
                </span>
                Product Owner
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-2 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">Arman Barik</h2>
              <p className="text-fuchsia-400 text-lg mb-6 font-medium drop-shadow-[0_0_5px_rgba(224,0,255,0.4)]">Founder & Lead Developer @ {settings.siteName || "ARMAN X STORE"}</p>
              
              <p className="text-zinc-300 mb-8 leading-relaxed max-w-2xl">
                Hi! I'm the creator behind {settings.siteName || "ARMAN X STORE"}. I specialize in building high-performance 
                digital tools that help modern creators streamline their workflow. My goal is to craft 
                software that isn't just functional, but genuinely a joy to use.
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <a href="#" className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all hover:-translate-y-1 border border-zinc-700 hover:border-fuchsia-500/50 hover:shadow-[0_0_15px_rgba(224,0,255,0.3)]">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all hover:-translate-y-1 border border-zinc-700 hover:border-fuchsia-500/50 hover:shadow-[0_0_15px_rgba(224,0,255,0.3)]">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all hover:-translate-y-1 border border-zinc-700 hover:border-fuchsia-500/50 hover:shadow-[0_0_15px_rgba(224,0,255,0.3)]">
                  <Linkedin className="w-5 h-5" />
                </a>
                <a href="mailto:barikarman12@gmail.com" className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all hover:-translate-y-1 border border-zinc-700 hover:border-fuchsia-500/50 hover:shadow-[0_0_15px_rgba(224,0,255,0.3)]">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
