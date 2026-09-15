import { Shield, Zap, User, KeyRound, ArrowLeft, ArrowRight, Hash } from 'lucide-react';
import { registerWithIdMock, loginWithIdMock } from '../lib/useAuth';
import React, { useState } from 'react';

interface LoginProps {
  onBack: () => void;
}

export function Login({ onBack }: LoginProps) {
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [customId, setCustomId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLogin && !name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!customId || customId.length < 3) {
      setError('Please enter a valid User ID (minimum 3 characters)');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      if (isLogin) {
        await loginWithIdMock(customId, password);
      } else {
        await registerWithIdMock(customId, password, name);
      }
      onBack();
    } catch (err: any) {
      if (err.code === 'auth/invalid-credential') {
        setError('Invalid User ID or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Account exists. Switched to Sign In. Please sign in with your password.');
        setIsLogin(true);
      } else {
        setError(err.message || 'Failed to authenticate. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-fuchsia-600/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="max-w-md w-full bg-zinc-900/40 backdrop-blur-xl rounded-3xl p-8 sm:p-10 border border-fuchsia-500/20 shadow-[0_0_40px_rgba(224,0,255,0.1)] relative z-10">
        
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-fuchsia-500/10 rounded-2xl mb-6 shadow-[0_0_20px_rgba(224,0,255,0.2)] border border-fuchsia-500/20 transform rotate-3">
            <Shield className="w-8 h-8 text-fuchsia-400 transform -rotate-3 drop-shadow-[0_0_8px_rgba(224,0,255,0.6)]" />
          </div>
          <h2 className="text-3xl font-display font-bold text-white mb-3">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-zinc-400">
            {isLogin ? 'Sign in to manage your keys.' : 'Register to secure your purchases.'}
          </p>
        </div>
        
        {error && (
          <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-xl text-red-400 text-sm text-center mb-6 backdrop-blur-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                  placeholder="Enter your name"
                  required={!isLogin}
                />
              </div>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">User ID (Username)</label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="text"
                value={customId}
                onChange={(e) => setCustomId(e.target.value.replace(/[^a-zA-Z0-9_\-.]/g, '').toLowerCase())}
                className="w-full pl-12 pr-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                placeholder="your_unique_id"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-950/50 border border-zinc-800 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 focus:border-fuchsia-500 transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-3 px-4 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:bg-fuchsia-600/50 text-white rounded-xl font-medium transition-colors shadow-[0_0_15px_rgba(224,0,255,0.4)] mt-6"
          >
             {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isLogin ? 'Sign In' : 'Create Account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-fuchsia-400 hover:text-fuchsia-300 text-sm font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-zinc-800/50">
          <div className="flex items-start">
            <Zap className="w-5 h-5 text-zinc-500 mr-3 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-zinc-500 leading-relaxed">
              We only use your account to secure your purchases and keys. We never share your information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

