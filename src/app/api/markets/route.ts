import { getMarkets } from "@/lib/market-data";
import type { Timeframe } from "@/lib/market-types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const value = new URL(request.url).searchParams.get("timeframe");
  const timeframe: Timeframe = value === "10m" ? "10m" : "5m";

  try {
    return Response.json(await getMarkets(timeframe), {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" },
    });
  } catch (error) {
    console.error("Unable to load market data", error);
    return Response.json({ message: "行情暂时不可用，请稍后重试。" }, { status: 503 });
  }
}
