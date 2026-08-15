import type { MarketItem } from "@/lib/market-types";
import "./MarketTable.scss";

const formatter = new Intl.NumberFormat("zh-CN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function marketStatus(state: string) {
  return ["REGULAR", "PRE", "POST", "PREPRE", "POSTPOST"].includes(state) ? "交易中" : "已休市";
}

function AverageCell({ average, price }: { average: number; price: number }) {
  const distance = average ? ((price - average) / average) * 100 : 0;
  const above = distance >= 0;
  return (
    <td className="market-table__average">
      <strong>{formatter.format(average)}</strong>
      <span className={above ? "is-up" : "is-down"}>{above ? "现价高于" : "现价低于"} {Math.abs(distance).toFixed(2)}%</span>
    </td>
  );
}

export default function MarketTable({ markets }: { markets: MarketItem[] }) {
  return (
    <div className="market-table__frame">
      <table className="market-table">
        <thead>
          <tr>
            <th>市场 / MARKET</th>
            <th>现价 / LAST</th>
            <th>M5 <small>5 日均价</small></th>
            <th>M10 <small>10 日均价</small></th>
            <th>状态 / STATUS</th>
          </tr>
        </thead>
        <tbody>
          {markets.map((market, index) => {
            const positive = market.change >= 0;
            const status = marketStatus(market.marketState);
            return (
              <tr key={market.symbol}>
                <td className="market-table__market">
                  <span>0{index + 1}</span>
                  <div><strong>{market.name}</strong><small>{market.englishName} · {market.symbol}</small></div>
                </td>
                <td className="market-table__price">
                  <strong><small>{market.currency}</small>{formatter.format(market.price)}</strong>
                  <span className={positive ? "is-up" : "is-down"}>{positive ? "+" : ""}{formatter.format(market.change)} · {positive ? "+" : ""}{market.changePercent.toFixed(2)}%</span>
                </td>
                <AverageCell average={market.ma5} price={market.price} />
                <AverageCell average={market.ma10} price={market.price} />
                <td className="market-table__status"><span className={status === "交易中" ? "is-open" : ""}>{status}</span><small>{market.exchange}</small></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
