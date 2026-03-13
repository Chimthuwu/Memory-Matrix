import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, RotateCcw } from 'lucide-react';

const GRID_SIZE = 4;
const INITIAL_SPEED = 800;

export const MemoryMatrix: React.FC = () => {
  const [grid, setGrid] = useState<boolean[]>(new Array(GRID_SIZE * GRID_SIZE).fill(false));
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'idle' | 'showing' | 'playing' | 'gameOver'>('idle');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ index: number, type: 'success' | 'error' } | null>(null);

  const startLevel = useCallback((lvl: number) => {
    setGameState('showing');
    setUserSequence([]);
    setFeedback(null);
    const newSequence: number[] = [];
    const count = lvl + 2;
    
    while (newSequence.length < count) {
      const rand = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
      if (!newSequence.includes(rand)) {
        newSequence.push(rand);
      }
    }
    
    setSequence(newSequence);
    
    // Flash sequence
    let i = 0;
    const interval = setInterval(() => {
      if (i < newSequence.length) {
        const newGrid = new Array(GRID_SIZE * GRID_SIZE).fill(false);
        newGrid[newSequence[i]] = true;
        setGrid(newGrid);
        i++;
      } else {
        clearInterval(interval);
        setGrid(new Array(GRID_SIZE * GRID_SIZE).fill(false));
        setGameState('playing');
      }
    }, Math.max(300, INITIAL_SPEED - lvl * 40));
  }, []);

  const handleTileClick = (index: number) => {
    if (gameState !== 'playing') return;
    
    const expected = sequence[userSequence.length];
    if (index === expected) {
      setFeedback({ index, type: 'success' });
      const newUserSequence = [...userSequence, index];
      setUserSequence(newUserSequence);
      
      if (newUserSequence.length === sequence.length) {
        setScore(s => s + level * 10);
        setLevel(l => l + 1);
        setTimeout(() => startLevel(level + 1), 800);
      }
    } else {
      setFeedback({ index, type: 'error' });
      setTimeout(() => setGameState('gameOver'), 500);
    }
  };

  const reset = () => {
    setLevel(1);
    setScore(0);
    setFeedback(null);
    startLevel(1);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 md:p-8">
      <div className="flex justify-between items-center w-full max-w-[320px] mb-6">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Level</span>
          <span className="text-2xl font-black text-white">{level}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Score</span>
          <span className="text-2xl font-black text-white">{score}</span>
        </div>
      </div>

      <div className="relative aspect-square w-full max-w-[320px] grid grid-cols-4 gap-2">
        {grid.map((active, i) => {
          const isSuccess = feedback?.index === i && feedback?.type === 'success';
          const isError = feedback?.index === i && feedback?.type === 'error';
          
          return (
            <motion.button
              key={i}
              whileHover={{ scale: gameState === 'playing' ? 1.05 : 1 }}
              whileTap={{ scale: gameState === 'playing' ? 0.95 : 1 }}
              animate={isError ? { x: [-2, 2, -2, 2, 0] } : {}}
              onClick={() => handleTileClick(i)}
              className={`
                aspect-square rounded-lg border-2 transition-all duration-200
                ${active || isSuccess ? 'bg-terminal-cyan border-white shadow-[0_0_20px_rgba(0,242,255,0.8)]' : 
                  isError ? 'bg-terminal-fuchsia border-white shadow-[0_0_20px_rgba(255,0,255,0.8)]' : 
                  'bg-white/5 border-white/10'}
                ${gameState === 'playing' ? 'hover:border-white/30 cursor-pointer' : 'cursor-default'}
              `}
            />
          );
        })}

        <AnimatePresence>
          {gameState === 'idle' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl"
            >
              <Brain size={48} className="text-terminal-cyan mb-4 animate-pulse" />
              <button
                onClick={() => startLevel(1)}
                className="px-8 py-3 bg-terminal-cyan text-black font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform"
              >
                Start Test
              </button>
            </motion.div>
          )}

          {gameState === 'gameOver' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-xl"
            >
              <h3 className="text-3xl font-black text-white mb-2">SYSTEM FAILURE</h3>
              <p className="text-terminal-fuchsia font-bold mb-6">Final Score: {score}</p>
              <button
                onClick={reset}
                className="flex items-center gap-2 px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform"
              >
                <RotateCcw size={20} /> Reboot
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 text-[10px] font-bold uppercase tracking-widest opacity-40 text-center max-w-[280px]">
        {gameState === 'showing' ? 'Observe the sequence...' : 
         gameState === 'playing' ? 'Repeat the pattern' : 
         'Test your cognitive bandwidth'}
      </div>
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
      <div className="w-full max-w-md border border-white/10 bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,242,255,0.03)_0%,transparent_70%)] pointer-events-none" />
        <MemoryMatrix />
      </div>
    </div>
  );
}
