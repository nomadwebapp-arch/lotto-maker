import { useState, useEffect, useRef } from 'react';
import { LotteryGame } from '../types/lottery';
import { generateUniqueNumbers } from '../utils/numberGenerator';
import './SlotMachine.css';

interface SlotMachineProps {
  game: LotteryGame;
  onNumberUpdate: (numbers: number[], bonusNumbers?: number[]) => void;
  onReset: () => void;
}

const SlotMachine = ({ game, onNumberUpdate, onReset }: SlotMachineProps) => {
  const [selectedMainNumbers, setSelectedMainNumbers] = useState<number[]>([]);
  const [selectedBonusNumbers, setSelectedBonusNumbers] = useState<number[]>([]);
  const [mainReels, setMainReels] = useState<number[][]>([]);
  const [bonusReels, setBonusReels] = useState<number[][]>([]);
  const [isSpinning, setIsSpinning] = useState<boolean[]>([]);
  const [flashingReel, setFlashingReel] = useState<number | null>(null);
  const [leverPulled, setLeverPulled] = useState(false);
  const [currentSpinNumbers, setCurrentSpinNumbers] = useState<number[]>([]);
  const [finalNumbers, setFinalNumbers] = useState<number[]>([]);
  const [hasStarted, setHasStarted] = useState(false);
  const [stoppedCount, setStoppedCount] = useState(0);
  const numberChangeIntervals = useRef<number[]>([]);

  const mainRequired = game.mainNumbers.count;
  const bonusRequired = game.bonusNumbers?.count || 0;
  const totalRequired = mainRequired + bonusRequired;

  // Initialize reels
  useEffect(() => {
    initializeReels();
    setCurrentSpinNumbers(new Array(totalRequired).fill(0));
    setFinalNumbers(new Array(totalRequired).fill(0));
  }, [game]);

  // Update parent when numbers change
  useEffect(() => {
    if (selectedMainNumbers.length > 0 || selectedBonusNumbers.length > 0) {
      onNumberUpdate(
        selectedMainNumbers,
        selectedBonusNumbers.length > 0 ? selectedBonusNumbers : undefined
      );
    }
  }, [selectedMainNumbers, selectedBonusNumbers, onNumberUpdate]);

  const initializeReels = () => {
    const newMainReels: number[][] = [];
    const newBonusReels: number[][] = [];
    const newIsSpinning: boolean[] = [];

    const mainRange = game.mainNumbers.max - game.mainNumbers.min + 1;
    const numbersToGenerate = Math.min(20, mainRange);

    // Create main reels
    for (let i = 0; i < mainRequired; i++) {
      const reelNumbers = generateUniqueNumbers(game.mainNumbers.min, game.mainNumbers.max, numbersToGenerate);
      newMainReels.push(reelNumbers);
      newIsSpinning.push(false);
    }

    // Create bonus reels if needed
    if (game.bonusNumbers) {
      const bonusRange = game.bonusNumbers.max - game.bonusNumbers.min + 1;
      const bonusNumsToGenerate = Math.min(20, bonusRange);

      for (let i = 0; i < bonusRequired; i++) {
        const reelNumbers = generateUniqueNumbers(game.bonusNumbers.min, game.bonusNumbers.max, bonusNumsToGenerate);
        newBonusReels.push(reelNumbers);
        newIsSpinning.push(false);
      }
    }

    setMainReels(newMainReels);
    setBonusReels(newBonusReels);
    setIsSpinning(newIsSpinning);
    setSelectedMainNumbers([]);
    setSelectedBonusNumbers([]);
    setHasStarted(false);
    setStoppedCount(0);
  };

  const handleStart = () => {
    if (hasStarted) return;

    // Lever animation
    setLeverPulled(true);
    setTimeout(() => setLeverPulled(false), 600);

    setHasStarted(true);

    // Start ALL reels spinning
    const newIsSpinning = new Array(totalRequired).fill(true);
    setIsSpinning(newIsSpinning);

    // Pre-select all numbers
    const newMainNumbers: number[] = [];
    const newBonusNumbers: number[] = [];
    const allFinalNumbers: number[] = [];

    // Select main numbers
    for (let i = 0; i < mainRequired; i++) {
      const availableNumbers = mainReels[i].filter(
        (num) => !newMainNumbers.includes(num)
      );
      const selectedNum = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
      newMainNumbers.push(selectedNum);
      allFinalNumbers.push(selectedNum);
    }

    // Select bonus numbers
    for (let i = 0; i < bonusRequired; i++) {
      const availableNumbers = bonusReels[i].filter(
        (num) => !newBonusNumbers.includes(num)
      );
      const selectedNum = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
      newBonusNumbers.push(selectedNum);
      allFinalNumbers.push(selectedNum);
    }

    setFinalNumbers(allFinalNumbers);

    // Start flickering for all reels
    for (let reelIndex = 0; reelIndex < totalRequired; reelIndex++) {
      const isSelectingBonus = reelIndex >= mainRequired;
      const minNum = isSelectingBonus && game.bonusNumbers
        ? game.bonusNumbers.min
        : game.mainNumbers.min;
      const maxNum = isSelectingBonus && game.bonusNumbers
        ? game.bonusNumbers.max
        : game.mainNumbers.max;

      const numberInterval = setInterval(() => {
        const randomNum = Math.floor(Math.random() * (maxNum - minNum + 1)) + minNum;
        setCurrentSpinNumbers(prev => {
          const newNums = [...prev];
          newNums[reelIndex] = randomNum;
          return newNums;
        });
      }, 80);

      numberChangeIntervals.current[reelIndex] = numberInterval;
    }
  };

  const handleStop = () => {
    if (!hasStarted || stoppedCount >= totalRequired) return;

    const reelIndex = stoppedCount;

    // Stop flickering for this reel
    clearInterval(numberChangeIntervals.current[reelIndex]);

    // Set final number
    setCurrentSpinNumbers(prev => {
      const newNums = [...prev];
      newNums[reelIndex] = finalNumbers[reelIndex];
      return newNums;
    });

    // Flash effect
    setFlashingReel(reelIndex);
    setTimeout(() => setFlashingReel(null), 500);

    // Mark reel as stopped
    setIsSpinning(prev => {
      const newSpinning = [...prev];
      newSpinning[reelIndex] = false;
      return newSpinning;
    });

    setStoppedCount(reelIndex + 1);

    // If this is the last reel, update the selected numbers
    if (reelIndex === totalRequired - 1) {
      const newMainNumbers: number[] = [];
      const newBonusNumbers: number[] = [];

      for (let i = 0; i < totalRequired; i++) {
        if (i < mainRequired) {
          newMainNumbers.push(finalNumbers[i]);
        } else {
          newBonusNumbers.push(finalNumbers[i]);
        }
      }

      setSelectedMainNumbers(newMainNumbers);
      setSelectedBonusNumbers(newBonusNumbers);
    }
  };

  const handleResetLocal = () => {
    // Clear all intervals
    numberChangeIntervals.current.forEach((interval) => clearInterval(interval));
    numberChangeIntervals.current = [];

    initializeReels();
    setCurrentSpinNumbers(new Array(totalRequired).fill(0));
    setFinalNumbers(new Array(totalRequired).fill(0));
    onNumberUpdate([], undefined);
    onReset();
  };

  // Get all selected numbers in display order
  const getAllSelectedNumbers = () => {
    return [...selectedMainNumbers, ...selectedBonusNumbers];
  };

  const allSelectedNumbers = getAllSelectedNumbers();
  const allStopped = stoppedCount >= totalRequired;

  return (
    <div className="slot-machine">
      <div className="slot-machine-frame">
        <div className="slot-machine-top-light"></div>
        <div className="slot-machine-side-panel left"></div>
        <div className="slot-machine-side-panel right"></div>

        <div className="slot-container-glass">
          <div className="slot-header-glass">LOTTO</div>

          {/* Lever */}
          <div className={`slot-lever ${leverPulled ? 'pulled' : ''}`}>
            <div className="lever-handle"></div>
            <div className="lever-ball"></div>
          </div>

          <div className="slot-reels-glass">
            {Array.from({ length: totalRequired }).map((_, reelIndex) => (
              <div
                key={reelIndex}
                className={`slot-reel-glass ${flashingReel === reelIndex ? 'flash' : ''}`}
              >
                <div className="reel-numbers">
                  <div className={`reel-number ${isSpinning[reelIndex] ? 'flickering' : ''}`}>
                    {isSpinning[reelIndex]
                      ? currentSpinNumbers[reelIndex]
                      : (allSelectedNumbers[reelIndex] || '?')
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>

          {!allStopped ? (
            <button
              className="spin-button-glass"
              onClick={hasStarted ? handleStop : handleStart}
              disabled={false}
            >
              {hasStarted ? 'STOP' : 'START'}
            </button>
          ) : null}
        </div>

        {allStopped && (
          <button className="reset-button-glass" onClick={handleResetLocal}>
            다시 하기
          </button>
        )}
      </div>
    </div>
  );
};

export default SlotMachine;
