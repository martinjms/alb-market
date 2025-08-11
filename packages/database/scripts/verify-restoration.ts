#!/usr/bin/env npx ts-node

/**
 * Verification Script for Database Restoration
 * Checks what data was successfully restored
 */

import { createConnection } from '../src/connection';
import { DatabaseUtils } from '../src/utils';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = (level: string, message: string) => {
  const timestamp = new Date().toISOString();
  const levelColors: Record<string, string> = {
    INFO: colors.blue,
    SUCCESS: colors.green,
    WARNING: colors.yellow,
    ERROR: colors.red,
  };
  
  console.log(
    `${levelColors[level]}[${level}]${colors.reset} ${colors.cyan}${timestamp}${colors.reset} ${message}`
  );
};

async function main() {
  console.log('');
  console.log('='.repeat(60));
  console.log('      ALB Market Database Restoration Verification');
  console.log('='.repeat(60));
  console.log('');

  const connection = createConnection({
    uri: 'bolt://localhost:7687',
    user: 'neo4j',
    password: 'albmarket123',
  });

  try {
    await connection.connect();
    const utils = new DatabaseUtils(connection);
    
    // Get database statistics
    const stats = await utils.getDatabaseStats();
    
    log('INFO', '📊 Database Statistics:');
    log('INFO', `  - Total nodes: ${stats.nodeCount}`);
    log('INFO', `  - Total relationships: ${stats.relationshipCount}`);
    log('INFO', `  - Items: ${stats.itemCount}`);
    log('INFO', `  - Recipes: ${stats.recipeCount}`);
    log('INFO', `  - Cities: ${stats.cityCount}`);
    log('INFO', `  - Price records: ${stats.priceCount}`);
    
    // Get node counts by type
    const nodeCounts = await connection.executeRead(`
      MATCH (n)
      RETURN labels(n) as labels, count(n) as count
      ORDER BY count(n) DESC
    `);
    
    log('INFO', '📋 Node counts by type:');
    nodeCounts.forEach(row => {
      log('INFO', `  - ${row.labels.join(', ')}: ${row.count}`);
    });
    
    // Get relationship counts by type
    const relationshipCounts = await connection.executeRead(`
      MATCH ()-[r]->()
      RETURN type(r) as type, count(r) as count
      ORDER BY count(r) DESC
    `);
    
    log('INFO', '🔗 Relationship counts by type:');
    relationshipCounts.forEach(row => {
      log('INFO', `  - ${row.type}: ${row.count}`);
    });
    
    // Sample items by category
    const categories = await connection.executeRead(`
      MATCH (c:Category)
      RETURN c.name as name
      ORDER BY c.name
    `);
    
    log('INFO', '📦 Categories found:');
    for (const category of categories) {
      const itemCount = await connection.executeRead(`
        MATCH (i:Item {category: $categoryName})
        RETURN count(i) as count
      `, { categoryName: category.name });
      
      log('INFO', `  - ${category.name}: ${itemCount[0]?.count || 0} items`);
    }
    
    // Sample subcategories
    const subcategories = await connection.executeRead(`
      MATCH (s:Subcategory)
      RETURN s.name as name
      ORDER BY s.name
      LIMIT 15
    `);
    
    log('INFO', '📋 Sample subcategories:');
    subcategories.forEach(row => {
      log('INFO', `  - ${row.name}`);
    });
    
    // Tier distribution
    const tierCounts = await connection.executeRead(`
      MATCH (i:Item)
      WHERE i.tier IS NOT NULL
      RETURN i.tier as tier, count(i) as count
      ORDER BY i.tier
    `);
    
    log('INFO', '🎯 Items by tier:');
    tierCounts.forEach(row => {
      log('INFO', `  - Tier ${row.tier}: ${row.count} items`);
    });
    
    // Cities verification
    const cities = await connection.executeRead(`
      MATCH (c:City)
      RETURN c.name as name, c.safetyLevel as safety, c.isBlackMarket as isBlackMarket
      ORDER BY c.name
    `);
    
    log('INFO', '🏙️ Cities restored:');
    cities.forEach(city => {
      const blackMarket = city.isBlackMarket ? ' (Black Market)' : '';
      log('INFO', `  - ${city.name} (${city.safety})${blackMarket}`);
    });
    
    // Sample items with full details
    const sampleItems = await connection.executeRead(`
      MATCH (i:Item)
      WHERE i.category IS NOT NULL AND i.subcategory IS NOT NULL
      RETURN i.id, i.name, i.category, i.subcategory, i.tier, i.enchantmentLevel
      ORDER BY i.tier DESC, i.category
      LIMIT 10
    `);
    
    log('INFO', '🔍 Sample items with details:');
    sampleItems.forEach(item => {
      log('INFO', `  - ${item['i.name']} (${item['i.id']})`);
      log('INFO', `    Category: ${item['i.category']} → ${item['i.subcategory']}`);
      log('INFO', `    Tier: ${item['i.tier']}, Enchantment: ${item['i.enchantmentLevel']}`);
    });
    
    log('SUCCESS', '✅ Database verification completed successfully!');
    
    await connection.disconnect();
    
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : 'Unknown error';
    log('ERROR', `❌ Verification failed: ${errMessage}`);
    
    try {
      await connection.disconnect();
    } catch (disconnectError) {
      // ignore disconnect errors
    }
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export default main;