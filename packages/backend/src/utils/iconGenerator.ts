/**
 * Backend-specific re-exports from shared icon generator utility
 * This ensures consistency between backend and frontend while maintaining
 * a single source of truth in the shared package
 */

// Re-export everything from shared package
export {
  generateItemIconUrl,
  IconOptions,
  IconPresets,
  QualityLevels,
  EnchantmentLevels
} from '@alb-market/shared';