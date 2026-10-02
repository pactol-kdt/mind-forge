"use client";

/** Lightweight optional feedback — no external assets required. */

let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}

export function isMuted(): boolean {
  return muted;
}

function beep(freq: number, durationMs: number, type: OscillatorType = "sine") {
  if (muted || typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = 0.04;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    osc.stop(ctx.currentTime + durationMs / 1000);
    window.setTimeout(() => void ctx.close(), durationMs + 50);
  } catch {
    // ignore audio failures
  }
}

export function playCorrect() {
  beep(660, 90);
  try {
    navigator.vibrate?.(30);
  } catch {
    /* ignore */
  }
}

export function playIncorrect() {
  beep(220, 140, "triangle");
  try {
    navigator.vibrate?.([40, 30, 40]);
  } catch {
    /* ignore */
  }
}

export function playUpgrade() {
  beep(520, 80);
  beep(780, 100);
}

export function playGameOver() {
  beep(180, 220, "sawtooth");
}
