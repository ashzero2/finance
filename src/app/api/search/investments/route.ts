import { NextRequest, NextResponse } from "next/server";

// ── Types ──

interface InvestmentSuggestion {
  name: string;
  type: "stock" | "etf" | "mf";
  exchange?: string | null;
  symbol?: string;
  schemeCode?: string;
  source: "groww" | "mfapi";
}

interface GrowwItem {
  title: string;
  entity_type: string;
  nse_scrip_code: string | null;
  bse_scrip_code: string | null;
  scheme_code: string | null;
  company_short_name: string | null;
}

interface MFAPIItem {
  schemeCode: number;
  schemeName: string;
}

// ── In-memory cache ──

const cache = new Map<string, { data: InvestmentSuggestion[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): InvestmentSuggestion[] | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  if (entry) cache.delete(key);
  return null;
}

function setCache(key: string, data: InvestmentSuggestion[]) {
  // Keep cache small — evict old entries if > 200
  if (cache.size > 200) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { data, ts: Date.now() });
}

// ── External API fetchers ──

async function fetchGroww(query: string): Promise<InvestmentSuggestion[]> {
  try {
    const url = `https://groww.in/v1/api/search/v1/entity?app=false&entity_type=scheme,stock,etf&page=0&q=${encodeURIComponent(query)}&size=10`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items: GrowwItem[] = data?.content || [];

    return items.map((item) => {
      const entityType = item.entity_type?.toLowerCase() || "";
      let type: "stock" | "etf" | "mf" = "stock";
      if (entityType === "etf") type = "etf";
      else if (entityType === "scheme") type = "mf";

      const exchange = item.nse_scrip_code ? "NSE" : item.bse_scrip_code ? "BSE" : null;
      const symbol = item.nse_scrip_code || item.bse_scrip_code || item.company_short_name || undefined;

      return {
        name: item.title,
        type,
        exchange,
        symbol: symbol || undefined,
        schemeCode: item.scheme_code || undefined,
        source: "groww" as const,
      };
    });
  } catch {
    return [];
  }
}

async function fetchMFAPI(query: string): Promise<InvestmentSuggestion[]> {
  try {
    const url = `https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const items: MFAPIItem[] = await res.json();
    if (!Array.isArray(items)) return [];

    return items.slice(0, 10).map((item) => {
      const nameUpper = item.schemeName.toUpperCase();
      const isETF = nameUpper.includes("ETF") || nameUpper.includes("EXCHANGE TRADED");
      return {
        name: item.schemeName,
        type: isETF ? "etf" as const : "mf" as const,
        schemeCode: String(item.schemeCode),
        source: "mfapi" as const,
      };
    });
  } catch {
    return [];
  }
}

// ── Deduplication ──

function dedup(results: InvestmentSuggestion[]): InvestmentSuggestion[] {
  const seen = new Map<string, InvestmentSuggestion>();
  for (const r of results) {
    const key = r.name.toLowerCase().replace(/\s+/g, " ").trim();
    // Prefer Groww results (they have exchange info)
    if (!seen.has(key) || (r.source === "groww" && seen.get(key)?.source === "mfapi")) {
      seen.set(key, r);
    }
  }
  return Array.from(seen.values());
}

// ── Main handler ──

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() || "";
  const typeFilter = searchParams.get("type") || "all"; // all | stock | etf | mf

  if (query.length < 2) {
    return NextResponse.json({ query, results: [] });
  }

  const cacheKey = `${query.toLowerCase()}:${typeFilter}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json({ query, results: cached });
  }

  // Fan out to both APIs in parallel
  const [growwResults, mfapiResults] = await Promise.all([
    fetchGroww(query),
    fetchMFAPI(query),
  ]);

  // Combine: Groww first (has richer data), then MFAPI
  let combined = dedup([...growwResults, ...mfapiResults]);

  // Apply type filter
  if (typeFilter !== "all") {
    combined = combined.filter((r) => r.type === typeFilter);
  }

  // Sort: exact name matches first, then alphabetical
  const queryLower = query.toLowerCase();
  combined.sort((a, b) => {
    const aExact = a.name.toLowerCase().startsWith(queryLower) ? 0 : 1;
    const bExact = b.name.toLowerCase().startsWith(queryLower) ? 0 : 1;
    if (aExact !== bExact) return aExact - bExact;
    return a.name.localeCompare(b.name);
  });

  // Limit results
  const results = combined.slice(0, 15);

  setCache(cacheKey, results);

  return NextResponse.json({ query, results });
}