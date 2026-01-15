// Lottery types and interfaces

export interface LotteryGame {
  id: string;
  countryCode: string;
  countryName: string;
  gameName: string;
  mainNumbers: {
    min: number;
    max: number;
    count: number;
  };
  bonusNumbers?: {
    min: number;
    max: number;
    count: number;
  };
}

export type GeneratorType = 'lottery' | 'roulette' | 'slot';

export interface GeneratedNumbers {
  mainNumbers: number[];
  bonusNumbers?: number[];
}
