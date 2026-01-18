import { useState, useEffect, useCallback } from 'react';
import { getBallColor } from '../utils/numberGenerator';
import './ResultsPage.css';

interface PrizeInfo {
  rank: number;
  prizePerWinner: number;
  winnerCount: number;
}

interface LottoResult {
  drwNo: number;
  drwNoDate: string;
  drwtNo1: number;
  drwtNo2: number;
  drwtNo3: number;
  drwtNo4: number;
  drwtNo5: number;
  drwtNo6: number;
  bnusNo: number;
  firstWinamnt: number;
  firstPrzwnerCo: number;
  firstAccumamnt: number;
  totSellamnt: number;
  prizes?: PrizeInfo[];
  returnValue: string;
}

function ResultsPage() {
  const [result, setResult] = useState<LottoResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentRound, setCurrentRound] = useState<number>(0);
  const [latestRound, setLatestRound] = useState<number>(0);
  const [inputRound, setInputRound] = useState<string>('');

  // 최신 회차 가져오기
  const fetchLatestRound = async (): Promise<number> => {
    try {
      const response = await fetch('/api/lotto?drwNo=latest');
      const data = await response.json();
      if (data.returnValue === 'success' && data.drwNo) {
        return data.drwNo;
      }
    } catch {
      // 실패시 날짜 계산으로 폴백
    }
    const startDate = new Date('2002-12-07');
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks + 1;
  };

  const fetchLottoResult = useCallback(async (round: number) => {
    setLoading(true);
    setError(null);

    try {
      // 프로덕션에서는 Vercel API 사용
      const apiUrl = `/api/lotto?drwNo=${round}`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error('네트워크 오류');
      }

      const data = await response.json();

      if (data.returnValue === 'success') {
        setResult(data);
        setCurrentRound(round);
        setLatestRound((prev) => Math.max(prev, round));
      } else {
        // 아직 추첨 안된 회차면 이전 회차로
        if (round > 1) {
          fetchLottoResult(round - 1);
          return;
        }
        setError('데이터를 불러올 수 없습니다.');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      // API 실패시 샘플 데이터 사용
      const sampleData: LottoResult = {
        drwNo: round,
        drwNoDate: '2025-01-18',
        drwtNo1: 7,
        drwtNo2: 11,
        drwtNo3: 19,
        drwtNo4: 28,
        drwtNo5: 36,
        drwtNo6: 42,
        bnusNo: 15,
        firstWinamnt: 1987654321,
        firstPrzwnerCo: 12,
        firstAccumamnt: 23851851852,
        totSellamnt: 112345678900,
        returnValue: 'success'
      };
      setResult(sampleData);
      setCurrentRound(round);
      setError('※ 현재 동행복권 API 연결 불가로 샘플 데이터를 표시합니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const latest = await fetchLatestRound();
      setLatestRound(latest);
      setInputRound(String(latest));
      fetchLottoResult(latest);
    };
    init();
  }, [fetchLottoResult]);

  const handlePrevRound = () => {
    if (currentRound > 1) {
      const newRound = currentRound - 1;
      setInputRound(String(newRound));
      fetchLottoResult(newRound);
    }
  };

  const handleNextRound = () => {
    if (currentRound < latestRound) {
      const newRound = currentRound + 1;
      setInputRound(String(newRound));
      fetchLottoResult(newRound);
    }
  };

  const handleSearch = () => {
    const searchValue = inputRound || String(currentRound);
    const round = parseInt(searchValue);
    if (round >= 1 && round <= latestRound) {
      fetchLottoResult(round);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const formatMoney = (amount: number) => {
    if (amount >= 100000000) {
      const billions = Math.floor(amount / 100000000);
      const millions = Math.floor((amount % 100000000) / 10000);
      if (millions > 0) {
        return `${billions}억 ${millions.toLocaleString()}만원`;
      }
      return `${billions}억원`;
    }
    if (amount >= 10000) {
      return `${Math.floor(amount / 10000).toLocaleString()}만원`;
    }
    return `${amount.toLocaleString()}원`;
  };

  const getWinningNumbers = (): number[] => {
    if (!result) return [];
    return [
      result.drwtNo1,
      result.drwtNo2,
      result.drwtNo3,
      result.drwtNo4,
      result.drwtNo5,
      result.drwtNo6,
    ];
  };

  const renderBall = (num: number, isBonus = false) => (
    <div
      key={`${num}-${isBonus ? 'bonus' : 'main'}`}
      className={`result-ball ${isBonus ? 'bonus' : ''}`}
      style={{ background: getBallColor(num) }}
    >
      {num}
    </div>
  );

  const prizeConditions: Record<number, string> = {
    1: '6개 번호 일치',
    2: '5개 + 보너스',
    3: '5개 번호 일치',
    4: '4개 번호 일치',
    5: '3개 번호 일치',
  };

  const renderPrizeRows = () => {
    if (!result) return null;

    // prizes 배열이 있으면 사용, 없으면 기본 정보 사용
    if (result.prizes && result.prizes.length > 0) {
      return result.prizes.map((prize) => (
        <div key={prize.rank} className={`prize-row ${prize.rank === 1 ? 'first' : ''}`}>
          <span className={`rank rank-${prize.rank}`}>{prize.rank}등</span>
          <span>{prizeConditions[prize.rank]}</span>
          <span className={`amount ${prize.rank >= 4 ? 'fixed' : ''}`}>
            {formatMoney(prize.prizePerWinner)} ({prize.winnerCount.toLocaleString()}명)
          </span>
        </div>
      ));
    }

    // 기본 정보만 있을 때 (개발 환경 샘플 데이터)
    return (
      <>
        <div className="prize-row first">
          <span className="rank rank-1">1등</span>
          <span>6개 번호 일치</span>
          <span className="amount">{formatMoney(result.firstWinamnt)} ({result.firstPrzwnerCo}명)</span>
        </div>
        <div className="prize-row">
          <span className="rank rank-2">2등</span>
          <span>5개 + 보너스</span>
          <span className="amount secondary">배포 후 표시</span>
        </div>
        <div className="prize-row">
          <span className="rank rank-3">3등</span>
          <span>5개 번호 일치</span>
          <span className="amount secondary">배포 후 표시</span>
        </div>
        <div className="prize-row">
          <span className="rank rank-4">4등</span>
          <span>4개 번호 일치</span>
          <span className="amount fixed">50,000원 (고정)</span>
        </div>
        <div className="prize-row">
          <span className="rank rank-5">5등</span>
          <span>3개 번호 일치</span>
          <span className="amount fixed">5,000원 (고정)</span>
        </div>
      </>
    );
  };

  return (
    <div className="results-page">
      <div className="results-header">
        <h2>추첨결과</h2>
        <p>회차별 당첨번호를 확인하세요</p>
      </div>

      <div className="results-content">
        {/* 회차 검색 */}
        <div className="round-search">
          <input
            type="number"
            value={inputRound}
            onChange={(e) => setInputRound(e.target.value)}
            onKeyPress={handleKeyPress}
            min={1}
            max={latestRound}
          />
          <button onClick={handleSearch}>조회</button>
        </div>

        {loading ? (
          <div className="loading-box">
            <div className="loading-spinner"></div>
            <p>데이터를 불러오는 중...</p>
          </div>
        ) : !result ? (
          <div className="error-box">
            <p>{error || '데이터를 불러올 수 없습니다.'}</p>
            <button onClick={() => fetchLottoResult(latestRound)}>다시 시도</button>
          </div>
        ) : (
          <>
            {error && (
              <div className="api-notice">
                <p>{error}</p>
              </div>
            )}
            {/* 회차 네비게이션 */}
            <div className="round-nav">
              <button
                className="nav-btn"
                onClick={handlePrevRound}
                disabled={currentRound <= 1}
              >
                ◀ 이전
              </button>
              <div className="round-info">
                <span className="round-number">{result.drwNo}회</span>
                <span className="round-date">{result.drwNoDate} 추첨</span>
              </div>
              <button
                className="nav-btn"
                onClick={handleNextRound}
                disabled={currentRound >= latestRound}
              >
                다음 ▶
              </button>
            </div>

            {/* 당첨 번호 */}
            <div className="winning-numbers">
              <h3>당첨번호</h3>
              <div className="numbers-display">
                <div className="main-numbers">
                  {getWinningNumbers().map((num) => renderBall(num))}
                </div>
                <span className="plus-sign">+</span>
                <div className="bonus-number">
                  {renderBall(result.bnusNo, true)}
                </div>
              </div>
              <p className="bonus-label">보너스</p>
            </div>

            {/* 당첨금 정보 */}
            <div className="prize-table">
              <h3>등위별 당첨 정보</h3>
              <div className="prize-grid">
                <div className="prize-row header">
                  <span>등위</span>
                  <span>당첨 조건</span>
                  <span>당첨금 (당첨자)</span>
                </div>
                {renderPrizeRows()}
              </div>
            </div>

            {/* 총 판매금액 */}
            <div className="total-sales">
              <span className="sales-label">총 판매금액</span>
              <span className="sales-value">{formatMoney(result.totSellamnt)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ResultsPage;
