import type { VercelRequest, VercelResponse } from '@vercel/node';

interface PrizeInfo {
  rank: number;
  totalPrize: number;
  winnerCount: number;
  prizePerWinner: number;
}

interface LottoDetailResult {
  drwNo: number;
  drwNoDate: string;
  drwtNo1: number;
  drwtNo2: number;
  drwtNo3: number;
  drwtNo4: number;
  drwtNo5: number;
  drwtNo6: number;
  bnusNo: number;
  totSellamnt: number;
  prizes: PrizeInfo[];
  returnValue: string;
}

async function fetchBasicResult(drwNo: string) {
  const response = await fetch(
    `https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`,
    {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.dhlottery.co.kr/',
        'Origin': 'https://www.dhlottery.co.kr',
      }
    }
  );
  return response.json();
}

async function fetchDetailedResult(drwNo: string): Promise<PrizeInfo[]> {
  try {
    const response = await fetch(
      `https://www.dhlottery.co.kr/gameResult.do?method=byWin&drwNo=${drwNo}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        }
      }
    );

    const html = await response.text();
    const prizes: PrizeInfo[] = [];

    // 테이블에서 당첨금 정보 추출
    // 패턴: <td>등위</td><td>당첨금</td><td>당첨자수</td><td>1인당금액</td>
    const tableRegex = /<tr[^>]*class="[^"]*"[^>]*>[\s\S]*?<td[^>]*>(\d)등<\/td>[\s\S]*?<td[^>]*>([\d,]+)원<\/td>[\s\S]*?<td[^>]*>([\d,]+)<\/td>[\s\S]*?<td[^>]*>([\d,]+)원<\/td>/gi;

    let match;
    while ((match = tableRegex.exec(html)) !== null) {
      const rank = parseInt(match[1]);
      const totalPrize = parseInt(match[2].replace(/,/g, ''));
      const winnerCount = parseInt(match[3].replace(/,/g, ''));
      const prizePerWinner = parseInt(match[4].replace(/,/g, ''));

      prizes.push({ rank, totalPrize, winnerCount, prizePerWinner });
    }

    // 다른 패턴 시도 (테이블 구조가 다를 수 있음)
    if (prizes.length === 0) {
      // tbody 내 tr 추출
      const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);
      if (tbodyMatch) {
        const tbody = tbodyMatch[1];
        const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
        let rowMatch;

        while ((rowMatch = rowRegex.exec(tbody)) !== null) {
          const row = rowMatch[1];
          const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi);

          if (cells && cells.length >= 4) {
            const rankMatch = cells[0].match(/(\d)등/);
            if (rankMatch) {
              const rank = parseInt(rankMatch[1]);

              // 금액 추출 (숫자와 쉼표만)
              const extractNumber = (cell: string) => {
                const numMatch = cell.replace(/<[^>]+>/g, '').match(/([\d,]+)/);
                return numMatch ? parseInt(numMatch[1].replace(/,/g, '')) : 0;
              };

              const totalPrize = extractNumber(cells[1]);
              const winnerCount = extractNumber(cells[2]);
              const prizePerWinner = extractNumber(cells[3]);

              if (rank >= 1 && rank <= 5) {
                prizes.push({ rank, totalPrize, winnerCount, prizePerWinner });
              }
            }
          }
        }
      }
    }

    return prizes.sort((a, b) => a.rank - b.rank);
  } catch (error) {
    console.error('Failed to fetch detailed result:', error);
    return [];
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { drwNo } = req.query;

  if (!drwNo) {
    return res.status(400).json({ error: 'drwNo is required' });
  }

  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  try {
    // 기본 정보 가져오기
    const basicData = await fetchBasicResult(drwNo as string);

    if (basicData.returnValue !== 'success') {
      return res.status(200).json(basicData);
    }

    // 상세 정보는 별도로 시도 (실패해도 기본 정보 반환)
    let prizes: PrizeInfo[] = [];
    try {
      prizes = await fetchDetailedResult(drwNo as string);
    } catch {
      // 상세 정보 실패시 무시
    }

    // 상세 정보 병합
    const result: LottoDetailResult = {
      ...basicData,
      prizes: prizes.length > 0 ? prizes : [
        {
          rank: 1,
          totalPrize: basicData.firstAccumamnt || 0,
          winnerCount: basicData.firstPrzwnerCo || 0,
          prizePerWinner: basicData.firstWinamnt || 0
        }
      ]
    };

    return res.status(200).json(result);
  } catch (error) {
    console.error('API error:', error);
    // 에러 발생시에도 샘플 데이터 반환
    return res.status(200).json({
      returnValue: 'fail',
      error: 'Failed to fetch lottery data'
    });
  }
}
