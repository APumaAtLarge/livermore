import type { PricePoint } from "@/lib/market-types";
import "./Sparkline.scss";

export default function Sparkline({ points, positive }: { points: PricePoint[]; positive: boolean }) {
  if (points.length < 2) return <div className="sparkline sparkline--empty">暂无走势</div>;

  const values = points.map((point) => point.price);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const coords = values.map((value, index) => {
    const x = (index / (values.length - 1)) * 100;
    const y = 8 + ((max - value) / range) * 66;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const area = `0,88 ${coords.join(" ")} 100,88`;

  return (
    <div className={`sparkline ${positive ? "sparkline--up" : "sparkline--down"}`} aria-label="日内价格走势">
      <svg viewBox="0 0 100 90" preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id={`fade-${positive ? "up" : "down"}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity=".24" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={area} fill={`url(#fade-${positive ? "up" : "down"})`} />
        <polyline points={coords.join(" ")} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
        <circle cx={coords.at(-1)?.split(",")[0]} cy={coords.at(-1)?.split(",")[1]} r="2.2" fill="currentColor" />
      </svg>
    </div>
  );
}
