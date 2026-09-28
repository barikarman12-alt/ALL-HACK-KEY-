/**
 * Lightweight Web Audio API synthesizer for Spin Wheel sound effects.
 * Zero external audio assets needed - 100% reliable, zero network latency.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (e) {
    return null;
  }
}

/**
 * Play subtle wheel pin click/tick sound
 */
export function playTickSound(volume = 0.08, pitch = 850) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(pitch, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(pitch * 0.4, ctx.currentTime + 0.035);

    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  } catch (e) {
    // Audio might be muted or blocked by browser policy
  }
}

/**
 * Play a sequence of decelerating ticks simulating the wheel rotation
 */
export function startWheelSpinningAudio(durationMs = 4500, onMutedCheck?: () => boolean): () => void {
  let isCancelled = false;
  const startTime = Date.now();

  const scheduleNextTick = () => {
    if (isCancelled) return;
    const elapsed = Date.now() - startTime;
    if (elapsed >= durationMs) return;

    if (!onMutedCheck || !onMutedCheck()) {
      // Modulate pitch slightly as it slows down
      const progress = elapsed / durationMs;
      const pitch = 800 - progress * 200 + Math.random() * 50;
      const volume = Math.max(0.03, 0.1 - progress * 0.05);
      playTickSound(volume, pitch);
    }

    // Deceleration curve (tick interval gets longer and longer)
    const progress = elapsed / durationMs;
    // Cubic bezier easing approximation for tick delay (starts at ~45ms, ends at ~380ms)
    const delay = 40 + Math.pow(progress, 2.5) * 340;

    setTimeout(scheduleNextTick, delay);
  };

  scheduleNextTick();

  return () => {
    isCancelled = true;
  };
}

/**
 * Play celebratory fanfare chords when a discount prize is won
 */
export function playWinPrizeSound(volume = 0.15) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    // Harmonious chord notes (C5, E5, G5, C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];

    notes.forEach((freq, index) => {
      const startTime = ctx.currentTime + index * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = index === 3 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.55);
    });
  } catch (e) {}
}

/**
 * Play gentle sound when landing on 0% (Try again)
 */
export function playTryAgainSound(volume = 0.1) {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [392.00, 329.63]; // G4 -> E4 gentle descending
    notes.forEach((freq, idx) => {
      const startTime = ctx.currentTime + idx * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  } catch (e) {}
}
