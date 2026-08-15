import YahooFinance from "yahoo-finance2";
import type { MarketItem, MarketResponse } from "./market-types";

const yahooFinance = new YahooFinance({ queue: { concurrency: 2, interval: 100 } });

const MARKETS = [
  { symbol: "XAUUSD=X", fallback: "GC=F", name: "伦敦金现", englishName: "Spot Gold", kind: "metal" as const },
  { symbol: "BZ=F", name: "布伦特原油", englishName: "Brent Crude", kind: "energy" as const },
  { symbol: "^NDX", name: "纳斯达克 100", englishName: "Nasdaq 100", kind: "index" as const },
  { symbol: "^GSPC", name: "标普 500", englishName: "S&P 500", kind: "index" as const },
];

function average(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

async function loadMarket(config: (typeof MARKETS)[number]): Promise<MarketItem> {
  let symbol = config.symbol;
  let chart;
  try {
    chart = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      interval: "1d",
      return: "array",
    });
  } catch (error) {
    if (!("fallback" in config) || !config.fallback) throw error;
    symbol = config.fallback;
    chart = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      interval: "1d",
      return: "array",
    });
  }

  const closes = chart.quotes
    .filter((quote): quote is typeof quote & { close: number } => typeof quote.close === "number")
    .map((quote) => quote.close);
  const price = chart.meta.regularMarketPrice ?? closes.at(-1) ?? 0;
  const previousClose = chart.meta.chartPreviousClose ?? chart.meta.previousClose ?? closes.at(-2) ?? price;
  const change = price - previousClose;

  if (closes.length < 10) throw new Error(`${symbol} does not have enough daily data`);

  // Yahoo's latest daily candle tracks the current session. Replace its close
  // with the latest market price so the moving averages remain current intraday.
  const liveCloses = [...closes];
  liveCloses[liveCloses.length - 1] = price;

  return {
    symbol,
    name: config.name,
    englishName: config.englishName,
    kind: config.kind,
    price,
    previousClose,
    change,
    changePercent: previousClose ? (change / previousClose) * 100 : 0,
    currency: chart.meta.currency,
    exchange: chart.meta.exchangeName,
    marketState: typeof chart.meta.marketState === "string" ? chart.meta.marketState : "CLOSED",
    ma5: average(liveCloses.slice(-5)),
    ma10: average(liveCloses.slice(-10)),
  };
}

export async function getMarkets(): Promise<MarketResponse> {
  const markets = await Promise.all(MARKETS.map((market) => loadMarket(market)));
  return { markets, updatedAt: new Date().toISOString(), delayed: true };
}
