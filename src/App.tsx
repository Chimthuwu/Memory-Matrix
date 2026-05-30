import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, RotateCcw, Pause, Play } from 'lucide-react';
import { useSound } from './hooks/useSound';
import { useHighScore } from './hooks/useHighScore';

const DIFFICULTY_LEVELS = {
  easy: { gridSize: 3, speed: 1000, name: 'Easy' },
  medium: { gridSize: 4, speed: 800, name: 'Medium' },
  hard: { gridSize: 5, speed: 650, name: 'Hard' },
};

type Difficulty = keyof typeof DIFFICULTY_LEVELS;

interface MemoryMatrixProps {
  difficulty: Difficulty;
  onExit: () => void;
}

export const MemoryMatrix: React.FC<MemoryMatrixProps> = ({ difficulty, onExit }) => {
  const { gridSize, speed: initialSpeed } = DIFFICULTY_LEVELS[difficulty];
  const { playClick, playSuccess, playError, initAudio, playStart } = useSound();
  const { highScore, updateHighScore } = useHighScore(difficulty);
  
  const [grid, setGrid] = useState<boolean[]>(new Array(gridSize * gridSize).fill(false));
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'idle' | 'showing' | 'playing' | 'gameOver'>('idle');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState<{ index: number, type: 'success' | 'error' } | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const timerRef = useRef<number | null>(null);
  const sequenceTimer = useRef<number>(0);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const startLevel = useCallback((lvl: number) => {
    clearTimers();
    setGameState('showing');
    setUserSequence([]);
    setFeedback(null);
    const newSequence: number[] = [];
    const count = lvl + 2;
    
    while (newSequence.length < count) {
      const rand = Math.floor(Math.random() * (gridSize * gridSize));
      if (!newSequence.includes(rand)) {
        newSequence.push(rand);
      }
    }
    
    setSequence(newSequence);
    sequenceTimer.current = 0;
  }, [gridSize]);

  useEffect(() => {
    if (gameState === 'showing' && !isPaused) {
      const flashDuration = Math.max(200, initialSpeed - level * 40);
      const showNextInSequence = (index: number) => {
        if (index >= sequence.length) {
          setGrid(new Array(gridSize * gridSize).fill(false));
          setGameState('playing');
          return;
        }
        
        playClick();
        const newGrid = new Array(gridSize * gridSize).fill(false);
        newGrid[sequence[index]] = true;
        setGrid(newGrid);

        timerRef.current = setTimeout(() => {
          setGrid(new Array(gridSize * gridSize).fill(false));
          timerRef.current = setTimeout(() => {
            sequenceTimer.current = index + 1;
            showNextInSequence(index + 1);
          }, 100);
        }, flashDuration);
      };
      
      showNextInSequence(sequenceTimer.current);
    }
    
    return clearTimers;
  }, [gameState, isPaused, sequence, level, initialSpeed, gridSize, playClick]);

  const handleTileClick = (index: number) => {
    if (gameState !== 'playing' || isPaused) return;
    
    const expected = sequence[userSequence.length];
    if (index === expected) {
      playClick();
      setFeedback({ index, type: 'success' });
      const newUserSequence = [...userSequence, index];
      setUserSequence(newUserSequence);
      
      if (newUserSequence.length === sequence.length) {
        playSuccess();
        const newScore = score + level * 10 * (Object.keys(DIFFICULTY_LEVELS).indexOf(difficulty) + 1);
        setScore(newScore);
        if (newScore > highScore) {
          setIsNewHighScore(true);
          updateHighScore(newScore);
        }
        setLevel(l => l + 1);
        clearTimers();
        timerRef.current = setTimeout(() => startLevel(level + 1), 1200);
      }
    } else {
      playError();
      setFeedback({ index, type: 'error' });
      setGameState('gameOver');
    }
  };

  const handleStart = () => {
    initAudio();
    playStart();
    startLevel(1);
  };
  
  const togglePause = () => {
    setIsPaused(!isPaused);
    clearTimers();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 md:p-8">
      <div className="grid grid-cols-3 items-center w-full max-w-[400px] mb-6 relative">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Level</span>
          <span className="text-2xl font-black text-white">{level}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Score</span>
          <span className="text-2xl font-black text-white">{score}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">High Score</span>
          <span className="text-2xl font-black text-white">{highScore}</span>
        </div>
        {(gameState === 'playing' || gameState === 'showing') && (
          <button onClick={togglePause} className="absolute -right-12 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
        )}
      </div>

      <div 
        className="relative aspect-square w-full max-w-[400px] grid gap-2"
        style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
      >
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
                ${(gameState === 'playing' && !isPaused) ? 'hover:border-white/30 cursor-pointer' : 'cursor-default'}
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
                onClick={handleStart}
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
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-xl text-center"
            >
              {isNewHighScore ? (
                <>
                  <h3 className="text-2xl font-black text-terminal-cyan mb-2">NEW HIGH SCORE!</h3>
                  <p className="text-white text-4xl font-black mb-6">{score}</p>
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-black text-white mb-2">SYSTEM FAILURE</h3>
                  <p className="text-terminal-fuchsia font-bold mb-2">Final Score: {score}</p>
                  <p className="text-white/50 text-xs font-bold mb-6">High Score: {highScore}</p>
                </>
              )}
              <button
                onClick={onExit}
                className="flex items-center gap-2 px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform"
              >
                <RotateCcw size={20} /> New Game
              </button>
            </motion.div>
          )}

          {isPaused && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-xl z-10"
            >
              <h3 className="text-3xl font-black text-white mb-6">PAUSED</h3>
              <div className="flex flex-col gap-4">
                <button
                  onClick={togglePause}
                  className="flex items-center gap-2 px-8 py-3 bg-terminal-cyan text-black font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform"
                >
                  <Play size={20} /> Resume
                </button>
                <button
                  onClick={onExit}
                  className="flex items-center gap-2 px-8 py-3 bg-white/20 text-white font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform"
                >
                  <RotateCcw size={20} /> New Game
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 text-center">
        <div className="text-[10px] font-bold uppercase tracking-widest opacity-40 max-w-[280px] mb-2">
          {isPaused ? 'Game is Paused' :
           gameState === 'showing' ? 'Observe the sequence...' : 
           gameState === 'playing' ? 'Repeat the pattern' : 
           'Test your cognitive bandwidth'}
        </div>
        <div className="text-lg font-bold text-white">{DIFFICULTY_LEVELS[difficulty].name}</div>
      </div>
    </div>
  );
};

