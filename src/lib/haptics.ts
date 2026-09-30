import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

let audioCtx: AudioContext | null = null;

export const playTickSound = () => {
    try {
        if (!isHapticsEnabled()) return;
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;
        
        if (!audioCtx) {
            audioCtx = new AudioContextClass();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.02);
        
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime); 
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.02);
        
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.02);
    } catch(e) {}
};

export const isHapticsEnabled = () => {
    return localStorage.getItem('haptics_enabled') !== 'false';
};

export const setHapticsEnabled = (enabled: boolean) => {
    localStorage.setItem('haptics_enabled', enabled.toString());
};

/**
 * Basic vibration fallback for web
 */
export const vibrate = async (pattern: number | number[] = 20) => {
    if (isHapticsEnabled()) {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(pattern);
        }
    }
};

/**
 * Success: Crisp, premium double-tap feel
 */
export const vibrateSuccess = async () => {
    if (!isHapticsEnabled()) return;
    try {
        await Haptics.notification({ type: NotificationType.Success });
    } catch (e) {
        vibrate([30, 50, 40]);
    }
};

/**
 * Error: Rough, warning-style pulses
 */
export const vibrateError = async () => {
    if (!isHapticsEnabled()) return;
    try {
        await Haptics.notification({ type: NotificationType.Error });
    } catch (e) {
        vibrate([50, 50, 50, 50, 50]);
    }
};

/**
 * Light: Subtle tick for buttons (like a mechanical keyboard)
 */
export const vibrateLight = async () => {
    if (!isHapticsEnabled()) return;
    playTickSound();
    try {
        await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
        vibrate(10);
    }
};

/**
 * Medium: Stronger feedback for switching tabs or modal opens
 */
export const vibrateMedium = async () => {
    if (!isHapticsEnabled()) return;
    playTickSound();
    try {
        await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
        vibrate(20);
    }
};

/**
 * Purchase: Rich, crescendo of vibrations (coins/reward feel)
 */
export const vibratePurchase = async () => {
    if (!isHapticsEnabled()) return;
    try {
        await Haptics.impact({ style: ImpactStyle.Heavy });
        setTimeout(async () => await Haptics.notification({ type: NotificationType.Success }), 200);
    } catch (e) {
        vibrate([40, 40, 80, 40, 120]);
    }
};

/**
 * Selection: Subtle "click" for list items
 */
export const vibrateSelection = async () => {
    if (!isHapticsEnabled()) return;
    playTickSound();
    try {
        await Haptics.selectionStart();
        setTimeout(async () => await Haptics.selectionEnd(), 10);
    } catch (e) {
        vibrate(10);
    }
};

/**
 * Sustained Humming: Soft vibration for loading/extraction
 */
export const startHumming = () => {
    if (!isHapticsEnabled()) return () => {};
    
    const interval = setInterval(() => {
        vibrateLight();
    }, 150);
    
    return () => {
        clearInterval(interval);
        vibrateMedium(); // Soft end click
    };
};
