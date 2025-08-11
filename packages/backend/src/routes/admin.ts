import express, { Router } from 'express';
import { getConnection } from '../../../database/src/connection';
import { ApiResponse } from '@alb-market/shared';
import { generateItemIconUrl, IconOptions } from '../utils/iconGenerator';

const router: Router = express.Router();

export interface DatabaseStats {
  totalItems: number;
  itemsByCategory: { category: string; count: number }[];
  itemsWithoutCategory: number;
  itemsWithoutIcon: number;
  itemsWithoutPriceData: number;
  dataHealth: {
    score: number;
    status: 'excellent' | 'good' | 'needs-improvement' | 'poor';
  };
  lastUpdated: string;
}

export interface RandomItem {
  id: string;
  name: string;
  tier: number;
  enchantmentLevel: number;
  category?: string;
  subcategory?: string;
  iconUrl?: string;
  createdAt?: string;
}

// Get database statistics
router.get('/stats', async (req, res) => {
  try {
    const connection = getConnection();
    
    // Get total items
    const totalItemsResult = await connection.executeQuery(`
      MATCH (i:Item)
      RETURN count(i) as total
    `);
    const totalItems = totalItemsResult[0]?.total?.toNumber() || 0;

    // Get items by category
    const categoryStatsResult = await connection.executeQuery(`
      MATCH (i:Item)
      WHERE i.category IS NOT NULL
      RETURN i.category as category, count(i) as count
      ORDER BY count DESC
    `);
    const itemsByCategory = categoryStatsResult.map((record: any) => ({
      category: record.category as string,
      count: (record.count?.toNumber ? record.count.toNumber() : Number(record.count)) as number
    }));

    // Get items without category
    const itemsWithoutCategoryResult = await connection.executeQuery(`
      MATCH (i:Item)
      WHERE i.category IS NULL OR i.category = ''
      RETURN count(i) as count
    `);
    const itemsWithoutCategory = itemsWithoutCategoryResult[0]?.count?.toNumber() || 0;

    // Get items without icon URLs
    const itemsWithoutIconResult = await connection.executeQuery(`
      MATCH (i:Item)
      WHERE i.iconUrl IS NULL OR i.iconUrl = ''
      RETURN count(i) as count
    `);
    const itemsWithoutIcon = itemsWithoutIconResult[0]?.count?.toNumber() || 0;

    // Get items without price relationships
    const itemsWithoutPriceResult = await connection.executeQuery(`
      MATCH (i:Item)
      WHERE NOT (i)-[:PRICED_AT]->()
      RETURN count(i) as count
    `);
    const itemsWithoutPriceData = itemsWithoutPriceResult[0]?.count?.toNumber() || 0;

    // Calculate data health score (0-100)
    const categorizedRatio = totalItems > 0 ? (totalItems - itemsWithoutCategory) / totalItems : 0;
    const iconRatio = totalItems > 0 ? (totalItems - itemsWithoutIcon) / totalItems : 0;
    const priceDataRatio = totalItems > 0 ? (totalItems - itemsWithoutPriceData) / totalItems : 0;
    const dataHealthScore = Math.round((categorizedRatio + iconRatio + priceDataRatio) / 3 * 100);
    
    // Determine health status
    let healthStatus: 'excellent' | 'good' | 'needs-improvement' | 'poor';
    if (dataHealthScore >= 80) healthStatus = 'excellent';
    else if (dataHealthScore >= 60) healthStatus = 'good';
    else if (dataHealthScore >= 40) healthStatus = 'needs-improvement';
    else healthStatus = 'poor';

    const stats: DatabaseStats = {
      totalItems,
      itemsByCategory,
      itemsWithoutCategory,
      itemsWithoutIcon,
      itemsWithoutPriceData: itemsWithoutPriceData,
      dataHealth: {
        score: dataHealthScore,
        status: healthStatus
      },
      lastUpdated: new Date().toISOString()
    };

    const response: ApiResponse<DatabaseStats> = {
      success: true,
      data: stats
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching database stats:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Failed to fetch database statistics'
    };
    res.status(500).json(response);
  }
});

// Get random item
router.get('/random-item', async (req, res) => {
  try {
    const connection = getConnection();
    
    const randomItemResult = await connection.executeQuery(`
      MATCH (i:Item)
      WHERE i.name IS NOT NULL AND i.name <> ""
      WITH i, rand() as random
      ORDER BY random
      LIMIT 1
      RETURN i.id as id,
             i.name as name,
             coalesce(i.tier, 0) as tier,
             coalesce(i.enchantment, 0) as enchantment,
             i.category as category,
             i.subcategory as subcategory,
             i.iconUrl as iconUrl,
             toString(i.createdAt) as createdAt
    `);

    if (randomItemResult.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'No items found in database'
      };
      return res.status(404).json(response);
    }

    const record = randomItemResult[0];
    const randomItem: RandomItem = {
      id: record.id,
      // itemId removed as it's not in the interface
      name: record.name,
      tier: typeof record.tier === 'object' && record.tier?.toNumber ? record.tier.toNumber() : Number(record.tier) || 0,
      enchantmentLevel: typeof record.enchantment === 'object' && record.enchantment?.toNumber ? record.enchantment.toNumber() : Number(record.enchantment) || 0,
      category: record.category || undefined,
      subcategory: record.subcategory || undefined,
      iconUrl: record.iconUrl || undefined,
      createdAt: record.createdAt || new Date().toISOString()
    };

    const response: ApiResponse<RandomItem> = {
      success: true,
      data: randomItem
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching random item:', error);
    const response: ApiResponse = {
      success: false,
      error: `Failed to fetch random item: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
    res.status(500).json(response);
  }
});

// Get item icon URL
router.get('/item/:itemId/icon', async (req, res) => {
  try {
    const { itemId } = req.params;
    
    if (!itemId) {
      const response: ApiResponse = {
        success: false,
        error: 'Item ID is required'
      };
      return res.status(400).json(response);
    }

    // Extract query parameters for icon options
    const quality = req.query.quality ? parseInt(req.query.quality as string, 10) : undefined;
    const enchantment = req.query.enchantment ? parseInt(req.query.enchantment as string, 10) : undefined;
    const size = req.query.size ? parseInt(req.query.size as string, 10) : undefined;

    const options: IconOptions = {
      quality,
      enchantment,
      size
    };

    // Generate the icon URL
    const iconUrl = generateItemIconUrl(itemId, options);

    const response: ApiResponse<{ iconUrl: string; itemId: string; options: IconOptions }> = {
      success: true,
      data: {
        iconUrl,
        itemId,
        options
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error generating icon URL:', error);
    const response: ApiResponse = {
      success: false,
      error: `Failed to generate icon URL: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
    res.status(500).json(response);
  }
});

export default router;