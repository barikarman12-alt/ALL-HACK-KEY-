import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

export function SupportChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'bot' | 'user', text: string}[]>([
    { role: 'bot', text: 'Hello! I am the Payment Support Assistant. To check your payment status, please provide your Order ID or Transaction/UTR ID.' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInput('');
    setIsTyping(true);

    // Simulate backend check_payment_status function
    setTimeout(() => {
      setIsTyping(false);
      if (userMsg === '123456789012') {
        setMessages(prev => [...prev, { role: 'bot', text: `Verified Transaction: ${userMsg}.\n\nStatus: ✅ Successful\n\nYour payment has been received successfully.` }]);
      } else if (userMsg.length < 8) {
         setMessages(prev => [...prev, { role: 'bot', text: 'That ID looks a bit too short. Please provide a valid 12-digit UTR or complete Order ID.' }]);
      } else {
        setMessages(prev => [...prev, { role: 'bot', text: `Verified Transaction: ${userMsg}.\n\nStatus: ❌ Failed / Not Found\n\nWe couldn't find a successful payment for this ID. If you just paid, it might be Pending. Please wait a few minutes or contact support.` }]);
      }
    }, 1500);
  };

  return (
    <>
      {/* Floating Chat Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-full shadow-[0_0_25px_rgba(99,102,241,0.5)] border border-indigo-400/40 backdrop-blur-md transition-all z-50 cursor-pointer active:scale-95 ${isOpen ? 'hidden' : 'flex'}`}
        aria-label="Support Chat"
      >
        <MessageCircle className="w-5 h-5" />
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-[#121215]/95 backdrop-blur-2xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.9)] z-50 flex flex-col border border-white/10 overflow-hidden animate-in slide-in-from-bottom-5 theme-modal">
          {/* Header */}
          <div className="bg-black/90 p-4 flex justify-between items-center text-white border-b border-white/10 theme-modal-section">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <span className="font-semibold block text-xs sm:text-sm theme-text-title">Support Assistant</span>
                <a 
                  href="https://t.me/FATHERXSIR" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-[10px] text-sky-400 hover:underline flex items-center gap-1"
                >
                  <Send className="w-2.5 h-2.5 inline" /> Contact: t.me/FATHERXSIR
                </a>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Container */}
          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-[#0d0d10]/90 flex flex-col focus:outline-none theme-section">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 whitespace-pre-wrap text-xs sm:text-sm ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-tr-sm shadow-[0_2px_10px_rgba(99,102,241,0.3)]' 
                      : 'bg-zinc-900/90 text-zinc-200 border border-white/10 rounded-tl-sm shadow-sm'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex w-full justify-start">
                <div className="bg-zinc-900 border border-white/10 text-zinc-400 rounded-2xl rounded-tl-sm px-3.5 py-2 shadow-sm text-xs flex items-center space-x-1.5 w-fit">
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-black/80 border-t border-white/10 flex items-center space-x-2 theme-modal-section">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Enter Order/UTR ID..."
              className="flex-1 bg-zinc-900/80 text-zinc-100 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 outline-none focus:ring-1 focus:ring-indigo-500/50 border border-white/10 transition-all placeholder-zinc-500 theme-input"
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all disabled:opacity-40 cursor-pointer shadow-[0_0_12px_rgba(99,102,241,0.3)]"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