const DifficultySelector: React.FC<{ onSelect: (diff: Difficulty) => void }> = ({ onSelect }) => {
  const { initAudio, playStart } = useSound();

  const handleSelect = (diff: Difficulty) => {
    initAudio();
    playStart();
    onSelect(diff);
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <h2 className="text-2xl font-black text-white mb-6">Select Difficulty</h2>
      <div className="flex flex-col gap-4 w-full max-w-[220px]">
        {(Object.keys(DIFFICULTY_LEVELS) as Difficulty[]).map(diff => (
          <button
            key={diff}
            onClick={() => handleSelect(diff)}
            className="group px-6 py-3 bg-white/10 text-white font-bold uppercase tracking-widest rounded-full hover:bg-terminal-cyan hover:text-black transition-all flex justify-between items-center"
          >
            <span>{DIFFICULTY_LEVELS[diff].name}</span>
            <span className="text-xs opacity-50 font-mono group-hover:text-black">
              HS: {useHighScore(diff).highScore}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center">
      <div className="w-full max-w-md border border-white/10 bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,242,255,0.03)_0%,transparent_70%)] pointer-events-none" />
        {!difficulty ? (
          <DifficultySelector onSelect={setDifficulty} />
        ) : (
          <MemoryMatrix difficulty={difficulty} onExit={() => setDifficulty(null)} />
        )}
      </div>
    </div>
  );
}
