import { useInventory } from '../store';

export function Footer() {
  const { settings } = useInventory();
  
  return (
    <footer className="bg-purple-950 border-t border-purple-900 py-12 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8">
          <div className="mb-4 md:mb-0 text-center md:text-left flex flex-col md:items-start items-center">
            <div className="flex items-center space-x-3 mb-3">
              <img 
                src={settings.siteLogoUrl || "/logo.png"} 
                alt={`${settings.siteName || 'ARMAN X STORE'} Logo`} 
                className="w-12 h-12 rounded-lg shadow-sm border border-purple-500/20 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="font-display font-bold text-3xl tracking-tight text-white mb-0 block">
                {settings.siteName || "ARMAN X STORE"}<span className="text-purple-500">.</span>
              </span>
            </div>
            <p className="text-purple-200 max-w-xs">
              Designing tools for the modern creator. Redefining excellence, one product at a time.
            </p>
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-purple-300 hover:text-white transition-colors">
              Twitter
            </a>
            <a href="#" className="text-purple-300 hover:text-white transition-colors">
              Instagram
            </a>
            <a href="#" className="text-purple-300 hover:text-white transition-colors">
              Support
            </a>
          </div>
        </div>
        <div className="pt-8 border-t border-purple-900 text-center md:text-left text-purple-400 text-sm flex flex-col md:flex-row justify-between">
          <p>&copy; {new Date().getFullYear()} {settings.siteName || "ARMAN X STORE"} Inc. All rights reserved.</p>
          <div className="bg-purple-900/50 px-3 py-1 rounded-full mt-4 md:mt-0 text-xs inline-block">
            Terms of Service &middot; Privacy Policy
          </div>
        </div>
      </div>
    </footer>
  );
}
