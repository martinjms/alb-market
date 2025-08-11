# Database Audit Report

**Generated:** 2025-08-11T13:47:14.018Z
**Database:** Neo4j ALB Market

## Executive Summary

The database contains **8,226 items** with **0 recipes** and **0 price entries** across **17 categories** and **9 tiers**.

## Overview Statistics

| Metric | Count |
|--------|-------|
| Total Items | 8,226 |
| Total Recipes | 0 |
| Total Prices | 0 |
| Total Categories | 17 |
| Total Tiers | 9 |
| Total Relationships | 20,989 |

## Item Analysis

### Items by Category
No category data available

### Items by Tier
- **Tier 0**: 352 items
- **Tier 1**: 51 items
- **Tier 2**: 97 items
- **Tier 3**: 168 items
- **Tier 4**: 1,538 items
- **Tier 5**: 1,496 items
- **Tier 6**: 1,525 items
- **Tier 7**: 1,430 items
- **Tier 8**: 1,569 items

### Data Completeness

| Metric | With Data | Missing Data | Completion Rate |
|--------|-----------|-------------|----------------|
| **Icons** | 0 | 8,226 | 0.0% |
| **Categories** | 0 | 8,226 | 0.0% |
| **Prices** | 0 | 8,226 | 0.0% |

## Recipe Analysis

- **Total Recipes**: 0
- **Recipes with Ingredients**: 0
- **Recipes without Ingredients**: 0
- **Average Ingredients per Recipe**: 0

## Price Analysis

- **Total Price Entries**: 0
- **Items with Price Data**: 0
- **Items without Price Data**: 8,226
- **Average Prices per Item**: 0

## Relationship Analysis

### Relationships by Type
- **HAS_TIER**: 7,874
- **HAS_SUBCATEGORY**: 10
- **BELONGS_TO_CATEGORY**: 0
- **BELONGS_TO_SUBCATEGORY**: 0
- **HAS_PRICE**: 0
- **REQUIRES**: 0
- **PRODUCES**: 0

## Data Quality Issues

### Items Missing Categories (50 items)
- `null`: Scraps of Hide
- `null`: Rugged Hide
- `null`: Thin Hide
- `null`: Medium Hide
- `null`: Heavy Hide
- `null`: Robust Hide
- `null`: Thick Hide
- `null`: Resilient Hide
- `null`: Rough Logs
- `null`: Birch Logs
- *...and 40 more*

### Items Missing Icons (50 items)
- `null`: Scraps of Hide (Tier 1)
- `null`: Rugged Hide (Tier 2)
- `null`: Thin Hide (Tier 3)
- `null`: Medium Hide (Tier 4)
- `null`: Heavy Hide (Tier 5)
- `null`: Robust Hide (Tier 6)
- `null`: Thick Hide (Tier 7)
- `null`: Resilient Hide (Tier 8)
- `null`: Rough Logs (Tier 1)
- `null`: Birch Logs (Tier 2)
- *...and 40 more*

### Items Without Prices (50 items)
- `null`: Scraps of Hide (Tier 1)
- `null`: Rugged Hide (Tier 2)
- `null`: Thin Hide (Tier 3)
- `null`: Medium Hide (Tier 4)
- `null`: Heavy Hide (Tier 5)
- `null`: Robust Hide (Tier 6)
- `null`: Thick Hide (Tier 7)
- `null`: Resilient Hide (Tier 8)
- `null`: Rough Logs (Tier 1)
- `null`: Birch Logs (Tier 2)
- *...and 40 more*

### Duplicate Items (20 groups)
- **Unknown Item**: 95 instances
- **Bow**: 46 instances
- **Broadsword**: 45 instances
- **Scholar Sandals**: 26 instances
- **Bag**: 26 instances
- **Pickaxe**: 26 instances
- **Mercenary Hood**: 26 instances
- **Mercenary Jacket**: 26 instances
- **Shield**: 26 instances
- **Cape**: 26 instances
- **Fire Staff**: 26 instances
- **Soldier Helmet**: 26 instances
- **Scholar Robe**: 26 instances
- **Undead Cape**: 25 instances
- **Scholar Cowl**: 25 instances
- **Smuggler Cape**: 25 instances
- **Muisak**: 25 instances
- **Thetford Cape**: 25 instances
- **Caitiff Shield**: 25 instances
- **Facebreaker**: 25 instances

## Recommendations

- 🏷️  8226 items are missing category assignments (Issue #7)
- 🖼️  8226 items are missing icon URLs (Issue #8)
- 💰 8226 items have no price data (Issue #9)
- ⚠️  Found 20 items with duplicate names - review for data integrity

## Next Steps

Based on this audit, the following GitHub issues should be prioritized:

1. **Issue #7**: Category Assignment - 8226 items need categories
2. **Issue #8**: Icon URL Enrichment - 8226 items need icons
3. **Issue #9**: Price Data Collection - 8226 items need pricing

---

*This report was generated automatically by the database audit script.*
*Run `npm run audit` to generate an updated report.*
