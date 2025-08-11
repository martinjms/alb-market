#!/usr/bin/env npx ts-node

/**
 * Neo4j Database Restoration Script
 * Restores data from JSON backup files into Neo4j database
 */

import fs from 'fs';
import path from 'path';
import { createConnection } from '../src/connection';
import { SchemaManager } from '../src/schema';
import { DatabaseUtils } from '../src/utils';
import type { Neo4jConnection } from '../src/connection';

interface BackupMetadata {
  timestamp?: string;
  database?: string;
  operation?: string;
  suffix?: string;
  item_count?: number;
}

interface BackupCity {
  name: string;
  is_black_market?: boolean;
  safety_level?: string;
  created_at?: string;
}

interface BackupItem {
  id?: string;
  item_id?: string;
  name?: string;
  name_es?: string;
  category?: string;
  subcategory?: string;
  sub_category?: string;
  tier?: number;
  enchantment_level?: number;
  quality?: number;
  quality_name?: string;
  quality_name_es?: string;
  icon_url?: string;
  wiki_url?: string;
  verified?: boolean;
  source?: string;
  family?: string;
  created_at?: string;
  updated_at?: string;
}

interface BackupData {
  metadata?: BackupMetadata;
  items?: BackupItem[];
  cities?: BackupCity[];
  data?: {
    items?: BackupItem[];
    cities?: BackupCity[];
  };
}

interface RestorationStats {
  itemsProcessed: number;
  citiesProcessed: number;
  errors: number;
  startTime: Date;
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

type LogLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';

const log = (level: LogLevel, message: string) => {
  const timestamp = new Date().toISOString();
  const levelColors: Record<LogLevel, string> = {
    INFO: colors.blue,
    SUCCESS: colors.green,
    WARNING: colors.yellow,
    ERROR: colors.red,
  };
  
  console.log(
    `${levelColors[level]}[${level}]${colors.reset} ${colors.cyan}${timestamp}${colors.reset} ${message}`
  );
};

class DatabaseRestorer {
  private connection: Neo4jConnection;
  private backupFile: string;
  private schemaManager: SchemaManager;
  private utils: DatabaseUtils;
  private batchSize: number = 1000;
  private stats: RestorationStats;

  constructor(connection: Neo4jConnection, backupFile: string) {
    this.connection = connection;
    this.backupFile = backupFile;
    this.schemaManager = new SchemaManager(connection);
    this.utils = new DatabaseUtils(connection);
    this.stats = {
      itemsProcessed: 0,
      citiesProcessed: 0,
      errors: 0,
      startTime: new Date(),
    };
  }

  async loadBackupData(): Promise<BackupData> {
    log('INFO', `📁 Loading backup file: ${this.backupFile}`);
    
    if (!fs.existsSync(this.backupFile)) {
      throw new Error(`Backup file not found: ${this.backupFile}`);
    }

    const fileContent = fs.readFileSync(this.backupFile, 'utf8');
    const data: BackupData = JSON.parse(fileContent);
    
    log('INFO', `📊 Backup metadata:`);
    log('INFO', `  - Timestamp: ${data.metadata?.timestamp || 'unknown'}`);
    log('INFO', `  - Database: ${data.metadata?.database || 'unknown'}`);
    log('INFO', `  - Operation: ${data.metadata?.operation || 'unknown'}`);
    const itemCount = data.metadata?.item_count || data.items?.length || data.data?.items?.length || 0;
    const cityCount = data.cities?.length || data.data?.cities?.length || 0;
    log('INFO', `  - Item count: ${itemCount}`);
    log('INFO', `  - Cities: ${cityCount}`);
    
    return data;
  }

  async clearExistingData(): Promise<void> {
    log('WARNING', '🗑️ Clearing existing data...');
    
    const clearQueries = [
      'MATCH (n) DETACH DELETE n',
    ];

    for (const query of clearQueries) {
      await this.connection.executeWrite(query);
    }
    
    log('SUCCESS', '✅ Existing data cleared');
  }

