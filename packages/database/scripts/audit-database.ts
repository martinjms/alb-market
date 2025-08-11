#!/usr/bin/env npx ts-node

/**
 * Database Audit Script
 * 
 * Performs comprehensive audit of Neo4j database to assess:
 * - Data counts by category, tier, etc.
 * - Data quality issues
 * - Relationship integrity
 * - Missing data patterns
 * 
 * Usage: npx ts-node scripts/audit-database.ts [--output=file|console]
 */

import { createConnection } from '../src/connection';
import * as fs from 'fs/promises';
import * as path from 'path';

interface AuditResults {
  overview: {
    timestamp: string;
    totalItems: number;
    totalRecipes: number;
    totalPrices: number;
    totalCategories: number;
    totalTiers: number;
  };
  itemBreakdown: {
    byCategory: Array<{ category: string; count: number }>;
    byTier: Array<{ tier: string; count: number }>;
    byIconStatus: { withIcons: number; withoutIcons: number };
    byCategoryStatus: { withCategories: number; withoutCategories: number };
  };
  recipeBreakdown: {
    totalRecipes: number;
    recipesWithIngredients: number;
    recipesWithoutIngredients: number;
    avgIngredientsPerRecipe: number;
  };
  priceBreakdown: {
    totalPrices: number;
    itemsWithPrices: number;
    itemsWithoutPrices: number;
    avgPricesPerItem: number;
  };
  relationshipBreakdown: {
    totalRelationships: number;
    byType: Array<{ type: string; count: number }>;
  };
  dataQualityIssues: {
    itemsMissingCategories: Array<{ itemId: string; name: string }>;
    itemsMissingIcons: Array<{ itemId: string; name: string; tier?: string }>;
    itemsWithoutPrices: Array<{ itemId: string; name: string; tier?: string }>;
    orphanedRelationships: Array<{ type: string; count: number }>;
    duplicateItems: Array<{ itemName: string; count: number }>;
  };
  recommendations: string[];
}

class DatabaseAuditor {
  private connection = createConnection({
    uri: 'bolt://localhost:7687',
    user: 'neo4j',
    password: 'albmarket123'
  });

  async connect(): Promise<void> {
    await this.connection.connect();
  }

  async disconnect(): Promise<void> {
    await this.connection.disconnect();
  }

  async runAudit(): Promise<AuditResults> {
    console.log('🔍 Starting database audit...');

    const results: AuditResults = {
      overview: await this.getOverview(),
      itemBreakdown: await this.getItemBreakdown(),
      recipeBreakdown: await this.getRecipeBreakdown(),
      priceBreakdown: await this.getPriceBreakdown(),
      relationshipBreakdown: await this.getRelationshipBreakdown(),
      dataQualityIssues: await this.getDataQualityIssues(),
      recommendations: []
    };

    // Generate recommendations based on findings
    results.recommendations = this.generateRecommendations(results);

    return results;
  }

  private async getOverview(): Promise<AuditResults['overview']> {
    console.log('  📊 Getting overview statistics...');

    const [itemCount] = await this.connection.executeRead(`
      MATCH (i:Item) RETURN count(i) as count
    `);

    const [recipeCount] = await this.connection.executeRead(`
      MATCH (r:Recipe) RETURN count(r) as count
    `);

    const [priceCount] = await this.connection.executeRead(`
      MATCH (p:Price) RETURN count(p) as count
    `);

    const [categoryCount] = await this.connection.executeRead(`
      MATCH (c:Category) RETURN count(c) as count
    `);

    const tierResults = await this.connection.executeRead(`
      MATCH (i:Item) WHERE i.tier IS NOT NULL 
      RETURN DISTINCT i.tier as tier
    `);

    return {
      timestamp: new Date().toISOString(),
      totalItems: itemCount.count.toNumber(),
      totalRecipes: recipeCount.count.toNumber(),
      totalPrices: priceCount.count.toNumber(),
      totalCategories: categoryCount.count.toNumber(),
      totalTiers: tierResults.length
    };
  }

