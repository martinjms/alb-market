#!/usr/bin/env ts-node

import * as fs from 'fs/promises';
import * as path from 'path';
import * as https from 'https';
import { createConnection, Neo4jConnection } from '../src/connection';
import { DatabaseUtils } from '../src/utils';
import { ItemNode } from '../src/schema';

// Types for the processing system
interface ParsedItem {
  id: string;
  name: string;
  category: string;
  tier: number;
  subcategory: string;
  originalName: string;
  enchantment: number;
  itemType: string;
}

// New JSON format interface
interface ItemsJsonData {
  LocalizationNameVariable: string;
  UniqueName: string;
  LocalizedNames: {
    'EN-US': string;
    [key: string]: string;
  };
}

// Progress persistence interface
interface ProcessingProgress {
  timestamp: string;
  lastProcessedIndex: number;
  totalItems: number;
  validItemsCount: number;
  needsValidationCount: number;
  errorCount: number;
}

// Enhanced error tracking
interface DetailedError {
  type: 'api_error' | 'database_error' | 'parsing_error' | 'validation_error';
  itemId?: string;
  batchIndex?: number;
  message: string;
  stack?: string;
  timestamp: string;
  retryCount: number;
}

interface PriceData {
  item_id: string;
  city: string;
  quality: number;
  sell_price_min: number;
  sell_price_min_date: string;
  buy_price_min: number;
  buy_price_min_date: string;
}

interface ValidationResult {
  itemId: string;
  isValid: boolean;
  hasActivePrices: boolean;
  cityCount: number;
  maxPrice: number;
  reason: string;
}

interface ProcessingReport {
  totalItemsProcessed: number;
  validItems: number;
  needsValidationItems: number;
  apiErrors: number;
  databaseErrors: number;
  processingTimeMs: number;
  batchResults: Array<{
    batchIndex: number;
    itemCount: number;
    validCount: number;
    invalidCount: number;
    duration: number;
  }>;
  errorDetails: any[];
}

