import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, RotateCcw, Pause, Play } from 'lucide-react';
import { useSound } from './hooks/useSound';
import { useHighScore } from './hooks/useHighScore';
import { Starfield } from './components/Starfield';
import { CRTOverlay } from './components/CRTOverlay';

interface DifficultyLevel {
  gridSize: number;
  speed: number;
  name: string;
  timeLimit?: number;
}

const DIFFICULTY_LEVELS: Record<string, DifficultyLevel> = {
  easy: { gridSize: 3, speed: 1000, name: 'Easy' },
  medium: { gridSize: 4, speed: 800, name: 'Medium' },
  hard: { gridSize: 5, speed: 650, name: 'Hard' },
};
type Difficulty = keyof typeof DIFFICULTY_LEVELS;
type GameMode = 'classic' | 'endless';

interface MemoryMatrixProps {
  difficulty: Difficulty;
  mode: GameMode;
  onExit: () => void;
}

export const MemoryMatrix: React.FC<MemoryMatrixProps> = ({ difficulty, mode, onExit }) => {
  const { gridSize, speed: initialSpeed, timeLimit } = DIFFICULTY_LEVELS[difficulty];
  // ... rest of the logic ...

  const { playClick, playSuccess, playError, initAudio, playStart } = useSound();
  const { highScore, updateHighScore } = useHighScore(difficulty as any);
  
  const [grid, setGrid] = useState<boolean[]>(new Array(gridSize * gridSize).fill(false));
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [gameState, setGameState] = useState<'idle' | 'showing' | 'playing' | 'gameOver'>('idle');
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit || 0);
  const [feedback, setFeedback] = useState<{ index: number, type: 'success' | 'error' } | null>(null);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [goToNextLevel, setGoToNextLevel] = useState(false);

  const timerRef = useRef<number | null>(null);
  const sequenceTimer = useRef<number>(0);

  const clearTimers = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => {
    if (gameState === 'playing' && difficulty === 'hard' && timeLeft > 0 && !isPaused) {
      const timer = setInterval(() => setTimeLeft((t: number) => t - 1), 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && gameState === 'playing' && difficulty === 'hard') {
      playError();
      setGameState('gameOver');
    }
  }, [timeLeft, gameState, difficulty, isPaused, playError]);

  const startLevel = useCallback((lvl: number, currentSequence: number[] = []) => {
    setGoToNextLevel(false);
    clearTimers();
    setGameState('showing');
    setUserSequence([]);
    setFeedback(null);
    setTimeLeft(timeLimit || 0);
    
    let newSequence = [...currentSequence];
    const count = mode === 'endless' ? 1 : (lvl + 2);
    
    // If classic, generate new sequence from scratch. If endless, add just 1 more to existing.
    if (mode === 'classic') {
       newSequence = [];
    }

    while (newSequence.length < (mode === 'endless' ? currentSequence.length + 1 : count)) {
      const rand = Math.floor(Math.random() * (gridSize * gridSize));
      if (!newSequence.includes(rand)) {
        newSequence.push(rand);
      }
    }
    
    setSequence(newSequence);
    sequenceTimer.current = 0;
  }, [gridSize, setGoToNextLevel, timeLimit, mode]);

  useEffect(() => {
    if (goToNextLevel) {
      timerRef.current = setTimeout(() => {
        // Pass existing sequence for endless mode
        startLevel(level, mode === 'endless' ? sequence : []);
      }, 1200);
    }
  }, [goToNextLevel, level, startLevel, mode, sequence]);

  // Update DifficultySelector to let user pick mode and pass mode to MemoryMatrix
  // ... and update handleTileClick and UI color...

  useEffect(() => {
    if (gameState === 'showing' && !isPaused) {
      const flashDuration = Math.max(200, initialSpeed - level * 40);
      const showNextInSequence = (index: number) => {
        if (index >= sequence.length) {
          setGrid(new Array(gridSize * gridSize).fill(false));
          setGameState('playing');
          setTimeLeft(timeLimit || 0);
          return;
        }
        
        playClick(sequence[index]);
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
  }, [gameState, isPaused, sequence, level, initialSpeed, gridSize, playClick, timeLimit]);

  const handleTileClick = (index: number) => {
    if (gameState !== 'playing' || isPaused) return;
    
    const expected = sequence[userSequence.length];
    if (index === expected) {
      playClick(index);
      setFeedback({ index, type: 'success' });
      const newUserSequence = [...userSequence, index];
      setUserSequence(newUserSequence);
      setTimeLeft(timeLimit || 0);
      
      if (newUserSequence.length === sequence.length) {
        playSuccess();
        const streakBonus = Math.floor(streak / 3) * 50;
        const newScore = score + level * 10 * (Object.keys(DIFFICULTY_LEVELS).indexOf(difficulty) + 1) + streakBonus;
        setScore(newScore);
        setStreak(s => s + 1);
        if (newScore > highScore) {
          setIsNewHighScore(true);
          updateHighScore(newScore);
        }
        setLevel(l => l + 1);
        setGoToNextLevel(true);
      }
    } else {
      playError();
      setFeedback({ index, type: 'error' });
      setGameState('gameOver');
      setStreak(0);
    }
  };

  const handleStart = () => {
    initAudio();
    playStart();
    setGoToNextLevel(false);
    setLevel(1);
    setScore(0);
    setStreak(0);
    setIsNewHighScore(false);
    startLevel(1);
  };
  
  const togglePause = () => {
    setIsPaused(!isPaused);
    clearTimers();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full p-4 md:p-8 relative">
      <CRTOverlay />
      <div className="grid grid-cols-3 items-center w-full max-w-[400px] mb-6 relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Level</span>
          <span className="text-2xl font-black text-white">{level}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Score</span>
          <span className={`text-2xl font-black ${mode === 'endless' ? 'text-terminal-fuchsia' : 'text-white'}`}>{score}</span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Streak</span>
          <span className={`text-2xl font-black ${mode === 'endless' ? 'text-terminal-fuchsia' : 'text-terminal-cyan'}`}>{streak}</span>
        </div>
        {mode === 'endless' && (
           <span className="absolute -top-8 left-0 text-[10px] uppercase tracking-widest font-bold text-terminal-fuchsia">Endless Mode</span>
        )}
        {(gameState === 'playing' || gameState === 'showing') && (
          <button onClick={togglePause} className="absolute -right-12 top-1/2 -translate-y-1/2 text-white/50 hover:text-white">
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
        )}
      </div>

      <div 
        className="relative aspect-square w-full max-w-[400px] grid gap-2 z-10"
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
                aspect-square rounded-lg border-2 transition-all duration-200 shadow-inner
                ${active || isSuccess ? 
                  (mode === 'endless' ? 'bg-terminal-fuchsia/90 border-white shadow-[0_0_25px_rgba(255,0,255,0.9)]' : 'bg-terminal-cyan/90 border-white shadow-[0_0_25px_rgba(0,242,255,0.9)]') : 
                  isError ? 'bg-orange-500/90 border-white shadow-[0_0_25px_rgba(249,115,22,0.9)]' : 
                  'bg-slate-900/50 border-slate-800 shadow-slate-900/50'}
                ${(gameState === 'playing' && !isPaused) ? 'hover:border-white/50 cursor-pointer' : 'cursor-default'}
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
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm rounded-xl z-20"
            >
              <Brain size={48} className="text-terminal-cyan mb-4 animate-pulse" />
              <button
                onClick={handleStart}
                className="px-8 py-3 bg-terminal-cyan text-black font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,242,255,0.5)] hover:shadow-[0_0_30px_rgba(0,242,255,0.8)]"
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
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-xl text-center z-20"
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
                className="flex items-center gap-2 px-8 py-3 bg-white text-black font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.5)] hover:shadow-[0_0_30px_rgba(255,255,255,0.8)]"
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
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md rounded-xl z-20"
            >
              <h3 className="text-3xl font-black text-white mb-6">PAUSED</h3>
              <div className="flex flex-col gap-4">
                <button
                  onClick={togglePause}
                  className="flex items-center gap-2 px-8 py-3 bg-terminal-cyan text-black font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform shadow-[0_0_20px_rgba(0,242,255,0.5)] hover:shadow-[0_0_30px_rgba(0,242,255,0.8)]"
                >
                  <Play size={20} /> Resume
                </button>
                <button
                  onClick={onExit}
                  className="flex items-center gap-2 px-8 py-3 bg-white/20 text-white font-black uppercase tracking-widest rounded-full hover:scale-105 transition-transform hover:bg-white/30"
                >
                  <RotateCcw size={20} /> New Game
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8 text-center relative z-10">
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

const DifficultySelector: React.FC<{ onSelect: (diff: Difficulty, mode: GameMode) => void }> = ({ onSelect }) => {
  const { initAudio, playStart } = useSound();

  const handleSelect = (diff: Difficulty, mode: GameMode) => {
    initAudio();
    playStart();
    onSelect(diff, mode);
  }

  return (
    <div className="flex flex-col items-center justify-center p-8 relative z-10">
      <h2 className="text-2xl font-black text-white mb-6">Select Difficulty</h2>
      <div className="flex flex-col gap-4 w-full max-w-[220px]">
        {(Object.keys(DIFFICULTY_LEVELS) as Difficulty[]).map(diff => (
          <div key={diff} className="flex flex-col gap-2">
            <button
              onClick={() => handleSelect(diff, 'classic')}
              className="group px-6 py-3 bg-slate-800/50 text-white font-bold uppercase tracking-widest rounded-full hover:bg-terminal-cyan hover:text-black transition-all flex justify-between items-center border-2 border-slate-800 hover:border-terminal-cyan hover:shadow-[0_0_20px_rgba(0,242,255,0.5)]"
            >
              <span>{DIFFICULTY_LEVELS[diff].name}</span>
            </button>
            <button
              onClick={() => handleSelect(diff, 'endless')}
              className="group px-6 py-2 bg-slate-800/50 text-terminal-fuchsia font-bold uppercase tracking-widest rounded-full hover:bg-terminal-fuchsia hover:text-black transition-all flex justify-between items-center border-2 border-slate-800 hover:border-terminal-fuchsia hover:shadow-[0_0_20px_rgba(255,0,255,0.5)]"
            >
              <span>{DIFFICULTY_LEVELS[diff].name} Endless</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function App() {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [mode, setMode] = useState<GameMode>('classic');

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <Starfield />
      <div className="w-full max-w-md bg-black/40 rounded-2xl overflow-hidden shadow-2xl relative neon-border">
        {!difficulty ? (
          <DifficultySelector onSelect={(d, m) => { setDifficulty(d); setMode(m); }} />
        ) : (
          <MemoryMatrix difficulty={difficulty} mode={mode} onExit={() => setDifficulty(null)} />
        )}
      </div>
    </div>
  );
}