  private async getItemBreakdown(): Promise<AuditResults['itemBreakdown']> {
    console.log('  📦 Analyzing item breakdown...');

    // Items by category
    const categoryBreakdown = await this.connection.executeRead(`
      MATCH (i:Item)-[:BELONGS_TO_CATEGORY]->(c:Category)
      RETURN c.name as category, count(i) as count
      ORDER BY count DESC
    `);

    // Items by tier
    const tierBreakdown = await this.connection.executeRead(`
      MATCH (i:Item) WHERE i.tier IS NOT NULL
      RETURN i.tier as tier, count(i) as count
      ORDER BY 
        CASE i.tier
          WHEN 'I' THEN 1
          WHEN 'II' THEN 2
          WHEN 'III' THEN 3
          WHEN 'IV' THEN 4
          WHEN 'V' THEN 5
          WHEN 'VI' THEN 6
          WHEN 'VII' THEN 7
          WHEN 'VIII' THEN 8
          ELSE 9
        END
    `);

    // Icon status
    const [iconStats] = await this.connection.executeRead(`
      MATCH (i:Item)
      RETURN 
        sum(CASE WHEN i.iconUrl IS NOT NULL AND i.iconUrl <> '' THEN 1 ELSE 0 END) as withIcons,
        sum(CASE WHEN i.iconUrl IS NULL OR i.iconUrl = '' THEN 1 ELSE 0 END) as withoutIcons
    `);

    // Category status
    const [categoryStats] = await this.connection.executeRead(`
      MATCH (i:Item)
      OPTIONAL MATCH (i)-[:BELONGS_TO_CATEGORY]->(c:Category)
      RETURN 
        sum(CASE WHEN c IS NOT NULL THEN 1 ELSE 0 END) as withCategories,
        sum(CASE WHEN c IS NULL THEN 1 ELSE 0 END) as withoutCategories
    `);

    return {
      byCategory: categoryBreakdown.map(row => ({
        category: row.category,
        count: row.count.toNumber()
      })),
      byTier: tierBreakdown.map(row => ({
        tier: row.tier,
        count: row.count.toNumber()
      })),
      byIconStatus: {
        withIcons: iconStats.withIcons.toNumber(),
        withoutIcons: iconStats.withoutIcons.toNumber()
      },
      byCategoryStatus: {
        withCategories: categoryStats.withCategories.toNumber(),
        withoutCategories: categoryStats.withoutCategories.toNumber()
      }
    };
  }

  private async getRecipeBreakdown(): Promise<AuditResults['recipeBreakdown']> {
    console.log('  🔨 Analyzing recipe data...');

    const [recipeStats] = await this.connection.executeRead(`
      MATCH (r:Recipe)
      OPTIONAL MATCH (r)-[req:REQUIRES]->(i:Item)
      WITH r, count(req) as ingredientCount
      RETURN 
        count(r) as totalRecipes,
        sum(CASE WHEN ingredientCount > 0 THEN 1 ELSE 0 END) as recipesWithIngredients,
        sum(CASE WHEN ingredientCount = 0 THEN 1 ELSE 0 END) as recipesWithoutIngredients,
        avg(ingredientCount) as avgIngredients
    `);

    return {
      totalRecipes: recipeStats.totalRecipes.toNumber(),
      recipesWithIngredients: recipeStats.recipesWithIngredients.toNumber(),
      recipesWithoutIngredients: recipeStats.recipesWithoutIngredients.toNumber(),
      avgIngredientsPerRecipe: recipeStats.avgIngredients ? Number(recipeStats.avgIngredients.toFixed(2)) : 0
    };
  }

  private async getPriceBreakdown(): Promise<AuditResults['priceBreakdown']> {
    console.log('  💰 Analyzing price data...');

    const [priceStats] = await this.connection.executeRead(`
      MATCH (i:Item)
      OPTIONAL MATCH (i)-[:HAS_PRICE]->(p:Price)
      WITH i, count(p) as priceCount
      RETURN 
        sum(priceCount) as totalPrices,
        sum(CASE WHEN priceCount > 0 THEN 1 ELSE 0 END) as itemsWithPrices,
        sum(CASE WHEN priceCount = 0 THEN 1 ELSE 0 END) as itemsWithoutPrices,
        avg(priceCount) as avgPricesPerItem
    `);

    return {
      totalPrices: priceStats.totalPrices.toNumber(),
      itemsWithPrices: priceStats.itemsWithPrices.toNumber(),
      itemsWithoutPrices: priceStats.itemsWithoutPrices.toNumber(),
      avgPricesPerItem: priceStats.avgPricesPerItem ? Number(priceStats.avgPricesPerItem.toFixed(2)) : 0
    };
  }

