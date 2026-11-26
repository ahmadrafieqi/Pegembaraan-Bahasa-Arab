export type SoundEffectKind = 'jump' | 'pickup' | 'correct' | 'wrong' | 'unlock';

let audioCtx: AudioContext | null = null;

export function ensureAudio(): void {
  if (typeof window === 'undefined') return;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
}

function playTone(
  freq: number,
  duration = 0.14,
  type: OscillatorType = 'sine',
  vol = 0.12,
  delay = 0
): void {
  try {
    ensureAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime + delay;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration);
  } catch {
    // Ignore audio context errors on restricted browsers
  }
}

export function playSound(kind: SoundEffectKind, muted: boolean): void {
  if (muted) return;
  if (kind === 'jump') {
    playTone(260, 0.13, 'triangle', 0.11, 0);
    playTone(420, 0.15, 'triangle', 0.09, 0.045);
  } else if (kind === 'pickup') {
    playTone(587.33, 0.12, 'sine', 0.13, 0);
    playTone(880, 0.22, 'sine', 0.13, 0.09);
  } else if (kind === 'correct') {
    playTone(523.25, 0.12, 'triangle', 0.14, 0);
    playTone(659.25, 0.12, 'triangle', 0.14, 0.09);
    playTone(783.99, 0.24, 'triangle', 0.15, 0.18);
  } else if (kind === 'wrong') {
    playTone(220, 0.17, 'sawtooth', 0.09, 0);
    playTone(175, 0.22, 'sawtooth', 0.09, 0.13);
  } else if (kind === 'unlock') {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      playTone(f, 0.22, 'triangle', 0.14, i * 0.085);
    });
  }
}

export function speakArabic(text: string, muted: boolean): boolean {
  if (muted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.85;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const arVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ar'));
    if (arVoice) {
      utterance.voice = arVoice;
    }

    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
