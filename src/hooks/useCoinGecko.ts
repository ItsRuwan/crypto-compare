import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { Coin, CoinGeckoHistoryResponse, CoinGeckoMarketChartResponse } from '../types';

const BASE_URL = 'https://api.coingecko.com/api/v3';

// Simple rate limiting - delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1500; // 1.5 seconds between requests

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await delay(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
  }

  lastRequestTime = Date.now();
  const response = await fetch(url);

  if (response.status === 429) {
    // Rate limited - wait and retry
    await delay(60000);
    return rateLimitedFetch(url);
  }

  return response;
}

// Fetch top 100 coins by market cap
export function useTopCoins() {
  return useQuery({
    queryKey: ['topCoins'],
    queryFn: async (): Promise<Coin[]> => {
      const response = await rateLimitedFetch(
        `${BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch coins');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes (formerly cacheTime)
  });
}

// Fetch historical price for a specific coin on a specific date
export function useHistoricalPrice(coinId: string, date: Date | null) {
  const dateStr = date ? format(date, 'dd-MM-yyyy') : null;

  return useQuery({
    queryKey: ['historicalPrice', coinId, dateStr],
    queryFn: async (): Promise<number | null> => {
      if (!dateStr) return null;

      const response = await rateLimitedFetch(
        `${BASE_URL}/coins/${coinId}/history?date=${dateStr}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Coin didn't exist on this date
        }
        throw new Error('Failed to fetch historical price');
      }

      const data: CoinGeckoHistoryResponse = await response.json();
      return data.market_data?.current_price?.usd ?? null;
    },
    enabled: !!coinId && !!dateStr,
    staleTime: Infinity, // Historical data never changes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

// Fetch price range for chart data
export function usePriceRange(coinId: string, fromDate: Date | null, toDate: Date | null) {
  const fromTimestamp = fromDate ? Math.floor(fromDate.getTime() / 1000) : null;
  const toTimestamp = toDate ? Math.floor(toDate.getTime() / 1000) : null;

  return useQuery({
    queryKey: ['priceRange', coinId, fromTimestamp, toTimestamp],
    queryFn: async (): Promise<[number, number][]> => {
      if (!fromTimestamp || !toTimestamp) return [];

      const response = await rateLimitedFetch(
        `${BASE_URL}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch price range');
      }

      const data: CoinGeckoMarketChartResponse = await response.json();
      return data.prices;
    },
    enabled: !!coinId && !!fromTimestamp && !!toTimestamp,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

// Batch fetch historical prices for multiple coins
export async function fetchHistoricalPrices(
  coinIds: string[],
  date: Date
): Promise<Map<string, number | null>> {
  const dateStr = format(date, 'dd-MM-yyyy');
  const results = new Map<string, number | null>();

  for (const coinId of coinIds) {
    try {
      const response = await rateLimitedFetch(
        `${BASE_URL}/coins/${coinId}/history?date=${dateStr}`
      );

      if (!response.ok) {
        results.set(coinId, null);
        continue;
      }

      const data: CoinGeckoHistoryResponse = await response.json();
      results.set(coinId, data.market_data?.current_price?.usd ?? null);
    } catch {
      results.set(coinId, null);
    }
  }

  return results;
}
