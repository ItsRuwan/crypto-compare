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
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card p-8 text-center max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(255,42,109,0.2)] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#ff2a6d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2 neon-text-pink">Connection Failed</h2>
          <p className="text-[#e0e0ff]/60">
            Failed to load cryptocurrency data. Please check your connection and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-12 animate-slide-up">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-2 h-12 bg-gradient-to-b from-[#05d9e8] via-[#d300c5] to-[#ff2a6d] rounded-full" />
            <div>
              <h1 className="text-4xl font-bold tracking-wider">
                <span className="neon-text-cyan">CRYPTO</span>
                <span className="text-[#e0e0ff]"> PULSE</span>
              </h1>
              <p className="text-[#e0e0ff]/50 text-sm tracking-[0.3em] uppercase mt-1">
                Historical Price Analysis Terminal
              </p>
            </div>
          </div>
          <div className="divider-neon" />
        </header>

        {/* Control Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          {/* Date Selection */}
          <div className="glass-card p-6 animate-slide-up stagger-1" style={{ opacity: 0 }}>
            <h2 className="section-header">Temporal Reference</h2>
            <DatePicker
              selectedDate={referenceDate}
              onDateChange={setReferenceDate}
              label="Historical Date"
            />
          </div>

          {/* Reference Assets */}
          <div className="glass-card p-6 animate-slide-up stagger-2" style={{ opacity: 0 }}>
            <h2 className="section-header">
              Reference Assets
              <span className="ml-auto text-[#ff2a6d] text-xs">
                {pinnedAssets.length}/{MAX_PINNED}
              </span>
            </h2>
            <AssetSearch
              coins={coins}
              selectedIds={selectedIds}
              onSelect={handleAddPinned}
              placeholder="Search to pin reference asset..."
              disabled={isLoadingCoins || pinnedAssets.length >= MAX_PINNED}
            />
            {isLoadingCoins && (
              <div className="mt-3 flex items-center gap-2 text-[#05d9e8] text-sm">
                <div className="w-4 h-4 border-2 border-[#05d9e8] border-t-transparent rounded-full animate-spin" />
                <span>Syncing market data...</span>
              </div>
            )}
          </div>

          {/* Comparison Assets */}
          <div className="glass-card p-6 animate-slide-up stagger-3" style={{ opacity: 0 }}>
            <h2 className="section-header">Comparison Assets</h2>
            <AssetSearch
              coins={coins}
              selectedIds={selectedIds}
              onSelect={handleAddComparison}
              placeholder="Search to add comparison..."
              disabled={isLoadingCoins}
            />
          </div>
        </div>

        {/* Pinned Assets Display */}
        {pinnedAssets.length > 0 && (
          <div className="mb-8 animate-slide-up stagger-4" style={{ opacity: 0 }}>
            <h2 className="section-header">Reference Assets</h2>
            <PinnedAssets
              assets={pinnedAssets}
              onRemove={handleRemoveAsset}
              onToggleVisibility={handleToggleVisibility}
            />
          </div>
        )}

        {/* Comparison Assets Display */}
        {comparisonAssets.length > 0 && (
          <div className="mb-8 animate-fade-in">
            <h2 className="section-header">Comparison Assets</h2>
            <ComparisonAssets
              assets={comparisonAssets}
              onRemove={handleRemoveAsset}
              onToggleVisibility={handleToggleVisibility}
            />
          </div>
        )}

        {/* Loading Indicator */}
        {isLoadingPrices && (
          <div className="mb-8 glass-card p-6 animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 border-2 border-[#05d9e8]/30 rounded-full" />
                <div className="absolute inset-0 border-2 border-[#05d9e8] border-t-transparent rounded-full animate-spin" />
                <div className="absolute inset-2 border-2 border-[#ff2a6d] border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              </div>
              <div>
                <h3 className="font-bold text-[#05d9e8]">Fetching Price Data</h3>
                <p className="text-sm text-[#e0e0ff]/50">
                  Synchronizing with CoinGecko API... Each asset takes ~12 seconds due to rate limits.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chart Section */}
        <div className="mb-12">
          {/* Chart Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold">
                {chartMode === 'price' ? 'Price' : 'Market Cap'} Analysis
              </h2>
              {isNormalized && (
                <p className="text-sm text-[#e0e0ff]/50 mt-1">
                  Normalized to index 100 at reference date
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Normalization Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[rgba(10,0,20,0.5)] border border-[rgba(5,217,232,0.2)]">
                <button
                  onClick={() => setIsNormalized(true)}
                  className={`btn-neon px-4 py-2 text-xs ${isNormalized ? 'btn-neon-active' : 'btn-neon-cyan'}`}
                >
                  Normalized
                </button>
                <button
                  onClick={() => setIsNormalized(false)}
                  className={`btn-neon px-4 py-2 text-xs ${!isNormalized ? 'btn-neon-active' : 'btn-neon-cyan'}`}
                >
                  Actual $
                </button>
              </div>

              {/* Chart Mode Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-[rgba(10,0,20,0.5)] border border-[rgba(255,42,109,0.2)]">
                <button
                  onClick={() => setChartMode('price')}
                  className={`btn-neon px-4 py-2 text-xs ${chartMode === 'price' ? 'btn-neon-active' : 'btn-neon-pink'}`}
                >
                  Price
                </button>
                <button
                  onClick={() => setChartMode('marketCap')}
                  className={`btn-neon px-4 py-2 text-xs ${chartMode === 'marketCap' ? 'btn-neon-active' : 'btn-neon-pink'}`}
                >
                  Market Cap
                </button>
              </div>
            </div>
          </div>

          {/* Chart */}
          <PriceChart
            assets={assetsWithPrices}
            priceData={displayChartData}
            isNormalized={isNormalized}
            chartMode={chartMode}
          />
        </div>

        {/* Data Table */}
        <div className="mb-8">
          <h2 className="section-header mb-6">Price Matrix</h2>
          <PriceTable assets={assetsWithPrices} />
        </div>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-[rgba(5,217,232,0.1)]">
          <p className="text-[#e0e0ff]/30 text-sm tracking-wider">
            CRYPTO PULSE // DATA FROM COINGECKO API
          </p>
        </footer>
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
