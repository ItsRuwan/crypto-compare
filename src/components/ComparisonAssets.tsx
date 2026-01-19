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
    <div className="flex flex-wrap gap-2">
      {assets.map((asset) => (
        <div
          key={asset.coin.id}
          className={`flex items-center gap-2 bg-gray-800 rounded-full px-3 py-1.5 transition-opacity ${
            asset.visible ? 'opacity-100' : 'opacity-50'
          }`}
        >
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: asset.color }}
          />
          <img
            src={asset.coin.image}
            alt={asset.coin.name}
            className="w-5 h-5 rounded-full"
          />
          <span className="text-sm font-medium">{asset.coin.symbol.toUpperCase()}</span>
          <button
            onClick={() => onToggleVisibility(asset.coin.id)}
            className="p-0.5 hover:bg-gray-700 rounded transition-colors"
            title={asset.visible ? 'Hide on chart' : 'Show on chart'}
          >
            {asset.visible ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>
          <button
            onClick={() => onRemove(asset.coin.id)}
            className="p-0.5 hover:bg-red-900/50 hover:text-red-400 rounded transition-colors"
            title="Remove"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