  async initializeSchema(): Promise<void> {
    log('INFO', '🏗️ Initializing database schema...');
    
    const isValid = await this.schemaManager.validateSchema();
    if (!isValid) {
      await this.schemaManager.initializeSchema();
    }
    
    log('SUCCESS', '✅ Schema initialized');
  }

  async restoreCities(cities?: BackupCity[]): Promise<void> {
    if (!cities || cities.length === 0) {
      log('WARNING', 'No cities to restore');
      return;
    }

    log('INFO', `🏙️ Restoring ${cities.length} cities...`);

    const cityQuery = `
      UNWIND $cities AS cityData
      MERGE (c:City {name: cityData.name})
      SET c.isBlackMarket = cityData.is_black_market,
          c.safetyLevel = cityData.safety_level,
          c.createdAt = datetime(cityData.created_at),
          c.updatedAt = datetime()
      RETURN c.name
    `;

    try {
      const results = await this.connection.executeWrite(cityQuery, { cities });
      this.stats.citiesProcessed = results.length;
      log('SUCCESS', `✅ Restored ${results.length} cities`);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error';
      log('ERROR', `❌ Failed to restore cities: ${errMessage}`);
      this.stats.errors++;
      throw error;
    }
  }

  async restoreItemsBatch(items: BackupItem[]): Promise<number> {
    if (!items || items.length === 0) {
      return 0;
    }

    // Transform items to match our schema
    const transformedItems = items.map(item => ({
      id: item.id || item.item_id,
      itemId: item.item_id,
      name: item.name,
      nameEs: item.name_es,
      category: item.category,
      subcategory: item.subcategory,
      subCategory: item.sub_category,
      tier: item.tier,
      enchantmentLevel: item.enchantment_level || 0,
      quality: item.quality || 1,
      qualityName: item.quality_name,
      qualityNameEs: item.quality_name_es,
      iconUrl: item.icon_url,
      wikiUrl: item.wiki_url,
      verified: item.verified || false,
      source: item.source,
      family: item.family,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));

    const itemQuery = `
      UNWIND $items AS itemData
      MERGE (i:Item {id: itemData.id})
      SET i.itemId = itemData.itemId,
          i.name = itemData.name,
          i.nameEs = itemData.nameEs,
          i.category = itemData.category,
          i.subcategory = itemData.subcategory,
          i.subCategory = itemData.subCategory,
          i.tier = itemData.tier,
          i.enchantmentLevel = itemData.enchantmentLevel,
          i.quality = itemData.quality,
          i.qualityName = itemData.qualityName,
          i.qualityNameEs = itemData.qualityNameEs,
          i.iconUrl = itemData.iconUrl,
          i.wikiUrl = itemData.wikiUrl,
          i.verified = itemData.verified,
          i.source = itemData.source,
          i.family = itemData.family,
          i.createdAt = CASE 
            WHEN itemData.createdAt IS NOT NULL 
            THEN datetime(itemData.createdAt) 
            ELSE datetime() 
          END,
          i.updatedAt = CASE 
            WHEN itemData.updatedAt IS NOT NULL 
            THEN datetime(itemData.updatedAt) 
            ELSE datetime() 
          END
      RETURN i.id as itemId
    `;

    try {
      const results = await this.connection.executeWrite(itemQuery, { items: transformedItems });
      return results.length;
    } catch (error) {
      throw error;
    }
  }

  async restoreItems(items?: BackupItem[]): Promise<void> {
    if (!items || items.length === 0) {
      log('WARNING', 'No items to restore');
      return;
    }

    log('INFO', `📦 Restoring ${items.length} items in batches of ${this.batchSize}...`);

    let processed = 0;
    let totalProcessed = 0;

    for (let i = 0; i < items.length; i += this.batchSize) {
      const batch = items.slice(i, i + this.batchSize);
      
      try {
        const batchProcessed = await this.restoreItemsBatch(batch);
        totalProcessed += batchProcessed;
        processed += batch.length;
        
        const progress = ((processed / items.length) * 100).toFixed(1);
        log('INFO', `📊 Progress: ${processed}/${items.length} (${progress}%)`);
        
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : 'Unknown error';
        log('ERROR', `❌ Failed to process batch ${i}-${i + batch.length}: ${errMessage}`);
        this.stats.errors++;
        // Continue with next batch instead of failing completely
      }
    }

    this.stats.itemsProcessed = totalProcessed;
    log('SUCCESS', `✅ Restored ${totalProcessed} items`);
  }

  async createCategoryRelationships(): Promise<void> {
    log('INFO', '🔗 Creating category relationships...');

    // Create relationships between categories and subcategories
    const categoryQuery = `
      MATCH (i:Item)
      WHERE i.category IS NOT NULL AND i.subcategory IS NOT NULL
      MERGE (cat:Category {name: i.category})
      MERGE (subcat:Subcategory {name: i.subcategory})
      MERGE (cat)-[:HAS_SUBCATEGORY]->(subcat)
      MERGE (i)-[:BELONGS_TO_CATEGORY]->(cat)
      MERGE (i)-[:BELONGS_TO_SUBCATEGORY]->(subcat)
      RETURN count(i) as itemsLinked
    `;

    try {
      const results = await this.connection.executeWrite(categoryQuery);
      log('SUCCESS', `✅ Created category relationships for ${results[0]?.itemsLinked || 0} items`);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error';
      log('ERROR', `❌ Failed to create category relationships: ${errMessage}`);
      this.stats.errors++;
    }
  }

  async createTierRelationships(): Promise<void> {
    log('INFO', '🔗 Creating tier relationships...');

    const tierQuery = `
      MATCH (i:Item)
      WHERE i.tier IS NOT NULL
      MERGE (t:Tier {level: i.tier})
      MERGE (i)-[:HAS_TIER]->(t)
      RETURN count(i) as itemsLinked
    `;

    try {
      const results = await this.connection.executeWrite(tierQuery);
      log('SUCCESS', `✅ Created tier relationships for ${results[0]?.itemsLinked || 0} items`);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error';
      log('ERROR', `❌ Failed to create tier relationships: ${errMessage}`);
      this.stats.errors++;
    }
  }

  async verifyRestoration() {
    log('INFO', '🔍 Verifying restoration...');

    const stats = await this.utils.getDatabaseStats();
    
    log('INFO', '📊 Database statistics after restoration:');
    log('INFO', `  - Total nodes: ${stats.nodeCount}`);
    log('INFO', `  - Total relationships: ${stats.relationshipCount}`);
    log('INFO', `  - Items: ${stats.itemCount}`);
    log('INFO', `  - Cities: ${stats.cityCount}`);
    // Get additional counts manually since they're not in getDatabaseStats
    const categoryCount = await this.connection.executeRead('MATCH (c:Category) RETURN count(c) as count');
    const subcategoryCount = await this.connection.executeRead('MATCH (s:Subcategory) RETURN count(s) as count');
    const tierCount = await this.connection.executeRead('MATCH (t:Tier) RETURN count(t) as count');
    
    log('INFO', `  - Categories: ${categoryCount[0]?.count || 0}`);
    log('INFO', `  - Subcategories: ${subcategoryCount[0]?.count || 0}`);
    log('INFO', `  - Tiers: ${tierCount[0]?.count || 0}`);

    // Sample some restored data
    const sampleItems = await this.connection.executeRead(`
      MATCH (i:Item)
      RETURN i.id, i.name, i.category, i.tier, i.enchantmentLevel
      LIMIT 5
    `);

    if (sampleItems.length > 0) {
      log('INFO', '🔍 Sample restored items:');
      sampleItems.forEach(item => {
        log('INFO', `  - ${item['i.name']} (${item['i.id']}) - ${item['i.category']} T${item['i.tier']}@${item['i.enchantmentLevel']}`);
      });
    }

    const sampleCities = await this.connection.executeRead(`
      MATCH (c:City)
      RETURN c.name, c.safetyLevel, c.isBlackMarket
      LIMIT 5
    `);

    if (sampleCities.length > 0) {
      log('INFO', '🔍 Sample restored cities:');
      sampleCities.forEach(city => {
        log('INFO', `  - ${city['c.name']} (${city['c.safetyLevel']}) - Black Market: ${city['c.isBlackMarket']}`);
      });
    }

    return stats;
  }

  async restore() {
    try {
      const backupData = await this.loadBackupData();
      
      // Clear existing data if requested
      if (process.argv.includes('--clear') || process.argv.includes('-c')) {
        await this.clearExistingData();
      }

      // Initialize schema
      await this.initializeSchema();

      // Restore cities first - handle both direct and nested structure
      const cities = backupData.cities || backupData.data?.cities;
      await this.restoreCities(cities);

      // Restore items - handle both direct and nested structure
      const items = backupData.items || backupData.data?.items;
      await this.restoreItems(items);

      // Create relationships
      await this.createCategoryRelationships();
      await this.createTierRelationships();

      // Verify restoration
      const finalStats = await this.verifyRestoration();

      // Calculate duration
      const duration = (new Date().getTime() - this.stats.startTime.getTime()) / 1000;

      log('SUCCESS', '🎉 Database restoration completed successfully!');
      log('INFO', '📊 Restoration Summary:');
      log('INFO', `  - Items restored: ${this.stats.itemsProcessed}`);
      log('INFO', `  - Cities restored: ${this.stats.citiesProcessed}`);
      log('INFO', `  - Errors encountered: ${this.stats.errors}`);
      log('INFO', `  - Duration: ${duration.toFixed(2)} seconds`);
      log('INFO', `  - Average speed: ${(this.stats.itemsProcessed / duration).toFixed(0)} items/second`);

      return {
        success: true,
        stats: this.stats,
        finalStats,
        duration,
      };

    } catch (error) {
      const errMessage = error instanceof Error ? error.message : 'Unknown error';
      log('ERROR', `❌ Database restoration failed: ${errMessage}`);
      if (error instanceof Error) {
        console.error(error.stack);
      }
      return {
        success: false,
        error: errMessage,
        stats: this.stats,
      };
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  // Default backup file
  let backupFile = path.join(__dirname, '../backups/2025-08-09T12-46-16-028Z-cloud-complete-backup.json');
  
  // Check for custom backup file argument
  const fileArgIndex = args.findIndex(arg => arg === '--file' || arg === '-f');
  if (fileArgIndex !== -1 && args[fileArgIndex + 1]) {
    backupFile = path.resolve(args[fileArgIndex + 1]);
  }

  // Help text
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Neo4j Database Restoration Script

Usage: npx ts-node scripts/restore.ts [options]

Options:
  -f, --file <path>    Path to backup file (default: latest backup)
  -c, --clear          Clear existing data before restoration
  -h, --help           Show this help message

Examples:
  npx ts-node scripts/restore.ts
  npx ts-node scripts/restore.ts --clear
  npx ts-node scripts/restore.ts --file /path/to/backup.json --clear

Connection Details:
  - URI: bolt://localhost:7687
  - User: neo4j
  - Password: albmarket123
    `);
    process.exit(0);
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('      ALB Market Neo4j Database Restoration');
  console.log('='.repeat(60));
  console.log('');

  // Create connection
  const connection = createConnection({
    uri: 'bolt://localhost:7687',
    user: 'neo4j',
    password: 'albmarket123',
  });

  try {
    // Connect to database
    await connection.connect();
    
    // Test connection
    const isConnected = await connection.testConnection();
    if (!isConnected) {
      throw new Error('Failed to connect to Neo4j database');
    }

    // Create restorer and run restoration
    const restorer = new DatabaseRestorer(connection, backupFile);
    const result = await restorer.restore();

    await connection.disconnect();
    
    process.exit(result.success ? 0 : 1);

  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', `❌ Restoration failed: ${errMessage}`);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    
    try {
      await connection.disconnect();
    } catch (disconnectError) {
      const disconnectErrMessage = disconnectError instanceof Error ? disconnectError.message : 'Unknown error';
      log('ERROR', `❌ Failed to disconnect: ${disconnectErrMessage}`);
    }
    
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('WARNING', '🛑 Restoration interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', `❌ Unhandled rejection at ${promise}: ${reason}`);
  process.exit(1);
});

// Run the restoration if this file is executed directly
if (require.main === module) {
  main();
}

export { DatabaseRestorer };