import { useState, useEffect, useCallback } from 'react';

const HIGH_SCORE_KEY = 'memory-matrix-high-scores';

type HighScores = {
  easy: number;
  medium: number;
  hard: number;
};

const getHighScores = (): HighScores => {
  try {
    const scores = localStorage.getItem(HIGH_SCORE_KEY);
    if (scores) {
      return JSON.parse(scores);
    }
  } catch (error) {
    console.error('Failed to parse high scores from localStorage', error);
  }
  return { easy: 0, medium: 0, hard: 0 };
};

export const useHighScore = (difficulty: keyof HighScores) => {
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const scores = getHighScores();
    setHighScore(scores[difficulty] || 0);
  }, [difficulty]);

  const updateHighScore = useCallback(
    (newScore: number) => {
      if (newScore > highScore) {
        setHighScore(newScore);
        const scores = getHighScores();
        scores[difficulty] = newScore;
        try {
          localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(scores));
        } catch (error) {
          console.error('Failed to save high scores to localStorage', error);
        }
      }
    },
    [difficulty, highScore]
  );

  return { highScore, updateHighScore };
};
