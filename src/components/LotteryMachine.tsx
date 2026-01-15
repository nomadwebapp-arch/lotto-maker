import { useState, useEffect } from 'react';
import { LotteryGame } from '../types/lottery';
import { generateUniqueNumbers, getBallColor } from '../utils/numberGenerator';
import './LotteryMachine.css';

interface LotteryMachineProps {
  game: LotteryGame;
  onNumberUpdate: (numbers: number[], bonusNumbers?: number[]) => void;
  onReset: () => void;
}

const LotteryMachine = ({ game, onNumberUpdate, onReset }: LotteryMachineProps) => {
  const [selectedMainNumbers, setSelectedMainNumbers] = useState<number[]>([]);
  const [selectedBonusNumbers, setSelectedBonusNumbers] = useState<number[]>([]);
  const [floatingBalls, setFloatingBalls] = useState<number[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [extractingBall, setExtractingBall] = useState<number | null>(null);

  const mainRequired = game.mainNumbers.count;
  const bonusRequired = game.bonusNumbers?.count || 0;
  const totalRequired = mainRequired + bonusRequired;

  // Initialize floating balls from both pools
  useEffect(() => {
    const mainRange = game.mainNumbers.max - game.mainNumbers.min + 1;
    const mainCount = Math.min(10, mainRange);
    const mainBalls = generateUniqueNumbers(game.mainNumbers.min, game.mainNumbers.max, mainCount);

    let allBalls = mainBalls;

    if (game.bonusNumbers) {
      const bonusRange = game.bonusNumbers.max - game.bonusNumbers.min + 1;
      const bonusCount = Math.min(5, bonusRange);
      const bonusBalls = generateUniqueNumbers(game.bonusNumbers.min, game.bonusNumbers.max, bonusCount);
      allBalls = [...mainBalls, ...bonusBalls];
    }

    setFloatingBalls(allBalls);
    setSelectedMainNumbers([]);
    setSelectedBonusNumbers([]);
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

  const handleGenerate = () => {
    const currentTotal = selectedMainNumbers.length + selectedBonusNumbers.length;
    if (isGenerating || currentTotal >= totalRequired) return;

    setIsGenerating(true);

    // Determine if we're selecting main or bonus
    const isSelectingBonus = selectedMainNumbers.length >= mainRequired;

    // Simulate ball extraction with animation
    setTimeout(() => {
      let num: number;
      let attempts = 0;

      if (isSelectingBonus && game.bonusNumbers) {
        // Select from bonus pool
        const bonusRange = game.bonusNumbers.max - game.bonusNumbers.min + 1;
        do {
          num = generateUniqueNumbers(game.bonusNumbers.min, game.bonusNumbers.max, 1)[0];
          attempts++;
        } while (selectedBonusNumbers.includes(num) && attempts < bonusRange);

        if (!selectedBonusNumbers.includes(num)) {
          // Start extraction animation
          setExtractingBall(num);

          // After animation completes, add to selected bonus numbers
          setTimeout(() => {
            setSelectedBonusNumbers([...selectedBonusNumbers, num]);
            setExtractingBall(null);
            setIsGenerating(false);
          }, 1200);
        } else {
          setIsGenerating(false);
        }
      } else {
        // Select from main pool
        const mainRange = game.mainNumbers.max - game.mainNumbers.min + 1;
        do {
          num = generateUniqueNumbers(game.mainNumbers.min, game.mainNumbers.max, 1)[0];
          attempts++;
        } while (selectedMainNumbers.includes(num) && attempts < mainRange);

        if (!selectedMainNumbers.includes(num)) {
          // Start extraction animation
          setExtractingBall(num);

          // After animation completes, add to selected main numbers
          setTimeout(() => {
            setSelectedMainNumbers([...selectedMainNumbers, num]);
            setExtractingBall(null);
            setIsGenerating(false);
          }, 1200);
        } else {
          setIsGenerating(false);
        }
      }
    }, 300);
  };

  const handleResetLocal = () => {
    setSelectedMainNumbers([]);
    setSelectedBonusNumbers([]);

    const mainRange = game.mainNumbers.max - game.mainNumbers.min + 1;
    const mainCount = Math.min(10, mainRange);
    const mainBalls = generateUniqueNumbers(game.mainNumbers.min, game.mainNumbers.max, mainCount);

    let allBalls = mainBalls;

    if (game.bonusNumbers) {
      const bonusRange = game.bonusNumbers.max - game.bonusNumbers.min + 1;
      const bonusCount = Math.min(5, bonusRange);
      const bonusBalls = generateUniqueNumbers(game.bonusNumbers.min, game.bonusNumbers.max, bonusCount);
      allBalls = [...mainBalls, ...bonusBalls];
    }

    setFloatingBalls(allBalls);
    onNumberUpdate([], undefined);
    onReset();
  };

  const currentTotal = selectedMainNumbers.length + selectedBonusNumbers.length;
  const allSelectedNumbers = [...selectedMainNumbers, ...selectedBonusNumbers];

  return (
    <div className="lottery-machine">
      <div className="machine-container">
        <div className="machine-body-glass">
          <div className="machine-dome-glass">
            <div className="sphere-container">
              <div className="sphere-shell"></div>
              <div className="floating-balls">
                {floatingBalls.map((num, index) => {
                  const isExtracting = extractingBall === num;
                  const isSelected = allSelectedNumbers.includes(num);

                  return (
                    <div
                      key={`${num}-${index}`}
                      className={`floating-ball ${isExtracting ? 'extracting' : ''} ${isSelected ? 'hidden' : ''}`}
                      style={{
                        backgroundColor: getBallColor(num),
                        left: '50%',
                        top: '50%',
                        marginLeft: '-22.5px',
                        marginTop: '-22.5px',
                      }}
                    >
                      {num}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Extracted ball animation */}
            {extractingBall !== null && (
              <div
                className="extracting-ball-container"
                style={{ backgroundColor: getBallColor(extractingBall) }}
              >
                <div className="extracting-ball">
                  {extractingBall}
                </div>
              </div>
            )}
          </div>
          <div className="machine-base-glass">
            <button
              className="generate-button-glass"
              onClick={handleGenerate}
              disabled={isGenerating || currentTotal >= totalRequired}
            >
              번호 뽑기
            </button>
          </div>
        </div>

        {currentTotal > 0 && (
          <button className="reset-button-glass" onClick={handleResetLocal}>
            다시 하기
          </button>
        )}
      </div>
    </div>
  );
};

export default LotteryMachine;
