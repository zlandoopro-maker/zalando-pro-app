export const playGlassSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const now = ctx.currentTime;

    // Primary crystal chime (high glass frequency)
    const playCrystalTone = (freq: number, startTime: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'highpass';
      filter.frequency.setValueAtTime(800, startTime);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.015, startTime + 0.03);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    };

    // Dual crystal glass clink shimmer
    playCrystalTone(2093, now, 0.28, 0.35);         // C7 glass ping
    playCrystalTone(3135.96, now + 0.025, 0.22, 0.2); // G7 harmonic overtone
    playCrystalTone(4186, now + 0.05, 0.18, 0.15);   // C8 sparkle
  } catch (e) {
    console.warn('Audio not supported or blocked by browser', e);
  }
};

export const playSuccessSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const pitchShift = 1 + (Math.random() * 0.04 - 0.02);

    const playSoftTone = (freq: number, startTime: number, attack: number, decay: number, type: OscillatorType = 'sine', volume: number = 0.5) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, startTime); 
      filter.frequency.exponentialRampToValueAtTime(400, startTime + attack + decay);
      
      osc.connect(gain);
      gain.connect(filter);
      filter.connect(ctx.destination);
      
      osc.type = type;
      osc.frequency.setValueAtTime(freq * pitchShift, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + attack);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + attack + decay);
      
      osc.start(startTime);
      osc.stop(startTime + attack + decay + 0.1);
    };

    const now = ctx.currentTime;
    
    playSoftTone(150, now, 0.04, 0.15, 'sine', 0.7);
    playSoftTone(380, now + 0.08, 0.05, 0.3, 'sine', 0.4);
    playSoftTone(480, now + 0.1, 0.06, 0.35, 'sine', 0.2);
    
  } catch (e) {
    console.warn('Audio not supported or blocked by browser', e);
  }
};

/**
 * Slot Reel Spinning Tick sound
 */
export const playSpinTick = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(650 + Math.random() * 120, now);
    osc.frequency.exponentialRampToValueAtTime(140, now + 0.035);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.04);
  } catch (e) {}
};

/**
 * Slot Reel Stop Chink / Lock sound
 */
export const playReelStopSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    // Heavy mechanical stop thud
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(320, now);
    osc1.frequency.exponentialRampToValueAtTime(90, now + 0.06);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.07);

    // High metallic click accent
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1800, now);
    osc2.frequency.exponentialRampToValueAtTime(400, now + 0.04);
    gain2.gain.setValueAtTime(0.25, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + 0.05);

  } catch (e) {}
};

/**
 * Premium Casino Task Victory & Coin Chime
 * 5-note ascending fanfare (C5, E5, G5, C6, E6) + sparkling coin cascade
 */
export const playTaskWinSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    // Victory Arpeggio (C5, E5, G5, C6, E6)
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.075;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.012, startTime + 0.28);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.32, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });

    // Sparkling coin shower layer (high frequency glass/coin pings)
    const coinPings = [2093, 2637, 3135, 4186, 5274, 6272];
    coinPings.forEach((freq, idx) => {
      const startTime = now + 0.28 + idx * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.22, startTime + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.18);
    });
  } catch (e) {
    console.warn('Audio error:', e);
  }
};

/**
 * Unique VIP Order Page Opening Chime
 * Warm ascending synth sweep + crystal glass popup ping
 */
export const playOrderPageOpenSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    // 1. Warm ascending 4-note harmonic glide (F#4 -> A#4 -> C#5 -> F#5)
    const tones = [369.99, 466.16, 554.37, 739.99];
    tones.forEach((freq, idx) => {
      const startTime = now + idx * 0.055;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, startTime);
      filter.frequency.exponentialRampToValueAtTime(2600, startTime + 0.28);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, startTime + 0.22);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.28);

      osc.connect(gain);
      gain.connect(filter);
      filter.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.32);
    });

    // 2. Delicate high-end crystal glass ping at top of opening
    const oscPing = ctx.createOscillator();
    const gainPing = ctx.createGain();
    oscPing.type = 'sine';
    oscPing.frequency.setValueAtTime(2793.83, now + 0.20); // F7 glass ping

    gainPing.gain.setValueAtTime(0, now + 0.20);
    gainPing.gain.linearRampToValueAtTime(0.2, now + 0.21);
    gainPing.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);

    oscPing.connect(gainPing);
    gainPing.connect(ctx.destination);

    oscPing.start(now + 0.20);
    oscPing.stop(now + 0.45);

  } catch (e) {
    console.warn('Audio open error:', e);
  }
};
