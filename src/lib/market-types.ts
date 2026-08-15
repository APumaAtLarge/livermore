export type Timeframe = "5m" | "10m";

export type PricePoint = {
  time: string;
  price: number;
};

export type MarketItem = {
  symbol: string;
  name: string;
  englishName: string;
  kind: "metal" | "energy" | "index";
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  currency: string;
  exchange: string;
  marketState: string;
  points: PricePoint[];
};

export type MarketResponse = {
  markets: MarketItem[];
  updatedAt: string;
  delayed: boolean;
};
