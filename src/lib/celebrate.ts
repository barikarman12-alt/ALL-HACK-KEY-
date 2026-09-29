import confetti from 'canvas-confetti';

/**
 * Triggers a multi-stage celebratory confetti explosion
 * with dual cannons and a center starburst.
 */
export function triggerCelebrationConfetti() {
  try {
    // 1. Center burst
    confetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.55 },
      colors: ['#06b6d4', '#6366f1', '#eab308', '#22c55e', '#ec4899', '#ffffff'],
      disableForReducedMotion: true,
      zIndex: 999999
    });

    // 2. Left side cannon
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 60,
        spread: 70,
        origin: { x: 0.05, y: 0.8 },
        colors: ['#22d3ee', '#818cf8', '#fbbf24', '#4ade80'],
        disableForReducedMotion: true,
        zIndex: 999999
      });
    }, 150);

    // 3. Right side cannon
    setTimeout(() => {
      confetti({
        particleCount: 60,
        angle: 120,
        spread: 70,
        origin: { x: 0.95, y: 0.8 },
        colors: ['#22d3ee', '#818cf8', '#fbbf24', '#4ade80'],
        disableForReducedMotion: true,
        zIndex: 999999
      });
    }, 250);

    // 4. Subtle trailing gold stars shower
    setTimeout(() => {
      confetti({
        particleCount: 40,
        spread: 120,
        origin: { y: 0.4 },
        shapes: ['circle'],
        colors: ['#fbbf24', '#f59e0b', '#fef08a'],
        gravity: 0.8,
        scalar: 1.1,
        disableForReducedMotion: true,
        zIndex: 999999
      });
    }, 450);
  } catch (err) {
    console.warn('Canvas confetti error:', err);
  }
}

/**
 * Plays an upbeat harmonic victory chime
 */
export function playSuccessChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 (major chord)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);

      gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + idx * 0.09 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.09 + 0.55);

      osc.start(ctx.currentTime + idx * 0.09);
      osc.stop(ctx.currentTime + idx * 0.09 + 0.6);
    });
  } catch {}
}
