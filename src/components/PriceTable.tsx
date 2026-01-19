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
        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-900">
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('name')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Asset <SortIcon field="name" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('symbol')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                >
                  Symbol <SortIcon field="symbol" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('historicalPrice')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-300 hover:text-white transition-colors ml-auto"
                >
                  Historical Price <SortIcon field="historicalPrice" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('currentPrice')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-300 hover:text-white transition-colors ml-auto"
                >
                  Current Price <SortIcon field="currentPrice" />
                </button>
              </th>
              <th className="px-4 py-3 text-right">
                <button
                  onClick={() => handleSort('change')}
                  className="flex items-center gap-1 text-sm font-medium text-gray-300 hover:text-white transition-colors ml-auto"
                >
                  Change <SortIcon field="change" />
                </button>
              </th>
              <th className="px-4 py-3 text-center">
                <span className="text-sm font-medium text-gray-300">Type</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedAssets.map((asset) => {
              const change = calculateChange(asset.historicalPrice, asset.coin.current_price);
              const isPositive = change !== null && change >= 0;

              return (
                <tr
                  key={asset.coin.id}
                  className={`hover:bg-gray-750 transition-colors ${
                    !asset.visible ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-1 h-8 rounded-full"
                        style={{ backgroundColor: asset.color }}
                      />
                      <img
                        src={asset.coin.image}
                        alt={asset.coin.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="font-medium">{asset.coin.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 uppercase">
                    {asset.coin.symbol}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatPrice(asset.historicalPrice)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatPrice(asset.coin.current_price)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
                      {formatPercentage(change)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        asset.isPinned
                          ? 'bg-blue-900/50 text-blue-300'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      {asset.isPinned ? 'Reference' : 'Comparison'}
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
