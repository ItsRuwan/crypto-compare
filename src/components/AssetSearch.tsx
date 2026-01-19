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
      {/* Search Input */}
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
          className="input-neon pr-10 disabled:opacity-40 disabled:cursor-not-allowed"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="w-5 h-5 text-[#05d9e8]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && filteredCoins.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 dropdown-neon max-h-72 overflow-y-auto animate-fade-in"
        >
          {filteredCoins.slice(0, 20).map((coin, index) => (
            <button
              key={coin.id}
              onClick={() => handleSelect(coin)}
              className="dropdown-item w-full text-left group"
              style={{ animationDelay: `${index * 0.02}s` }}
            >
              {/* Coin Image with glow */}
              <div className="relative">
                <img
                  src={coin.image}
                  alt={coin.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="absolute inset-0 rounded-full bg-[#05d9e8] opacity-0 blur-md group-hover:opacity-30 transition-opacity" />
              </div>

              {/* Coin Info */}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-[#e0e0ff] truncate">{coin.name}</div>
                <div className="text-xs text-[#05d9e8] uppercase tracking-wider">
                  {coin.symbol}
                </div>
              </div>

              {/* Rank Badge */}
              <div className="flex items-center gap-1 text-xs text-[#e0e0ff]/40">
                <span className="text-[#ff2a6d]">#</span>
                {coin.market_cap_rank}
              </div>

              {/* Hover Arrow */}
              <svg className="w-4 h-4 text-[#05d9e8] opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}

      {/* No Results */}
      {isOpen && query && filteredCoins.length === 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 dropdown-neon p-6 text-center animate-fade-in"
        >
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[rgba(255,42,109,0.1)] flex items-center justify-center">
            <svg className="w-6 h-6 text-[#ff2a6d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-[#e0e0ff]/50 text-sm">No coins found matching "{query}"</p>
        </div>
      )}
    </div>
  );
}