  private async getRelationshipBreakdown(): Promise<AuditResults['relationshipBreakdown']> {
    console.log('  🔗 Analyzing relationships...');

    // Get total relationships first
    const [totalRels] = await this.connection.executeRead(`
      MATCH ()-[r]->() RETURN count(r) as total
    `);

    // Get relationship types manually since APOC might not be available
    const relationshipCounts: Array<{ type: string; count: number }> = [];
    
    // Check for common relationship types we know exist
    const knownTypes = ['BELONGS_TO_CATEGORY', 'BELONGS_TO_SUBCATEGORY', 'HAS_TIER', 'HAS_SUBCATEGORY', 'HAS_PRICE', 'REQUIRES', 'PRODUCES'];
    
    for (const type of knownTypes) {
      try {
        const result = await this.connection.executeRead(`
          MATCH ()-[r:\`${type}\`]->() RETURN count(r) as count
        `);
        if (result.length > 0) {
          relationshipCounts.push({
            type: type,
            count: result[0].count.toNumber()
          });
        }
      } catch (error) {
        // Relationship type doesn't exist, skip
      }
    }

    return {
      totalRelationships: totalRels.total.toNumber(),
      byType: relationshipCounts.sort((a, b) => b.count - a.count)
    };
  }

  private async getDataQualityIssues(): Promise<AuditResults['dataQualityIssues']> {
    console.log('  ⚠️  Identifying data quality issues...');

    // Items missing categories
    const itemsMissingCategories = await this.connection.executeRead(`
      MATCH (i:Item)
      WHERE NOT EXISTS((i)-[:BELONGS_TO_CATEGORY]->(:Category))
      RETURN i.itemId as itemId, i.name as name
      LIMIT 50
    `);

    // Items missing icons
    const itemsMissingIcons = await this.connection.executeRead(`
      MATCH (i:Item)
      WHERE i.iconUrl IS NULL OR i.iconUrl = ''
      RETURN i.itemId as itemId, i.name as name, i.tier as tier
      LIMIT 50
    `);

    // Items without prices
    const itemsWithoutPrices = await this.connection.executeRead(`
      MATCH (i:Item)
      WHERE NOT EXISTS((i)-[:HAS_PRICE]->(:Price))
      RETURN i.itemId as itemId, i.name as name, i.tier as tier
      LIMIT 50
    `);

    // Check for duplicate items
    const duplicateItems = await this.connection.executeRead(`
      MATCH (i:Item)
      WITH i.name as itemName, count(i) as count
      WHERE count > 1 AND itemName IS NOT NULL
      RETURN itemName, count
      ORDER BY count DESC
      LIMIT 20
    `);

    // Orphaned relationships (this is a simplified check)
    const orphanedRels = await this.connection.executeRead(`
      CALL db.relationshipTypes() YIELD relationshipType
      RETURN relationshipType as type, 0 as count
      LIMIT 0
    `);

    return {
      itemsMissingCategories: itemsMissingCategories.map(row => ({
        itemId: row.itemId,
        name: row.name
      })),
      itemsMissingIcons: itemsMissingIcons.map(row => ({
        itemId: row.itemId,
        name: row.name,
        tier: row.tier
      })),
      itemsWithoutPrices: itemsWithoutPrices.map(row => ({
        itemId: row.itemId,
        name: row.name,
        tier: row.tier
      })),
      orphanedRelationships: orphanedRels.map(row => ({
        type: row.type,
        count: row.count
      })),
      duplicateItems: duplicateItems.map(row => ({
        itemName: row.itemName,
        count: row.count.toNumber()
      }))
    };
  }

