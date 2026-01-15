import { LotteryGame } from '../types/lottery';

export const lotteryGames: LotteryGame[] = [
  {
    id: 'kr-lotto',
    countryCode: 'KR',
    countryName: '대한민국',
    gameName: '로또 6/45',
    mainNumbers: { min: 1, max: 45, count: 6 },
  },
];
