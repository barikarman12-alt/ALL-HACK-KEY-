import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Top-edge glowing animated progress bar for global network & auth operations
 */
export function GlobalLoadingBar({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[3px] bg-transparent overflow-hidden pointer-events-none">
      <div className="w-full h-full bg-gradient-to-r from-transparent via-indigo-500 to-violet-500 animate-[shimmer_1.5s_infinite] shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
    </div>
  );
}

/**
 * Shimmering skeleton grid matching the Product Cards perfectly
 */
export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {Array.from({ length: count }).map((_, i) => (
        <div 
          key={i}
          className="relative bg-[#121215]/80 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-white/5 p-4 sm:p-7 flex flex-col justify-between overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] theme-card"
        >
          {/* Shimmer sweep effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent pointer-events-none" />

          <div className="flex flex-col items-center text-center space-y-3">
            {/* Glossy Icon Placeholder */}
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-zinc-800/80 border border-white/5 shadow-inner animate-pulse" />

            {/* Title Placeholder */}
            <div className="h-4 sm:h-5 w-24 sm:w-32 bg-zinc-800/80 rounded-lg animate-pulse" />

            {/* Price Placeholder */}
            <div className="flex items-baseline gap-1.5 pt-1">
              <div className="h-6 sm:h-8 w-16 sm:w-20 bg-zinc-800/80 rounded-lg animate-pulse" />
              <div className="h-3 w-8 bg-zinc-800/50 rounded animate-pulse" />
            </div>

            {/* Stock Pill Placeholder */}
            <div className="h-5 w-20 bg-emerald-950/30 border border-emerald-500/10 rounded-full animate-pulse" />
          </div>

          {/* Action Button Placeholder */}
          <div className="mt-5 sm:mt-6">
            <div className="w-full h-9 sm:h-11 rounded-xl bg-indigo-950/40 border border-indigo-500/20 animate-pulse flex items-center justify-center">
              <div className="h-3 w-16 bg-indigo-400/30 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Key History skeleton loading state
 */
export function KeyHistorySkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="relative bg-[#121215]/80 border border-white/10 rounded-2xl sm:rounded-3xl p-5 sm:p-6 backdrop-blur-xl overflow-hidden theme-card space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none" />

          {/* Header Row */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/20 animate-pulse" />
              <div className="space-y-1.5">
                <div className="h-4 w-36 bg-zinc-800/80 rounded animate-pulse" />
                <div className="h-3 w-24 bg-zinc-800/40 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-6 w-20 bg-zinc-800/60 rounded-full animate-pulse self-start sm:self-auto" />
          </div>

          {/* Keys list box */}
          <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-2">
            <div className="h-8 bg-zinc-900/80 rounded-lg border border-white/5 animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Table skeleton placeholder for Dashboard tables (Orders, Transactions, Customers)
 */
export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full bg-[#121215]/80 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl animate-in fade-in duration-300">
      {/* Table Header */}
      <div className="bg-zinc-900/90 border-b border-white/10 p-4 grid grid-flow-col auto-cols-fr gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3.5 bg-zinc-800/80 rounded animate-pulse" />
        ))}
      </div>
      {/* Table Rows */}
      <div className="divide-y divide-white/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-4 grid grid-flow-col auto-cols-fr gap-4 items-center relative overflow-hidden">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none" />
            {Array.from({ length: cols }).map((_, c) => (
              <div 
                key={c} 
                className="h-4 bg-zinc-800/50 rounded animate-pulse" 
                style={{ width: `${60 + ((r * 7 + c * 13) % 35)}%` }} 
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Dashboard Overview cards skeleton
 */
export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[#121215]/90 border border-white/10 p-6 rounded-2xl relative overflow-hidden backdrop-blur-xl theme-card space-y-3">
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none" />
            <div className="flex justify-between items-start">
              <div className="w-9 h-9 rounded-xl bg-indigo-950/60 border border-indigo-500/20 animate-pulse" />
              <div className="h-4 w-12 bg-zinc-800/60 rounded animate-pulse" />
            </div>
            <div className="space-y-1.5 pt-2">
              <div className="h-3 w-20 bg-zinc-800/60 rounded animate-pulse" />
              <div className="h-7 w-28 bg-zinc-800/80 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Fullscreen or in-container loading overlay with spinner and title
 */
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-50 bg-[#09090b]/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
      <div className="relative mb-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center shadow-[0_0_25px_rgba(99,102,241,0.35)]">
          <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
        </div>
        <div className="absolute -inset-1 rounded-2xl border border-indigo-500/20 animate-ping pointer-events-none" />
      </div>
      <p className="text-white text-sm font-bold tracking-wide">{message}</p>
      <p className="text-zinc-400 text-xs mt-1">Please wait a moment...</p>
    </div>
  );
}

/**
 * Button Spinner component
 */
export function ButtonSpinner({ className = "w-4 h-4 mr-2" }: { className?: string }) {
  return <Loader2 className={`animate-spin text-current inline-block ${className}`} />;
}

/**
 * Sleek pulsing verification state placeholder
 */
export function VerifyPaymentSkeleton() {
  return (
    <div className="bg-[#121215]/80 border border-white/15 rounded-2xl p-8 text-center space-y-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl relative overflow-hidden theme-card">
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none" />
      
      <div className="relative mx-auto w-16 h-16 rounded-2xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_25px_rgba(99,102,241,0.2)]">
        <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
      </div>

      <div className="space-y-2">
        <div className="h-6 w-56 bg-zinc-800/80 rounded-lg mx-auto animate-pulse" />
        <div className="h-4 w-72 bg-zinc-800/50 rounded mx-auto animate-pulse" />
      </div>

      <div className="pt-2">
        <div className="h-3 w-40 bg-zinc-800/40 rounded mx-auto font-mono animate-pulse" />
      </div>
    </div>
  );
}

