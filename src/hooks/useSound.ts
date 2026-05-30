import { useCallback, useRef } from 'react';

export const useSound = () => {
  const audioContext = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioContext.current) {
      audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const playTone = useCallback((freq: number, duration: number, type: OscillatorType = 'sine', vol: number = 0.1) => {
    initAudio();
    if (!audioContext.current) return;
    
    const osc = audioContext.current.createOscillator();
    const gain = audioContext.current.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.current.currentTime);
    gain.gain.setValueAtTime(vol, audioContext.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.current.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioContext.current.destination);
    
    osc.start();
    osc.stop(audioContext.current.currentTime + duration);
  }, [initAudio]);

  const playClick = () => playTone(440, 0.1);
  const playSuccess = () => {
    playTone(600, 0.1);
    setTimeout(() => playTone(800, 0.2), 100);
  };
  const playError = () => {
    playTone(200, 0.3, 'sawtooth', 0.2);
    playTone(150, 0.3, 'sawtooth', 0.2);
  };

  return { playClick, playSuccess, playError, initAudio };
};
