#!/usr/bin/env node
/**
 * Parse item.txt and populate Neo4j database with clean, normalized data
 * 
 * This script addresses Issue #17: Comprehensive Database Population from item.txt File
 * 
 * Features:
 * - Parses item.txt file format: ItemID|ItemName|Category|Tier|Subcategory
 * - Cleans English item names by removing:
 *   - Tier references (T1, T2, T3, etc.)
 *   - Enchantment levels (@1, @2, @3, etc.)
 *   - Quality indicators (anything in parentheses)
 *   - Other tier/quality references like "Adept's", "Expert's", etc.
 * - Creates proper Neo4j schema and relationships
 * - Populates database with normalized data
 */

import { createConnection } from '../src/connection';
import { DatabaseUtils } from '../src/utils';
import * as fs from 'fs';
import * as path from 'path';

interface ParsedItem {
  itemId: string;
  originalName: string;
  cleanName: string;
  category: string;
  tier: number;
  subcategory: string;
  enchantment: number;
  baseItemId: string;
}

class ItemParser {
  private connection: any;
  private utils?: DatabaseUtils;

  constructor() {
    this.connection = createConnection({
      uri: 'bolt://localhost:7687',
      user: 'neo4j',
      password: 'albmarket123'
    });
  }

  async initialize() {
    await this.connection.connect();
    this.utils = new DatabaseUtils(this.connection);
  }

  async disconnect() {
    await this.connection.disconnect();
  }

  /**
   * Clean item names by removing tier references, enchantments, and quality indicators
   */
  cleanItemName(originalName: string): string {
    let cleanName = originalName;

    // Remove tier references (T1, T2, T3, etc.)
    cleanName = cleanName.replace(/\bT[1-8]\s*/g, '');

    // Remove enchantment levels (@1, @2, @3, etc.)
    cleanName = cleanName.replace(/@[1-3]/g, '');

    // Remove anything in parentheses (quality indicators)
    cleanName = cleanName.replace(/\([^)]*\)/g, '');

    // Remove quality prefixes
    const qualityPrefixes = [
      "Beginner's", "Novice's", "Journeyman's", "Adept's", "Expert's", 
      "Master's", "Grandmaster's", "Elder's"
    ];
    
    for (const prefix of qualityPrefixes) {
      cleanName = cleanName.replace(new RegExp(`\\b${prefix}\\s*`, 'g'), '');
    }

    // Clean up extra spaces and trim
    cleanName = cleanName.replace(/\s+/g, ' ').trim();