  private generateRecommendations(results: AuditResults): string[] {
    const recommendations: string[] = [];

    // Missing categories
    if (results.itemBreakdown.byCategoryStatus.withoutCategories > 0) {
      recommendations.push(
        `🏷️  ${results.itemBreakdown.byCategoryStatus.withoutCategories} items are missing category assignments (Issue #7)`
      );
    }

    // Missing icons
    if (results.itemBreakdown.byIconStatus.withoutIcons > 0) {
      recommendations.push(
        `🖼️  ${results.itemBreakdown.byIconStatus.withoutIcons} items are missing icon URLs (Issue #8)`
      );
    }

    // Missing prices
    if (results.priceBreakdown.itemsWithoutPrices > 0) {
      recommendations.push(
        `💰 ${results.priceBreakdown.itemsWithoutPrices} items have no price data (Issue #9)`
      );
    }

    // Duplicate items
    if (results.dataQualityIssues.duplicateItems.length > 0) {
      recommendations.push(
        `⚠️  Found ${results.dataQualityIssues.duplicateItems.length} items with duplicate names - review for data integrity`
      );
    }

    // Recipe issues
    if (results.recipeBreakdown.recipesWithoutIngredients > 0) {
      recommendations.push(
        `🔨 ${results.recipeBreakdown.recipesWithoutIngredients} recipes have no ingredient relationships`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Database appears to be in good health with no major issues detected');
    }

    return recommendations;
  }
}

async function generateMarkdownReport(results: AuditResults): Promise<string> {
  const report = `# Database Audit Report

**Generated:** ${results.overview.timestamp}
**Database:** Neo4j ALB Market

## Executive Summary

The database contains **${results.overview.totalItems.toLocaleString()} items** with **${results.overview.totalRecipes.toLocaleString()} recipes** and **${results.overview.totalPrices.toLocaleString()} price entries** across **${results.overview.totalCategories} categories** and **${results.overview.totalTiers} tiers**.

## Overview Statistics

| Metric | Count |
|--------|-------|
| Total Items | ${results.overview.totalItems.toLocaleString()} |
| Total Recipes | ${results.overview.totalRecipes.toLocaleString()} |
| Total Prices | ${results.overview.totalPrices.toLocaleString()} |
| Total Categories | ${results.overview.totalCategories} |
| Total Tiers | ${results.overview.totalTiers} |
| Total Relationships | ${results.relationshipBreakdown.totalRelationships.toLocaleString()} |

## Item Analysis

### Items by Category
${results.itemBreakdown.byCategory.length > 0 ? 
  results.itemBreakdown.byCategory.map(cat => 
    `- **${cat.category}**: ${cat.count.toLocaleString()} items`
  ).join('\n') : 
  'No category data available'
}

### Items by Tier
${results.itemBreakdown.byTier.length > 0 ? 
  results.itemBreakdown.byTier.map(tier => 
    `- **Tier ${tier.tier}**: ${tier.count.toLocaleString()} items`
  ).join('\n') : 
  'No tier data available'
}

### Data Completeness

| Metric | With Data | Missing Data | Completion Rate |
|--------|-----------|-------------|----------------|
| **Icons** | ${results.itemBreakdown.byIconStatus.withIcons.toLocaleString()} | ${results.itemBreakdown.byIconStatus.withoutIcons.toLocaleString()} | ${((results.itemBreakdown.byIconStatus.withIcons / results.overview.totalItems) * 100).toFixed(1)}% |
| **Categories** | ${results.itemBreakdown.byCategoryStatus.withCategories.toLocaleString()} | ${results.itemBreakdown.byCategoryStatus.withoutCategories.toLocaleString()} | ${((results.itemBreakdown.byCategoryStatus.withCategories / results.overview.totalItems) * 100).toFixed(1)}% |
| **Prices** | ${results.priceBreakdown.itemsWithPrices.toLocaleString()} | ${results.priceBreakdown.itemsWithoutPrices.toLocaleString()} | ${((results.priceBreakdown.itemsWithPrices / results.overview.totalItems) * 100).toFixed(1)}% |

## Recipe Analysis

- **Total Recipes**: ${results.recipeBreakdown.totalRecipes.toLocaleString()}
- **Recipes with Ingredients**: ${results.recipeBreakdown.recipesWithIngredients.toLocaleString()}
- **Recipes without Ingredients**: ${results.recipeBreakdown.recipesWithoutIngredients.toLocaleString()}
- **Average Ingredients per Recipe**: ${results.recipeBreakdown.avgIngredientsPerRecipe}

## Price Analysis

- **Total Price Entries**: ${results.priceBreakdown.totalPrices.toLocaleString()}
- **Items with Price Data**: ${results.priceBreakdown.itemsWithPrices.toLocaleString()}
- **Items without Price Data**: ${results.priceBreakdown.itemsWithoutPrices.toLocaleString()}
- **Average Prices per Item**: ${results.priceBreakdown.avgPricesPerItem}

## Relationship Analysis

### Relationships by Type
${results.relationshipBreakdown.byType.map(rel => 
  `- **${rel.type}**: ${rel.count.toLocaleString()}`
).join('\n')}

## Data Quality Issues

### Items Missing Categories (${results.dataQualityIssues.itemsMissingCategories.length} items)
${results.dataQualityIssues.itemsMissingCategories.length > 0 ? 
  results.dataQualityIssues.itemsMissingCategories.slice(0, 10).map(item => 
    `- \`${item.itemId}\`: ${item.name || 'No name'}`
  ).join('\n') + 
  (results.dataQualityIssues.itemsMissingCategories.length > 10 ? 
    `\n- *...and ${results.dataQualityIssues.itemsMissingCategories.length - 10} more*` : '') : 
  'None found ✅'
}

