import { useState } from 'react';
import type { SelectedAsset, SortField, SortDirection } from '../types';
import { formatPrice, formatPercentage, calculateChange } from '../utils/priceUtils';

interface PriceTableProps {
  assets: SelectedAsset[];
}

export function PriceTable({ assets }: PriceTableProps) {
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  if (assets.length === 0) {
    return null;
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAssets = [...assets].sort((a, b) => {
    let comparison = 0;

    switch (sortField) {
      case 'name':
        comparison = a.coin.name.localeCompare(b.coin.name);
        break;
      case 'symbol':
        comparison = a.coin.symbol.localeCompare(b.coin.symbol);
        break;
      case 'historicalPrice':
        comparison = (a.historicalPrice ?? 0) - (b.historicalPrice ?? 0);
        break;
      case 'currentPrice':
        comparison = (a.coin.current_price ?? 0) - (b.coin.current_price ?? 0);
        break;
      case 'change':
        const changeA = calculateChange(a.historicalPrice, a.coin.current_price) ?? 0;
        const changeB = calculateChange(b.historicalPrice, b.coin.current_price) ?? 0;
        comparison = changeA - changeB;
        break;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-3 h-3 text-[#e0e0ff]/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-3 h-3 text-[#05d9e8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-[#05d9e8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-neon">
          <thead>
            <tr>
              <th>
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-2 hover:text-[#ff2a6d] transition-colors"
                >
                  Asset <SortIcon field="name" />
                </button>
              </th>
              <th>
                <button
                  onClick={() => handleSort('symbol')}
                  className="flex items-center gap-2 hover:text-[#ff2a6d] transition-colors"
                >
                  Symbol <SortIcon field="symbol" />
                </button>
              </th>
              <th className="text-right">
                <button
                  onClick={() => handleSort('historicalPrice')}
                  className="flex items-center gap-2 hover:text-[#ff2a6d] transition-colors ml-auto"
                >
                  Historical <SortIcon field="historicalPrice" />
                </button>
              </th>
              <th className="text-right">
                <button
                  onClick={() => handleSort('currentPrice')}
                  className="flex items-center gap-2 hover:text-[#ff2a6d] transition-colors ml-auto"
                >
                  Current <SortIcon field="currentPrice" />
                </button>
              </th>
              <th className="text-right">
                <button
                  onClick={() => handleSort('change')}
                  className="flex items-center gap-2 hover:text-[#ff2a6d] transition-colors ml-auto"
                >
                  Change <SortIcon field="change" />
                </button>
              </th>
              <th className="text-center">Type</th>
            </tr>
          </thead>
          <tbody>
            {sortedAssets.map((asset, index) => {
              const change = calculateChange(asset.historicalPrice, asset.coin.current_price);
              const isPositive = change !== null && change >= 0;

              return (
                <tr
                  key={asset.coin.id}
                  className={`animate-fade-in ${!asset.visible ? 'opacity-40' : ''}`}
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td>
                    <div className="flex items-center gap-3">
                      {/* Color indicator with glow */}
                      <div className="relative">
                        <div
                          className="w-1 h-8 rounded-full"
                          style={{ backgroundColor: asset.color }}
                        />
                        <div
                          className="absolute inset-0 rounded-full blur-sm opacity-50"
                          style={{ backgroundColor: asset.color }}
                        />
                      </div>

                      {/* Coin image */}
                      <div className="relative">
                        <img
                          src={asset.coin.image}
                          alt={asset.coin.name}
                          className="w-8 h-8 rounded-full"
                        />
                        <div
                          className="absolute -inset-0.5 rounded-full opacity-30 blur-sm -z-10"
                          style={{ backgroundColor: asset.color }}
                        />
                      </div>

                      {/* Name */}
                      <span className="font-medium text-[#e0e0ff]">{asset.coin.name}</span>
                    </div>
                  </td>
                  <td className="text-[#05d9e8] uppercase tracking-wider text-sm font-semibold">
                    {asset.coin.symbol}
                  </td>
                  <td className="text-right font-mono text-sm text-[#e0e0ff]">
                    {formatPrice(asset.historicalPrice)}
                  </td>
                  <td className="text-right font-mono text-sm text-[#e0e0ff]">
                    {formatPrice(asset.coin.current_price)}
                  </td>
                  <td className="text-right font-mono text-sm font-bold">
                    <span className={isPositive ? 'value-positive' : 'value-negative'}>
                      {formatPercentage(change)}
                    </span>
                  </td>
                  <td className="text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full tracking-wider ${
                        asset.isPinned
                          ? 'bg-gradient-to-r from-[#05d9e8]/20 to-[#d300c5]/20 text-[#05d9e8] border border-[#05d9e8]/30'
                          : 'bg-[rgba(255,42,109,0.1)] text-[#ff2a6d]/70 border border-[#ff2a6d]/20'
                      }`}
                    >
                      {asset.isPinned ? 'REF' : 'CMP'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
