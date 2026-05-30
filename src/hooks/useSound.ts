import { useCallback, useRef } from 'react';

export const useSound = () => {
  const audioContext = useRef<AudioContext | null>(null);

  const initAudio = useCallback(() => {
    if (!audioContext.current) {
      try {
        audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error("Web Audio API is not supported in this browser");
      }
    }
  }, []);

  const playTone = useCallback((
    freq: number, 
    duration: number, 
    type: OscillatorType = 'sine', 
    vol: number = 0.05
  ) => {
    if (!audioContext.current) return;
    
    const osc = audioContext.current.createOscillator();
    const gain = audioContext.current.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.current.currentTime);
    
    gain.gain.setValueAtTime(vol, audioContext.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.current.currentTime + duration * 0.8);
    
    osc.connect(gain);
    gain.connect(audioContext.current.destination);
    
    osc.start();
    osc.stop(audioContext.current.currentTime + duration);
  }, []);

  const playClick = useCallback((index?: number) => {
    const freq = (index !== undefined && index % 2 === 0) ? 880 : 987.77;
    playTone(freq, 0.08, 'triangle', 0.04);
  }, [playTone]);

  const playSuccess = useCallback(() => {
    playTone(523.25, 0.1, 'sine');
    setTimeout(() => playTone(659.25, 0.1, 'sine'), 100);
    setTimeout(() => playTone(783.99, 0.15, 'sine'), 200);
  }, [playTone]);

  const playError = useCallback(() => {
    playTone(220, 0.15, 'sine', 0.08);
    setTimeout(() => playTone(207.65, 0.2, 'sine', 0.08), 50);
  }, [playTone]);
  
  const playStart = useCallback(() => {
    playTone(261.63, 0.1, 'sine');
    setTimeout(() => playTone(329.63, 0.1, 'sine'), 100);
    setTimeout(() => playTone(392.00, 0.1, 'sine'), 200);
  }, [playTone]);

  return { playClick, playSuccess, playError, playStart, initAudio };
};
