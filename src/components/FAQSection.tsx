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
  CreditCard 
} from 'lucide-react';
import { useFAQs, FAQItem } from '../store';
import { useAuth } from '../lib/useAuth';

interface FAQSectionProps {
  onManageFAQs?: () => void;
}

export const FAQSection: React.FC<FAQSectionProps> = ({ onManageFAQs }) => {
  const { activeFaqs } = useFAQs();
  const { currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

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
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-600/10 via-purple-600/10 to-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-4 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <HelpCircle className="w-4 h-4 text-indigo-400" />
            <span>Customer Help & FAQ</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-display font-extrabold text-white tracking-tight theme-text-title">
            Frequently Asked <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Questions</span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto theme-text-sub">
            Payment, Key Delivery, Device Compatibility aur Wallet se jude aam sawalon ke turant jawab yahan paayein.
          </p>

          {/* Admin shortcut if logged in as Owner */}
          {isOwner && onManageFAQs && (
            <div className="mt-4 inline-flex items-center gap-2">
              <button
                onClick={onManageFAQs}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold rounded-full transition-all cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.2)] active:scale-95"
              >
                <Settings className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin: Manage Questions & Answers</span>
              </button>
            </div>
          )}
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
              className="w-full bg-[#121215]/90 border border-white/10 hover:border-indigo-500/40 focus:border-indigo-500 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm text-white placeholder-zinc-500 shadow-[0_4px_20px_rgba(0,0,0,0.4)] focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all theme-card"
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
                    ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400'
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
                        ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.4)] border border-indigo-400'
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
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                Aapke search query &quot;{searchQuery}&quot; se milta julta koi question nahi mila. Direct help ke liye WhatsApp support par message karein.
              </p>
              <button
                onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                className="mt-4 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-xs font-bold rounded-xl transition-all"
              >
                Show All FAQs
              </button>
            </div>
          ) : (
            filteredFaqs.map((faq, index) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden theme-card ${
                    isOpen 
                      ? 'bg-[#14151b] border-indigo-500/50 shadow-[0_0_25px_rgba(99,102,241,0.18)]' 
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
                          ? 'bg-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]' 
                          : 'bg-zinc-800/80 text-zinc-400'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        {faq.category && (
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
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
                      isOpen ? 'bg-indigo-500/20 text-indigo-300 rotate-180' : 'text-zinc-400 bg-white/5'
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
                        <span className="text-zinc-500 font-mono">
                          Arman X Store Instant System
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Bottom Support CTA Box */}
        <div className="mt-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-[#121215] border border-indigo-500/30 shadow-[0_4px_30px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row items-center justify-between gap-6 theme-card">
          <div className="flex items-center gap-4 text-center sm:text-left flex-col sm:flex-row">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] shrink-0">
              <MessageCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-lg font-bold text-white flex items-center justify-center sm:justify-start gap-2 theme-text-title">
                <span>Koi aur sawal ya dikkat hai?</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  24/7 Live
                </span>
              </h4>
              <p className="text-xs sm:text-sm text-zinc-400 mt-1 theme-text-sub">
                Hamari support team se WhatsApp par seedha chat karein aur turant assistance paayein.
              </p>
            </div>
          </div>

          <a
            href={`https://wa.me/917903102377?text=${encodeURIComponent('Hello Arman Bhai, mujhe Arman X Store se related help chahiye.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Chat on WhatsApp</span>
          </a>
        </div>

      </div>
    </section>
  );
};
