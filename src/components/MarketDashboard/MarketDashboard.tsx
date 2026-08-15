"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketResponse, Timeframe } from "@/lib/market-types";
import MarketCard from "../MarketCard/MarketCard";
import "./MarketDashboard.scss";

export default function MarketDashboard() {
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [data, setData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/markets?timeframe=${timeframe}`, { signal, cache: "no-store" });
      if (!response.ok) throw new Error("Market request failed");
      setData(await response.json());
      setError("");
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === "AbortError") return;
      setError("暂时无法连接行情源");
    } finally { setLoading(false); }
  }, [timeframe]);

  useEffect(() => {
    const controller = new AbortController();
    const initial = window.setTimeout(() => refresh(controller.signal), 0);
    const timer = window.setInterval(() => refresh(), 30_000);
    return () => { controller.abort(); window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refresh]);

  const updated = data ? new Intl.DateTimeFormat("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(data.updatedAt)) : "--:--:--";

  return (
    <div className="dashboard">
      <nav className="dashboard__nav">
        <a href="#top" className="dashboard__brand"><span>LM</span> LIVERMORE</a>
        <span className="dashboard__edition">GLOBAL MARKET MONITOR / CN</span>
        <time>{new Intl.DateTimeFormat("zh-CN", { month: "short", day: "2-digit", weekday: "short" }).format(new Date())}</time>
      </nav>

      <header className="dashboard__hero" id="top">
        <div><p className="dashboard__eyebrow">LIVE MARKET INTELLIGENCE</p><h1>全球市场<br/><em>一览</em></h1></div>
        <div className="dashboard__intro">
          <p>聚焦贵金属、能源与美国核心指数。<br/>数据来自 Yahoo Finance，自动更新。</p>
          <div className="dashboard__pulse"><i /> 行情监测中 <span>更新于 {updated}</span></div>
        </div>
      </header>

      <section className="dashboard__toolbar" aria-label="行情周期选择">
        <div><span>INTRADAY</span><b>分时走势</b></div>
        <div className="dashboard__tabs">
          {(["5m", "10m"] as Timeframe[]).map((frame) => <button key={frame} onClick={() => { setLoading(true); setTimeframe(frame); }} className={timeframe === frame ? "is-active" : ""}>M{frame.slice(0, -1)}</button>)}
        </div>
        <button className="dashboard__refresh" onClick={() => { setLoading(true); refresh(); }} disabled={loading}>{loading ? "同步中…" : "↻ 刷新行情"}</button>
      </section>

      {error && !data ? <div className="dashboard__error"><b>连接中断</b><span>{error}</span><button onClick={() => refresh()}>重新尝试</button></div> : null}
      <section className={`dashboard__grid ${loading && data ? "is-updating" : ""}`}>
        {data?.markets.map((market, index) => <MarketCard key={market.symbol} market={market} index={index} />)}
        {loading && !data ? Array.from({ length: 4 }, (_, index) => <div className="dashboard__skeleton" key={index} />) : null}
      </section>

      <footer className="dashboard__footer"><span>数据可能存在延迟，仅供参考，不构成投资建议。</span><b>4 MARKETS · {timeframe.toUpperCase()} INTERVAL</b></footer>
    </div>
  );
}
