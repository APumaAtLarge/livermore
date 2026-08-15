import type { MarketItem } from "@/lib/market-types";
import Sparkline from "../Sparkline/Sparkline";
import "./MarketCard.scss";

const formatter = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function marketStatus(state: string) {
  if (["REGULAR", "PRE", "POST", "PREPRE", "POSTPOST"].includes(state)) return "交易中";
  return "已休市";
}

export default function MarketCard({ market, index }: { market: MarketItem; index: number }) {
  const positive = market.change >= 0;
  return (
    <article className={`market-card market-card--${market.kind}`}>
      <header className="market-card__header">
        <span className="market-card__index">0{index + 1}</span>
        <div>
          <h2>{market.name}</h2>
          <p>{market.englishName} · {market.symbol}</p>
        </div>
        <span className={`market-card__status ${marketStatus(market.marketState) === "交易中" ? "is-open" : ""}`}>
          {marketStatus(market.marketState)}
        </span>
      </header>

      <div className="market-card__quote">
        <div>
          <span className="market-card__currency">{market.currency}</span>
          <strong>{formatter.format(market.price)}</strong>
        </div>
        <div className={`market-card__change ${positive ? "is-up" : "is-down"}`}>
          <span>{positive ? "+" : ""}{formatter.format(market.change)}</span>
          <b>{positive ? "↗" : "↘"} {Math.abs(market.changePercent).toFixed(2)}%</b>
        </div>
      </div>

      <Sparkline points={market.points} positive={positive} />
      <footer className="market-card__footer">
        <span>昨收 <b>{formatter.format(market.previousClose)}</b></span>
        <span>{market.exchange}</span>
      </footer>
    </article>
  );
}
