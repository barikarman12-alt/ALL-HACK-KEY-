import React, { useState, useEffect } from 'react';
import { Shield, Zap, User, KeyRound, ArrowLeft, ArrowRight, Hash, Mail } from 'lucide-react';
import { registerWithIdMock, loginWithIdMock, resetPassword } from '../lib/useAuth';

interface LoginProps {
  onBack: () => void;
}

export function Login({ onBack }: LoginProps) {
  const [view, setView] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpStep, setOtpStep] = useState<1 | 2>(1);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Switch views and clear messages
  const switchView = (newView: 'login' | 'register' | 'forgot' | 'reset') => {
    setView(newView);
    setError('');
    setSuccess('');
    setPassword('');
    setOtpStep(1);
    setEnteredOtp('');
    setGeneratedOtp('');
    setNewPassword('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const customId = email.toLowerCase().trim();
      await loginWithIdMock(customId, password);
      setSuccess('Success! Welcome back.');
      setTimeout(() => onBack(), 1000);
    } catch (err: any) {
      if (err?.code === 'auth/invalid-credential') {
        setError('Invalid email or password. If you don\'t have an account, please Sign Up first.');
      } else {
        setError(err.message || 'Invalid credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    try {
      const customId = email.toLowerCase().trim();
      await registerWithIdMock(customId, password, name);
      setSuccess('Account created successfully!');
      setTimeout(() => switchView('login'), 2000);
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await resetPassword(email);
      setSuccess('Password reset link sent to your email.');
      setEmail('');
    } catch (err: any) {
      const errorMessage = `Error: ${err.code} - ${err.message}`;
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    setTimeout(() => {
      setSuccess('Password successfully reset! You can now log in.');
      setTimeout(() => switchView('login'), 2000);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-blue-900 via-zinc-950 to-fuchsia-900">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none mix-blend-screen"></div>

      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] rounded-3xl p-8 sm:p-10 relative z-10">
        
        {/* Messages */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 text-red-200 text-sm font-medium rounded-lg text-center backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-3 bg-green-500/20 border border-green-500/50 text-green-200 text-sm font-medium rounded-lg text-center backdrop-blur-md animate-in fade-in slide-in-from-top-2">
            {success}
          </div>
        )}

        {/* LOGIN VIEW */}
        {view === 'login' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-bold text-white mb-2 text-center tracking-tight font-display">Welcome Back</h2>
            <p className="text-white/70 text-sm text-center mb-8">Sign in to continue to your dashboard.</p>
            
            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-4 focus:ring-white/10 transition-all" 
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1.5">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    minLength={6} 
                    className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-4 focus:ring-white/10 transition-all" 
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-white/10 border border-white/20 text-white font-bold py-3.5 rounded-xl hover:bg-white/20 transition duration-300 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing In...' : 'Sign In with Email'}
              </button>
            </form>
            
            <div className="mt-6 flex flex-col items-center space-y-4">
              <button onClick={() => switchView('forgot')} className="text-white/70 hover:text-white text-sm font-medium transition-colors">
                Forgot Password?
              </button>
              <div className="w-full h-px bg-white/10"></div>
              <button onClick={() => switchView('register')} className="text-white/90 hover:text-white text-sm font-medium transition-colors">
                Don't have an account? <span className="font-bold underline decoration-white/30 underline-offset-4">Sign Up</span>
              </button>
            </div>
          </div>
        )}

        {/* REGISTER VIEW */}
        {view === 'register' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-bold text-white mb-2 text-center tracking-tight font-display">Create Account</h2>
            <p className="text-white/70 text-sm text-center mb-8">Join us today to get started.</p>
            
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required 
                    className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-4 focus:ring-white/10 transition-all" 
                    placeholder="John Doe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-4 focus:ring-white/10 transition-all" 
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1.5">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    minLength={6} 
                    className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-4 focus:ring-white/10 transition-all" 
                    placeholder="Min 6 characters"
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-white/10 border border-white/20 text-white font-bold py-3.5 rounded-xl hover:bg-white/20 transition duration-300 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Create Account with Email'}
              </button>
            </form>
            
            <div className="mt-6 text-center">
              <button onClick={() => switchView('login')} className="text-white/90 hover:text-white text-sm font-medium transition-colors">
                Already have an account? <span className="font-bold underline decoration-white/30 underline-offset-4">Sign In</span>
              </button>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {view === 'forgot' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-bold text-white mb-2 text-center tracking-tight font-display">Reset Password</h2>
            <p className="text-white/70 text-sm text-center mb-8">Enter your email and we'll send you a secure link to reset your password.</p>
            
            <form onSubmit={handleForgot} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                    className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-4 focus:ring-white/10 transition-all" 
                    placeholder="you@example.com"
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-white text-indigo-900 font-bold py-3.5 rounded-xl hover:bg-gray-100 transition duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
            
            <div className="mt-8 text-center">
              <button onClick={() => switchView('login')} className="text-white/70 hover:text-white text-sm font-medium flex items-center justify-center w-full gap-2 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          </div>
        )}

        {/* RESET PASSWORD VIEW */}
        {view === 'reset' && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <h2 className="text-3xl font-bold text-white mb-2 text-center tracking-tight font-display">New Password</h2>
            <p className="text-white/70 text-sm text-center mb-8">Your identity has been verified. Please enter your new secure password.</p>
            
            <form onSubmit={handleReset} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-1.5">New Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                    minLength={6} 
                    className="w-full pl-12 pr-4 py-3.5 bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/50 focus:ring-4 focus:ring-white/10 transition-all" 
                    placeholder="Min 6 characters"
                  />
                </div>
              </div>
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-white text-indigo-900 font-bold py-3.5 rounded-xl hover:bg-gray-100 transition duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
            
            <div className="mt-8 text-center">
              <button onClick={() => switchView('login')} className="text-white/70 hover:text-white text-sm font-medium flex items-center justify-center w-full gap-2 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
