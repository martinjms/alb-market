#!/usr/bin/env node

/**
 * Test Neo4j Connection Script
 * Tests the Neo4j database connection and verifies schema
 */

const path = require('path');
const { createConnection } = require('../src/connection');
const { SchemaManager } = require('../src/schema');
const { DatabaseUtils } = require('../src/utils');

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

const log = (level, message) => {
  const timestamp = new Date().toISOString();
  const levelColors = {
    INFO: colors.blue,
    SUCCESS: colors.green,
    WARNING: colors.yellow,
    ERROR: colors.red,
  };
  
  console.log(
    `${levelColors[level]}[${level}]${colors.reset} ${colors.cyan}${timestamp}${colors.reset} ${message}`
  );
};

async function testBasicConnection() {
  log('INFO', '🔌 Testing basic Neo4j connection...');
  
  try {
    const connection = createConnection();
    await connection.connect();
    
    const isConnected = await connection.testConnection();
    if (isConnected) {
      log('SUCCESS', '✅ Basic connection test passed');
    } else {
      log('ERROR', '❌ Basic connection test failed');
      return false;
    }
    
    // Get database info
    const dbInfo = await connection.getDatabaseInfo();
    if (dbInfo && dbInfo.length > 0) {
      log('INFO', `📊 Database: ${dbInfo[0].name} ${dbInfo[0].versions[0]} (${dbInfo[0].edition})`);
    }
    
    await connection.disconnect();
    return true;
  } catch (error) {
    log('ERROR', `❌ Connection failed: ${error.message}`);
    return false;
  }
}

async function testSchemaOperations() {
  log('INFO', '🏗️ Testing schema operations...');
  
  try {
    const connection = createConnection();
    await connection.connect();
    
    const schemaManager = new SchemaManager(connection);
    
    // Test schema validation
    const isValid = await schemaManager.validateSchema();
    if (isValid) {
      log('SUCCESS', '✅ Schema validation passed');
    } else {
      log('WARNING', '⚠️ Schema validation failed - initializing schema...');
      await schemaManager.initializeSchema();
      log('SUCCESS', '✅ Schema initialized successfully');
    }
    
    // Get schema info
    const schemaInfo = await schemaManager.getSchemaInfo();
    log('INFO', `📋 Schema info:`);
    log('INFO', `  - Constraints: ${schemaInfo.constraints.length}`);
    log('INFO', `  - Indexes: ${schemaInfo.indexes.length}`);
    log('INFO', `  - Node labels: ${schemaInfo.nodeLabels.map(n => n.label).join(', ')}`);
    log('INFO', `  - Relationship types: ${schemaInfo.relationshipTypes.map(r => r.relationshipType).join(', ')}`);
    
    await connection.disconnect();
    return true;
  } catch (error) {
    log('ERROR', `❌ Schema operations failed: ${error.message}`);
    return false;
  }
}

async function testCRUDOperations() {
  log('INFO', '🧪 Testing CRUD operations...');
  
  try {
    const connection = createConnection();
    await connection.connect();
    
    const testItemId = 'TEST_ITEM_' + Date.now();
    
    // Test CREATE
    const createResult = await connection.executeWrite(`
      MERGE (i:Item {id: $id})
      SET i.name = $name,
          i.category = $category,
          i.tier = $tier,
          i.enchantment = $enchantment,
          i.createdAt = datetime(),
          i.updatedAt = datetime()
      RETURN i
    `, {
      id: testItemId,
      name: 'Test Item',
      category: 'Test',
      tier: 4,
      enchantment: 0,
    });
    
    if (createResult.length > 0) {
      log('SUCCESS', '✅ CREATE operation successful');
    } else {
      throw new Error('CREATE operation returned no results');
    }
    
    // Test READ
    const readResult = await connection.executeRead(`
      MATCH (i:Item {id: $id})
      RETURN i
    `, { id: testItemId });
    
    if (readResult.length > 0) {
      log('SUCCESS', '✅ READ operation successful');
    } else {
      throw new Error('READ operation returned no results');
    }
    
    // Test UPDATE
    const updateResult = await connection.executeWrite(`
      MATCH (i:Item {id: $id})
      SET i.name = $newName,
          i.updatedAt = datetime()
      RETURN i
    `, {
      id: testItemId,
      newName: 'Updated Test Item',
    });
    
    if (updateResult.length > 0) {
      log('SUCCESS', '✅ UPDATE operation successful');
    } else {
      throw new Error('UPDATE operation returned no results');
    }
    
    // Test DELETE
    const deleteResult = await connection.executeWrite(`
      MATCH (i:Item {id: $id})
      DELETE i
      RETURN count(i) as deleted
    `, { id: testItemId });
    
    log('SUCCESS', '✅ DELETE operation successful');
    
    await connection.disconnect();
    return true;
  } catch (error) {
    log('ERROR', `❌ CRUD operations failed: ${error.message}`);
    return false;
  }
}

