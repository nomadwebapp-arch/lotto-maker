import { LotteryGame, GeneratedNumbers } from '../types/lottery';

/**
 * Generate unique random numbers for lottery
 */
export const generateLotteryNumbers = (game: LotteryGame): GeneratedNumbers => {
  const mainNumbers = generateUniqueNumbers(
    game.mainNumbers.min,
    game.mainNumbers.max,
    game.mainNumbers.count
  ).sort((a, b) => a - b);

  const bonusNumbers = game.bonusNumbers
    ? generateUniqueNumbers(
        game.bonusNumbers.min,
        game.bonusNumbers.max,
        game.bonusNumbers.count
      ).sort((a, b) => a - b)
    : undefined;

  return { mainNumbers, bonusNumbers };
};

/**
 * Generate unique random numbers within a range
 */
export const generateUniqueNumbers = (
  min: number,
  max: number,
  count: number
): number[] => {
  const numbers = new Set<number>();

  while (numbers.size < count) {
    const num = Math.floor(Math.random() * (max - min + 1)) + min;
    numbers.add(num);
  }

  return Array.from(numbers);
};

/**
 * Get ball color based on number range
 * Modern color palette with softer, more elegant tones
 */
export const getBallColor = (num: number): string => {
  if (num < 10) return '#F59E0B'; // amber
  if (num < 20) return '#EF4444'; // rose red
  if (num < 30) return '#3B82F6'; // sky blue
  if (num < 40) return '#10B981'; // emerald
  if (num < 50) return '#8B5CF6'; // violet
  return '#F97316'; // orange
};
