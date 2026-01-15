import { useState, useEffect, useRef } from 'react';
import { lotteryGames } from './data/lotteryGames';
import { GeneratorType, GeneratedNumbers } from './types/lottery';
import LotteryMachine from './components/LotteryMachine';
import RouletteMachine from './components/RouletteMachine';
import SlotMachine from './components/SlotMachine';
import LiveResult from './components/LiveResult';
import ResultModal from './components/ResultModal';
import './App.css';

function App() {
  const selectedGame = lotteryGames[0]; // 한국 로또 6/45
  const [generatorType, setGeneratorType] = useState<GeneratorType>('lottery');
  const [liveNumbers, setLiveNumbers] = useState<number[]>([]);
  const [liveBonusNumbers, setLiveBonusNumbers] = useState<number[]>([]);
  const [generatedNumbers, setGeneratedNumbers] = useState<GeneratedNumbers | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  const totalRequired = selectedGame.mainNumbers.count;
  const prevTotalRef = useRef(0);

  const handleGeneratorTypeChange = (type: GeneratorType) => {
    setGeneratorType(type);
    setLiveNumbers([]);
    setLiveBonusNumbers([]);
    setGeneratedNumbers(null);
    setShowModal(false);
    prevTotalRef.current = 0;
    setResetKey(prev => prev + 1);
  };

  const handleNumberUpdate = (numbers: number[], bonusNumbers?: number[]) => {
    setLiveNumbers(numbers);
    if (bonusNumbers) {
      setLiveBonusNumbers(bonusNumbers);
    }
  };

  useEffect(() => {
    const currentTotal = liveNumbers.length + liveBonusNumbers.length;
    const prevTotal = prevTotalRef.current;

    if (currentTotal === totalRequired && prevTotal < totalRequired && currentTotal > 0) {
      const sortedMain = [...liveNumbers].sort((a, b) => a - b);
      const sortedBonus = liveBonusNumbers.length > 0
        ? [...liveBonusNumbers].sort((a, b) => a - b)
        : undefined;

      const finalNumbers: GeneratedNumbers = {
        mainNumbers: sortedMain,
        bonusNumbers: sortedBonus,
      };

      setGeneratedNumbers(finalNumbers);
      setTimeout(() => {
        setShowModal(true);
      }, 500);
    }

    prevTotalRef.current = currentTotal;
  }, [liveNumbers, liveBonusNumbers, totalRequired]);

  const handleReset = () => {
    setLiveNumbers([]);
    setLiveBonusNumbers([]);
    setGeneratedNumbers(null);
    setShowModal(false);
    prevTotalRef.current = 0;
    setResetKey(prev => prev + 1);
  };

  const handleShare = () => {
    if (generatedNumbers) {
      const text = `🍀 로또메이커 생성 번호\n\n당첨 번호: ${generatedNumbers.mainNumbers.join(', ')}\n\nhttps://lotto-maker.vercel.app`;

      if (navigator.share) {
        navigator.share({
          title: '로또메이커 - 행운의 번호',
          text: text,
        });
      } else {
        navigator.clipboard.writeText(text);
        alert('클립보드에 복사되었습니다!');
      }
    }
  };

  const isComplete = liveNumbers.length + liveBonusNumbers.length === totalRequired;

  const generatorLabels: Record<GeneratorType, string> = {
    lottery: '🎱 로또 머신',
    roulette: '🎡 룰렛',
    slot: '🎰 슬롯 머신',
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">🍀 로또메이커</h1>
        <p className="app-subtitle">행운의 번호를 뽑아보세요!</p>
      </header>

      <main className="app-main">
        <div className="controls">
          <div className="control-group">
            <label htmlFor="generator-select">생성 방식 선택</label>
            <select
              id="generator-select"
              value={generatorType}
              onChange={(e) => handleGeneratorTypeChange(e.target.value as GeneratorType)}
              className="select-box"
            >
              <option value="lottery">🎱 로또 머신</option>
              <option value="roulette">🎡 룰렛</option>
              <option value="slot">🎰 슬롯 머신</option>
            </select>
          </div>
        </div>

        <div className="generator-label">
          {generatorLabels[generatorType]}
        </div>

        <div className="content-layout">
          <div className="generator-area">
            {generatorType === 'lottery' && (
              <LotteryMachine
                key={`lottery-${resetKey}`}
                game={selectedGame}
                onNumberUpdate={handleNumberUpdate}
                onReset={handleReset}
              />
            )}
            {generatorType === 'roulette' && (
              <RouletteMachine
                key={`roulette-${resetKey}`}
                game={selectedGame}
                onNumberUpdate={handleNumberUpdate}
                onReset={handleReset}
              />
            )}
            {generatorType === 'slot' && (
              <SlotMachine
                key={`slot-${resetKey}`}
                game={selectedGame}
                onNumberUpdate={handleNumberUpdate}
                onReset={handleReset}
              />
            )}
          </div>

          <div className="result-area">
            <LiveResult
              numbers={liveNumbers}
              bonusNumbers={liveBonusNumbers.length > 0 ? liveBonusNumbers : undefined}
              totalRequired={totalRequired}
              isComplete={isComplete}
            />
          </div>
        </div>
      </main>

      <footer className="app-footer">
        <p>© 2025 로또메이커. 본 서비스는 오락 목적으로만 제공됩니다.</p>
      </footer>

      {showModal && generatedNumbers && (
        <ResultModal
          numbers={generatedNumbers}
          onClose={() => setShowModal(false)}
          onReset={handleReset}
          onShare={handleShare}
        />
      )}
    </div>
  );
}

export default App;
