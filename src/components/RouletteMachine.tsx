import { useState, useEffect } from 'react';
import { LotteryGame } from '../types/lottery';
import { getBallColor } from '../utils/numberGenerator';
import './RouletteMachine.css';

interface RouletteMachineProps {
  game: LotteryGame;
  onNumberUpdate: (numbers: number[], bonusNumbers?: number[]) => void;
  onReset: () => void;
}

const SEGMENT_COUNT = 10;

const RouletteMachine = ({ game, onNumberUpdate, onReset }: RouletteMachineProps) => {
  const [selectedMainNumbers, setSelectedMainNumbers] = useState<number[]>([]);
  const [selectedBonusNumbers, setSelectedBonusNumbers] = useState<number[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [poppingNumber, setPoppingNumber] = useState<number | null>(null);
  const [showingNumbers, setShowingNumbers] = useState<number[]>([]);

  const mainRequired = game.mainNumbers.count;
  const bonusRequired = game.bonusNumbers?.count || 0;
  const totalRequired = mainRequired + bonusRequired;

  // Reset when game changes
  useEffect(() => {
    setSelectedMainNumbers([]);
    setSelectedBonusNumbers([]);
    setShowingNumbers([]);
    setPoppingNumber(null);
    setRotation(0);
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

  const handleSpin = () => {
    const currentTotal = selectedMainNumbers.length + selectedBonusNumbers.length;
    if (isSpinning || currentTotal >= totalRequired) return;

    setIsSpinning(true);
    setPoppingNumber(null);

    // Determine if we're selecting main or bonus
    const isSelectingBonus = selectedMainNumbers.length >= mainRequired;

    // Generate number from FULL range
    let selectedNum: number;
    if (isSelectingBonus && game.bonusNumbers) {
      const bonusMin = game.bonusNumbers.min;
      const bonusMax = game.bonusNumbers.max;
      const availableNumbers: number[] = [];
      for (let i = bonusMin; i <= bonusMax; i++) {
        if (!selectedBonusNumbers.includes(i)) {
          availableNumbers.push(i);
        }
      }
      selectedNum = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    } else {
      const mainMin = game.mainNumbers.min;
      const mainMax = game.mainNumbers.max;
      const availableNumbers: number[] = [];
      for (let i = mainMin; i <= mainMax; i++) {
        if (!selectedMainNumbers.includes(i)) {
          availableNumbers.push(i);
        }
      }
      selectedNum = availableNumbers[Math.floor(Math.random() * availableNumbers.length)];
    }

    // Random target position on wheel
    const targetIndex = Math.floor(Math.random() * SEGMENT_COUNT);
    const segmentAngle = 360 / SEGMENT_COUNT;
    const targetAngle = targetIndex * segmentAngle;

    // Add multiple full rotations for spinning effect
    const spins = 5 + Math.random() * 3;
    const fullRotations = Math.floor(spins) * 360;
    const desiredFinalAngle = (360 - targetAngle) % 360;
    const currentAngle = rotation % 360;
    let rotationNeeded = (desiredFinalAngle - currentAngle + 360) % 360;
    if (rotationNeeded === 0) rotationNeeded = 360;

    const targetRotation = rotation + fullRotations + rotationNeeded;
    setRotation(targetRotation);

    // After spin completes, show the popping animation
    setTimeout(() => {
      setPoppingNumber(selectedNum);

      // After pop animation, add to selected numbers
      setTimeout(() => {
        setShowingNumbers(prev => [...prev, selectedNum]);

        if (isSelectingBonus) {
          setSelectedBonusNumbers(prev => [...prev, selectedNum]);
        } else {
          setSelectedMainNumbers(prev => [...prev, selectedNum]);
        }

        setPoppingNumber(null);
        setIsSpinning(false);
      }, 800);
    }, 3000);
  };

  const handleResetLocal = () => {
    setSelectedMainNumbers([]);
    setSelectedBonusNumbers([]);
    setShowingNumbers([]);
    setPoppingNumber(null);
    setRotation(0);
    onNumberUpdate([], undefined);
    onReset();
  };

  const segmentAngle = 360 / SEGMENT_COUNT;
  const currentTotal = selectedMainNumbers.length + selectedBonusNumbers.length;

  return (
    <div className="roulette-machine">
      <div className="roulette-container-glass">
        <div className="roulette-pointer">▼</div>
        <div
          className={`roulette-wheel-glass ${isSpinning ? 'spinning' : ''}`}
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: isSpinning ? 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
          }}
        >
          {/* Dividing lines */}
          {Array.from({ length: SEGMENT_COUNT }).map((_, index) => (
            <div
              key={`divider-${index}`}
              className="roulette-divider"
              style={{
                transform: `rotate(${index * segmentAngle}deg)`,
              }}
            />
          ))}

          {/* Question marks */}
          {Array.from({ length: SEGMENT_COUNT }).map((_, index) => {
            const angle = index * segmentAngle + segmentAngle / 2;
            return (
              <div
                key={index}
                className="roulette-question"
                style={{
                  transform: `rotate(${angle}deg) translateY(-110px) rotate(${-angle}deg)`,
                }}
              >
                ?
              </div>
            );
          })}

          <div className="roulette-center-glass">
            <span>{game.gameName}</span>
          </div>
        </div>

        {/* Popping number animation */}
        {poppingNumber !== null && (
          <div
            className="popping-ball"
            style={{ backgroundColor: getBallColor(poppingNumber) }}
          >
            {poppingNumber}
          </div>
        )}

        <button
          className="spin-button-glass"
          onClick={handleSpin}
          disabled={isSpinning || currentTotal >= totalRequired}
        >
          {isSpinning ? '...' : '돌리기'}
        </button>
      </div>

      {/* Selected numbers display */}
      {showingNumbers.length > 0 && (
        <div className="selected-balls-container">
          {showingNumbers.map((num, index) => {
            const isBonus = index >= mainRequired;
            return (
              <div
                key={`${num}-${index}`}
                className={`selected-ball ${isBonus ? 'bonus' : ''}`}
                style={{
                  backgroundColor: getBallColor(num),
                  animationDelay: `${index * 0.1}s`
                }}
              >
                {num}
              </div>
            );
          })}
        </div>
      )}

      {currentTotal > 0 && (
        <button className="reset-button-glass" onClick={handleResetLocal}>
          다시 하기
        </button>
      )}
    </div>
  );
};

export default RouletteMachine;
