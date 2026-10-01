import React, { useState } from 'react';
import { 
  User, 
  Mail, 
  ArrowLeft, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Lock, 
  UserPlus, 
  LogIn as LogInIcon,
  AlertCircle,
  ShieldCheck,
  Zap,
  Gift,
  Key,
  Sparkles
} from 'lucide-react';
import { registerWithIdMock, loginWithIdMock, resetPassword, loginWithGoogle, loginAsGuest } from '../lib/useAuth';
import { store } from '../store';
import { Helmet } from './Helmet';
import { ButtonSpinner } from './Skeletons';

interface LoginProps {
  onBack?: () => void;
  defaultView?: 'register' | 'login';
  isMandatoryGate?: boolean;
}

export function Login({ onBack, defaultView = 'login', isMandatoryGate = false }: LoginProps) {
  const [view, setView] = useState<'register' | 'login' | 'forgot'>(defaultView);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  const siteSettings = store.getSettings();

  // Form states
  const [name, setName] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Switch tabs
  const switchView = (newView: 'register' | 'login' | 'forgot') => {
    setView(newView);
    setError('');
    setSuccess('');
    setShowRegisterPrompt(false);
  };

  // 1. REGISTER NEW ACCOUNT
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setShowRegisterPrompt(false);

    const cleanInput = emailOrUsername.toLowerCase().trim();
    if (!cleanInput) {
      setError('Please enter an Email or Username');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (confirmPassword && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await registerWithIdMock(cleanInput, password, name.trim() || undefined);
      setSuccess('Account created successfully! Entering store...');
      setTimeout(() => {
        onBack?.();
      }, 700);
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        try {
          await loginWithIdMock(cleanInput, password);
          setSuccess('Account already exists. Logged in successfully! Entering store...');
          setTimeout(() => {
            onBack?.();
          }, 700);
          return;
        } catch (loginErr: any) {
          setView('login');
          setError('This account already exists. Please enter your password to Log In.');
        }
      } else if (err?.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (err?.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 letters or numbers.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Google 1-Tap Sign-In / Register
  const handleGoogleSignIn = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await loginWithGoogle();
      setSuccess('Signed in with Google successfully! Entering store...');
      setTimeout(() => {
        onBack?.();
      }, 600);
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In was cancelled or failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Instant Guest Quick Access
  const handleGuestSignIn = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      await loginAsGuest();
      setSuccess('Logged in as Guest! Entering store...');
      setTimeout(() => {
        onBack?.();
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize guest session.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. LOGIN TO EXISTING ACCOUNT
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setShowRegisterPrompt(false);

    const cleanInput = emailOrUsername.toLowerCase().trim();
    if (!cleanInput) {
      setError('Please enter your Email or Username');
      return;
    }

    if (!password) {
      setError('Please enter your password');
      return;
    }

    setIsLoading(true);

    try {
      await loginWithIdMock(cleanInput, password);
      setSuccess('Logged in successfully! Entering store...');
      setTimeout(() => {
        onBack?.();
      }, 700);
    } catch (err: any) {
      if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/user-not-found' || err?.code === 'auth/wrong-password') {
        setError('Invalid credentials or account does not exist.');
        setShowRegisterPrompt(true);
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please wait 1 minute before trying again.');
      } else {
        setError(err.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. FORGOT PASSWORD
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const cleanEmail = emailOrUsername.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address with @ to receive password reset link.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(cleanEmail);
      setSuccess(`Password reset email sent to ${cleanEmail}. Check your inbox or spam folder.`);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') {
        setError('No account found with this email. Please Sign Up first.');
      } else {
        setError(err.message || 'Failed to send password reset email.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-300 theme-section">
      <Helmet 
        title={`${view === 'register' ? 'Register Account' : view === 'forgot' ? 'Reset Password' : 'Login'} - ${siteSettings.siteName || 'Arman X Store'}`}
        description={`Secure VIP customer access to ${siteSettings.siteName || 'Arman X Store'}. Sign in to view purchased game activation keys, wallet rewards, and instant order tracking.`}
      />
      
      {/* Background Glow Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-violet-600/15 rounded-full blur-[160px] pointer-events-none" />

      {/* Brand Header for Mandatory Gate */}
      <div className="text-center mb-6 z-10 flex flex-col items-center space-y-2 max-w-md">
        <div className="flex items-center gap-3">
          <img 
            src={siteSettings.siteLogoUrl || "/logo.png"} 
            alt="Store Logo"
            className="w-12 h-12 rounded-2xl border border-indigo-500/40 object-cover shadow-[0_0_25px_rgba(99,102,241,0.4)]"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="text-left">
            <h1 className="text-2xl font-black font-display tracking-tight text-white flex items-center gap-2">
              <span>{siteSettings.siteName || "ARMAN X STORE"}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-400/40">
                VIP
              </span>
            </h1>
            <p className="text-xs text-zinc-400 font-medium">Official Digital Keys & Tools Portal</p>
          </div>
        </div>

        {isMandatoryGate && (
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.15)] mt-1 animate-pulse">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Pehele Login / Register Karein Web me Enter Hone ke Liye</span>
          </div>
        )}
      </div>

      {/* Main Frosted Obsidian Glass Card */}
      <div className="w-full max-w-md bg-[#121215]/95 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_60px_rgba(0,0,0,0.85)] backdrop-blur-2xl relative z-10 theme-modal">
        
        {/* Top Navigation Bar */}
        {!isMandatoryGate && onBack && (
          <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10 theme-modal-section">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 px-3 py-1.5 rounded-xl transition-colors cursor-pointer theme-pill"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Store</span>
            </button>

            <span className="text-xs font-bold tracking-wider uppercase text-zinc-400 font-display">
              Authentication
            </span>
          </div>
        )}

        {/* View Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/60 border border-white/10 rounded-2xl mb-6 theme-pill">
          <button
            type="button"
            onClick={() => switchView('login')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              view === 'login'
                ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <LogInIcon className="w-4 h-4" />
            <span>Log In</span>
          </button>

          <button
            type="button"
            onClick={() => switchView('register')}
            className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              view === 'register'
                ? 'bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Sign Up / Register</span>
          </button>
        </div>

        {/* Title Header */}
        <div className="text-center mb-6 space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display theme-text-title">
            {view === 'login' && 'Welcome Back'}
            {view === 'register' && 'Create Free Account'}
            {view === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 theme-text-sub">
            {view === 'login' && 'Enter your credentials or use 1-Tap Google login.'}
            {view === 'register' && 'Register in seconds to unlock full store keys & wallet.'}
            {view === 'forgot' && 'Enter your registered email to receive a reset link.'}
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-300 text-xs sm:text-sm space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
            {showRegisterPrompt && (
              <button
                type="button"
                onClick={() => {
                  setConfirmPassword(password);
                  switchView('register');
                }}
                className="w-full py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 rounded-xl text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>New here? Register with these credentials now →</span>
              </button>
            )}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs sm:text-sm font-medium text-center flex items-center justify-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{success}</span>
          </div>
        )}

        {/* 1. LOGIN FORM */}
        {view === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5 theme-text-title">
                Email or Username
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={emailOrUsername}
                  onChange={(e) => {
                    setEmailOrUsername(e.target.value);
                    if (error) setError('');
                    if (showRegisterPrompt) setShowRegisterPrompt(false);
                  }}
                  placeholder="you@gmail.com or username"
                  className="w-full pl-10 pr-4 py-3 bg-[#18181c]/80 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono theme-input"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 theme-text-title">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => switchView('forgot')}
                  className="text-[11px] text-zinc-400 hover:text-indigo-400 transition-colors cursor-pointer theme-text-sub"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                    if (showRegisterPrompt) setShowRegisterPrompt(false);
                  }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-[#18181c]/80 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono theme-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 active:scale-[0.98]"
            >
              {isLoading ? <ButtonSpinner /> : <LogInIcon className="w-4 h-4" />}
              <span>{isLoading ? 'Logging In...' : 'Log In & Enter Store'}</span>
            </button>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="bg-[#121215] px-3 text-zinc-500">Or Quick Sign In</span>
              </div>
            </div>

            {/* Google One-Tap Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 bg-[#18181c] hover:bg-[#202026] text-white border border-white/10 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm hover:border-white/20 active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* 1-Tap Guest Access Option */}
            <button
              type="button"
              onClick={handleGuestSignIn}
              disabled={isLoading}
              className="w-full py-2.5 bg-zinc-900/60 hover:bg-zinc-800/80 text-zinc-400 hover:text-white border border-white/5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>1-Tap Instant Guest Access (Explore Store)</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchView('register')}
                className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer theme-text-sub"
              >
                Don't have an account? <span className="text-indigo-400 font-bold underline underline-offset-4">Register for Free</span>
              </button>
            </div>
          </form>
        )}

        {/* 2. REGISTER FORM */}
        {view === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5 theme-text-title">
                Your Name (Optional)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Arman Barik"
                  className="w-full pl-10 pr-4 py-3 bg-[#18181c]/80 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all theme-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5 theme-text-title">
                Email or Username <span className="text-indigo-400">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="you@gmail.com or username"
                  className="w-full pl-10 pr-4 py-3 bg-[#18181c]/80 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono theme-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5 theme-text-title">
                Password <span className="text-indigo-400">* (Min 6 characters)</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-[#18181c]/80 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono theme-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5 theme-text-title">
                Confirm Password <span className="text-indigo-400">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-[#18181c]/80 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono theme-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_20px_rgba(99,102,241,0.45)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2 active:scale-[0.98]"
            >
              {isLoading ? <ButtonSpinner /> : <UserPlus className="w-4 h-4" />}
              <span>{isLoading ? 'Creating Account...' : 'Register Account & Enter'}</span>
            </button>

            {/* Divider */}
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                <span className="bg-[#121215] px-3 text-zinc-500">Or 1-Tap Sign Up</span>
              </div>
            </div>

            {/* Google One-Tap Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full py-3 bg-[#18181c] hover:bg-[#202026] text-white border border-white/10 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm hover:border-white/20 active:scale-[0.98]"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.15z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.15C3.26 21.36 7.33 24 12 24z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.24C.45 8.15 0 9.99 0 12s.45 3.85 1.24 5.42l4.04-3.15z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.58l4.04 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchView('login')}
                className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer theme-text-sub"
              >
                Already registered? <span className="text-indigo-400 font-bold underline underline-offset-4">Log In here</span>
              </button>
            </div>
          </form>
        )}

        {/* 3. FORGOT PASSWORD FORM */}
        {view === 'forgot' && (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-1.5 theme-text-title">
                Registered Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full pl-10 pr-4 py-3 bg-[#18181c]/80 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 font-mono theme-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shadow-[0_0_20px_rgba(99,102,241,0.4)]"
            >
              {isLoading && <ButtonSpinner />}
              <span>{isLoading ? 'Sending Link...' : 'Send Reset Link'}</span>
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => switchView('login')}
                className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer theme-text-sub"
              >
                Back to <span className="text-indigo-400 font-semibold underline">Log In</span>
              </button>
            </div>
          </form>
        )}

      </div>

      {/* Feature Highlights Footer */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full z-10 px-2">
        <div className="flex items-center gap-3 p-3 bg-zinc-900/40 border border-white/5 rounded-2xl">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Instant Delivery</h4>
            <p className="text-[11px] text-zinc-400">Keys delivered in 1-second</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-zinc-900/40 border border-white/5 rounded-2xl">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">100% Ban Safe</h4>
            <p className="text-[11px] text-zinc-400">Tested Root & Non-Root keys</p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-zinc-900/40 border border-white/5 rounded-2xl">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
            <Gift className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Lucky Spin Rewards</h4>
            <p className="text-[11px] text-zinc-400">Free daily discount coupons</p>
          </div>
        </div>
      </div>

    </div>
  );
}
