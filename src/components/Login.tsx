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
  AlertCircle
} from 'lucide-react';
import { registerWithIdMock, loginWithIdMock, resetPassword } from '../lib/useAuth';

interface LoginProps {
  onBack: () => void;
  defaultView?: 'register' | 'login';
}

export function Login({ onBack, defaultView = 'register' }: LoginProps) {
  const [view, setView] = useState<'register' | 'login' | 'forgot'>(defaultView);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

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
      setSuccess('Account created successfully! Logging you in...');
      setTimeout(() => {
        onBack();
      }, 800);
    } catch (err: any) {
      if (err?.code === 'auth/email-already-in-use') {
        try {
          await loginWithIdMock(cleanInput, password);
          setSuccess('Account already exists. Logged in successfully!');
          setTimeout(() => {
            onBack();
          }, 800);
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
      setSuccess('Logged in successfully! Redirecting...');
      setTimeout(() => {
        onBack();
      }, 800);
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
    <div className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4 sm:p-6 relative overflow-hidden transition-colors duration-300 theme-section">
      
      {/* Glow Backdrop */}
      <div className="absolute top-1/4 -left-32 w-80 h-80 bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main Frosted Obsidian Glass Card */}
      <div className="w-full max-w-md bg-[#121215]/90 border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl relative z-10 theme-modal">
        
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between pb-5 mb-6 border-b border-white/10 theme-modal-section">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 px-3 py-1.5 rounded-xl transition-colors cursor-pointer theme-pill"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Store</span>
          </button>

          <span className="text-xs font-bold tracking-wider uppercase text-zinc-300 font-display theme-text-title">
            ARMAN X STORE
          </span>
        </div>

        {/* View Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/60 border border-white/10 rounded-2xl mb-6 theme-pill">
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
            <span>Sign Up</span>
          </button>

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
        </div>

        {/* Title Header */}
        <div className="text-center mb-6 space-y-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-display theme-text-title">
            {view === 'register' && 'Create Your Account'}
            {view === 'login' && 'Welcome Back'}
            {view === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 theme-text-sub">
            {view === 'register' && 'Sign up in seconds to access VIP digital keys & wallet.'}
            {view === 'login' && 'Enter your credentials to access your keys and balance.'}
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

        {/* 1. REGISTER FORM */}
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
              <UserPlus className="w-4 h-4" />
              <span>{isLoading ? 'Creating Account...' : 'Register Account'}</span>
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

        {/* 2. LOGIN FORM */}
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
              <LogInIcon className="w-4 h-4" />
              <span>{isLoading ? 'Logging In...' : 'Log In'}</span>
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

    </div>
  );
}