    return cleanName;
  }

  /**
   * Parse enchantment level from item ID
   */
  parseEnchantment(itemId: string): number {
    const match = itemId.match(/@([1-3])$/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Get base item ID (without enchantment)
   */
  getBaseItemId(itemId: string): string {
    return itemId.replace(/@[1-3]$/, '');
  }

  /**
   * Parse the item.txt file
   */
  parseItemFile(filePath: string): ParsedItem[] {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => {
      const trimmed = line.trim();
      return trimmed && !trimmed.startsWith('#');
    });

    const items: ParsedItem[] = [];

    for (const line of lines) {
      const parts = line.split('|');
      if (parts.length !== 5) {
        console.warn(`Skipping malformed line: ${line}`);
        continue;
      }

      const [itemId, originalName, category, tierStr, subcategory] = parts.map(p => p.trim());
      const tier = parseInt(tierStr);
      const enchantment = this.parseEnchantment(itemId);
      const baseItemId = this.getBaseItemId(itemId);
      const cleanName = this.cleanItemName(originalName);

      items.push({
        itemId,
        originalName,
        cleanName,
        category,
        tier,
        subcategory,
        enchantment,
        baseItemId
      });
    }

    return items;
  }

  /**
   * Create database schema
   */
  async createSchema() {
    console.log('📋 Creating database schema...');

    const schemaQueries = [
      // Create constraints
      'CREATE CONSTRAINT item_id_unique IF NOT EXISTS FOR (i:Item) REQUIRE i.id IS UNIQUE',
      'CREATE CONSTRAINT category_name_unique IF NOT EXISTS FOR (c:Category) REQUIRE c.name IS UNIQUE',
      'CREATE CONSTRAINT tier_level_unique IF NOT EXISTS FOR (t:Tier) REQUIRE t.level IS UNIQUE',
      
      // Create indexes for performance
      'CREATE INDEX item_name_index IF NOT EXISTS FOR (i:Item) ON (i.name)',
      'CREATE INDEX item_tier_index IF NOT EXISTS FOR (i:Item) ON (i.tier)',
      'CREATE INDEX item_category_index IF NOT EXISTS FOR (i:Item) ON (i.category)',
      'CREATE INDEX item_enchantment_index IF NOT EXISTS FOR (i:Item) ON (i.enchantment)'
    ];

    for (const query of schemaQueries) {
      try {
        await this.connection.executeQuery(query);
        console.log(`✅ ${query.split(' ')[1]}: ${query.split(' ')[2]}`);
      } catch (error: any) {
        console.log(`⚠️  Schema already exists or error: ${query.split(' ')[2]}`);
      }
    }

    // Create tier nodes using CREATE OR REPLACE (compatible with older Neo4j)
    const tierNames = {
      1: "Beginner",
      2: "Novice", 
      3: "Journeyman",
      4: "Adept",
      5: "Expert",
      6: "Master",
      7: "Grandmaster",
      8: "Elder"
    };

    for (let tier = 1; tier <= 8; tier++) {
      await this.connection.executeQuery(`
        MERGE (t:Tier {level: $tier})
        SET t.name = $tierName, t.updatedAt = datetime()
      `, { 
        tier: tier, 
        tierName: tierNames[tier as keyof typeof tierNames] 
      });

      // Set createdAt only if it doesn't exist
      await this.connection.executeQuery(`
        MATCH (t:Tier {level: $tier})
        WHERE t.createdAt IS NULL
        SET t.createdAt = datetime()
      `, { tier: tier });
    }

    console.log('✅ Database schema created successfully');
  }

  /**
   * Populate database with parsed items
   */
  async populateItems(items: ParsedItem[]) {
    console.log(`📦 Populating database with ${items.length} items...`);

    const batchSize = 50; // Reduced batch size for stability
    let processed = 0;
    let created = 0;
    let errors = 0;

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      for (const item of batch) {
        try {
          // Create/merge category
          await this.connection.executeQuery(`
            MERGE (c:Category {name: $category})
            SET c.updatedAt = datetime()
          `, { category: item.category });

          await this.connection.executeQuery(`
            MATCH (c:Category {name: $category})
            WHERE c.createdAt IS NULL
            SET c.createdAt = datetime()
          `, { category: item.category });

          // Create/merge subcategory
          if (item.subcategory) {
            await this.connection.executeQuery(`
              MERGE (sc:Subcategory {name: $subcategory})
              SET sc.updatedAt = datetime()
            `, { subcategory: item.subcategory });

            await this.connection.executeQuery(`
              MATCH (sc:Subcategory {name: $subcategory})
              WHERE sc.createdAt IS NULL
              SET sc.createdAt = datetime()
            `, { subcategory: item.subcategory });

            await this.connection.executeQuery(`
              MATCH (c:Category {name: $category}), (sc:Subcategory {name: $subcategory})
              MERGE (c)-[:HAS_SUBCATEGORY]->(sc)
            `, { category: item.category, subcategory: item.subcategory });
          }

          // Create/merge item
          await this.connection.executeQuery(`
            MERGE (i:Item {id: $itemId})
            SET i.name = $cleanName,
                i.originalName = $originalName,
                i.category = $category,
                i.subcategory = $subcategory,
                i.tier = $tier,
                i.enchantment = $enchantment,
                i.baseItemId = $baseItemId,
                i.updatedAt = datetime()
          `, {
            itemId: item.itemId,
            cleanName: item.cleanName,
            originalName: item.originalName,
            category: item.category,
            subcategory: item.subcategory,
            tier: item.tier,
            enchantment: item.enchantment,
            baseItemId: item.baseItemId
          });

          await this.connection.executeQuery(`
            MATCH (i:Item {id: $itemId})
            WHERE i.createdAt IS NULL
            SET i.createdAt = datetime()
          `, { itemId: item.itemId });

          // Create relationships
          await this.connection.executeQuery(`
            MATCH (i:Item {id: $itemId}), (c:Category {name: $category}), (t:Tier {level: $tier})
            MERGE (i)-[:BELONGS_TO]->(c)
            MERGE (i)-[:HAS_TIER]->(t)
          `, { itemId: item.itemId, category: item.category, tier: item.tier });

          if (item.subcategory) {
            await this.connection.executeQuery(`
              MATCH (i:Item {id: $itemId}), (sc:Subcategory {name: $subcategory})
              MERGE (i)-[:BELONGS_TO]->(sc)
            `, { itemId: item.itemId, subcategory: item.subcategory });
          }

          // Create enchantment relationships for non-base items
          if (item.enchantment > 0) {
            await this.connection.executeQuery(`
              MATCH (base:Item {id: $baseItemId}), (enchanted:Item {id: $itemId})
              WHERE base.id <> enchanted.id
              MERGE (enchanted)-[:ENCHANTED_FROM]->(base)
              SET enchanted.enchantmentLevel = $enchantment
            `, { 
              baseItemId: item.baseItemId, 
              itemId: item.itemId, 
              enchantment: item.enchantment 
            });
          }

          created++;
        } catch (error: any) {
          console.error(`❌ Error processing item ${item.itemId}:`, error.message);
          errors++;
        }

        processed++;
      }

      console.log(`📈 Progress: ${processed}/${items.length} (${Math.round(processed/items.length*100)}%)`);
    }

    console.log('\n✅ Population completed:');
    console.log(`  - Total processed: ${processed}`);
    console.log(`  - Successfully created: ${created}`);
    console.log(`  - Errors: ${errors}`);
  }

  /**
   * Show database statistics
   */
  async showStats() {
    console.log('\n📊 Database Statistics:');

    const queries = [
      { label: 'Total Items', query: 'MATCH (i:Item) RETURN count(i) as count' },
      { label: 'Categories', query: 'MATCH (c:Category) RETURN count(c) as count' },
      { label: 'Subcategories', query: 'MATCH (sc:Subcategory) RETURN count(sc) as count' },
      { label: 'Tiers', query: 'MATCH (t:Tier) RETURN count(t) as count' },
      { label: 'Base Items', query: 'MATCH (i:Item) WHERE i.enchantment = 0 RETURN count(i) as count' },
      { label: 'Enchanted Items', query: 'MATCH (i:Item) WHERE i.enchantment > 0 RETURN count(i) as count' }
    ];

    for (const { label, query } of queries) {
      try {
        const result = await this.connection.executeQuery(query);
        const count = result[0]?.count?.low || result[0]?.count || 0;
        console.log(`  - ${label}: ${count}`);
      } catch (error: any) {
        console.log(`  - ${label}: Error retrieving count`);
      }
    }

    // Show items by category
    console.log('\n📋 Items by Category:');
    const categoryResult = await this.connection.executeQuery(`
      MATCH (i:Item)
      RETURN i.category as category, count(i) as count
      ORDER BY count DESC
    `);

    for (const row of categoryResult) {
      const count = row.count?.low || row.count || 0;
      console.log(`  - ${row.category}: ${count}`);
    }

    // Show sample cleaned names
    console.log('\n🧹 Sample Name Cleaning Results:');
    const sampleResult = await this.connection.executeQuery(`
      MATCH (i:Item)
      WHERE i.originalName <> i.name
      RETURN i.originalName as original, i.name as cleaned
      LIMIT 10
    `);

    for (const row of sampleResult) {
      console.log(`  - "${row.original}" → "${row.cleaned}"`);
    }
  }

  /**
   * Verify data integrity
   */
  async verifyData() {
    console.log('\n🔍 Verifying Data Integrity:');

    const checks = [
      {
        name: 'Items with empty names',
        query: 'MATCH (i:Item) WHERE i.name = "" OR i.name IS NULL RETURN count(i) as count'
      },
      {
        name: 'Items without categories',
        query: 'MATCH (i:Item) WHERE NOT (i)-[:BELONGS_TO]->(:Category) RETURN count(i) as count'
      },
      {
        name: 'Items without tiers',
        query: 'MATCH (i:Item) WHERE NOT (i)-[:HAS_TIER]->(:Tier) RETURN count(i) as count'
      },
      {
        name: 'Orphaned enchanted items',
        query: `
          MATCH (i:Item) 
          WHERE i.enchantment > 0 AND NOT (i)-[:ENCHANTED_FROM]->(:Item)
          RETURN count(i) as count
        `
      }
    ];

    let totalIssues = 0;
    for (const check of checks) {
      const result = await this.connection.executeQuery(check.query);
      const count = result[0]?.count?.low || result[0]?.count || 0;
      console.log(`  - ${check.name}: ${count}`);
      totalIssues += count;
    }

    if (totalIssues === 0) {
      console.log('✅ No data integrity issues found!');
    } else {
      console.log(`⚠️  Found ${totalIssues} data integrity issues`);
    }
  }
}

async function main() {
  const parser = new ItemParser();
  
  try {
    console.log('🚀 Starting Albion Online Database Population');
    console.log('============================================\n');

    await parser.initialize();

    // Parse item file
    const itemFilePath = path.join(__dirname, '..', 'item.txt');
    if (!fs.existsSync(itemFilePath)) {
      throw new Error(`Item file not found: ${itemFilePath}`);
    }

    const items = parser.parseItemFile(itemFilePath);
    console.log(`📄 Parsed ${items.length} items from item.txt`);

    // Show sample of cleaning
    console.log('\n🧹 Sample Name Cleaning:');
    for (let i = 0; i < Math.min(5, items.length); i++) {
      const item = items[i];
      console.log(`  - "${item.originalName}" → "${item.cleanName}"`);
    }

    // Create schema
    await parser.createSchema();

    // Populate database
    await parser.populateItems(items);

    // Show statistics
    await parser.showStats();

    // Verify data
    await parser.verifyData();

    console.log('\n🎉 Database population completed successfully!');
    console.log('============================================\n');

  } catch (error: any) {
    console.error('❌ Database population failed:', error.message);
    process.exit(1);
  } finally {
    await parser.disconnect();
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

export { ItemParser };