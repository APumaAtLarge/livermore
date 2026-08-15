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
  ma5: number;
  ma10: number;
};

export type MarketResponse = {
  markets: MarketItem[];
  updatedAt: string;
  delayed: boolean;
};
