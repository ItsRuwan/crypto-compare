import type { SelectedAsset } from '../types';
import { formatPrice, formatPercentage, calculateChange } from '../utils/priceUtils';

interface PinnedAssetsProps {
  assets: SelectedAsset[];
  onRemove: (coinId: string) => void;
  onToggleVisibility: (coinId: string) => void;
}

export function PinnedAssets({ assets, onRemove, onToggleVisibility }: PinnedAssetsProps) {
  if (assets.length === 0) {
    return (
      <div className="glass-card p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[rgba(5,217,232,0.1)] flex items-center justify-center">
          <svg className="w-8 h-8 text-[#05d9e8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <p className="text-[#e0e0ff]/50">
          No reference assets pinned. Add up to 4 reference assets.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {assets.map((asset, index) => {
        const change = calculateChange(asset.historicalPrice, asset.coin.current_price);
        const isPositive = change !== null && change >= 0;

        return (
          <div
            key={asset.coin.id}
            className={`group relative glass-card overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
              asset.visible ? 'opacity-100' : 'opacity-40'
            }`}
            style={{
              animationDelay: `${index * 0.1}s`,
            }}
          >
            {/* Accent border glow */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 transition-all duration-300 group-hover:w-1.5"
              style={{
                background: `linear-gradient(180deg, ${asset.color}, ${asset.color}88)`,
                boxShadow: `0 0 20px ${asset.color}66`,
              }}
            />

            <div className="p-5 pl-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img
                      src={asset.coin.image}
                      alt={asset.coin.name}
                      className="w-10 h-10 rounded-full coin-image"
                    />
                    <div
                      className="absolute -inset-1 rounded-full opacity-50 blur-sm -z-10"
                      style={{ backgroundColor: asset.color }}
                    />
                  </div>
                  <div>
                    <div className="font-bold text-[#e0e0ff]">{asset.coin.name}</div>
                    <div className="text-xs text-[#05d9e8] uppercase tracking-wider font-semibold">
                      {asset.coin.symbol}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-1">
                  <button
                    onClick={() => onToggleVisibility(asset.coin.id)}
                    className="icon-btn"
                    title={asset.visible ? 'Hide on chart' : 'Show on chart'}
                  >
                    {asset.visible ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={() => onRemove(asset.coin.id)}
                    className="icon-btn icon-btn-danger"
                    title="Remove"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Price Stats */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="stat-label">Historical</span>
                  <span className="font-mono text-sm text-[#e0e0ff]">
                    {formatPrice(asset.historicalPrice)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="stat-label">Current</span>
                  <span className="font-mono text-sm text-[#e0e0ff]">
                    {formatPrice(asset.coin.current_price)}
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-[#05d9e8]/30 to-transparent" />
                <div className="flex justify-between items-center">
                  <span className="stat-label">Change</span>
                  <span className={`font-mono text-sm font-bold ${isPositive ? 'value-positive' : 'value-negative'}`}>
                    {formatPercentage(change)}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom gradient accent */}
            <div
              className="absolute bottom-0 left-0 right-0 h-px opacity-50"
              style={{
                background: `linear-gradient(90deg, ${asset.color}, transparent)`,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
