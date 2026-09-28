import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, RotateCw, Gift, Trophy, ArrowDown } from 'lucide-react';
import { startWheelSpinningAudio, playWinPrizeSound, playTryAgainSound } from '../lib/spinAudio';

export interface SpinWheelSlice {
  id: string;
  label: string;
  subLabel?: string;
  probability: number; // Decimal (e.g. 0.50, 0.20, 0.20, 0.10)
  backgroundColor: string;
  textColor: string;
  accentColor?: string;
  discountPercent?: number;
  couponPrefix?: string;
}

export const DEFAULT_WHEEL_SLICES: SpinWheelSlice[] = [
  {
    id: 'slice-0',
    label: '0% OFF',
    subLabel: 'Try Again',
    probability: 0.50, // 50%
    backgroundColor: '#18181b', // Zinc 900
    textColor: '#94a3b8', // Slate 400
    accentColor: '#3f3f46',
    discountPercent: 0,
    couponPrefix: 'NONE'
  },
  {
    id: 'slice-10',
    label: '10% OFF',
    subLabel: 'Lucky Win',
    probability: 0.20, // 20%
    backgroundColor: '#3730a3', // Indigo 800
    textColor: '#ffffff',
    accentColor: '#6366f1',
    discountPercent: 10,
    couponPrefix: 'LUCKY10'
  },
  {
    id: 'slice-20',
    label: '20% OFF',
    subLabel: 'Mega Win',
    probability: 0.20, // 20%
    backgroundColor: '#065f46', // Emerald 800
    textColor: '#ffffff',
    accentColor: '#10b981',
    discountPercent: 20,
    couponPrefix: 'LUCKY20'
  },
  {
    id: 'slice-50',
    label: '50% OFF',
    subLabel: 'JACKPOT',
    probability: 0.10, // 10%
    backgroundColor: '#92400e', // Amber 800
    textColor: '#ffffff',
    accentColor: '#f59e0b',
    discountPercent: 50,
    couponPrefix: 'JACKPOT50'
  }
];

interface SpinWheelAnimationProps {
  slices?: SpinWheelSlice[];
  size?: number;
  spinDurationMs?: number;
  isSpinning?: boolean;
  onSpinStart?: () => void;
  onSpinComplete?: (winningSlice: SpinWheelSlice, winningIndex: number) => void;
  disabled?: boolean;
  showCenterButton?: boolean;
  centerButtonLabel?: string;
  soundEnabled?: boolean;
}

/**
 * High-performance SpinWheel Animation component rendered with Canvas & CSS transitions.
 * Integrates accurate Math.random() probability distribution & realistic pointer physics.
 */
