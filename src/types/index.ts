export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
}

export interface HistoricalPrice {
  coinId: string;
  date: string;
  price: number;
}

export interface PriceDataPoint {
  date: string;
  timestamp: number;
  [coinId: string]: number | string;
}

export interface SelectedAsset {
  coin: Coin;
  isPinned: boolean;
  color: string;
  visible: boolean;
  historicalPrice?: number;
}

export interface CoinGeckoHistoryResponse {
  id: string;
  symbol: string;
  name: string;
  market_data: {
    current_price: {
      usd: number;
    };
  };
}

export interface CoinGeckoMarketChartResponse {
  prices: [number, number][];
}

export type SortField = 'name' | 'symbol' | 'historicalPrice' | 'currentPrice' | 'change';
export type SortDirection = 'asc' | 'desc';
