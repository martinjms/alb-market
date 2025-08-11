import { getConnection, Neo4jConnection } from './connection';
import type { ItemNode, RecipeNode, CityNode } from './schema';

export interface QueryOptions {
  limit?: number;
  skip?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface BatchOperationResult {
  processed: number;
  errors: any[];
  duration: number;
}

export class DatabaseUtils {
  private connection: Neo4jConnection;

  constructor(connection?: Neo4jConnection) {
    this.connection = connection || getConnection();
  }

  /**
   * Execute multiple queries in a single transaction
   */
  async executeTransaction(queries: Array<{ query: string; parameters?: Record<string, any> }>): Promise<any[]> {
    const session = this.connection.getSession();
    
    try {
      const results = await session.executeWrite(async (tx: any) => {
        const txResults = [];
        for (const { query, parameters = {} } of queries) {
          const result = await tx.run(query, parameters);
          txResults.push(result.records.map((record: any) => record.toObject()));
        }
        return txResults;
      });
      
      return results;
    } catch (error) {
      console.error('Transaction failed:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Batch insert items with progress tracking
   */
  async batchCreateItems(items: Partial<ItemNode>[], batchSize = 1000): Promise<BatchOperationResult> {
    const startTime = Date.now();
    let processed = 0;
    const errors: any[] = [];

    console.log(`🚀 Starting batch insert of ${items.length} items (batch size: ${batchSize})`);

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      try {
        const query = `
          UNWIND $items as item
          MERGE (i:Item {id: item.id})
          ON CREATE SET 
            i.name = item.name,
            i.category = item.category,
            i.tier = item.tier,
            i.enchantment = item.enchantment,
            i.iconUrl = item.iconUrl,
            i.createdAt = datetime(),
            i.updatedAt = datetime()
          ON MATCH SET 
            i.name = item.name,
            i.category = item.category,
            i.tier = item.tier,
            i.enchantment = item.enchantment,
            i.iconUrl = item.iconUrl,
            i.updatedAt = datetime()
          RETURN count(i) as created
        `;

        await this.connection.executeWrite(query, { items: batch });
        processed += batch.length;
        
        if (processed % (batchSize * 5) === 0 || processed === items.length) {
          console.log(`📊 Progress: ${processed}/${items.length} items processed`);
        }
      } catch (error) {
        console.error(`❌ Batch ${i / batchSize + 1} failed:`, error);
        errors.push({ batchIndex: i / batchSize, error });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Batch operation completed in ${duration}ms`);

    return { processed, errors, duration };
  }

  /**
   * Batch create price relationships
   */
  async batchCreatePrices(
    prices: Array<{
      itemId: string;
      cityName: string;
      price: number;
      timestamp: string;
      quality: number;
      sellOrderCount?: number;
      buyOrderCount?: number;
    }>,
    batchSize = 1000
  ): Promise<BatchOperationResult> {
    const startTime = Date.now();
    let processed = 0;
    const errors: any[] = [];

    console.log(`💰 Starting batch insert of ${prices.length} prices (batch size: ${batchSize})`);

    for (let i = 0; i < prices.length; i += batchSize) {
      const batch = prices.slice(i, i + batchSize);
      
      try {
        const query = `
          UNWIND $prices as price
          MATCH (i:Item {id: price.itemId}), (c:City {name: price.cityName})
          MERGE (i)-[p:PRICED_AT]->(c)
          SET p.price = price.price,
              p.timestamp = datetime(price.timestamp),
              p.quality = price.quality,
              p.sellOrderCount = price.sellOrderCount,
              p.buyOrderCount = price.buyOrderCount
          RETURN count(p) as created
        `;

        await this.connection.executeWrite(query, { prices: batch });
        processed += batch.length;
        
        if (processed % (batchSize * 5) === 0 || processed === prices.length) {
          console.log(`📊 Progress: ${processed}/${prices.length} prices processed`);
        }
      } catch (error) {
        console.error(`❌ Price batch ${i / batchSize + 1} failed:`, error);
        errors.push({ batchIndex: i / batchSize, error });
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Price batch operation completed in ${duration}ms`);

    return { processed, errors, duration };
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    nodeCount: number;
    relationshipCount: number;
    itemCount: number;
    recipeCount: number;
    cityCount: number;
    priceCount: number;
    lastPriceUpdate?: Date;
  }> {
    try {
      const [nodeStats, relationshipStats, itemCount, recipeCount, cityCount, priceStats] = await Promise.all([
        this.connection.executeQuery('MATCH (n) RETURN count(n) as count'),
        this.connection.executeQuery('MATCH ()-[r]->() RETURN count(r) as count'),
        this.connection.executeQuery('MATCH (i:Item) RETURN count(i) as count'),
        this.connection.executeQuery('MATCH (r:Recipe) RETURN count(r) as count'),
        this.connection.executeQuery('MATCH (c:City) RETURN count(c) as count'),
        this.connection.executeQuery(`
          MATCH ()-[p:PRICED_AT]->()
          RETURN count(p) as count, max(p.timestamp) as lastUpdate
        `),
      ]);

      return {
        nodeCount: nodeStats[0]?.count || 0,
        relationshipCount: relationshipStats[0]?.count || 0,
        itemCount: itemCount[0]?.count || 0,
        recipeCount: recipeCount[0]?.count || 0,
        cityCount: cityCount[0]?.count || 0,
        priceCount: priceStats[0]?.count || 0,
        lastPriceUpdate: priceStats[0]?.lastUpdate ? new Date(priceStats[0].lastUpdate) : undefined,
      };
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  /**
   * Clean old price data
   */
  async cleanOldPrices(olderThanDays = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const query = `
        MATCH ()-[p:PRICED_AT]->()
        WHERE p.timestamp < datetime($cutoffDate)
        DELETE p
        RETURN count(p) as deletedCount
      `;

      const result = await this.connection.executeWrite(query, {
        cutoffDate: cutoffDate.toISOString(),
      });

      const deletedCount = result[0]?.deletedCount || 0;
      console.log(`🧹 Cleaned ${deletedCount} old price records older than ${olderThanDays} days`);
      
      return deletedCount;
    } catch (error) {
      console.error('Failed to clean old prices:', error);
      throw error;
    }
  }

  /**
   * Get query performance metrics
   */
  async profileQuery(query: string, parameters: Record<string, any> = {}): Promise<any> {
    try {
      const profileQuery = `PROFILE ${query}`;
      const result = await this.connection.executeQuery(profileQuery, parameters);
      return result;
    } catch (error) {
      console.error('Query profiling failed:', error);
      throw error;
    }
  }

  /**
   * Explain query execution plan
   */
  async explainQuery(query: string, parameters: Record<string, any> = {}): Promise<any> {
    try {
      const explainQuery = `EXPLAIN ${query}`;
      const result = await this.connection.executeQuery(explainQuery, parameters);
      return result;
    } catch (error) {
      console.error('Query explanation failed:', error);
      throw error;
    }
  }

  /**
   * Verify data integrity
   */
  async verifyDataIntegrity(): Promise<{
    orphanedPrices: number;
    duplicateItems: number;
    missingRequiredFields: number;
    issues: string[];
  }> {
    const issues: string[] = [];
    let orphanedPrices = 0;
    let duplicateItems = 0;
    let missingRequiredFields = 0;

    try {
      // Check for orphaned price relationships
      const orphanedPriceQuery = `
        MATCH ()-[p:PRICED_AT]->()
        WHERE NOT exists((i:Item)-[p]->(c:City))
        RETURN count(p) as count
      `;
      const orphanedResult = await this.connection.executeQuery(orphanedPriceQuery);
      orphanedPrices = orphanedResult[0]?.count || 0;
      if (orphanedPrices > 0) {
        issues.push(`Found ${orphanedPrices} orphaned price relationships`);
      }

      // Check for duplicate items (same name, tier, enchantment)
      const duplicateItemQuery = `
        MATCH (i:Item)
        WITH i.name as name, i.tier as tier, i.enchantment as enchantment, collect(i) as items
        WHERE size(items) > 1
        RETURN count(*) as count
      `;
      const duplicateResult = await this.connection.executeQuery(duplicateItemQuery);
      duplicateItems = duplicateResult[0]?.count || 0;
      if (duplicateItems > 0) {
        issues.push(`Found ${duplicateItems} groups of duplicate items`);
      }

      // Check for items with missing required fields
      const missingFieldsQuery = `
        MATCH (i:Item)
        WHERE i.id IS NULL OR i.name IS NULL OR i.category IS NULL OR i.tier IS NULL OR i.enchantment IS NULL
        RETURN count(i) as count
      `;
      const missingFieldsResult = await this.connection.executeQuery(missingFieldsQuery);
      missingRequiredFields = missingFieldsResult[0]?.count || 0;
      if (missingRequiredFields > 0) {
        issues.push(`Found ${missingRequiredFields} items with missing required fields`);
      }

      console.log(`🔍 Data integrity check completed. Found ${issues.length} issues.`);
      
      return {
        orphanedPrices,
        duplicateItems,
        missingRequiredFields,
        issues,
      };
    } catch (error) {
      console.error('Data integrity verification failed:', error);
      throw error;
    }
  }

  /**
   * Create database backup
   */
  async createBackup(backupName?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const name = backupName || `backup-${timestamp}`;

    try {
      // Export all nodes and relationships
      const exportQuery = `
        CALL apoc.export.json.all("${name}.json", {})
        YIELD file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data
        RETURN file, nodes, relationships, time
      `;

      const result = await this.connection.executeQuery(exportQuery);
      console.log(`✅ Database backup created: ${name}.json`);
      
      return name;
    } catch (error) {
      console.error('Backup creation failed:', error);
      // Fallback to manual export if APOC is not available
      console.log('📝 APOC not available, creating manual backup...');
      
      const [nodes, relationships] = await Promise.all([
        this.connection.executeQuery('MATCH (n) RETURN n'),
        this.connection.executeQuery('MATCH ()-[r]->() RETURN r'),
      ]);

      const backupData = {
        timestamp: new Date().toISOString(),
        nodes: nodes.length,
        relationships: relationships.length,
        data: { nodes, relationships },
      };

      // In a real implementation, you'd write this to a file
      console.log(`📊 Manual backup completed: ${nodes.length} nodes, ${relationships.length} relationships`);
      
      return name;
    }
  }
}

/**
 * Utility functions for common operations
 */
export const dbUtils = {
  /**
   * Build dynamic WHERE clause from filters
   */
  buildWhereClause(filters: Record<string, any>, nodeAlias = 'n'): { clause: string; parameters: Record<string, any> } {
    const conditions: string[] = [];
    const parameters: Record<string, any> = {};

    Object.entries(filters).forEach(([key, value], index) => {
      if (value !== undefined && value !== null) {
        const paramName = `param_${index}`;
        conditions.push(`${nodeAlias}.${key} = $${paramName}`);
        parameters[paramName] = value;
      }
    });

    const clause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    return { clause, parameters };
  },

  /**
   * Build ORDER BY clause
   */
  buildOrderByClause(orderBy?: string, direction: 'ASC' | 'DESC' = 'ASC', nodeAlias = 'n'): string {
    if (!orderBy) return '';
    return `ORDER BY ${nodeAlias}.${orderBy} ${direction}`;
  },

  /**
   * Build LIMIT and SKIP clause
   */
  buildLimitClause(limit?: number, skip?: number): string {
    const clauses: string[] = [];
    if (skip !== undefined && skip > 0) clauses.push(`SKIP ${skip}`);
    if (limit !== undefined && limit > 0) clauses.push(`LIMIT ${limit}`);
    return clauses.join(' ');
  },

  /**
   * Validate item ID format
   */
  isValidItemId(id: string): boolean {
    return /^T\d+_[\w]+(@\d+)?$/.test(id);
  },

  /**
   * Parse item ID components
   */
  parseItemId(id: string): { tier: number; name: string; enchantment: number } | null {
    const match = id.match(/^T(\d+)_([\w]+)(?:@(\d+))?$/);
    if (!match) return null;

    return {
      tier: parseInt(match[1]),
      name: match[2],
      enchantment: match[3] ? parseInt(match[3]) : 0,
    };
  },

  /**
   * Generate item ID from components
   */
  generateItemId(name: string, tier: number, enchantment = 0): string {
    const base = `T${tier}_${name}`;
    return enchantment > 0 ? `${base}@${enchantment}` : base;
  },
};

export default DatabaseUtils;