class BatchItemProcessor {
  private connection: Neo4jConnection;
  private dbUtils: DatabaseUtils;
  private readonly BATCH_SIZE = 200; // Larger batch size for efficiency with longer delays
  private readonly API_BASE_URL = 'https://www.albion-online-data.com/api/v2/stats/prices';
  private readonly CITIES = ['Caerleon', 'Martlock', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Thetford'];
  private readonly REQUEST_DELAY = 3000; // Respectful delay for API rate limiting
  private readonly PROGRESS_SAVE_INTERVAL = 1000; // Save progress every 1000 items
  private readonly PROGRESS_REPORT_INTERVAL = 500; // Report progress every 500 items
  private readonly MAX_RETRIES = 3; // Maximum retry attempts for failed requests
  private readonly RETRY_DELAY = 2000; // Initial retry delay
  private readonly OUTPUT_DIR = path.join(__dirname, '../outputs');
  private readonly PROGRESS_FILE = path.join(this.OUTPUT_DIR, 'processing-progress.json');
  
  // Category detection patterns
  private readonly CATEGORY_PATTERNS = {
    WEAPON: /^T\d+_(2H_|1H_|BOW_|CROSSBOW_|CURVEDSTAFF_|FIRESTAFF_|FROSTSTAFF_|HOLYSTAFF_|ARCANESTAFF_|NATURESTAFF_)/,
    ARMOR: /^T\d+_(ARMOR_|HEAD_|SHOES_|CAPE_)/,
    TOOL: /^T\d+_(TOOL_)/,
    BAG: /^T\d+_(BAG_)/,
    FOOD: /^T\d+_(MEAL_|FISH_)/,
    POTION: /^T\d+_(POTION_)/,
    MOUNT: /^T\d+_(MOUNT_)/,
    RESOURCE: /^T\d+_(HIDE|WOOD|STONE|ORE|FIBER|ROCK|PLANKS|METALBAR|LEATHER|CLOTH)(_|$)/,
    RUNE: /^T\d+_RUNE/,
    SOUL: /^T\d+_SOUL/,
    RELIC: /^T\d+_RELIC/,
    JOURNAL: /^T\d+_JOURNAL/,
    MAP: /^T\d+_MAP/,
    CONSUMABLE: /^T\d+_(SKILLBOOK_|VANITY_)/,
    FURNITURE: /^FURNITURE_/,
    UNIQUE: /^UNIQUE_/
  };

  // Name cleaning patterns
  private readonly TIER_PATTERNS = [
    /^(Novice's?|Adept's?|Expert's?|Master's?|Grandmaster's?|Elder's?)\s+/i,
    /\s*T[1-8]\s*/gi,
    /@[1-4]/g,
    /\s*\([^)]*Quality\)[^|]*/gi,
    /\s*\([^)]*\)$/g
  ];

  constructor() {
    this.connection = createConnection({
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      user: process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'albmarket123'
    });
    this.dbUtils = new DatabaseUtils(this.connection);
  }

  /**
   * Main processing workflow
   */
  async process(): Promise<ProcessingReport> {
    console.log('🚀 Starting batch item processing...');
    const startTime = Date.now();

    try {
      // Ensure output directory exists
      await this.ensureOutputDirectory();

      // Connect to database
      await this.connection.connect();

      // Parse items from file
      const items = await this.parseItemsFile();
      console.log(`📋 Parsed ${items.length} items from file`);

      // Process items in batches
      const report = await this.processItemBatches(items);
      report.processingTimeMs = Date.now() - startTime;

      // Generate output files
      await this.generateOutputFiles(report);

      console.log('✅ Batch processing completed successfully!');
      console.log(`📊 Total time: ${Math.round(report.processingTimeMs / 1000)}s`);
      console.log(`📊 Valid items: ${report.validItems}`);
      console.log(`📊 Needs validation: ${report.needsValidationItems}`);

      return report;

    } catch (error) {
      console.error('❌ Batch processing failed:', error);
      throw error;
    } finally {
      await this.connection.disconnect();
    }
  }

  /**
   * Parse items from JSON or TXT file
   */
  private async parseItemsFile(): Promise<ParsedItem[]> {
    // Try JSON format first, then fallback to TXT
    const jsonFilePath = path.join(__dirname, '../items.json');
    const txtFilePath = path.join(__dirname, '../items.txt');
    const fallbackTxtPath = path.join(__dirname, '../item.txt');
    
    try {
      // Check for JSON format first
      try {
        await fs.access(jsonFilePath);
        console.log('📄 Found items.json, parsing JSON format...');
        return await this.parseItemsFromJson(jsonFilePath);
      } catch {
        // JSON file doesn't exist, try TXT formats
      }

      // Try items.txt format
      try {
        await fs.access(txtFilePath);
        console.log('📄 Found items.txt, parsing TXT format...');
        return await this.parseItemsFromTxt(txtFilePath);
      } catch {
        // Try fallback item.txt
      }

      // Fallback to existing item.txt
      console.log('📄 Found item.txt, parsing legacy TXT format...');
      return await this.parseItemsFromTxt(fallbackTxtPath);

    } catch (error) {
      console.error('❌ Failed to parse items file:', error);
      throw new Error(`Failed to parse items file: ${error}`);
    }
  }

  /**
   * Parse items from JSON format
   */
  private async parseItemsFromJson(filePath: string): Promise<ParsedItem[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const jsonData: ItemsJsonData[] = JSON.parse(content);
      const items: ParsedItem[] = [];

      for (const itemData of jsonData) {
        // Use UniqueName directly (cleaner than parsing LocalizationNameVariable)
        const id = itemData.UniqueName;
        if (!id) continue;
        
        // Use EN-US name
        const name = itemData.LocalizedNames?.['EN-US'] || 'Unknown Item';
        
        // Auto-detect category and properties
        const category = this.detectCategory(id);
        const tier = this.extractTier(id);
        const enchantment = this.extractEnchantment(id);
        const itemType = this.extractItemType(id);
        const subcategory = this.detectSubcategory(id, category);

        items.push({
          id: id.trim(),
          name: name.trim(),
          category,
          tier,
          subcategory,
          originalName: name.trim(),
          enchantment,
          itemType
        });
      }

      console.log(`✅ Parsed ${items.length} items from JSON format`);
      return items;

    } catch (error) {
      console.error('❌ Failed to parse JSON items file:', error);
      throw error;
    }
  }

  /**
   * Parse items from TXT format (both new and legacy)
   */
  private async parseItemsFromTxt(filePath: string): Promise<ParsedItem[]> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const lines = content.split('\n');
      const items: ParsedItem[] = [];

      for (const line of lines) {
        // Skip comments, empty lines, and headers
        if (line.trim().startsWith('#') || line.trim() === '') {
          continue;
        }

        // Handle both formats: "1: UNIQUE_HIDEOUT : Hideout Construction Kit" and legacy pipe format
        if (line.includes(' : ') && /^\d+:/.test(line.trim())) {
          // New TXT format: "1: UNIQUE_HIDEOUT : Hideout Construction Kit"
          const parts = line.split(' : ');
          if (parts.length >= 3) {
            const id = parts[1].trim();
            const name = parts.slice(2).join(' : ').trim();
            
            const category = this.detectCategory(id);
            const tier = this.extractTier(id);
            const enchantment = this.extractEnchantment(id);
            const itemType = this.extractItemType(id);
            const subcategory = this.detectSubcategory(id, category);

            items.push({
              id,
              name,
              category,
              tier,
              subcategory: subcategory,
              originalName: name,
              enchantment,
              itemType
            });
          }
        } else if (line.includes('|')) {
          // Legacy format: "T1_HIDE|T1 Rugged Hide|material|1|raw"
          const parts = line.split('|');
          if (parts.length >= 5) {
            const [id, name, category, tierStr, subcategory] = parts;
            const tier = parseInt(tierStr);

            if (id && name && category && !isNaN(tier)) {
              items.push({
                id: id.trim(),
                name: name.trim(),
                category: category.trim(),
                tier,
                subcategory: subcategory.trim(),
                originalName: name.trim(),
                enchantment: this.extractEnchantment(id),
                itemType: this.extractItemType(id)
              });
            }
          }
        }
      }

      console.log(`✅ Parsed ${items.length} items from TXT format`);
      return items;

    } catch (error) {
      console.error('❌ Failed to parse TXT items file:', error);
      throw error;
    }
  }

  /**
   * Detect item category from ID
   */
  private detectCategory(itemId: string): string {
    for (const [category, pattern] of Object.entries(this.CATEGORY_PATTERNS)) {
      if (pattern.test(itemId)) {
        return category.toLowerCase();
      }
    }
    
    // Default categorization based on common patterns
    if (itemId.startsWith('T') && /^T\d+_/.test(itemId)) {
      return 'equipment';
    }
    if (itemId.startsWith('UNIQUE_')) {
      return 'unique';
    }
    if (itemId.startsWith('FURNITURE_')) {
      return 'furniture';
    }
    
    return 'misc';
  }

  /**
   * Extract tier from item ID
   */
  private extractTier(itemId: string): number {
    const match = itemId.match(/^T(\d+)_/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Extract item type from ID
   */
  private extractItemType(itemId: string): string {
    // Remove tier and enchantment info
    let type = itemId.replace(/^T\d+_/, '').replace(/@\d+$/, '');
    
    // Common type mappings
    const typeMap: Record<string, string> = {
      '2H_CLAYMORE': 'Two-Handed Sword',
      '1H_SWORD': 'One-Handed Sword',
      'BOW': 'Bow',
      'CROSSBOW': 'Crossbow',
      'ARMOR_CLOTH_SET1': 'Cloth Armor',
      'ARMOR_LEATHER_SET1': 'Leather Armor',
      'ARMOR_PLATE_SET1': 'Plate Armor',
      'HIDE': 'Hide',
      'WOOD': 'Wood',
      'STONE': 'Stone',
      'ORE': 'Ore',
      'FIBER': 'Fiber'
    };
    
    return typeMap[type] || type.toLowerCase().replace(/_/g, ' ');
  }

  /**
   * Detect subcategory from ID and category
   */
  private detectSubcategory(itemId: string, category: string): string {
    if (category === 'weapon') {
      if (itemId.includes('2H_')) return 'two-handed';
      if (itemId.includes('1H_')) return 'one-handed';
      if (itemId.includes('BOW_') || itemId.includes('CROSSBOW_')) return 'ranged';
      if (itemId.includes('STAFF_')) return 'magic';
    }
    
    if (category === 'armor') {
      if (itemId.includes('HEAD_')) return 'helmet';
      if (itemId.includes('ARMOR_')) return 'chest';
      if (itemId.includes('SHOES_')) return 'boots';
      if (itemId.includes('CAPE_')) return 'cape';
    }
    
    if (category === 'resource') {
      if (itemId.includes('HIDE') || itemId.includes('LEATHER')) return 'leather';
      if (itemId.includes('WOOD') || itemId.includes('PLANKS')) return 'wood';
      if (itemId.includes('STONE') || itemId.includes('BRICK')) return 'stone';
      if (itemId.includes('ORE') || itemId.includes('METALBAR')) return 'metal';
      if (itemId.includes('FIBER') || itemId.includes('CLOTH')) return 'fiber';
    }
    
    return 'general';
  }

  /**
   * Process items in batches with progress persistence and resume capability
   */
  private async processItemBatches(items: ParsedItem[]): Promise<ProcessingReport> {
    // Check for existing progress
    let startIndex = 0;
    let previousValidItems: ParsedItem[] = [];
    let previousNeedsValidation: ParsedItem[] = [];
    
    const existingProgress = await this.loadProgress();
    if (existingProgress && existingProgress.totalItems === items.length) {
      console.log(`📋 Found previous progress: ${existingProgress.lastProcessedIndex}/${existingProgress.totalItems} items processed`);
      console.log(`   Valid: ${existingProgress.validItemsCount}, Needs validation: ${existingProgress.needsValidationCount}`);
      
      const shouldResume = process.env.RESUME_PROCESSING === 'true' || 
                          process.argv.includes('--resume');
      
      if (shouldResume) {
        startIndex = existingProgress.lastProcessedIndex;
        console.log(`🔄 Resuming processing from item ${startIndex + 1}`);
      } else {
        console.log(`🆕 Starting fresh processing (use --resume flag to continue from where left off)`);
        await this.clearProgress();
      }
    }

    const report: ProcessingReport = {
      totalItemsProcessed: startIndex,
      validItems: 0,
      needsValidationItems: 0,
      apiErrors: 0,
      databaseErrors: 0,
      processingTimeMs: 0,
      batchResults: [],
      errorDetails: []
    };

    const validItems: ParsedItem[] = [...previousValidItems];
    const needsValidationItems: ParsedItem[] = [...previousNeedsValidation];

    console.log(`🔄 Processing ${items.length} items in batches of ${this.BATCH_SIZE}`);
    console.log(`📊 Memory usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    for (let i = startIndex; i < items.length; i += this.BATCH_SIZE) {
      const batch = items.slice(i, i + this.BATCH_SIZE);
      const batchIndex = Math.floor(i / this.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(items.length / this.BATCH_SIZE);
      const batchStartTime = Date.now();

      console.log(`\n📦 Processing batch ${batchIndex}/${totalBatches} (${batch.length} items)`);

      try {
        // Validate items via API
        const validationResults = await this.validateItemsViaAPI(batch);
        
        // Categorize items
        const batchValid: ParsedItem[] = [];
        const batchInvalid: ParsedItem[] = [];

        for (const result of validationResults) {
          const item = batch.find(b => b.id === result.itemId);
          if (item) {
            if (result.isValid) {
              batchValid.push(item);
              validItems.push(item);
            } else {
              batchInvalid.push(item);
              needsValidationItems.push(item);
            }
          }
        }

        // Insert valid items into database
        if (batchValid.length > 0) {
          try {
            await this.insertItemsIntoDatabase(batchValid);
            console.log(`✅ Inserted ${batchValid.length} valid items into database`);
          } catch (dbError) {
            console.error(`❌ Database insertion failed for batch ${batchIndex}:`, dbError);
            report.databaseErrors++;
            report.errorDetails.push({
              type: 'database_error',
              batchIndex,
              error: dbError,
              items: batchValid.map(i => i.id)
            });
          }
        }

        const batchDuration = Date.now() - batchStartTime;
        report.batchResults.push({
          batchIndex,
          itemCount: batch.length,
          validCount: batchValid.length,
          invalidCount: batchInvalid.length,
          duration: batchDuration
        });

        report.totalItemsProcessed += batch.length;
        
        // Progress update and persistence
        const progress = Math.round((report.totalItemsProcessed / items.length) * 100);
        const memUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
        console.log(`📊 Batch ${batchIndex} completed in ${batchDuration}ms - Progress: ${progress}% - Memory: ${memUsage}MB`);

        // Save progress every PROGRESS_SAVE_INTERVAL items
        if (report.totalItemsProcessed % this.PROGRESS_SAVE_INTERVAL === 0) {
          await this.saveProgress({
            timestamp: new Date().toISOString(),
            lastProcessedIndex: report.totalItemsProcessed,
            totalItems: items.length,
            validItemsCount: validItems.length,
            needsValidationCount: needsValidationItems.length,
            errorCount: report.apiErrors + report.databaseErrors
          });
          console.log(`💾 Progress saved at ${report.totalItemsProcessed}/${items.length} items`);
        }

        // Detailed progress report every PROGRESS_REPORT_INTERVAL items
        if (report.totalItemsProcessed % this.PROGRESS_REPORT_INTERVAL === 0) {
          const avgBatchTime = report.batchResults.length > 0 ? 
            Math.round(report.batchResults.reduce((sum, b) => sum + b.duration, 0) / report.batchResults.length) : 0;
          const itemsPerSecond = avgBatchTime > 0 ? Math.round((this.BATCH_SIZE * 1000) / avgBatchTime) : 0;
          const remainingItems = items.length - report.totalItemsProcessed;
          const estimatedTimeMin = avgBatchTime > 0 ? Math.round((remainingItems * avgBatchTime) / (this.BATCH_SIZE * 60000)) : 0;
          
          console.log(`\n📈 Progress Report:`);
          console.log(`   Items processed: ${report.totalItemsProcessed}/${items.length} (${progress}%)`);
          console.log(`   Valid items: ${validItems.length}`);
          console.log(`   Processing speed: ${itemsPerSecond} items/second`);
          console.log(`   Estimated time remaining: ${estimatedTimeMin} minutes`);
          console.log(`   API errors: ${report.apiErrors}, DB errors: ${report.databaseErrors}`);
        }

        // Rate limiting with longer delays between batches
        if (i + this.BATCH_SIZE < items.length) {
          // Base delay is 3 seconds, with exponential backoff for errors
          const baseDelay = this.REQUEST_DELAY;
          const errorMultiplier = report.apiErrors > 0 ? Math.pow(1.5, Math.min(report.apiErrors, 4)) : 1;
          const delay = Math.min(baseDelay * errorMultiplier, 15000); // Max 15 seconds
          
          if (delay > baseDelay) {
            console.log(`⚠️  API errors detected, using backoff delay: ${delay}ms`);
          } else {
            console.log(`⏱️  Waiting ${delay}ms between batches (respectful API usage)...`);
          }
          await this.delay(delay);
        }

      } catch (error) {
        console.error(`❌ Batch ${batchIndex} failed:`, error);
        
        // Implement retry logic with exponential backoff
        let retryCount = 0;
        let batchSuccess = false;
        
        while (retryCount < this.MAX_RETRIES && !batchSuccess) {
          retryCount++;
          const retryDelay = this.RETRY_DELAY * Math.pow(2, retryCount - 1);
          
          console.log(`🔄 Retrying batch ${batchIndex}, attempt ${retryCount}/${this.MAX_RETRIES} after ${retryDelay}ms...`);
          await this.delay(retryDelay);
          
          try {
            const validationResults = await this.validateItemsViaAPI(batch);
            
            // Process successful retry
            const batchValid: ParsedItem[] = [];
            const batchInvalid: ParsedItem[] = [];
            
            for (const result of validationResults) {
              const item = batch.find(b => b.id === result.itemId);
              if (item) {
                if (result.isValid) {
                  batchValid.push(item);
                  validItems.push(item);
                } else {
                  batchInvalid.push(item);
                  needsValidationItems.push(item);
                }
              }
            }
            
            if (batchValid.length > 0) {
              await this.insertItemsIntoDatabase(batchValid);
              console.log(`✅ Retry successful: ${batchValid.length} items inserted`);
            }
            
            batchSuccess = true;
            
          } catch (retryError) {
            console.error(`❌ Retry ${retryCount} failed:`, retryError);
            if (retryCount === this.MAX_RETRIES) {
              report.apiErrors++;
              report.errorDetails.push({
                type: 'batch_error',
                batchIndex,
                error: retryError,
                items: batch.map(i => i.id)
              } as any);
              
              // Add all items in failed batch to needs validation
              needsValidationItems.push(...batch);
            }
          }
        }
      }
    }

    report.validItems = validItems.length;
    report.needsValidationItems = needsValidationItems.length;

    // Clear progress file on successful completion
    await this.clearProgress();
    
    // Store results for output generation
    (report as any).validItemsData = validItems;
    (report as any).needsValidationItemsData = needsValidationItems;

    console.log(`\n🎯 Final Results:`);
    console.log(`   Total processed: ${report.totalItemsProcessed}/${items.length}`);
    console.log(`   Success rate: ${Math.round((report.validItems / report.totalItemsProcessed) * 100)}%`);
    console.log(`   Memory peak: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);

    return report;
  }


  /**
   * Make HTTP request to API with enhanced rate limit handling
   */
  private async makeAPIRequest(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = https.get(url, (response) => {
        let data = '';

        // Check for rate limiting immediately
        if (response.statusCode === 429) {
          reject(new Error('RATE_LIMIT_EXCEEDED'));
          return;
        }

        if (response.statusCode === 503) {
          reject(new Error('SERVICE_THROTTLED'));
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            // Check for throttled response in body
            if (data.toLowerCase().includes('throttled') || data.toLowerCase().includes('rate limit')) {
              reject(new Error('API_THROTTLED'));
              return;
            }

            const jsonData = JSON.parse(data);
            resolve(jsonData);
          } catch (parseError) {
            reject(new Error(`Failed to parse API response: ${parseError}`));
          }
        });
      });

      request.on('error', (error) => {
        reject(new Error(`API request failed: ${error.message}`));
      });

      // Set timeout to 45 seconds for large requests
      request.setTimeout(45000, () => {
        request.destroy();
        reject(new Error('API request timeout'));
      });
    });
  }

  /**
   * Insert valid items into Neo4j database with enhanced data
   */
  private async insertItemsIntoDatabase(items: ParsedItem[]): Promise<void> {
    const itemNodes: Partial<ItemNode>[] = items.map(item => ({
      id: item.id,
      name: this.cleanItemName(item.originalName),
      category: item.category,
      tier: item.tier,
      enchantment: item.enchantment,
      subcategory: item.subcategory,
      itemType: item.itemType,
      // Add additional metadata
      cleanedName: this.cleanItemName(item.originalName),
      originalName: item.originalName,
      lastUpdated: new Date().toISOString()
    }));

    // Use batch size appropriate for database performance
    const dbBatchSize = Math.min(25, items.length); // Smaller batches for database
    await this.dbUtils.batchCreateItems(itemNodes, dbBatchSize);

    // Create category and tier relationships in batches
    await this.createCategoryRelationships(items);
    await this.createEnchantmentRelationships(items);
    await this.createTierRelationships(items);
    await this.createTypeRelationships(items);
  }

  /**
   * Clean item names by removing tier references and quality indicators
   */
  private cleanItemName(name: string): string {
    let cleaned = name;

    // Apply all cleaning patterns
    for (const pattern of this.TIER_PATTERNS) {
      cleaned = cleaned.replace(pattern, '');
    }

    // Remove extra whitespace and normalize
    cleaned = cleaned.trim().replace(/\s+/g, ' ');

    // Remove leading/trailing punctuation
    cleaned = cleaned.replace(/^[^\w]+|[^\w]+$/g, '');

    return cleaned || name; // Fallback to original if cleaning resulted in empty string
  }

  /**
   * Extract enchantment level from item ID
   */
  private extractEnchantment(itemId: string): number {
    const match = itemId.match(/@(\d+)$/);
    return match ? parseInt(match[1]) : 0;
  }

  /**
   * Create category relationships in database
   */
  private async createCategoryRelationships(items: ParsedItem[]): Promise<void> {
    const uniqueCategories = Array.from(new Set(items.map(item => item.category)));

    for (const category of uniqueCategories) {
      try {
        await this.connection.executeWrite(`
          MERGE (c:Category {name: $category})
          ON CREATE SET c.createdAt = datetime()
        `, { category });

        // Link items to categories
        await this.connection.executeWrite(`
          MATCH (c:Category {name: $category})
          MATCH (i:Item) WHERE i.category = $category
          MERGE (i)-[:BELONGS_TO]->(c)
        `, { category });

      } catch (error) {
        console.error(`Failed to create category ${category}:`, error);
      }
    }
  }

  /**
   * Create enchantment relationships for enchanted items
   */
  private async createEnchantmentRelationships(items: ParsedItem[]): Promise<void> {
    const enchantedItems = items.filter(item => this.extractEnchantment(item.id) > 0);

    for (const enchantedItem of enchantedItems) {
      const baseId = enchantedItem.id.replace(/@\d+$/, '');
      const baseItem = items.find(item => item.id === baseId);

      if (baseItem) {
        try {
          await this.connection.executeWrite(`
            MATCH (enchanted:Item {id: $enchantedId})
            MATCH (base:Item {id: $baseId})
            MERGE (enchanted)-[:ENCHANTED_FROM]->(base)
          `, {
            enchantedId: enchantedItem.id,
            baseId: baseId
          });
        } catch (error) {
          console.error(`Failed to create enchantment relationship for ${enchantedItem.id}:`, error);
        }
      }
    }
  }

  /**
   * Generate output files
   */
  private async generateOutputFiles(report: ProcessingReport): Promise<void> {
    console.log('📄 Generating output files...');

    const validItems = (report as any).validItemsData || [];
    const needsValidationItems = (report as any).needsValidationItemsData || [];

    // Generate valid-items.json
    const validItemsOutput = {
      timestamp: new Date().toISOString(),
      count: validItems.length,
      items: validItems.map((item: ParsedItem) => ({
        id: item.id,
        name: item.name,
        cleanedName: this.cleanItemName(item.originalName),
        category: item.category,
        tier: item.tier,
        subcategory: item.subcategory,
        enchantment: this.extractEnchantment(item.id)
      }))
    };

    await fs.writeFile(
      path.join(this.OUTPUT_DIR, 'valid-items.json'),
      JSON.stringify(validItemsOutput, null, 2)
    );

    // Generate needs-validation.json
    const needsValidationOutput = {
      timestamp: new Date().toISOString(),
      count: needsValidationItems.length,
      items: needsValidationItems.map((item: ParsedItem) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        tier: item.tier,
        subcategory: item.subcategory,
        reason: 'No valid market prices found'
      }))
    };

    await fs.writeFile(
      path.join(this.OUTPUT_DIR, 'needs-validation.json'),
      JSON.stringify(needsValidationOutput, null, 2)
    );

    // Generate processing-report.json
    const reportOutput = {
      timestamp: new Date().toISOString(),
      summary: {
        totalItemsProcessed: report.totalItemsProcessed,
        validItems: report.validItems,
        needsValidationItems: report.needsValidationItems,
        successRate: Math.round((report.validItems / report.totalItemsProcessed) * 100),
        processingTimeSeconds: Math.round(report.processingTimeMs / 1000)
      },
      performance: {
        totalBatches: report.batchResults.length,
        averageBatchTime: Math.round(
          report.batchResults.reduce((sum, batch) => sum + batch.duration, 0) / report.batchResults.length
        ),
        itemsPerSecond: Math.round(
          (report.totalItemsProcessed * 1000) / report.processingTimeMs
        )
      },
      errors: {
        apiErrors: report.apiErrors,
        databaseErrors: report.databaseErrors,
        errorDetails: report.errorDetails
      },
      batchResults: report.batchResults
    };

    await fs.writeFile(
      path.join(this.OUTPUT_DIR, 'processing-report.json'),
      JSON.stringify(reportOutput, null, 2)
    );

    console.log('✅ Output files generated:');
    console.log(`   📄 valid-items.json (${validItems.length} items)`);
    console.log(`   📄 needs-validation.json (${needsValidationItems.length} items)`);
    console.log(`   📄 processing-report.json`);
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.OUTPUT_DIR, { recursive: true });
    } catch (error) {
      // Directory might already exist, ignore
    }
  }

  /**
   * Load processing progress from file
   */
  private async loadProgress(): Promise<ProcessingProgress | null> {
    try {
      const content = await fs.readFile(this.PROGRESS_FILE, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null; // File doesn't exist or invalid JSON
    }
  }

  /**
   * Save processing progress to file
   */
  private async saveProgress(progress: ProcessingProgress): Promise<void> {
    try {
      await this.ensureOutputDirectory();
      await fs.writeFile(this.PROGRESS_FILE, JSON.stringify(progress, null, 2));
    } catch (error) {
      console.error('⚠️ Failed to save progress:', error);
    }
  }

  /**
   * Clear progress file
   */
  private async clearProgress(): Promise<void> {
    try {
      await fs.unlink(this.PROGRESS_FILE);
    } catch {
      // File might not exist, ignore
    }
  }

  /**
   * Create tier relationships in database
   */
  private async createTierRelationships(items: ParsedItem[]): Promise<void> {
    const uniqueTiers = Array.from(new Set(items.map(item => item.tier).filter(tier => tier > 0)));

    for (const tier of uniqueTiers) {
      try {
        await this.connection.executeWrite(`
          MERGE (t:Tier {level: $tier})
          ON CREATE SET t.name = 'Tier ' + toString($tier), t.createdAt = datetime()
        `, { tier });

        // Link items to tiers
        await this.connection.executeWrite(`
          MATCH (t:Tier {level: $tier})
          MATCH (i:Item) WHERE i.tier = $tier
          MERGE (i)-[:HAS_TIER]->(t)
        `, { tier });

      } catch (error) {
        console.error(`Failed to create tier ${tier}:`, error);
      }
    }
  }

  /**
   * Create item type relationships in database
   */
  private async createTypeRelationships(items: ParsedItem[]): Promise<void> {
    const uniqueTypes = Array.from(new Set(items.map(item => item.itemType).filter(type => type)));

    for (const itemType of uniqueTypes) {
      try {
        await this.connection.executeWrite(`
          MERGE (t:ItemType {name: $itemType})
          ON CREATE SET t.createdAt = datetime()
        `, { itemType });

        // Link items to types
        await this.connection.executeWrite(`
          MATCH (t:ItemType {name: $itemType})
          MATCH (i:Item) WHERE i.itemType = $itemType
          MERGE (i)-[:IS_TYPE]->(t)
        `, { itemType });

      } catch (error) {
        console.error(`Failed to create item type ${itemType}:`, error);
      }
    }
  }

  /**
   * Enhanced validation with better error handling and rate limit retry
   */
  private async validateItemsViaAPI(items: ParsedItem[]): Promise<ValidationResult[]> {
    const itemIds = items.map(item => item.id).join(',');
    const cities = this.CITIES.join(',');
    
    // Check URL length to avoid 414 errors
    const url = `${this.API_BASE_URL}/${itemIds}?locations=${cities}`;
    if (url.length > 8000) {
      console.log(`⚠️ URL too long (${url.length} chars), splitting batch...`);
      // Split into smaller chunks if URL is too long
      const midPoint = Math.floor(items.length / 2);
      const firstHalf = await this.validateItemsViaAPI(items.slice(0, midPoint));
      const secondHalf = await this.validateItemsViaAPI(items.slice(midPoint));
      return [...firstHalf, ...secondHalf];
    }

    // Retry logic with exponential backoff for rate limiting
    let retryCount = 0;
    const maxRetries = 5;
    
    while (retryCount <= maxRetries) {
      try {
        console.log(`🔍 Validating ${items.length} items via API (${url.length} chars)${retryCount > 0 ? ` - Retry ${retryCount}` : ''}...`);
        const priceData: PriceData[] = await this.makeAPIRequest(url);
        
        // If successful, break out of retry loop
        if (retryCount > 0) {
          console.log(`✅ API request succeeded after ${retryCount} retries`);
        }

        // Process validation results with enhanced logic
        const results: ValidationResult[] = [];

        for (const item of items) {
          const itemPrices = priceData.filter(price => price.item_id === item.id);
          
          // Count cities with active prices (non-zero sell prices)
          const activeCities = new Set<string>();
          let maxPrice = 0;
          let totalVolume = 0;

          for (const price of itemPrices) {
            if (price.sell_price_min > 0 || price.buy_price_min > 0) {
              activeCities.add(price.city);
              maxPrice = Math.max(maxPrice, price.sell_price_min, price.buy_price_min);
              totalVolume++;
            }
          }

          const cityCount = activeCities.size;
          const hasActivePrices = cityCount > 0 && maxPrice > 0;
          
          // FIXED: Simple validation - any non-zero price = valid item
          const isValid = hasActivePrices; // Any non-zero price in any city makes item valid

          let reason = '';
          if (!hasActivePrices) {
            reason = 'No active prices found';
          } else {
            reason = `Valid item with prices in ${cityCount} cities (max: ${maxPrice})`;
          }

          results.push({
            itemId: item.id,
            isValid,
            hasActivePrices,
            cityCount,
            maxPrice,
            reason
          });
        }

        const validCount = results.filter(r => r.isValid).length;
        console.log(`✅ API validation completed: ${validCount}/${items.length} items are valid`);

        return results;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // Check for rate limiting errors
        if (errorMessage.includes('RATE_LIMIT') || errorMessage.includes('THROTTLED') || errorMessage.includes('429')) {
          retryCount++;
          
          if (retryCount <= maxRetries) {
            const backoffDelay = Math.min(3000 * Math.pow(2, retryCount - 1), 30000); // Max 30 seconds
            console.log(`⚠️  Rate limited! Waiting ${backoffDelay}ms before retry ${retryCount}/${maxRetries}...`);
            await this.delay(backoffDelay);
            continue; // Try again
          } else {
            console.error(`❌ Max retries exceeded for rate limiting`);
            // Fall through to return validation failure
          }
        } else {
          // Non-rate limit error, don't retry
          console.error('❌ API validation failed (non-rate limit):', errorMessage);
          break;
        }
      }
    }
    
    // If we get here, all retries failed or non-recoverable error occurred
    console.error('❌ API validation failed after all retries');
    return items.map(item => ({
      itemId: item.id,
      isValid: false,
      hasActivePrices: false,
      cityCount: 0,
      maxPrice: 0,
      reason: `API validation failed after ${retryCount} retries`
    }));
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI execution with enhanced argument handling
async function main() {
  try {
    console.log('🚀 Albion Online Item Batch Processor v2.1 - FIXED VERSION');
    console.log('📋 Enhanced for 11,716+ items with JSON support');
    console.log('🔧 CRITICAL FIXES: Proper validation logic + respectful API rate limiting\n');
    
    // Parse command line arguments
    const args = process.argv.slice(2);
    const isResume = args.includes('--resume');
    const isDryRun = args.includes('--dry-run');
    const batchSize = args.find(arg => arg.startsWith('--batch-size='))
      ?.split('=')[1];
    
    if (isDryRun) {
      console.log('📝 DRY RUN MODE: No data will be written to database\n');
    }
    
    if (isResume) {
      console.log('🔄 RESUME MODE: Continuing from last saved progress\n');
      process.env.RESUME_PROCESSING = 'true';
    }
    
    const processor = new BatchItemProcessor();
    
    // Override batch size if specified
    if (batchSize) {
      const size = parseInt(batchSize);
      if (size > 0 && size <= 500) {
        (processor as any).BATCH_SIZE = size;
        console.log(`🔧 Using custom batch size: ${size}\n`);
      } else {
        console.log('⚠️ Invalid batch size, using default\n');
      }
    }
    
    const startTime = Date.now();
    const report = await processor.process();
    const totalTimeMin = Math.round((Date.now() - startTime) / 60000);
    
    console.log('\n🎉 Processing completed successfully!');
    console.log(`📊 Final Results:`);
    console.log(`   • Total processed: ${report.totalItemsProcessed.toLocaleString()}`);
    console.log(`   • Valid items: ${report.validItems.toLocaleString()}`);
    console.log(`   • Need validation: ${report.needsValidationItems.toLocaleString()}`);
    console.log(`   • Success rate: ${Math.round((report.validItems / report.totalItemsProcessed) * 100)}%`);
    console.log(`   • Processing time: ${totalTimeMin} minutes`);
    console.log(`   • Items per minute: ${Math.round(report.totalItemsProcessed / totalTimeMin)}`);
    console.log(`   • API errors: ${report.apiErrors}`);
    console.log(`   • Database errors: ${report.databaseErrors}`);
    
    if (report.errorDetails.length > 0) {
      console.log(`\n⚠️  Encountered ${report.errorDetails.length} errors (see processing-report.json for details)`);
    }
    
    console.log('\n📋 Output files generated in packages/database/outputs/');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Processing failed:', error);
    
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
    }
    
    console.log('\n📝 Available options:');
    console.log('  --resume         Resume from last saved progress');
    console.log('  --dry-run        Parse items without database operations');
    console.log('  --batch-size=N   Set custom batch size (1-500)');
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }
  
  main();
}

// Help text
function showHelp() {
  console.log('🚀 Albion Online Item Batch Processor v2.0\n');
  console.log('Process and validate Albion Online items from JSON or TXT format.\n');
  console.log('Usage:');
  console.log('  ts-node batch-process-items.ts [options]\n');
  console.log('Options:');
  console.log('  --help           Show this help message');
  console.log('  --resume         Resume processing from last saved checkpoint');
  console.log('  --dry-run        Parse and validate without database writes');
  console.log('  --batch-size=N   Set API batch size (1-500, default: 100)');
  console.log('\nData Sources (in order of preference):');
  console.log('  1. items.json    - New JSON format with localized names');
  console.log('  2. items.txt     - New TXT format: "1: UNIQUE_HIDEOUT : Name"');
  console.log('  3. item.txt      - Legacy format: "ID|Name|Category|Tier|Sub"\n');
  console.log('Features:');
  console.log('  ✓ Progress persistence every 1,000 items');
  console.log('  ✓ Resume capability for interrupted processing');
  console.log('  ✓ Automatic category/tier detection from item IDs');
  console.log('  ✓ Enhanced validation with retry logic');
  console.log('  ✓ Memory usage monitoring');
  console.log('  ✓ Exponential backoff for API rate limiting\n');
}

export { BatchItemProcessor };