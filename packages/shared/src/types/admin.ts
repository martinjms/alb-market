export interface DatabaseStats {
  totalItems: number;
  itemsByCategory: { category: string; count: number }[];
  itemsWithoutCategory: number;
  itemsWithoutIcon: number;
  itemsWithoutPrices: number;
  dataHealth: {
    score: number;
    status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  };
  lastUpdated: string;
}

export interface RandomItem {
  id: string;
  itemId: string;
  name: string;
  tier: number;
  enchantmentLevel: number;
  category?: string;
  subcategory?: string;
  iconUrl?: string;
  createdAt: string;
}

export interface AdminPanelConfig {
  refreshInterval: number; // seconds, 0 = disabled
  autoRotateItem: boolean;
  itemRotateInterval: number; // seconds
}