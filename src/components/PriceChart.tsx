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
      <div className="h-[400px] bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
        Add assets to see price comparison chart
      </div>
    );
  }

  if (visibleAssets.length === 0) {
    return (
      <div className="h-[400px] bg-gray-800 rounded-lg flex items-center justify-center text-gray-500">
        Toggle asset visibility to show on chart
      </div>
    );
  }

  if (assetsWithData.length === 0) {
    return (
      <div className="h-[400px] bg-gray-800 rounded-lg flex flex-col items-center justify-center text-gray-500">
        <div className="animate-pulse mb-2">Loading chart data...</div>
        <div className="text-sm">
          Waiting for: {assetsWaitingForData.map(a => a.coin.symbol.toUpperCase()).join(', ')}
        </div>
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
    <div className="bg-gray-800 rounded-lg p-4">
      {assetsWaitingForData.length > 0 && (
        <div className="mb-2 text-sm text-yellow-500">
          Loading data for: {assetsWaitingForData.map(a => a.coin.symbol.toUpperCase()).join(', ')}
        </div>
      )}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickLine={{ stroke: '#4b5563' }}
              axisLine={{ stroke: '#4b5563' }}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              tickLine={{ stroke: '#4b5563' }}
              axisLine={{ stroke: '#4b5563' }}
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
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#fff' }}
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
                return asset ? asset.coin.symbol.toUpperCase() : value;
              }}
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
                activeDot={{ r: 4, fill: asset.color }}
                connectNulls
              />
            ))}

            {chartData.length > 50 && (
              <Brush
                dataKey="date"
                height={30}
                stroke="#4b5563"
                fill="#1f2937"
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
