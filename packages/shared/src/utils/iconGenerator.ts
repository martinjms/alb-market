/**
 * Shared utility functions for generating Albion Online item icon URLs
 * Can be used by both backend and frontend
 */

export interface IconOptions {
  quality?: number;    // 1-5 (1=Normal, 2=Good, 3=Outstanding, 4=Excellent, 5=Masterpiece)
  enchantment?: number; // 0-3 (overrides @X in itemId)
  size?: number;       // 1-217 pixels
}

/**
 * Generates an Albion Online item icon URL from the official render API
 * 
 * @param itemId - The item ID (may contain @X for enchantment)
 * @param options - Optional parameters for quality, enchantment, and size
 * @returns The complete icon URL
 * 
 * @example
 * generateItemIconUrl('T4_BAG', { quality: 3, size: 64 })
 * // Returns: https://render.albiononline.com/v1/item/T4_BAG.png?quality=3&size=64
 * 
 * @example
 * generateItemIconUrl('T4_BAG@1', { enchantment: 2 })
 * // Returns: https://render.albiononline.com/v1/item/T4_BAG@2.png?quality=1&size=217
 */
export function generateItemIconUrl(itemId: string, options: IconOptions = {}): string {
  // Validate and set default values
  const quality = validateQuality(options.quality);
  const size = validateSize(options.size);
  
  // Handle enchantment logic
  const { cleanItemId, finalEnchantment } = processEnchantment(itemId, options.enchantment);
  
  // Build the base URL
  const baseUrl = 'https://render.albiononline.com/v1/item';
  
  // Construct item identifier with enchantment if applicable
  let itemIdentifier = cleanItemId;
  if (finalEnchantment > 0) {
    itemIdentifier = `${cleanItemId}@${finalEnchantment}`;
  }
  
  // Build query parameters manually (avoid URLSearchParams dependency)
  const queryParams = `quality=${quality}&size=${size}`;
  
  return `${baseUrl}/${itemIdentifier}.png?${queryParams}`;
}

/**
 * Validates and normalizes quality parameter
 */
function validateQuality(quality?: number): number {
  if (quality === undefined || quality === null) {
    return 1; // Default to Normal quality
  }
  
  // Ensure quality is within valid range (1-5)
  if (quality < 1) return 1;
  if (quality > 5) return 5;
  
  return Math.floor(quality);
}

/**
 * Validates and normalizes size parameter
 */
function validateSize(size?: number): number {
  if (size === undefined || size === null) {
    return 217; // Default to maximum size
  }
  
  // Ensure size is within valid range (1-217)
  if (size < 1) return 1;
  if (size > 217) return 217;
  
  return Math.floor(size);
}

/**
 * Processes enchantment logic and extracts clean item ID
 */
function processEnchantment(itemId: string, enchantmentOverride?: number): {
  cleanItemId: string;
  finalEnchantment: number;
} {
  // Check if itemId already contains enchantment (@X)
  const enchantmentMatch = itemId.match(/^(.+)@(\d+)$/);
  
  let cleanItemId: string;
  let existingEnchantment = 0;
  
  if (enchantmentMatch) {
    cleanItemId = enchantmentMatch[1];
    existingEnchantment = parseInt(enchantmentMatch[2], 10);
  } else {
    cleanItemId = itemId;
  }
  
  // Determine final enchantment level
  let finalEnchantment = 0;
  
  if (enchantmentOverride !== undefined && enchantmentOverride !== null) {
    // Use override parameter (validate range 0-3)
    finalEnchantment = Math.max(0, Math.min(3, Math.floor(enchantmentOverride)));
  } else {
    // Use existing enchantment from itemId (validate range 0-3)
    finalEnchantment = Math.max(0, Math.min(3, existingEnchantment));
  }
  
  return {
    cleanItemId,
    finalEnchantment
  };
}

/**
 * Convenience function to generate icon URLs with common presets
 */
export const IconPresets = {
  /**
   * Small icon for list views (32px, normal quality)
   */
  small: (itemId: string, enchantment?: number) => 
    generateItemIconUrl(itemId, { quality: 1, size: 32, enchantment }),
  
  /**
   * Medium icon for cards (64px, good quality)
   */
  medium: (itemId: string, enchantment?: number) => 
    generateItemIconUrl(itemId, { quality: 2, size: 64, enchantment }),
  
  /**
   * Large icon for detailed views (128px, outstanding quality)
   */
  large: (itemId: string, enchantment?: number) => 
    generateItemIconUrl(itemId, { quality: 3, size: 128, enchantment }),
  
  /**
   * Full size icon for hero sections (217px, excellent quality)
   */
  hero: (itemId: string, enchantment?: number) => 
    generateItemIconUrl(itemId, { quality: 4, size: 217, enchantment })
};

/**
 * Quality level constants for better code readability
 */
export const QualityLevels = {
  NORMAL: 1,
  GOOD: 2,
  OUTSTANDING: 3,
  EXCELLENT: 4,
  MASTERPIECE: 5
} as const;

/**
 * Enchantment level constants
 */
export const EnchantmentLevels = {
  NONE: 0,
  ENCHANT_1: 1,
  ENCHANT_2: 2,
  ENCHANT_3: 3
} as const;