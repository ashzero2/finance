// ── Types ──

export interface PortfolioSuggestion {
  title: string;
  description: string;
  suggestedSearch: string;
  icon: string;
  color: string;
}

interface AssetInput {
  name: string;
  category: string;
  subCategory: string | null;
  currentValue: string;
}

// ── Suggestion Engine ──

export function getPortfolioSuggestions(assets: AssetInput[]): PortfolioSuggestion[] {
  const suggestions: PortfolioSuggestion[] = [];

  const investments = assets.filter((a) => a.category === "investment");
  const totalInvested = investments.reduce((s, a) => s + Number(a.currentValue), 0);

  // Collect subCategories present
  const subCats = new Set(investments.map((a) => a.subCategory).filter(Boolean));
  const names = investments.map((a) => a.name.toLowerCase()).join(" ");

  // 1. No investments at all
  if (investments.length === 0) {
    suggestions.push({
      title: "Start Investing",
      description: "You have no investment assets yet. Consider starting with index funds or gold ETFs for long-term growth.",
      suggestedSearch: "nifty 50",
      icon: "trending-up",
      color: "#60A5FA",
    });
    return suggestions.slice(0, 3);
  }

  // 2. No gold/commodity exposure
  const hasGold = subCats.has("gold") || names.includes("gold") || names.includes("silver");
  if (!hasGold && totalInvested > 0) {
    suggestions.push({
      title: "Add Gold Exposure",
      description: "Gold acts as a hedge against inflation and market volatility. Consider gold ETFs like GOLDBEES.",
      suggestedSearch: "gold etf",
      icon: "shield",
      color: "#FBBF24",
    });
  }

  // 3. Only one type of investment (e.g. all MFs)
  if (subCats.size === 1 && investments.length >= 2) {
    const onlyType = Array.from(subCats)[0];
    if (onlyType === "mf") {
      suggestions.push({
        title: "Diversify Beyond Mutual Funds",
        description: "All your investments are in mutual funds. Consider ETFs for lower expense ratios or direct stocks.",
        suggestedSearch: "nifty etf",
        icon: "layers",
        color: "#60A5FA",
      });
    } else if (onlyType === "stocks") {
      suggestions.push({
        title: "Add Mutual Funds",
        description: "Mutual funds provide professional management and diversification. Consider SIPs in index funds.",
        suggestedSearch: "index fund direct growth",
        icon: "layers",
        color: "#A78BFA",
      });
    } else if (onlyType === "etf") {
      suggestions.push({
        title: "Consider Direct Stocks",
        description: "You only have ETFs. Adding select blue-chip stocks could improve returns with focused exposure.",
        suggestedSearch: "hdfc bank",
        icon: "trending-up",
        color: "#34D399",
      });
    }
  }

  // 4. No international exposure
  const hasInternational = names.includes("international") || names.includes("nasdaq") ||
    names.includes("us ") || names.includes("global") || names.includes("s&p 500") ||
    names.includes("world") || names.includes("overseas");
  if (!hasInternational && totalInvested > 50000) {
    suggestions.push({
      title: "Add International Exposure",
      description: "Diversify geographically with US or global funds. This reduces country-specific risk.",
      suggestedSearch: "nasdaq fund",
      icon: "target",
      color: "#60A5FA",
    });
  }

  // 5. No debt instruments (FD, PPF, debt MFs)
  const hasDebt = subCats.has("fd") || subCats.has("ppf") ||
    names.includes("debt") || names.includes("liquid") || names.includes("fixed deposit") ||
    names.includes("ppf") || names.includes("bonds");
  const hasOnlyEquity = !hasDebt && (subCats.has("stocks") || subCats.has("mf") || subCats.has("etf"));
  if (hasOnlyEquity && investments.length >= 2) {
    suggestions.push({
      title: "Add Debt Instruments",
      description: "Your portfolio is 100% equity. Adding FDs, PPF, or liquid funds provides stability during downturns.",
      suggestedSearch: "liquid fund direct",
      icon: "lock",
      color: "#8B8B96",
    });
  }

  // 6. No crypto exposure (optional suggestion for larger portfolios)
  const hasCrypto = subCats.has("crypto") || names.includes("bitcoin") || names.includes("crypto");
  if (!hasCrypto && totalInvested > 200000 && suggestions.length < 3) {
    suggestions.push({
      title: "Explore Digital Assets",
      description: "A small allocation (2-5%) to crypto can add growth potential. Only invest what you can afford to lose.",
      suggestedSearch: "crypto",
      icon: "zap",
      color: "#FB923C",
    });
  }

  return suggestions.slice(0, 3);
}