import { useState, useEffect } from 'react';
import { getBallColor } from '../utils/numberGenerator';
import './StatsPage.css';

interface LottoResult {
  drwNo: number;
  drwtNo1: number;
  drwtNo2: number;
  drwtNo3: number;
  drwtNo4: number;
  drwtNo5: number;
  drwtNo6: number;
  bnusNo: number;
}

interface NumberStats {
  number: number;
  count: number;
  percentage: number;
}

interface PairStats {
  pair: [number, number];
  count: number;
}

type StatsTab = 'frequency' | 'topBottom' | 'companion';

const CACHE_KEY = 'lotto_stats_cache';
const CACHE_ROUNDS_KEY = 'lotto_stats_rounds';

function StatsPage() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<StatsTab>('frequency');
  const [totalRounds, setTotalRounds] = useState(0);

  // 통계 데이터
  const [numberStats, setNumberStats] = useState<NumberStats[]>([]);
  const [topNumbers, setTopNumbers] = useState<NumberStats[]>([]);
  const [bottomNumbers, setBottomNumbers] = useState<NumberStats[]>([]);
  const [pairStats, setPairStats] = useState<PairStats[]>([]);

  // 정렬 옵션
  const [sortBy, setSortBy] = useState<'number' | 'count'>('count');

  const calculateLatestRound = () => {
    const startDate = new Date('2002-12-07');
    const today = new Date();
    const diffTime = today.getTime() - startDate.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks + 1;
  };

  const fetchLottoResult = async (round: number): Promise<LottoResult | null> => {
    try {
      const apiUrl = `/api/lotto?drwNo=${round}`;
      const response = await fetch(apiUrl);
      const data = await response.json();

      if (data.returnValue === 'success') {
        return data;
      }
      return null;
    } catch {
      return null;
    }
  };

  // 개발용 샘플 데이터 생성
  const generateSampleData = (): LottoResult[] => {
    const results: LottoResult[] = [];
    for (let i = 1; i <= 100; i++) {
      const nums = new Set<number>();
      while (nums.size < 6) {
        nums.add(Math.floor(Math.random() * 45) + 1);
      }
      const sorted = Array.from(nums).sort((a, b) => a - b);
      let bonus = Math.floor(Math.random() * 45) + 1;
      while (nums.has(bonus)) {
        bonus = Math.floor(Math.random() * 45) + 1;
      }
      results.push({
        drwNo: 1100 + i,
        drwtNo1: sorted[0],
        drwtNo2: sorted[1],
        drwtNo3: sorted[2],
        drwtNo4: sorted[3],
        drwtNo5: sorted[4],
        drwtNo6: sorted[5],
        bnusNo: bonus,
      });
    }
    return results;
  };

  const calculateStats = (results: LottoResult[]) => {
    // 번호별 출현 횟수
    const frequency: Record<number, number> = {};
    for (let i = 1; i <= 45; i++) {
      frequency[i] = 0;
    }

    // 번호 쌍 출현 횟수
    const pairFrequency: Record<string, number> = {};

    results.forEach((result) => {
      const numbers = [
        result.drwtNo1,
        result.drwtNo2,
        result.drwtNo3,
        result.drwtNo4,
        result.drwtNo5,
        result.drwtNo6,
      ];

      // 개별 번호 카운트
      numbers.forEach((num) => {
        frequency[num]++;
      });

      // 번호 쌍 카운트
      for (let i = 0; i < numbers.length; i++) {
        for (let j = i + 1; j < numbers.length; j++) {
          const key = `${Math.min(numbers[i], numbers[j])}-${Math.max(numbers[i], numbers[j])}`;
          pairFrequency[key] = (pairFrequency[key] || 0) + 1;
        }
      }
    });

    // NumberStats 배열 생성
    const stats: NumberStats[] = [];
    for (let i = 1; i <= 45; i++) {
      stats.push({
        number: i,
        count: frequency[i],
        percentage: (frequency[i] / results.length) * 100,
      });
    }

    // 정렬된 통계
    const sortedByCount = [...stats].sort((a, b) => b.count - a.count);
    const top6 = sortedByCount.slice(0, 6);
    const bottom6 = sortedByCount.slice(-6).reverse();

    // 쌍 통계 (상위 20개)
    const pairs: PairStats[] = Object.entries(pairFrequency)
      .map(([key, count]) => {
        const [a, b] = key.split('-').map(Number);
        return { pair: [a, b] as [number, number], count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    setNumberStats(stats);
    setTopNumbers(top6);
    setBottomNumbers(bottom6);
    setPairStats(pairs);
    setTotalRounds(results.length);
  };

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // 캐시 확인
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedRounds = localStorage.getItem(CACHE_ROUNDS_KEY);

      const latestRound = calculateLatestRound();
      let results: LottoResult[] = [];
      let startRound = 1;

      if (cachedData && cachedRounds) {
        const cached = JSON.parse(cachedData) as LottoResult[];
        const lastCachedRound = parseInt(cachedRounds);

        if (lastCachedRound >= latestRound - 1) {
          // 캐시가 최신이면 바로 사용
          calculateStats(cached);
          setLoading(false);
          return;
        } else {
          // 캐시된 데이터 사용하고 나머지만 가져오기
          results = cached;
          startRound = lastCachedRound + 1;
        }
      }

      // 최근 100회차만 가져오기 (전체는 너무 오래 걸림)
      const roundsToFetch = Math.min(100, latestRound - startRound + 1);
      const actualStartRound = latestRound - roundsToFetch + 1;

      if (results.length === 0) {
        startRound = actualStartRound;
      }

      // 병렬로 데이터 가져오기 (10개씩 배치)
      const batchSize = 10;
      const totalBatches = Math.ceil((latestRound - startRound + 1) / batchSize);
      let successCount = 0;

      for (let batch = 0; batch < totalBatches; batch++) {
        const batchStart = startRound + batch * batchSize;
        const batchEnd = Math.min(batchStart + batchSize - 1, latestRound);

        const promises = [];
        for (let round = batchStart; round <= batchEnd; round++) {
          promises.push(fetchLottoResult(round));
        }

        const batchResults = await Promise.all(promises);
        batchResults.forEach((result) => {
          if (result) {
            results.push(result);
            successCount++;
          }
        });

        setProgress(Math.round(((batch + 1) / totalBatches) * 100));
      }

      // API 실패시 샘플 데이터 사용
      if (results.length === 0) {
        results = generateSampleData();
        setError('※ 동행복권 API 연결 불가로 샘플 데이터를 표시합니다.');
      }

      // 중복 제거 및 정렬
      const uniqueResults = Array.from(
        new Map(results.map((r) => [r.drwNo, r])).values()
      ).sort((a, b) => a.drwNo - b.drwNo);

      // 캐시 저장 (실제 데이터인 경우만)
      if (successCount > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify(uniqueResults));
        localStorage.setItem(CACHE_ROUNDS_KEY, String(latestRound - 1));
      }

      calculateStats(uniqueResults);
    } catch {
      // 에러 시 샘플 데이터 사용
      const sampleResults = generateSampleData();
      calculateStats(sampleResults);
      setError('※ 동행복권 API 연결 불가로 샘플 데이터를 표시합니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getSortedStats = () => {
    if (sortBy === 'number') {
      return [...numberStats].sort((a, b) => a.number - b.number);
    }
    return [...numberStats].sort((a, b) => b.count - a.count);
  };

  const renderBall = (num: number, size: 'small' | 'medium' = 'medium') => (
    <div
      className={`stats-ball ${size}`}
      style={{ background: getBallColor(num) }}
    >
      {num}
    </div>
  );

  const maxCount = Math.max(...numberStats.map((s) => s.count));

  return (
    <div className="stats-page">
      <div className="stats-header">
        <h2>통계</h2>
        <p>역대 당첨번호 분석 및 통계</p>
        {totalRounds > 0 && (
          <span className="stats-info">최근 {totalRounds}회차 기준</span>
        )}
      </div>

      {loading ? (
        <div className="stats-content">
          <div className="loading-box">
            <div className="loading-spinner"></div>
            <p>통계 데이터를 불러오는 중...</p>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
            <span className="progress-text">{progress}%</span>
          </div>
        </div>
      ) : numberStats.length === 0 ? (
        <div className="stats-content">
          <div className="error-box">
            <p>데이터를 불러올 수 없습니다.</p>
            <button onClick={loadStats}>다시 시도</button>
          </div>
        </div>
      ) : (
        <>
          {/* API 오류 알림 */}
          {error && (
            <div className="api-notice">
              <p>{error}</p>
            </div>
          )}
          {/* 탭 메뉴 */}
          <div className="stats-tabs">
            <button
              className={`tab-btn ${activeTab === 'frequency' ? 'active' : ''}`}
              onClick={() => setActiveTab('frequency')}
            >
              전체 통계
            </button>
            <button
              className={`tab-btn ${activeTab === 'topBottom' ? 'active' : ''}`}
              onClick={() => setActiveTab('topBottom')}
            >
              최다/최소 번호
            </button>
            <button
              className={`tab-btn ${activeTab === 'companion' ? 'active' : ''}`}
              onClick={() => setActiveTab('companion')}
            >
              동반 출현
            </button>
          </div>

          <div className="stats-content">
            {/* 전체 통계 */}
            {activeTab === 'frequency' && (
              <div className="frequency-section">
                <div className="section-header">
                  <h3>번호별 출현 횟수</h3>
                  <div className="sort-options">
                    <button
                      className={sortBy === 'count' ? 'active' : ''}
                      onClick={() => setSortBy('count')}
                    >
                      출현순
                    </button>
                    <button
                      className={sortBy === 'number' ? 'active' : ''}
                      onClick={() => setSortBy('number')}
                    >
                      번호순
                    </button>
                  </div>
                </div>
                <div className="frequency-grid">
                  {getSortedStats().map((stat) => (
                    <div key={stat.number} className="frequency-item">
                      {renderBall(stat.number, 'small')}
                      <div className="frequency-bar-container">
                        <div
                          className="frequency-bar"
                          style={{ width: `${(stat.count / maxCount) * 100}%` }}
                        ></div>
                      </div>
                      <span className="frequency-count">{stat.count}회</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 최다/최소 번호 */}
            {activeTab === 'topBottom' && (
              <div className="top-bottom-section">
                <div className="top-section">
                  <h3>가장 많이 나온 번호 6개</h3>
                  <div className="top-balls">
                    {topNumbers.map((stat, idx) => (
                      <div key={stat.number} className="ranked-ball">
                        <span className="rank-badge">{idx + 1}</span>
                        {renderBall(stat.number)}
                        <span className="ball-count">{stat.count}회</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bottom-section">
                  <h3>가장 적게 나온 번호 6개</h3>
                  <div className="bottom-balls">
                    {bottomNumbers.map((stat, idx) => (
                      <div key={stat.number} className="ranked-ball cold">
                        <span className="rank-badge">{idx + 1}</span>
                        {renderBall(stat.number)}
                        <span className="ball-count">{stat.count}회</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 동반 출현 통계 */}
            {activeTab === 'companion' && (
              <div className="companion-section">
                <h3>자주 함께 나오는 번호 조합</h3>
                <p className="section-desc">가장 많이 동반 출현한 번호 쌍 TOP 20</p>
                <div className="pair-list">
                  {pairStats.map((stat, idx) => (
                    <div key={`${stat.pair[0]}-${stat.pair[1]}`} className="pair-item">
                      <span className="pair-rank">{idx + 1}</span>
                      <div className="pair-balls">
                        {renderBall(stat.pair[0], 'small')}
                        <span className="pair-plus">+</span>
                        {renderBall(stat.pair[1], 'small')}
                      </div>
                      <span className="pair-count">{stat.count}회</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default StatsPage;
