import React, { useState, useMemo } from 'react';
import { 
  HelpCircle, 
  ChevronDown, 
  Search, 
  MessageCircle, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  Settings, 
  Key, 
  Wallet, 
  CreditCard,
  Send,
  ExternalLink
} from 'lucide-react';
import { useFAQs, FAQItem } from '../store';
import { useAuth } from '../lib/useAuth';

interface FAQSectionProps {
  onManageFAQs?: () => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ onManageFAQs }) => {
  const { activeFaqs, faqTelegramLink } = useFAQs();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const telegramUrl = useMemo(() => {
    const raw = (faqTelegramLink || 'https://t.me/FATHERXSIR').trim();
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    if (raw.startsWith('t.me/')) return `https://${raw}`;
    if (raw.startsWith('@')) return `https://t.me/${raw.substring(1)}`;
    return `https://t.me/${raw}`;
  }, [faqTelegramLink]);

  const telegramHandle = useMemo(() => {
    const raw = (faqTelegramLink || 't.me/FATHERXSIR').trim();
    return raw.replace(/^https?:\/\/(www\.)?t\.me\//, '').replace(/^t\.me\//, '').replace(/^@/, '');
  }, [faqTelegramLink]);

  const isOwner = Boolean(
    currentUser?.email === 'barikarman12@gmail.com' ||
    currentUser?.email === 'barikarman207@gmail.com' ||
    currentUser?.email?.includes('barikarman') ||
    ['admin', 'owner', 'arman_123', 'barikarman12'].includes(currentUser?.customId || '')
  );

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    activeFaqs.forEach(f => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set);
  }, [activeFaqs]);

  // Filter FAQs based on category & search
  const filteredFaqs = useMemo(() => {
    return activeFaqs.filter(faq => {
      const matchesCat = selectedCategory === 'all' || faq.category === selectedCategory;
      const q = searchQuery.trim().toLowerCase();
      const matchesQuery = !q || 
        faq.question.toLowerCase().includes(q) || 
        faq.answer.toLowerCase().includes(q) ||
        (faq.category && faq.category.toLowerCase().includes(q));
      return matchesCat && matchesQuery;
    });
  }, [activeFaqs, selectedCategory, searchQuery]);

  const toggleFaq = (id: string) => {
    setOpenFaqId(prev => (prev === id ? null : id));
  };

  const getCategoryIcon = (cat?: string) => {
    const c = (cat || '').toLowerCase();
    if (c.includes('delivery') || c.includes('purchase')) return <Zap className="w-3.5 h-3.5 text-amber-400" />;
    if (c.includes('payment') || c.includes('upi')) return <CreditCard className="w-3.5 h-3.5 text-cyan-400" />;
    if (c.includes('key') || c.includes('activation')) return <Key className="w-3.5 h-3.5 text-emerald-400" />;
    if (c.includes('wallet') || c.includes('balance')) return <Wallet className="w-3.5 h-3.5 text-purple-400" />;
    return <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />;
  };

  return (
    <section id="faq" className="py-20 relative overflow-hidden transition-colors duration-300">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-sky-600/10 via-purple-600/10 to-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-[0_0_15px_rgba(14,165,233,0.2)]">
            <HelpCircle className="w-4 h-4 text-sky-400" />
            <span>Customer Help & Telegram FAQ Hub</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight theme-text-title">
            Frequently Asked <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-pink-400 bg-clip-text text-transparent">Questions</span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto theme-text-sub">
            Payment, Key Delivery, Device Compatibility aur VIP updates se jude sawalon ke jawab. Live support ke liye Telegram join karein.
          </p>

          {/* Admin shortcut if logged in as Owner */}
          {isOwner && onManageFAQs && (
            <div className="mt-4 inline-flex items-center gap-2">
              <button
                onClick={onManageFAQs}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-full transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)] active:scale-95"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin: Manage Questions & Telegram Link</span>
              </button>
            </div>
          )}
        </div>

        {/* Prominent Official Telegram Channel & Community Card */}
        <div className="mb-10 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-sky-950/40 via-[#12141c] to-[#121215] border border-sky-500/30 shadow-[0_0_30px_rgba(14,165,233,0.15)] flex flex-col sm:flex-row items-center justify-between gap-5 theme-card relative overflow-hidden">
          <div className="absolute right-0 top-0 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row relative z-10">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-sky-500/15 border border-sky-400/30 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.3)] shrink-0">
              <Send className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap mb-0.5">
                <h3 className="text-base sm:text-lg font-bold text-white theme-text-title flex items-center gap-1.5">
                  <span>Official Telegram Channel & FAQ Community</span>
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-400/30 shadow-[0_0_10px_rgba(14,165,233,0.2)]">
                  VIP Support
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-300 theme-text-sub">
                Latest loader APKs, bypass updates, gift keys aur 24/7 help ke liye humein Telegram par follow karein:{' '}
                <span className="text-sky-400 font-mono font-bold tracking-tight">t.me/{telegramHandle}</span>
              </p>
            </div>
          </div>

          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-[0_0_25px_rgba(14,165,233,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0 relative z-10"
          >
            <Send className="w-4 h-4" />
            <span>Join Telegram Channel</span>
          </a>
        </div>

        {/* Search Bar & Category Filters */}
        <div className="space-y-4 mb-10">
          {/* Live Search Input */}
          <div className="relative max-w-xl mx-auto">
            <Search className="w-4 h-4 text-zinc-500 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your question (e.g., delivery, payment, key, root)..."
              className="w-full bg-[#121215]/90 border border-white/10 hover:border-sky-500/40 focus:border-sky-500 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all theme-card"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-zinc-400 hover:text-white px-1.5 py-0.5 rounded bg-white/5"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          {categories.length > 0 && (
            <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                  selectedCategory === 'all'
                    ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.4)] border border-sky-400'
                    : 'bg-[#141418] text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                }`}
              >
                All ({activeFaqs.length})
              </button>
              {categories.map((cat) => {
                const count = activeFaqs.filter(f => f.category === cat).length;
                const isSelected = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-[0_0_15px_rgba(14,165,233,0.4)] border border-sky-400'
                        : 'bg-[#141418] text-zinc-400 hover:text-white hover:bg-zinc-800 border border-white/5'
                    }`}
                  >
                    {getCategoryIcon(cat)}
                    <span>{cat}</span>
                    <span className="text-[10px] opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FAQs Accordion List */}
        <div className="space-y-3.5">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-16 px-4 rounded-3xl bg-[#121215]/80 border border-white/10 backdrop-blur-xl theme-card">
              <HelpCircle className="w-12 h-12 text-zinc-600 mx-auto mb-3 opacity-40" />
              <h4 className="text-base font-bold text-white mb-1">No matching questions found</h4>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
                Aapke search query &quot;{searchQuery}&quot; se milta julta koi question nahi mila. Direct query ke liye Telegram channel par message karein.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-zinc-200 text-xs font-bold rounded-xl transition-all"
                >
                  Show All FAQs
                </button>
                <a
                  href={telegramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask on Telegram</span>
                </a>
              </div>
            </div>
          ) : (
            filteredFaqs.map((faq, index) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden theme-card ${
                    isOpen 
                      ? 'bg-[#14151b] border-sky-500/50 shadow-[0_0_25px_rgba(14,165,233,0.18)]' 
                      : 'bg-[#121215]/90 border-white/10 hover:border-white/20'
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full text-left p-5 sm:p-6 flex items-start sm:items-center justify-between gap-4 cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                      <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-mono font-bold shrink-0 mt-0.5 sm:mt-0 transition-colors ${
                        isOpen 
                          ? 'bg-sky-500 text-white shadow-[0_0_10px_rgba(14,165,233,0.5)]' 
                          : 'bg-zinc-800/80 text-zinc-400'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        {faq.category && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                              {getCategoryIcon(faq.category)}
                              <span>{faq.category}</span>
                            </span>
                          </div>
                        )}
                        <h3 className="text-sm sm:text-base font-bold text-white theme-text-title leading-snug">
                          {faq.question}
                        </h3>
                      </div>
                    </div>

                    <div className={`p-1.5 rounded-xl transition-all shrink-0 ${
                      isOpen ? 'bg-sky-500/20 text-sky-300 rotate-180' : 'text-zinc-400 bg-white/5'
                    }`}>
                      <ChevronDown className="w-4 h-4 transition-transform duration-200" />
                    </div>
                  </button>

                  {/* Accordion Answer Content */}
                  {isOpen && (
                    <div className="px-5 sm:px-6 pb-6 pt-0 text-xs sm:text-sm text-zinc-300 leading-relaxed border-t border-white/5 mt-1 pt-4 space-y-3 animate-in fade-in duration-150 theme-text-sub">
                      <p className="whitespace-pre-line">{faq.answer}</p>

                      <div className="pt-2 flex items-center justify-between flex-wrap gap-2 text-[11px] text-zinc-500 border-t border-white/5">
                        <span className="flex items-center gap-1 text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Verified Store Policy</span>
                        </span>
                        <a
                          href={telegramUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:underline flex items-center gap-1 font-mono"
                        >
                          <Send className="w-3 h-3" />
                          <span>t.me/{telegramHandle}</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Support CTA Box */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-sky-950/40 via-indigo-950/30 to-[#121215] border border-sky-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-center justify-between gap-6 theme-card">
          <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_20px_rgba(14,165,233,0.25)] shrink-0">
              <Send className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-2 theme-text-title">
                <span>Koi aur sawal ya dikkat hai?</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/30">
                  Telegram 24/7
                </span>
              </h4>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 theme-text-sub">
                Hamare official Telegram channel <span className="text-sky-400 font-bold font-mono">@{telegramHandle}</span> par join karein aur direct VIP assistance paayein.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(14,165,233,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Join on Telegram (@{telegramHandle})</span>
            </a>
          </div>
        </div>

      </div>
    </section>
  );
};