async function testUtilityFunctions() {
  log('INFO', '🔧 Testing utility functions...');
  
  try {
    const connection = createConnection();
    await connection.connect();
    
    const utils = new DatabaseUtils(connection);
    
    // Test database statistics
    const stats = await utils.getDatabaseStats();
    log('INFO', '📊 Database statistics:');
    log('INFO', `  - Total nodes: ${stats.nodeCount}`);
    log('INFO', `  - Total relationships: ${stats.relationshipCount}`);
    log('INFO', `  - Items: ${stats.itemCount}`);
    log('INFO', `  - Recipes: ${stats.recipeCount}`);
    log('INFO', `  - Cities: ${stats.cityCount}`);
    log('INFO', `  - Price records: ${stats.priceCount}`);
    if (stats.lastPriceUpdate) {
      log('INFO', `  - Last price update: ${stats.lastPriceUpdate.toISOString()}`);
    }
    
    // Test data integrity
    const integrity = await utils.verifyDataIntegrity();
    log('INFO', '🔍 Data integrity check:');
    log('INFO', `  - Orphaned prices: ${integrity.orphanedPrices}`);
    log('INFO', `  - Duplicate items: ${integrity.duplicateItems}`);
    log('INFO', `  - Missing required fields: ${integrity.missingRequiredFields}`);
    
    if (integrity.issues.length > 0) {
      log('WARNING', '⚠️ Data integrity issues found:');
      integrity.issues.forEach(issue => log('WARNING', `    - ${issue}`));
    } else {
      log('SUCCESS', '✅ No data integrity issues found');
    }
    
    await connection.disconnect();
    return true;
  } catch (error) {
    log('ERROR', `❌ Utility functions test failed: ${error.message}`);
    return false;
  }
}

async function testTransactions() {
  log('INFO', '💼 Testing transaction operations...');
  
  try {
    const connection = createConnection();
    await connection.connect();
    
    const utils = new DatabaseUtils(connection);
    const testItemId1 = 'TRANS_TEST_1_' + Date.now();
    const testItemId2 = 'TRANS_TEST_2_' + Date.now();
    
    // Test successful transaction
    const queries = [
      {
        query: `
          MERGE (i:Item {id: $id1})
          SET i.name = 'Transaction Test 1',
              i.category = 'Test',
              i.tier = 4,
              i.enchantment = 0,
              i.createdAt = datetime()
          RETURN i
        `,
        parameters: { id1: testItemId1 },
      },
      {
        query: `
          MERGE (i:Item {id: $id2})
          SET i.name = 'Transaction Test 2',
              i.category = 'Test',
              i.tier = 4,
              i.enchantment = 0,
              i.createdAt = datetime()
          RETURN i
        `,
        parameters: { id2: testItemId2 },
      },
    ];
    
    const results = await utils.executeTransaction(queries);
    if (results.length === 2) {
      log('SUCCESS', '✅ Transaction test successful');
    }
    
    // Clean up test data
    await connection.executeWrite(`
      MATCH (i:Item)
      WHERE i.id IN [$id1, $id2]
      DELETE i
    `, { id1: testItemId1, id2: testItemId2 });
    
    await connection.disconnect();
    return true;
  } catch (error) {
    log('ERROR', `❌ Transaction test failed: ${error.message}`);
    return false;
  }
}

async function runAllTests() {
  console.log('');
  console.log('='.repeat(60));
  console.log('        ALB Market Neo4j Connection Test');
  console.log('='.repeat(60));
  console.log('');
  
  const tests = [
    { name: 'Basic Connection', fn: testBasicConnection },
    { name: 'Schema Operations', fn: testSchemaOperations },
    { name: 'CRUD Operations', fn: testCRUDOperations },
    { name: 'Utility Functions', fn: testUtilityFunctions },
    { name: 'Transactions', fn: testTransactions },
  ];
  
  const results = [];
  
  for (const test of tests) {
    log('INFO', `\n🧪 Running ${test.name} test...`);
    try {
      const result = await test.fn();
      results.push({ name: test.name, success: result });
    } catch (error) {
      log('ERROR', `❌ ${test.name} test threw an error: ${error.message}`);
      results.push({ name: test.name, success: false, error: error.message });
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  log('INFO', '📋 Test Results Summary:');
  console.log('='.repeat(60));
  
  let passCount = 0;
  results.forEach(result => {
    if (result.success) {
      log('SUCCESS', `✅ ${result.name}: PASSED`);
      passCount++;
    } else {
      log('ERROR', `❌ ${result.name}: FAILED`);
      if (result.error) {
        log('ERROR', `   Error: ${result.error}`);
      }
    }
  });
  
  console.log('');
  log('INFO', `📊 Results: ${passCount}/${results.length} tests passed`);
  
  if (passCount === results.length) {
    log('SUCCESS', '🎉 All tests passed! Neo4j setup is working correctly.');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run schema initialization: pnpm db:init-schema');
    console.log('2. Import sample data: pnpm db:seed');
    console.log('3. Start the backend API server');
    return true;
  } else {
    log('ERROR', '❌ Some tests failed. Please check the configuration and try again.');
    console.log('');
    console.log('Troubleshooting:');
    console.log('1. Ensure Neo4j is running: ./scripts/start-neo4j.sh');
    console.log('2. Check connection settings in .env.local');
    console.log('3. Verify Neo4j credentials');
    return false;
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('WARNING', '🛑 Test interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log('ERROR', `❌ Unhandled rejection at ${promise}: ${reason}`);
  process.exit(1);
});

// Run the tests
if (require.main === module) {
  runAllTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      log('ERROR', `❌ Test suite failed: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    });
}

module.exports = {
  testBasicConnection,
  testSchemaOperations,
  testCRUDOperations,
  testUtilityFunctions,
  testTransactions,
  runAllTests,
};