import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Brush,
} from 'recharts';
import { format } from 'date-fns';
import type { SelectedAsset } from '../types';

interface ChartDataPoint {
  timestamp: number;
  date: string;
  [key: string]: number | string;
}

interface PriceChartProps {
  assets: SelectedAsset[];
  priceData: Map<string, [number, number][]>;
  isNormalized: boolean;
  chartMode?: 'price' | 'marketCap';
}

export function PriceChart({ assets, priceData, isNormalized, chartMode = 'price' }: PriceChartProps) {
  const visibleAssets = assets.filter((a) => a.visible);

  // Find which visible assets have data loaded
  const assetsWithData = visibleAssets.filter((a) => priceData.has(a.coin.id));
  const assetsWaitingForData = visibleAssets.filter((a) => !priceData.has(a.coin.id));

  if (assets.length === 0) {
    return (
      <div className="chart-container h-[450px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#05d9e8]/10 to-[#ff2a6d]/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#05d9e8]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <p className="text-[#e0e0ff]/40 text-lg">Add assets to visualize price data</p>
        </div>
      </div>
    );
  }

  if (visibleAssets.length === 0) {
    return (
      <div className="chart-container h-[450px] flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-[#d300c5]/10 to-[#ff2a6d]/10 flex items-center justify-center">
            <svg className="w-10 h-10 text-[#d300c5]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
          </div>
          <p className="text-[#e0e0ff]/40 text-lg">Toggle asset visibility to show chart</p>
        </div>
      </div>
    );
  }

  if (assetsWithData.length === 0) {
    return (
      <div className="chart-container h-[450px] flex flex-col items-center justify-center">
        <div className="relative w-24 h-24 mb-6">
          <div className="absolute inset-0 border-2 border-[#05d9e8]/20 rounded-full" />
          <div className="absolute inset-0 border-2 border-[#05d9e8] border-t-transparent rounded-full animate-spin" />
          <div className="absolute inset-3 border-2 border-[#ff2a6d]/50 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          <div className="absolute inset-6 border-2 border-[#d300c5]/30 border-t-transparent rounded-full animate-spin" style={{ animationDuration: '2s' }} />
        </div>
        <p className="text-[#05d9e8] text-lg font-semibold mb-2">Synchronizing Data</p>
        <p className="text-[#e0e0ff]/40 text-sm">
          Loading: {assetsWaitingForData.map(a => a.coin.symbol.toUpperCase()).join(', ')}
        </p>
      </div>
    );
  }

  // Build chart data from price data
  const chartData: ChartDataPoint[] = [];

  // Get all unique timestamps from assets that have data
  const timestampSet = new Set<number>();
  assetsWithData.forEach((asset) => {
    const prices = priceData.get(asset.coin.id);
    if (prices) {
      prices.forEach(([timestamp]) => {
        timestampSet.add(timestamp);
      });
    }
  });

  const timestamps = Array.from(timestampSet).sort((a, b) => a - b);

  // Sample timestamps if there are too many (for performance)
  const maxPoints = 500;
  const step = timestamps.length > maxPoints ? Math.ceil(timestamps.length / maxPoints) : 1;
  const sampledTimestamps = timestamps.filter((_, i) => i % step === 0);

  // Build data points
  sampledTimestamps.forEach((timestamp) => {
    const point: ChartDataPoint = {
      timestamp,
      date: format(new Date(timestamp), 'MMM d, yyyy'),
    };

    assetsWithData.forEach((asset) => {
      const prices = priceData.get(asset.coin.id);
      if (prices) {
        // Find closest price to this timestamp
        let closestPrice: number | null = null;
        let minDiff = Infinity;

        for (const [ts, price] of prices) {
          const diff = Math.abs(ts - timestamp);
          if (diff < minDiff) {
            minDiff = diff;
            closestPrice = price;
          }
        }

        if (closestPrice !== null) {
          point[asset.coin.id] = closestPrice;
        }
      }
    });

    // Only add points that have at least one asset price
    if (Object.keys(point).some((k) => k !== 'timestamp' && k !== 'date')) {
      chartData.push(point);
    }
  });

  return (
    <div className="chart-container">
      {assetsWaitingForData.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm">
          <div className="w-3 h-3 border-2 border-[#ff2a6d] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#ff2a6d]">
            Loading: {assetsWaitingForData.map(a => a.coin.symbol.toUpperCase()).join(', ')}
          </span>
        </div>
      )}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <defs>
              {assetsWithData.map((asset) => (
                <linearGradient key={`gradient-${asset.coin.id}`} id={`gradient-${asset.coin.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={asset.color} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={asset.color} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(5, 217, 232, 0.1)"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fill: '#e0e0ff', fontSize: 11, opacity: 0.5 }}
              tickLine={{ stroke: 'rgba(5, 217, 232, 0.2)' }}
              axisLine={{ stroke: 'rgba(5, 217, 232, 0.2)' }}
            />
            <YAxis
              tick={{ fill: '#e0e0ff', fontSize: 11, opacity: 0.5 }}
              tickLine={{ stroke: 'rgba(5, 217, 232, 0.2)' }}
              axisLine={{ stroke: 'rgba(5, 217, 232, 0.2)' }}
              tickFormatter={(value) => {
                if (isNormalized) {
                  return value.toFixed(0);
                } else if (chartMode === 'marketCap') {
                  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
                  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
                  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
                  return `$${value.toLocaleString()}`;
                }
                return `$${value.toLocaleString()}`;
              }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(10, 0, 20, 0.95)',
                border: '1px solid rgba(5, 217, 232, 0.3)',
                borderRadius: '12px',
                boxShadow: '0 0 30px rgba(5, 217, 232, 0.2)',
                padding: '12px 16px',
              }}
              labelStyle={{ color: '#05d9e8', fontWeight: 'bold', marginBottom: '8px' }}
              itemStyle={{ padding: '2px 0' }}
              formatter={(value: number, name: string) => {
                const asset = assets.find((a) => a.coin.id === name);
                const displayName = asset ? asset.coin.symbol.toUpperCase() : name;
                let formattedValue: string;
                if (isNormalized) {
                  formattedValue = value.toFixed(2);
                } else if (chartMode === 'marketCap') {
                  // Format as billions/millions
                  if (value >= 1e12) {
                    formattedValue = `$${(value / 1e12).toFixed(2)}T`;
                  } else if (value >= 1e9) {
                    formattedValue = `$${(value / 1e9).toFixed(2)}B`;
                  } else if (value >= 1e6) {
                    formattedValue = `$${(value / 1e6).toFixed(2)}M`;
                  } else {
                    formattedValue = `$${value.toLocaleString()}`;
                  }
                } else {
                  formattedValue = `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
                }
                return [formattedValue, displayName];
              }}
            />
            <Legend
              formatter={(value: string) => {
                const asset = assets.find((a) => a.coin.id === value);
                return <span style={{ color: '#e0e0ff', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{asset ? asset.coin.symbol : value}</span>;
              }}
              wrapperStyle={{ paddingTop: '20px' }}
            />

            {assetsWithData.map((asset) => (
              <Line
                key={asset.coin.id}
                type="monotone"
                dataKey={asset.coin.id}
                stroke={asset.color}
                strokeWidth={asset.isPinned ? 2.5 : 1.5}
                strokeDasharray={asset.isPinned ? undefined : '5 5'}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: asset.color,
                  stroke: '#0a0014',
                  strokeWidth: 2,
                  style: { filter: `drop-shadow(0 0 8px ${asset.color})` }
                }}
                connectNulls
              />
            ))}

            {chartData.length > 50 && (
              <Brush
                dataKey="date"
                height={40}
                stroke="rgba(5, 217, 232, 0.5)"
                fill="rgba(10, 0, 20, 0.8)"
                travellerWidth={10}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
