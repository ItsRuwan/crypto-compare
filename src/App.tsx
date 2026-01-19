import { useState, useEffect, useCallback, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { subMonths } from 'date-fns';
import { useTopCoins } from './hooks/useCoinGecko';
import { AssetSearch } from './components/AssetSearch';
import { PinnedAssets } from './components/PinnedAssets';
import { ComparisonAssets } from './components/ComparisonAssets';
import { DatePicker } from './components/DatePicker';
import { PriceChart } from './components/PriceChart';
import { PriceTable } from './components/PriceTable';
import { getColor, normalizePrices } from './utils/priceUtils';
import type { Coin, SelectedAsset } from './types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const MAX_PINNED = 4;
const DEFAULT_PINNED_IDS = ['bitcoin', 'ethereum'];
const API_BASE = 'https://api.coingecko.com/api/v3';
const REQUEST_DELAY = 6000; // 6 seconds between requests to avoid rate limiting

// Helper to fetch with retry on rate limit
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url);
    if (response.status === 429) {
      console.log(`Rate limited, waiting ${(i + 1) * 10} seconds...`);
      await new Promise(r => setTimeout(r, (i + 1) * 10000));
      continue;
    }
    return response;
  }
  throw new Error('Rate limited after retries');
}

type ChartMode = 'price' | 'marketCap';

