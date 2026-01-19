import type { SelectedAsset } from '../types';

interface ComparisonAssetsProps {
  assets: SelectedAsset[];
  onRemove: (coinId: string) => void;
  onToggleVisibility: (coinId: string) => void;
}

export function ComparisonAssets({ assets, onRemove, onToggleVisibility }: ComparisonAssetsProps) {
  if (assets.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {assets.map((asset, index) => (
        <div
          key={asset.coin.id}
          className={`group chip-neon transition-all duration-300 hover:scale-105 ${
            asset.visible ? 'opacity-100' : 'opacity-40'
          }`}
          style={{
            borderColor: `${asset.color}66`,
            animationDelay: `${index * 0.05}s`,
          }}
        >
          {/* Color indicator with glow */}
          <div className="relative">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: asset.color }}
            />
            <div
              className="absolute inset-0 rounded-full blur-sm opacity-70"
              style={{ backgroundColor: asset.color }}
            />
          </div>

          {/* Coin image */}
          <img
            src={asset.coin.image}
            alt={asset.coin.name}
            className="w-5 h-5 rounded-full"
          />

          {/* Symbol */}
          <span className="text-sm font-semibold text-[#e0e0ff] tracking-wide">
            {asset.coin.symbol.toUpperCase()}
          </span>

          {/* Toggle visibility button */}
          <button
            onClick={() => onToggleVisibility(asset.coin.id)}
            className="p-1 rounded transition-all duration-200 hover:bg-[rgba(5,217,232,0.2)]"
            title={asset.visible ? 'Hide on chart' : 'Show on chart'}
          >
            {asset.visible ? (
              <svg className="w-3.5 h-3.5 text-[#05d9e8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-[#e0e0ff]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>

          {/* Remove button */}
          <button
            onClick={() => onRemove(asset.coin.id)}
            className="p-1 rounded transition-all duration-200 hover:bg-[rgba(255,42,109,0.2)]"
            title="Remove"
          >
            <svg className="w-3.5 h-3.5 text-[#e0e0ff]/50 hover:text-[#ff2a6d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