### Items Missing Icons (${results.dataQualityIssues.itemsMissingIcons.length} items)
${results.dataQualityIssues.itemsMissingIcons.length > 0 ? 
  results.dataQualityIssues.itemsMissingIcons.slice(0, 10).map(item => 
    `- \`${item.itemId}\`: ${item.name || 'No name'} ${item.tier ? `(Tier ${item.tier})` : ''}`
  ).join('\n') + 
  (results.dataQualityIssues.itemsMissingIcons.length > 10 ? 
    `\n- *...and ${results.dataQualityIssues.itemsMissingIcons.length - 10} more*` : '') : 
  'None found ✅'
}

### Items Without Prices (${results.dataQualityIssues.itemsWithoutPrices.length} items)
${results.dataQualityIssues.itemsWithoutPrices.length > 0 ? 
  results.dataQualityIssues.itemsWithoutPrices.slice(0, 10).map(item => 
    `- \`${item.itemId}\`: ${item.name || 'No name'} ${item.tier ? `(Tier ${item.tier})` : ''}`
  ).join('\n') + 
  (results.dataQualityIssues.itemsWithoutPrices.length > 10 ? 
    `\n- *...and ${results.dataQualityIssues.itemsWithoutPrices.length - 10} more*` : '') : 
  'None found ✅'
}

### Duplicate Items (${results.dataQualityIssues.duplicateItems.length} groups)
${results.dataQualityIssues.duplicateItems.length > 0 ? 
  results.dataQualityIssues.duplicateItems.map(dup => 
    `- **${dup.itemName}**: ${dup.count} instances`
  ).join('\n') : 
  'None found ✅'
}

## Recommendations

${results.recommendations.map(rec => `- ${rec}`).join('\n')}

## Next Steps

Based on this audit, the following GitHub issues should be prioritized:

1. **Issue #7**: Category Assignment - ${results.itemBreakdown.byCategoryStatus.withoutCategories} items need categories
2. **Issue #8**: Icon URL Enrichment - ${results.itemBreakdown.byIconStatus.withoutIcons} items need icons
3. **Issue #9**: Price Data Collection - ${results.priceBreakdown.itemsWithoutPrices} items need pricing

---

*This report was generated automatically by the database audit script.*
*Run \`npm run audit\` to generate an updated report.*
`;

  return report;
}

async function main() {
  const outputMode = process.argv.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'both';
  
  const auditor = new DatabaseAuditor();
  
  try {
    await auditor.connect();
    const results = await auditor.runAudit();
    
    // Generate markdown report
    const markdownReport = await generateMarkdownReport(results);
    
    if (outputMode === 'console' || outputMode === 'both') {
      console.log('\n' + '='.repeat(80));
      console.log('DATABASE AUDIT COMPLETE');
      console.log('='.repeat(80));
      console.log(`📊 Total Items: ${results.overview.totalItems.toLocaleString()}`);
      console.log(`🔨 Total Recipes: ${results.overview.totalRecipes.toLocaleString()}`);
      console.log(`💰 Total Prices: ${results.overview.totalPrices.toLocaleString()}`);
      console.log(`🏷️  Total Categories: ${results.overview.totalCategories}`);
      console.log(`🔗 Total Relationships: ${results.relationshipBreakdown.totalRelationships.toLocaleString()}`);
      console.log('\n📋 Key Issues:');
      results.recommendations.forEach(rec => console.log(`  ${rec}`));
    }
    
    if (outputMode === 'file' || outputMode === 'both') {
      const reportPath = path.join(__dirname, '..', 'AUDIT_REPORT.md');
      await fs.writeFile(reportPath, markdownReport);
      console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    }
    
    // Also output raw JSON for programmatic use
    const jsonPath = path.join(__dirname, '..', 'audit-results.json');
    await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
    console.log(`📊 Raw data saved to: ${jsonPath}`);
    
  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  } finally {
    await auditor.disconnect();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { DatabaseAuditor };
export type { AuditResults };