function CryptoCompareApp() {
  const [selectedAssets, setSelectedAssets] = useState<SelectedAsset[]>([]);
  const [referenceDate, setReferenceDate] = useState<Date | null>(() => subMonths(new Date(), 1));
  const [isNormalized, setIsNormalized] = useState(true);
  const [chartMode, setChartMode] = useState<ChartMode>('price');
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [priceChartData, setPriceChartData] = useState<Map<string, [number, number][]>>(new Map());
  const [marketCapChartData, setMarketCapChartData] = useState<Map<string, [number, number][]>>(new Map());
  const [historicalPrices, setHistoricalPrices] = useState<Map<string, number>>(new Map());

  // Use refs to track current fetch state
  const currentDateRef = useRef<string | null>(null);
  const fetchedCoinsRef = useRef<Set<string>>(new Set());

  const { data: coins = [], isLoading: isLoadingCoins, error: coinsError } = useTopCoins();

  // Pre-pin default coins when coins load
  useEffect(() => {
    if (coins.length > 0 && selectedAssets.length === 0) {
      const defaultCoins = coins.filter((c) => DEFAULT_PINNED_IDS.includes(c.id));
      if (defaultCoins.length > 0) {
        const initialAssets: SelectedAsset[] = defaultCoins.map((coin, index) => ({
          coin,
          isPinned: true,
          color: getColor(index),
          visible: true,
        }));
        setSelectedAssets(initialAssets);
      }
    }
  }, [coins]);

  // Reset fetched coins when date changes
  useEffect(() => {
    const dateKey = referenceDate?.toISOString() ?? '';
    if (currentDateRef.current !== dateKey) {
      currentDateRef.current = dateKey;
      fetchedCoinsRef.current = new Set();
      setHistoricalPrices(new Map());
      setPriceChartData(new Map());
      setMarketCapChartData(new Map());
    }
  }, [referenceDate]);

  // Fetch data for assets
  useEffect(() => {
    if (!referenceDate || selectedAssets.length === 0) return;

    const assetsToFetch = selectedAssets.filter(
      (a) => !fetchedCoinsRef.current.has(a.coin.id)
    );

    if (assetsToFetch.length === 0) return;

    let cancelled = false;
    setIsLoadingPrices(true);

    async function fetchData() {
      const today = new Date();
      const dateStr = `${referenceDate!.getDate().toString().padStart(2, '0')}-${(referenceDate!.getMonth() + 1).toString().padStart(2, '0')}-${referenceDate!.getFullYear()}`;
      const fromTimestamp = Math.floor(referenceDate!.getTime() / 1000);
      const toTimestamp = Math.floor(today.getTime() / 1000);

      for (const asset of assetsToFetch) {
        if (cancelled) return;

        const coinId = asset.coin.id;

        // Mark as being fetched
        fetchedCoinsRef.current.add(coinId);

        try {
          // Fetch historical price
          console.log(`Fetching historical price for ${coinId}...`);
          const histResponse = await fetchWithRetry(
            `${API_BASE}/coins/${coinId}/history?date=${dateStr}`
          );

          if (histResponse.ok) {
            const histData = await histResponse.json();
            const price = histData.market_data?.current_price?.usd;
            if (price != null && !cancelled) {
              setHistoricalPrices((prev) => new Map(prev).set(coinId, price));
              console.log(`Got historical price for ${coinId}: $${price}`);
            }
          } else {
            console.error(`Historical price API error for ${coinId}:`, histResponse.status);
          }

          // Rate limit delay
          await new Promise((r) => setTimeout(r, REQUEST_DELAY));
          if (cancelled) return;

          // Fetch chart data
          console.log(`Fetching chart data for ${coinId}...`);
          const chartResponse = await fetchWithRetry(
            `${API_BASE}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`
          );

          if (chartResponse.ok) {
            const data = await chartResponse.json();
            if (!cancelled) {
              if (data.prices) {
                setPriceChartData((prev) => new Map(prev).set(coinId, data.prices));
                console.log(`Got price chart data for ${coinId}: ${data.prices.length} points`);
              }
              if (data.market_caps) {
                setMarketCapChartData((prev) => new Map(prev).set(coinId, data.market_caps));
                console.log(`Got market cap chart data for ${coinId}: ${data.market_caps.length} points`);
              }
            }
          } else {
            console.error(`Chart API error for ${coinId}:`, chartResponse.status);
          }

          // Rate limit delay between coins
          await new Promise((r) => setTimeout(r, REQUEST_DELAY));
        } catch (error) {
          console.error(`Failed to fetch data for ${coinId}:`, error);
          // Wait extra long on error before trying next coin
          await new Promise((r) => setTimeout(r, REQUEST_DELAY * 2));
        }
      }

      if (!cancelled) {
        setIsLoadingPrices(false);
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [referenceDate, selectedAssets]);

  // Select chart data based on mode
  const chartData = chartMode === 'price' ? priceChartData : marketCapChartData;

  // Compute normalized chart data for display
  const displayChartData = isNormalized && referenceDate
    ? normalizePrices(chartData, referenceDate.getTime())
    : chartData;

  // Combine assets with their historical prices for display
  const assetsWithPrices: SelectedAsset[] = selectedAssets.map((asset) => ({
    ...asset,
    historicalPrice: historicalPrices.get(asset.coin.id),
  }));

  const pinnedAssets = assetsWithPrices.filter((a) => a.isPinned);
  const comparisonAssets = assetsWithPrices.filter((a) => !a.isPinned);
  const selectedIds = selectedAssets.map((a) => a.coin.id);

  const handleAddPinned = useCallback((coin: Coin) => {
    setSelectedAssets((prev) => {
      if (prev.filter((a) => a.isPinned).length >= MAX_PINNED) return prev;
      if (prev.some((a) => a.coin.id === coin.id)) return prev;
      return [
        ...prev,
        {
          coin,
          isPinned: true,
          color: getColor(prev.length),
          visible: true,
        },
      ];
    });
  }, []);

  const handleAddComparison = useCallback((coin: Coin) => {
    setSelectedAssets((prev) => {
      if (prev.some((a) => a.coin.id === coin.id)) return prev;
      return [
        ...prev,
        {
          coin,
          isPinned: false,
          color: getColor(prev.length),
          visible: true,
        },
      ];
    });
  }, []);

  const handleRemoveAsset = useCallback((coinId: string) => {
    setSelectedAssets((prev) => prev.filter((a) => a.coin.id !== coinId));
    setPriceChartData((prev) => {
      const newData = new Map(prev);
      newData.delete(coinId);
      return newData;
    });
    setMarketCapChartData((prev) => {
      const newData = new Map(prev);
      newData.delete(coinId);
      return newData;
    });
    setHistoricalPrices((prev) => {
      const newData = new Map(prev);
      newData.delete(coinId);
      return newData;
    });
    fetchedCoinsRef.current.delete(coinId);
  }, []);

  const handleToggleVisibility = useCallback((coinId: string) => {
    setSelectedAssets((prev) =>
      prev.map((a) => (a.coin.id === coinId ? { ...a, visible: !a.visible } : a))
    );
  }, []);

  if (coinsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-900/50 text-red-200 px-6 py-4 rounded-lg">
          Failed to load cryptocurrency data. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Crypto Price Comparison</h1>
          <p className="text-gray-400">
            Compare cryptocurrency prices at any historical date
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Date Selection</h2>
            <DatePicker
              selectedDate={referenceDate}
              onDateChange={setReferenceDate}
              label="Historical Date"
            />
            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNormalized}
                  onChange={(e) => setIsNormalized(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-gray-900"
                />
                <span className="text-sm text-gray-300">
                  Normalize prices (index to 100)
                </span>
              </label>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">
              Reference Assets ({pinnedAssets.length}/{MAX_PINNED})
            </h2>
            <AssetSearch
              coins={coins}
              selectedIds={selectedIds}
              onSelect={handleAddPinned}
              placeholder="Search to pin reference asset..."
              disabled={isLoadingCoins || pinnedAssets.length >= MAX_PINNED}
            />
            {isLoadingCoins && (
              <p className="text-gray-500 text-sm mt-2">Loading coins...</p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Comparison Assets</h2>
            <AssetSearch
              coins={coins}
              selectedIds={selectedIds}
              onSelect={handleAddComparison}
              placeholder="Search to add comparison asset..."
              disabled={isLoadingCoins}
            />
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Reference Assets</h2>
          <PinnedAssets
            assets={pinnedAssets}
            onRemove={handleRemoveAsset}
            onToggleVisibility={handleToggleVisibility}
          />
        </div>

        {comparisonAssets.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Comparison Assets</h2>
            <ComparisonAssets
              assets={comparisonAssets}
              onRemove={handleRemoveAsset}
              onToggleVisibility={handleToggleVisibility}
            />
          </div>
        )}

        {isLoadingPrices && (
          <div className="mb-4 p-4 bg-blue-900/30 border border-blue-700 rounded-lg">
            <div className="flex items-center gap-2 text-blue-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="font-medium">Loading price data...</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Using CoinGecko free API with rate limits. Each coin takes ~12 seconds to load.
              Check the browser console for progress.
            </p>
          </div>
        )}

        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <h2 className="text-lg font-semibold">
              {chartMode === 'price' ? 'Price' : 'Market Cap'} Comparison Chart
              {isNormalized && (
                <span className="text-sm font-normal text-gray-400 ml-2">
                  (Normalized to 100 at reference date)
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setChartMode('price')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  chartMode === 'price'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Price
              </button>
              <button
                onClick={() => setChartMode('marketCap')}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  chartMode === 'marketCap'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Market Cap
              </button>
            </div>
          </div>
          <PriceChart
            assets={assetsWithPrices}
            priceData={displayChartData}
            isNormalized={isNormalized}
            chartMode={chartMode}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Price Comparison Table</h2>
          <PriceTable assets={assetsWithPrices} />
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CryptoCompareApp />
    </QueryClientProvider>
  );
}

export default App;
