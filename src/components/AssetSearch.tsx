import { useState, useRef, useEffect } from 'react';
import type { Coin } from '../types';

interface AssetSearchProps {
  coins: Coin[];
  selectedIds: string[];
  onSelect: (coin: Coin) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function AssetSearch({
  coins,
  selectedIds,
  onSelect,
  placeholder = 'Search coins...',
  disabled = false,
}: AssetSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter coins based on search query (exclude already selected)
  const filteredCoins = coins.filter((coin) => {
    if (selectedIds.includes(coin.id)) return false;
    const searchLower = query.toLowerCase();
    return (
      coin.name.toLowerCase().includes(searchLower) ||
      coin.symbol.toLowerCase().includes(searchLower)
    );
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(coin: Coin) {
    onSelect(coin);
    setQuery('');
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
      />

      {isOpen && filteredCoins.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-60 overflow-y-auto"
        >
          {filteredCoins.slice(0, 20).map((coin) => (
            <button
              key={coin.id}
              onClick={() => handleSelect(coin)}
              className="w-full px-4 py-2 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            >
              <img
                src={coin.image}
                alt={coin.name}
                className="w-6 h-6 rounded-full"
              />
              <span className="font-medium">{coin.name}</span>
              <span className="text-gray-400 text-sm uppercase">
                {coin.symbol}
              </span>
              <span className="ml-auto text-gray-500 text-sm">
                #{coin.market_cap_rank}
              </span>
            </button>
          ))}
        </div>
      )}

      {isOpen && query && filteredCoins.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 text-gray-400 text-center"
        >
          No coins found
        </div>
      )}
    </div>
  );
}
