// Procedural WebAudio sound effects & autumn banjo-fiddle loop (zero external audio files).

const AUTUMN_MELODY = [
  523.25, 659.25, 783.99, 659.25,
  587.33, 659.25, 523.25, 440.0,
  523.25, 659.25, 783.99, 880.0,
  783.99, 659.25, 587.33, 523.25,
];

const AUTUMN_BASS = [
  130.81, 196.0, 146.83, 196.0,
  130.81, 164.81, 146.83, 196.0,
];

export function createSoundEngine() {
  return {
    ctx: null,
    muted: false,
    musicStep: 0,
    musicTimer: 0,
    footstepTimer: 0,
  };
}

function ensureAudioContext(sound) {
  if (sound.muted) return null;
  if (!sound.ctx && typeof window !== 'undefined') {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (AudioCtx) {
      try {
        sound.ctx = new AudioCtx();
      } catch {
        sound.ctx = null;
      }
    }
  }
  if (sound.ctx && sound.ctx.state === 'suspended') {
    sound.ctx.resume().catch(() => {});
  }
  return sound.ctx;
}

export function unlockAudio(sound) {
  ensureAudioContext(sound);
}

export function toggleMute(sound) {
  sound.muted = !sound.muted;
  return sound.muted;
}

function playTone(ctx, freq, duration, type, volume, freqEnd = freq, delay = 0) {
  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (freqEnd !== freq) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), now + duration);
  }
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(volume, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration + 0.02);
}

export function playTurkeyGobble(sound) {
  const ctx = ensureAudioContext(sound);
  if (!ctx) return;
  const notes = [420, 560, 460, 610, 480];
  for (let i = 0; i < notes.length; i += 1) {
    playTone(ctx, notes[i], 0.065, 'triangle', 0.14, notes[i] * 0.82, i * 0.052);
  }
}

export function playJumpWhoosh(sound, isFlutter = false) {
  const ctx = ensureAudioContext(sound);
  if (!ctx) return;
  playTone(ctx, isFlutter ? 340 : 210, 0.14, 'sine', 0.12, isFlutter ? 640 : 510);
}

export function playDashBurst(sound) {
  const ctx = ensureAudioContext(sound);
  if (!ctx) return;
  playTone(ctx, 290, 0.16, 'sawtooth', 0.1, 780);
  playTurkeyGobble(sound);
}

export function playHideRustle(sound) {
  const ctx = ensureAudioContext(sound);
  if (!ctx) return;
  playTone(ctx, 180, 0.09, 'triangle', 0.08, 120);
  playTone(ctx, 240, 0.08, 'sine', 0.06, 150, 0.04);
}

export function playKnifeShing(sound) {
  const ctx = ensureAudioContext(sound);
  if (!ctx) return;
  playTone(ctx, 1650, 0.18, 'triangle', 0.09, 980);
  playTone(ctx, 2400, 0.12, 'sine', 0.05, 1900, 0.02);
}

export function playFarmerAlarm(sound) {
  const ctx = ensureAudioContext(sound);
  if (!ctx) return;
  playTone(ctx, 220, 0.18, 'sawtooth', 0.11, 290);
  playTone(ctx, 290, 0.22, 'sawtooth', 0.11, 195, 0.16);
}

export function playCornChime(sound, streak = 1) {
  const ctx = ensureAudioContext(sound);
  if (!ctx) return;
  const pitch = 580 + Math.min(8, streak) * 48;
  playTone(ctx, pitch, 0.09, 'sine', 0.12, pitch * 1.15);
  playTone(ctx, pitch * 1.25, 0.11, 'triangle', 0.1, pitch * 1.4, 0.045);
}

export function playHurtSquawk(sound) {
  const ctx = ensureAudioContext(sound);
  if (!ctx) return;
  playTone(ctx, 520, 0.22, 'sawtooth', 0.15, 140);
  playTone(ctx, 310, 0.18, 'square', 0.1, 95, 0.07);
}

export function playStageFanfare(sound, isVictory = false) {
  const ctx = ensureAudioContext(sound);
  if (!ctx) return;
  const chord = isVictory
    ? [523.25, 659.25, 783.99, 1046.5, 1318.5]
    : [440, 554.37, 659.25, 880];
  for (let i = 0; i < chord.length; i += 1) {
    playTone(ctx, chord[i], 0.22, 'triangle', 0.12, chord[i], i * 0.09);
  }
}

export function playFootstep(sound) {
  const ctx = ensureAudioContext(sound);
  if (!ctx) return;
  playTone(ctx, 135, 0.04, 'triangle', 0.045, 75);
}

export function updateBackgroundMusic(sound, dt, isPlaying, stageNumber, runningOnGround) {
  if (!isPlaying || sound.muted || !sound.ctx) return;
  const stepSeconds = Math.max(0.145, 0.205 - (stageNumber - 1) * 0.022);
  sound.musicTimer += dt;
  if (sound.musicTimer >= stepSeconds) {
    sound.musicTimer -= stepSeconds;
    const note = AUTUMN_MELODY[sound.musicStep % AUTUMN_MELODY.length];
    playTone(sound.ctx, note, stepSeconds * 0.68, 'triangle', 0.032, note);
    if (sound.musicStep % 2 === 0) {
      const bass = AUTUMN_BASS[(sound.musicStep >> 1) % AUTUMN_BASS.length];
      playTone(sound.ctx, bass, stepSeconds * 1.1, 'sine', 0.038, bass);
    }
    sound.musicStep += 1;
  }

  if (runningOnGround) {
    sound.footstepTimer += dt;
    if (sound.footstepTimer >= 0.22) {
      sound.footstepTimer = 0;
      playFootstep(sound);
    }
  }
}
