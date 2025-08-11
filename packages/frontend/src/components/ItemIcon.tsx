import React, { useState } from 'react';
import { generateItemIconUrl, IconPresets } from '@alb-market/shared';
import './ItemIcon.css';

export interface ItemIconProps {
  itemId: string;           // Required: Item ID (may contain @X)
  quality?: number;         // Optional: 1-5 (overrides default)
  enchantment?: number;     // Optional: 0-3 (overrides @X in itemId)
  size?: number | 'small' | 'medium' | 'large' | 'hero'; // Optional
  alt?: string;            // Optional: Alt text (defaults to itemId)
  className?: string;      // Optional: CSS classes
  loading?: 'lazy' | 'eager'; // Optional: Loading behavior
  onError?: (error: Event) => void; // Optional: Error handler
  onClick?: () => void;    // Optional: Click handler
}

const SIZE_PRESETS = {
  small: 32,
  medium: 64,
  large: 128,
  hero: 217,
} as const;

const DEFAULT_QUALITY = 1;
const DEFAULT_SIZE = 'medium';
const DEFAULT_LOADING = 'lazy';

export const ItemIcon: React.FC<ItemIconProps> = ({
  itemId,
  quality = DEFAULT_QUALITY,
  enchantment,
  size = DEFAULT_SIZE,
  alt,
  className = '',
  loading = DEFAULT_LOADING,
  onError,
  onClick,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine the actual pixel size
  const pixelSize = typeof size === 'string' ? SIZE_PRESETS[size] : size;

  // Generate the icon URL using the shared utility
  const iconUrl = generateItemIconUrl(itemId, {
    quality,
    enchantment,
    size: pixelSize,
  });

  // Generate alt text if not provided
  const altText = alt || `${itemId} icon`;

  // Handle image load error
  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    setIsLoaded(true);
    if (onError) {
      onError(event.nativeEvent);
    }
  };

  // Handle image load success
  const handleLoad = () => {
    setIsLoaded(true);
    setHasError(false);
  };

  // Base classes for styling
  const baseClasses = `item-icon ${className}`.trim();
  
  // Add clickable class if onClick is provided
  const finalClasses = onClick 
    ? `${baseClasses} item-icon--clickable`.trim()
    : baseClasses;

  // Inline styles for sizing and basic appearance
  const imageStyles: React.CSSProperties = {
    width: pixelSize,
    height: pixelSize,
    display: 'block',
    objectFit: 'contain',
    cursor: onClick ? 'pointer' : undefined,
    opacity: isLoaded ? 1 : 0.7,
    transition: 'opacity 0.2s ease-in-out',
  };

  // Fallback styles for error state
  const fallbackStyles: React.CSSProperties = {
    ...imageStyles,
    backgroundColor: '#f3f4f6',
    border: '2px dashed #d1d5db',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
    fontSize: Math.max(10, pixelSize * 0.15),
    fontWeight: 500,
    textAlign: 'center',
    borderRadius: '4px',
  };

  // If there's an error, show fallback
  if (hasError) {
    return (
      <div
        className={`${finalClasses} item-icon--error`}
        style={fallbackStyles}
        onClick={onClick}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        } : undefined}
        aria-label={onClick ? `Click to interact with ${altText}` : altText}
        title={`Failed to load: ${itemId}`}
      >
        <span style={{ fontSize: 'inherit', lineHeight: 1 }}>
          {pixelSize >= 32 ? '?' : '?'}
        </span>
      </div>
    );
  }

  return (
    <img
      src={iconUrl}
      alt={altText}
      className={finalClasses}
      style={imageStyles}
      loading={loading}
      onError={handleError}
      onLoad={handleLoad}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={onClick ? `Click to interact with ${altText}` : altText}
      title={`${itemId}${quality > 1 ? ` (Quality ${quality})` : ''}${enchantment ? ` @${enchantment}` : ''}`}
    />
  );
};

export default ItemIcon;