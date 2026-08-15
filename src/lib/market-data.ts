import YahooFinance from "yahoo-finance2";
import type { MarketItem, MarketResponse, PricePoint, Timeframe } from "./market-types";

const yahooFinance = new YahooFinance({ queue: { concurrency: 2, interval: 100 } });

const MARKETS = [
  { symbol: "XAUUSD=X", fallback: "GC=F", name: "伦敦金现", englishName: "Spot Gold", kind: "metal" as const },
  { symbol: "BZ=F", name: "布伦特原油", englishName: "Brent Crude", kind: "energy" as const },
  { symbol: "^NDX", name: "纳斯达克 100", englishName: "Nasdaq 100", kind: "index" as const },
  { symbol: "^GSPC", name: "标普 500", englishName: "S&P 500", kind: "index" as const },
];

function aggregate(points: PricePoint[], timeframe: Timeframe) {
  if (timeframe === "5m") return points;
  return points.filter((_, index) => index % 2 === 1 || index === points.length - 1);
}

async function loadMarket(config: (typeof MARKETS)[number], timeframe: Timeframe): Promise<MarketItem> {
  let symbol = config.symbol;
  let chart;
  try {
    chart = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - 30 * 60 * 60 * 1000),
      interval: "5m",
      return: "array",
    });
  } catch (error) {
    if (!("fallback" in config) || !config.fallback) throw error;
    symbol = config.fallback;
    chart = await yahooFinance.chart(symbol, {
      period1: new Date(Date.now() - 30 * 60 * 60 * 1000),
      interval: "5m",
      return: "array",
    });
  }

  const points = chart.quotes
    .filter((quote): quote is typeof quote & { close: number } => typeof quote.close === "number")
    .slice(-48)
    .map((quote) => ({ time: quote.date.toISOString(), price: quote.close }));
  const price = chart.meta.regularMarketPrice ?? points.at(-1)?.price ?? 0;
  const previousClose = chart.meta.chartPreviousClose ?? chart.meta.previousClose ?? points.at(0)?.price ?? price;
  const change = price - previousClose;

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
    points: aggregate(points, timeframe),
  };
}

export async function getMarkets(timeframe: Timeframe): Promise<MarketResponse> {
  const markets = await Promise.all(MARKETS.map((market) => loadMarket(market, timeframe)));
  return { markets, updatedAt: new Date().toISOString(), delayed: true };
}
