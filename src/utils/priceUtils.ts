// Chart colors for different assets
export const CHART_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f97316', // orange
  '#6366f1', // indigo
];

export function getColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// Format price with appropriate decimal places
export function formatPrice(price: number | null | undefined): string {
  if (price == null) return 'N/A';

  if (price >= 1000) {
    return `$${price.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  } else if (price >= 1) {
    return `$${price.toFixed(2)}`;
  } else if (price >= 0.01) {
    return `$${price.toFixed(4)}`;
  } else {
    return `$${price.toFixed(8)}`;
  }
}

// Calculate percentage change between two prices
export function calculateChange(
  historicalPrice: number | null | undefined,
  currentPrice: number | null | undefined
): number | null {
  if (historicalPrice == null || currentPrice == null || historicalPrice === 0) {
    return null;
  }
  return ((currentPrice - historicalPrice) / historicalPrice) * 100;
}

// Format percentage with sign
export function formatPercentage(change: number | null): string {
  if (change == null) return 'N/A';
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}

// Normalize prices to index 100 at a reference point
export function normalizePrices(
  prices: Map<string, [number, number][]>,
  referenceTimestamp: number
): Map<string, [number, number][]> {
  const normalized = new Map<string, [number, number][]>();

  prices.forEach((priceData, coinId) => {
    // Find the price closest to the reference timestamp
    let referencePrice: number | null = null;
    let minDiff = Infinity;

    for (const [timestamp, price] of priceData) {
      const diff = Math.abs(timestamp - referenceTimestamp);
      if (diff < minDiff) {
        minDiff = diff;
        referencePrice = price;
      }
    }

    if (referencePrice && referencePrice > 0) {
      const normalizedData = priceData.map(([timestamp, price]) => [
        timestamp,
        (price / referencePrice!) * 100,
      ] as [number, number]);
      normalized.set(coinId, normalizedData);
    }
  });

  return normalized;
}

// Format large numbers (for market cap display)
export function formatLargeNumber(num: number): string {
  if (num >= 1e12) {
    return `$${(num / 1e12).toFixed(2)}T`;
  } else if (num >= 1e9) {
    return `$${(num / 1e9).toFixed(2)}B`;
  } else if (num >= 1e6) {
    return `$${(num / 1e6).toFixed(2)}M`;
  } else {
    return `$${num.toLocaleString()}`;
  }
}
