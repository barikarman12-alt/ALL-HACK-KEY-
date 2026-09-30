import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Sparkles, 
  Gift, 
  Copy, 
  Check, 
  Key, 
  RotateCw, 
  ArrowRight, 
  PartyPopper, 
  Frown,
  AlertCircle,
  Volume2,
  VolumeX
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useAuth } from '../lib/useAuth';
import { useCoupons, useInventory, defaultSpinWheelSettings, useSpinBalance } from '../store';
import { startWheelSpinningAudio, playWinPrizeSound, playTryAgainSound } from '../lib/spinAudio';

export interface SpinSlice {
  id: string;
  label: string;
  subText: string;
  prob: number; // Probability fraction out of 1.0
  color: string;
  textColor: string;
  discountPercentage: number;
  couponCodePrefix: string;
}

interface SpinWheelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToBuyKey?: () => void;
}

export function SpinWheelModal({ isOpen, onClose, onNavigateToBuyKey }: SpinWheelModalProps) {
  const { currentUser } = useAuth();
  const { addCoupon } = useCoupons();
  const { settings, purchases } = useInventory(currentUser?.uid);

  const spinConfig = settings.spinWheel || defaultSpinWheelSettings;
  const isFeatureEnabled = spinConfig.isEnabled !== false;

  // Build dynamic slices based on owner configured probabilities and discount percentages
  const totalP = (spinConfig.prob0 || 50) + (spinConfig.prob10 || 20) + (spinConfig.prob20 || 20) + (spinConfig.prob50 || 10);
  const safeTotal = totalP > 0 ? totalP : 100;

  const d1 = typeof spinConfig.discountSlice1 === 'number' ? spinConfig.discountSlice1 : 10;
  const d2 = typeof spinConfig.discountSlice2 === 'number' ? spinConfig.discountSlice2 : 20;
  const d3 = typeof spinConfig.discountSlice3 === 'number' ? spinConfig.discountSlice3 : 50;

  const currentSlices: SpinSlice[] = [
    {
      id: 'slice-0',
      label: '0% OFF',
      subText: 'Better luck next time!',
      prob: (spinConfig.prob0 ?? 50) / safeTotal,
      color: '#18181b', // Zinc 900
      textColor: '#a1a1aa',
      discountPercentage: 0,
      couponCodePrefix: 'NONE'
    },
    {
      id: 'slice-10',
      label: `${d1}% OFF`,
      subText: `${d1}% instant discount`,
      prob: (spinConfig.prob10 ?? 20) / safeTotal,
      color: '#4338ca', // Indigo 700
      textColor: '#ffffff',
      discountPercentage: d1,
      couponCodePrefix: `LUCKY${d1}`
    },
    {
      id: 'slice-20',
      label: `${d2}% OFF`,
      subText: `${d2}% mega discount`,
      prob: (spinConfig.prob20 ?? 20) / safeTotal,
      color: '#065f46', // Emerald 800
      textColor: '#ffffff',
      discountPercentage: d2,
      couponCodePrefix: `LUCKY${d2}`
    },
    {
      id: 'slice-50',
      label: `${d3}% OFF`,
      subText: `🎉 JACKPOT ${d3}% OFF`,
      prob: (spinConfig.prob50 ?? 10) / safeTotal,
      color: '#b45309', // Amber 700
      textColor: '#ffffff',
      discountPercentage: d3,
      couponCodePrefix: `JACKPOT${d3}`
    }
  ];

  // Spin balance from unified store (24h daily reset at 12:01 AM)
  const { spinBalance, countdown, deductSpin } = useSpinBalance(currentUser?.uid);

  const [isSpinning, setIsSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [wonPrize, setWonPrize] = useState<{ slice: SpinSlice; couponCode?: string } | null>(null);
  const [copiedCoupon, setCopiedCoupon] = useState(false);
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('spin_sound_muted') === 'true';
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stopAudioRef = useRef<(() => void) | null>(null);

  // Persist sound preference
  const toggleSound = () => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('spin_sound_muted', next.toString());
      return next;
    });
  };

  // Draw the wheel onto the canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numSlices = currentSlices.length;
    const arc = (2 * Math.PI) / numSlices;
    const radius = canvas.width / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    currentSlices.forEach((slice, i) => {
      const angle = i * arc;

      // Draw Slice Sector
      ctx.beginPath();
      ctx.fillStyle = slice.color;
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius, angle, angle + arc);
      ctx.lineTo(radius, radius);
      ctx.fill();

      // Border & Separator Line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner Arc Glow
      ctx.beginPath();
      ctx.arc(radius, radius, radius - 8, angle, angle + arc);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Slice Label
      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = slice.textColor;
      ctx.font = 'bold 16px Inter, system-ui, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(slice.label, radius - 26, 6);

      ctx.restore();
    });

    // Draw Wheel Center Hub
    ctx.beginPath();
    ctx.arc(radius, radius, 26, 0, 2 * Math.PI);
    ctx.fillStyle = '#09090b';
    ctx.fill();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center jewel
    ctx.beginPath();
    ctx.arc(radius, radius, 10, 0, 2 * Math.PI);
    ctx.fillStyle = '#818cf8';
    ctx.fill();
  }, [isOpen, spinConfig]);

  // Clean up audio if component unmounts during spin
  useEffect(() => {
    return () => {
      if (stopAudioRef.current) {
        stopAudioRef.current();
      }
    };
  }, []);

  /**
   * Probability selection algorithm strictly following configured percentages:
   */
  const calculateWinningSlice = (): { index: number; slice: SpinSlice } => {
    const randomVal = Math.random(); // Range [0.0, 1.0)
    let cumulative = 0;

    for (let i = 0; i < currentSlices.length; i++) {
      cumulative += currentSlices[i].prob;
      if (randomVal < cumulative) {
        return { index: i, slice: currentSlices[i] };
      }
    }

    return { index: 0, slice: currentSlices[0] };
  };

  const handleSpin = () => {
    if (!isFeatureEnabled) return;
    if (spinBalance <= 0 || isSpinning) return;

    // Deduct 1 spin chance immediately via unified store
    const deducted = deductSpin();
    if (!deducted) return;

    setIsSpinning(true);
    setWonPrize(null);

    // Start subtle decelerating ticking audio
    if (stopAudioRef.current) {
      stopAudioRef.current();
    }
    stopAudioRef.current = startWheelSpinningAudio(4500, () => isMuted);

    // Compute winning slice based on configured probability
    const { index: winningIndex, slice: winningSlice } = calculateWinningSlice();
    const numSlices = currentSlices.length;
    const sliceAngle = 360 / numSlices;

    // The wheel pointer is pinned at TOP (270° in canvas trigonometry).
    // Target angle where the center of the winning slice aligns under pointer:
    const targetSliceCenter = (winningIndex * sliceAngle) + (sliceAngle / 2);
    const stopAngle = 360 - targetSliceCenter + 270;
    const fullSpins = 360 * 6; // 6 dramatic full revolutions
    const newTotalDegrees = rotationDegrees + fullSpins + (stopAngle - (rotationDegrees % 360));

    setRotationDegrees(newTotalDegrees);

    // 4.5 seconds smooth cubic-bezier transition
    setTimeout(() => {
      setIsSpinning(false);
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }

      let generatedCode = '';
      if (winningSlice.discountPercentage > 0) {
        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        generatedCode = `${winningSlice.couponCodePrefix}-${randomSuffix}`;

        const expiryDays = spinConfig.couponExpiryDays || 3;
        const validHours = expiryDays * 24;
        const maxUses = spinConfig.couponUsageLimit || 1;

        // Automatically register this coupon into the store system with configured rules
        try {
          addCoupon({
            code: generatedCode,
            discountType: 'percentage',
            discountValue: winningSlice.discountPercentage,
            minSpend: 0,
            active: true,
            maxUses: maxUses,
            validHours: validHours,
            expiresAt: new Date(Date.now() + validHours * 60 * 60 * 1000).toISOString(),
            applicableScope: 'all',
            description: `Lucky Spin ${winningSlice.label} Reward (${expiryDays}d validity)`
          });
        } catch (e) {
          console.warn('Coupon auto-save notice:', e);
        }

        // Play celebratory win audio
        if (!isMuted) {
          playWinPrizeSound();
        }

        // Celebrate with confetti
        try {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#ffffff']
          });
        } catch {}
      } else {
        // Play gentle try-again audio
        if (!isMuted) {
          playTryAgainSound();
        }
      }

      setWonPrize({
        slice: winningSlice,
        couponCode: generatedCode || undefined
      });
    }, 4500);
  };

  const handleCopyCoupon = () => {
    if (!wonPrize?.couponCode) return;
    navigator.clipboard.writeText(wonPrize.couponCode);
    setCopiedCoupon(true);
    setTimeout(() => setCopiedCoupon(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/85 backdrop-blur-md transition-opacity" 
        onClick={() => {
          if (!isSpinning) onClose();
        }}
      />

      {/* Main Modal Card */}
      <div className="relative bg-[#0d0d11] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.95)] backdrop-blur-2xl z-10 theme-modal">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Gift className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Daily Lucky Spin & Win
              </h3>
              <p className="text-[11px] text-zinc-400">1 Free Spin Every 24h • Resets at 12:01 AM</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSound}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                isMuted
                  ? 'bg-zinc-800/80 text-zinc-500 border-zinc-700 hover:text-zinc-300'
                  : 'bg-indigo-600/20 text-indigo-300 border-indigo-500/30 hover:bg-indigo-600/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]'
              }`}
              title={isMuted ? 'Unmute Spin Sound' : 'Mute Spin Sound'}
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 animate-pulse" />}
            </button>
            <button 
              onClick={onClose}
              disabled={isSpinning}
              className="text-zinc-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-30"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Disabled Banner if turned off by Owner */}
        {!isFeatureEnabled && (
          <div className="m-4 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>The Spin Wheel event is currently paused by the Store Owner. Please check back later!</span>
          </div>
        )}

        {/* Modal Body */}
        <div className={`p-6 flex flex-col items-center text-center space-y-5 ${!isFeatureEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
          
          {/* Daily Spin Balance Pill & Live 12:01 AM Reset Countdown */}
          <div className="flex flex-col sm:flex-row items-center justify-between w-full bg-white/[0.03] border border-white/5 px-4 py-2.5 rounded-2xl gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xs text-zinc-400">Daily Spin:</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                spinBalance > 0
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}>
                {spinBalance > 0 ? '🟢 1 Free Available' : '🔒 Used for Today'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400">
              <span className="text-zinc-500">Next 12:01 AM Reset:</span>
              <span className="text-amber-300 font-bold">{countdown}</span>
            </div>
          </div>

          {/* Wheel Container with Pointer */}
          <div className="relative w-[280px] h-[280px] sm:w-[300px] sm:h-[300px] mx-auto my-2">
            {/* Top Pointer Arrow */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
              <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[22px] border-t-rose-500 animate-pulse" />
            </div>

            {/* Outer Glow Frame */}
            <div className="absolute inset-0 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />

            {/* Rotating Canvas */}
            <canvas 
              ref={canvasRef}
              width={300}
              height={300}
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
                transition: isSpinning ? 'transform 4.5s cubic-bezier(0.12, 0.9, 0.18, 1)' : 'none'
              }}
              className="w-full h-full rounded-full shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-white/15"
            />
          </div>

          {/* Prize Rewards Legend */}
          <div className="grid grid-cols-4 gap-1.5 w-full text-[10px]">
            {currentSlices.map(s => (
              <div key={s.id} className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                <div className="font-bold text-white text-xs">{s.label}</div>
                <div className="text-[9px] text-zinc-400 mt-0.5 truncate">{s.subText}</div>
              </div>
            ))}
          </div>

          {/* Primary Spin Action Button */}
          <button
            onClick={handleSpin}
            disabled={spinBalance <= 0 || isSpinning || !isFeatureEnabled}
            className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm sm:text-base font-bold rounded-2xl shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:shadow-[0_0_35px_rgba(99,102,241,0.6)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
          >
            {isSpinning ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-indigo-300" />
                <span>Spinning the Wheel...</span>
              </>
            ) : spinBalance > 0 ? (
              <>
                <Sparkles className="w-4 h-4 text-amber-300 animate-bounce" />
                <span>SPIN NOW (Daily Free Spin)</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : (
              <span>🔒 0 Spins Left • Next Reset in {countdown}</span>
            )}
          </button>

          {/* Daily 24h Explanatory Notice */}
          {spinBalance <= 0 ? (
            <div className="text-[11px] text-amber-300/90 bg-amber-500/10 border border-amber-500/20 px-3.5 py-2.5 rounded-xl w-full text-center space-y-1">
              <div>⏰ <strong>Aaj Ka Daily Free Spin Use Ho Chuka Hai!</strong></div>
              <div className="text-zinc-300">
                Har 24 ghante me ek baar free spin milta hai. Agla spin roz raat <span className="text-amber-300 font-bold">12:01 AM</span> pe refresh hoga: <span className="text-amber-400 font-bold font-mono">{countdown}</span>
              </div>
            </div>
          ) : (
            <div className="text-[11px] text-emerald-300/90 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl w-full text-center">
              🎉 <strong>Aaj Ka Free Spin Ready Hai!</strong> Wheel ghumayein aur discounts jeetein (Next reset 12:01 AM).
            </div>
          )}

          {/* Real Key Purchase Link */}
          {onNavigateToBuyKey && (
            <button
              onClick={() => {
                onClose();
                onNavigateToBuyKey();
              }}
              className="text-xs text-zinc-400 hover:text-indigo-300 flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Key className="w-3.5 h-3.5 text-indigo-400" />
              <span>Buy Keys from Store Catalog</span>
            </button>
          )}
        </div>
      </div>

      {/* Result Prize Popup Modal */}
      {wonPrize && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setWonPrize(null)} />
          
          <div className="relative bg-[#111116] border border-white/15 rounded-3xl p-6 sm:p-7 max-w-sm w-full text-center space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.95)] z-10">
            {wonPrize.slice.discountPercentage > 0 ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)] animate-bounce">
                  <PartyPopper className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-extrabold text-white mb-1">
                    🎉 Congratulations!
                  </h4>
                  <p className="text-xs text-emerald-400 font-medium">
                    You won a {wonPrize.slice.label} Discount Coupon!
                  </p>
                </div>

                {/* Coupon Code Display Box */}
                {wonPrize.couponCode && (
                  <div className="bg-zinc-950 border border-dashed border-indigo-500/50 rounded-2xl p-3.5 flex items-center justify-between gap-2 shadow-inner">
                    <div className="text-left">
                      <span className="text-[10px] text-zinc-500 block uppercase font-mono">COUPON CODE</span>
                      <span className="font-mono font-bold text-amber-300 text-sm tracking-wider">
                        {wonPrize.couponCode}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyCoupon}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {copiedCoupon ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedCoupon ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                )}

                <p className="text-[11px] text-zinc-400">
                  This coupon has been automatically saved to your account and is valid for {spinConfig.couponExpiryDays || 3} days ({spinConfig.couponUsageLimit || 1} use limit)!
                </p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(244,63,94,0.3)]">
                  <Frown className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-white mb-1">
                    Oops! 0% OFF
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Better luck next time! Buy another key to earn +1 Spin chance.
                  </p>
                </div>
              </>
            )}

            <button
              onClick={() => setWonPrize(null)}
              className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs sm:text-sm font-bold rounded-xl transition-colors cursor-pointer"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
