import { getMarkets } from "@/lib/market-data";

export const runtime = "nodejs";

export async function GET() {
  try {
    return Response.json(await getMarkets(), {
      headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=45" },
    });
  } catch (error) {
    console.error("Unable to load market data", error);
    return Response.json({ message: "行情暂时不可用，请稍后重试。" }, { status: 503 });
  }
}