export function SpinWheelAnimation({
  slices = DEFAULT_WHEEL_SLICES,
  size = 320,
  spinDurationMs = 4500,
  isSpinning: externalIsSpinning,
  onSpinStart,
  onSpinComplete,
  disabled = false,
  showCenterButton = true,
  centerButtonLabel = 'SPIN',
  soundEnabled = true
}: SpinWheelAnimationProps) {
  const [internalSpinning, setInternalSpinning] = useState(false);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [pointerBouncing, setPointerBouncing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stopAudioRef = useRef<(() => void) | null>(null);

  const isCurrentlySpinning = externalIsSpinning !== undefined ? externalIsSpinning : internalSpinning;

  useEffect(() => {
    return () => {
      if (stopAudioRef.current) {
        stopAudioRef.current();
      }
    };
  }, []);

  // Draw wheel sectors, labels, and glowing pins
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 2;
    const dimension = size * dpr;
    canvas.width = dimension;
    canvas.height = dimension;

    ctx.scale(dpr, dpr);
    const radius = size / 2;
    const numSlices = slices.length;
    const arc = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, size, size);

    // 1. Draw Slices
    slices.forEach((slice, i) => {
      const angle = i * arc;

      // Slice sector path
      ctx.beginPath();
      ctx.fillStyle = slice.backgroundColor;
      ctx.moveTo(radius, radius);
      ctx.arc(radius, radius, radius - 8, angle, angle + arc);
      ctx.lineTo(radius, radius);
      ctx.fill();

      // Outer sector border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text Labels
      ctx.save();
      ctx.translate(radius, radius);
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';

      // Primary Discount Value
      ctx.fillStyle = slice.textColor;
      ctx.font = `bold ${Math.max(13, Math.round(size * 0.052))}px 'Inter', system-ui, sans-serif`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
      ctx.shadowBlur = 6;
      ctx.fillText(slice.label, radius - 28, 4);

      // Subtitle / Win Label
      if (slice.subLabel) {
        ctx.font = `bold ${Math.max(9, Math.round(size * 0.03))}px 'Inter', system-ui, sans-serif`;
        ctx.fillStyle = slice.accentColor || 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(slice.subLabel, radius - 28, 18);
      }

      ctx.restore();
    });

    // 2. Outer Rim LED Pins
    const pinCount = numSlices * 4;
    const pinRadius = radius - 4;
    for (let p = 0; p < pinCount; p++) {
      const pinAngle = (p * 2 * Math.PI) / pinCount;
      const pinX = radius + pinRadius * Math.cos(pinAngle);
      const pinY = radius + pinRadius * Math.sin(pinAngle);

      ctx.beginPath();
      ctx.arc(pinX, pinY, 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = p % 2 === 0 ? '#ffffff' : '#fbbf24';
      ctx.shadowColor = p % 2 === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(245,158,11,0.8)';
      ctx.shadowBlur = 4;
      ctx.fill();
    }

    // 3. Inner Center Circle
    ctx.beginPath();
    ctx.arc(radius, radius, size * 0.14, 0, 2 * Math.PI);
    ctx.fillStyle = '#09090b';
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

  }, [slices, size]);

  /**
   * Deterministic result selection strictly using Math.random() based on slice probabilities
   */
  const pickWinningSliceIndex = (): number => {
    const totalProb = slices.reduce((acc, s) => acc + s.probability, 0);
    const rand = Math.random() * (totalProb > 0 ? totalProb : 1.0);
    let cumulative = 0;

    for (let i = 0; i < slices.length; i++) {
      cumulative += slices[i].probability;
      if (rand <= cumulative) {
        return i;
      }
    }
    return 0;
  };

  /**
   * Triggers the full CSS animation rotation
   */
  const triggerSpin = () => {
    if (isCurrentlySpinning || disabled) return;

    if (externalIsSpinning === undefined) {
      setInternalSpinning(true);
    }
    setPointerBouncing(true);
    onSpinStart?.();

    // 1. Pick slice via strict Math.random()
    const winningIndex = pickWinningSliceIndex();
    const winningSlice = slices[winningIndex];

    // 2. Wheel physics trigonometry:
    // Top pointer is situated at 270 degrees in canvas space
    const numSlices = slices.length;
    const sliceAngle = 360 / numSlices;
    const sliceCenterAngle = (winningIndex * sliceAngle) + (sliceAngle / 2);
    const targetStopAngle = 360 - sliceCenterAngle + 270;

    // 3. Add 5 to 7 full revolutions for dramatic suspense
    const extraFullRotations = 360 * 6;
    const targetDegrees = rotationDegrees + extraFullRotations + (targetStopAngle - (rotationDegrees % 360));

    setRotationDegrees(targetDegrees);

    // Start decelerating audio feedback if enabled
    if (soundEnabled) {
      if (stopAudioRef.current) stopAudioRef.current();
      stopAudioRef.current = startWheelSpinningAudio(spinDurationMs);
    }

    // 4. Handle completion after CSS transition
    setTimeout(() => {
      if (externalIsSpinning === undefined) {
        setInternalSpinning(false);
      }
      setPointerBouncing(false);
      if (stopAudioRef.current) {
        stopAudioRef.current();
        stopAudioRef.current = null;
      }

      if (soundEnabled) {
        if ((winningSlice.discountPercent && winningSlice.discountPercent > 0) || winningSlice.id !== 'slice-0') {
          playWinPrizeSound();
        } else {
          playTryAgainSound();
        }
      }

      onSpinComplete?.(winningSlice, winningIndex);
    }, spinDurationMs);
  };

  return (
    <div 
      className="relative flex items-center justify-center select-none"
      style={{ width: size, height: size }}
    >
      {/* Outer Ambient Glow */}
      <div 
        className={`absolute inset-0 rounded-full blur-2xl transition-opacity duration-700 pointer-events-none ${
          isCurrentlySpinning 
            ? 'bg-indigo-500/25 opacity-100 animate-pulse' 
            : 'bg-indigo-500/10 opacity-70'
        }`} 
      />

      {/* Outer Decorative Ring Frame */}
      <div 
        className="absolute inset-0 rounded-full border-2 border-white/20 shadow-[0_10px_35px_rgba(0,0,0,0.9)] pointer-events-none z-10" 
      />

      {/* Top Precision Indicator Arrow / Pointer */}
      <div 
        className={`absolute -top-3 left-1/2 -translate-x-1/2 z-30 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] transition-transform duration-100 origin-bottom ${
          pointerBouncing ? 'animate-[bounce_0.25s_infinite]' : ''
        }`}
      >
        <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-rose-500" />
      </div>

      {/* Rotating Canvas Element */}
      <canvas
        ref={canvasRef}
        style={{
          width: size,
          height: size,
          transform: `rotate(${rotationDegrees}deg)`,
          transition: isCurrentlySpinning 
            ? `transform ${spinDurationMs}ms cubic-bezier(0.15, 0.95, 0.2, 1)` 
            : 'none',
          willChange: 'transform'
        }}
        className="rounded-full shadow-2xl block"
      />

      {/* Center Interactive Button / Hub */}
      {showCenterButton ? (
        <button
          type="button"
          onClick={triggerSpin}
          disabled={isCurrentlySpinning || disabled}
          style={{
            width: size * 0.24,
            height: size * 0.24
          }}
          className="absolute z-20 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 hover:from-indigo-500 hover:to-violet-400 disabled:from-zinc-800 disabled:to-zinc-700 disabled:opacity-75 disabled:cursor-not-allowed text-white font-extrabold text-xs sm:text-sm tracking-wider shadow-[0_0_20px_rgba(99,102,241,0.6)] hover:shadow-[0_0_30px_rgba(99,102,241,0.8)] border border-white/30 flex flex-col items-center justify-center transition-all cursor-pointer active:scale-90"
        >
          {isCurrentlySpinning ? (
            <RotateCw className="w-4 h-4 animate-spin text-indigo-200" />
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse mb-0.5" />
              <span className="leading-tight font-black">{centerButtonLabel}</span>
            </>
          )}
        </button>
      ) : (
        <div 
          style={{
            width: size * 0.22,
            height: size * 0.22
          }}
          className="absolute z-20 rounded-full bg-zinc-950 border border-white/20 flex items-center justify-center text-indigo-400 shadow-inner"
        >
          <Gift className="w-5 h-5 animate-pulse" />
        </div>
      )}
    </div>
  );
}
