import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  User, 
  Mail, 
  Check, 
  X, 
  Sparkles, 
  Save, 
  ShieldCheck
} from 'lucide-react';
import { store, useUsers } from '../store';
import { useAuth, notifyAuthListeners } from '../lib/useAuth';

interface CustomerAddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  title?: string;
  isMandatory?: boolean;
}

export function CustomerAddressModal({
  isOpen,
  onClose,
  onSaved,
  title = "Customer Details / Apna Naam & Number Bharein",
  isMandatory = false
}: CustomerAddressModalProps) {
  const { currentUser } = useAuth();
  const { users } = useUsers();

  const userRecord = users.find(u => u.uid === currentUser?.uid || (currentUser?.email && u.email === currentUser.email));

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Hydrate fields from user profile or local storage
  useEffect(() => {
    if (isOpen && currentUser) {
      const savedPhone = userRecord?.phone || localStorage.getItem('customer_phone') || '';
      const savedName = userRecord?.displayName || currentUser.displayName || localStorage.getItem('customer_name') || '';

      setFullName(savedName);
      setPhone(savedPhone);
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, currentUser, userRecord]);

  if (!isOpen || !currentUser) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanName = fullName.trim() || currentUser.displayName || currentUser.email?.split('@')[0] || 'Customer';
    const cleanPhone = phone.trim().replace(/[^0-9]/g, '');

    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Kripya apna poora Naam enter karein.');
      return;
    }

    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMsg('Kripya apna 10-digit WhatsApp / Mobile number enter karein.');
      return;
    }

    setIsSaving(true);
    try {
      // Save locally
      localStorage.setItem('customer_name', cleanName);
      localStorage.setItem('customer_phone', cleanPhone);
      localStorage.setItem(`profile_completed_${currentUser.uid}`, 'true');

      // Save to Firestore & Store
      await store.registerOrUpdateUser({
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: cleanName,
        phone: cleanPhone
      });

      notifyAuthListeners({
        ...currentUser,
        displayName: cleanName
      });

      setSuccessMsg('✅ Aapka Naam & WhatsApp Number Safaltapoorvak Save Ho Gaya Hai!');
      setTimeout(() => {
        onSaved?.();
        onClose();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Details save karne me samasya aayi. Kripya punah prayas karein.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#121216] border border-indigo-500/30 rounded-3xl w-full max-w-md shadow-[0_0_50px_rgba(99,102,241,0.25)] overflow-hidden flex flex-col text-left relative">
        
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-indigo-950/60 via-[#181820] to-[#121216] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <User className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold font-display text-white flex items-center gap-2">
                <span>{title}</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Verified
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Google account verification & VIP order delivery details
              </p>
            </div>
          </div>

          {!isMandatory && (
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Notice Info */}
        <div className="px-6 py-3 bg-indigo-950/30 border-b border-white/5 flex items-center gap-2.5 text-xs text-indigo-200">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Apna official Naam aur WhatsApp number link karein taaki keys delivery & order confirmation asani se mil sake.</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl font-bold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Logged-in Gmail ID (Read-only) */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              <span>Google Gmail ID (Aapki Email)</span>
            </label>
            <div className="relative">
              <input
                type="text"
                readOnly
                value={currentUser.email || 'Google Account'}
                className="w-full bg-zinc-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-emerald-300 font-mono font-semibold cursor-not-allowed"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            </div>
          </div>

          {/* 2. Customer Full Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Aapka Poora Naam (Customer Full Name) <span className="text-rose-400">*</span></span>
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Saurav Kumar"
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* 3. WhatsApp / Mobile Number */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>WhatsApp / Mobile Number <span className="text-rose-400">*</span></span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-zinc-400">
                +91
              </span>
              <input
                type="tel"
                required
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="10 digit mobile number"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl pl-12 pr-3.5 py-2.5 text-xs sm:text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Key delivery alerts & payment receipt confirmation ke liye.</span>
          </div>

          {/* Submit Footer Buttons */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
            {!isMandatory && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Skip / Baad Me
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Details'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
