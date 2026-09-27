import React from 'react';

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
