#!/usr/bin/env node

const neo4j = require('neo4j-driver');
const fs = require('fs').promises;
const path = require('path');

async function createBackup() {
  const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
  const user = process.env.NEO4J_USER || 'neo4j';
  const password = process.env.NEO4J_PASSWORD || 'defaultpassword';
  
  const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  const session = driver.session();
  
  try {
    console.log('🔄 Creating database backup...');
    
    // Create timestamp for backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${timestamp}-issues-17-19-complete-population-backup.json`;
    const backupPath = path.join(__dirname, '..', 'backups', backupName);
    
    // Ensure backups directory exists
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    
    console.log('📊 Querying database for complete export...');
    
    // Export all nodes and relationships
    const result = await session.run(`
      CALL apoc.export.json.all(null, {stream: true})
      YIELD file, source, format, nodes, relationships, properties, time, rows, batchSize, batches, done, data
      RETURN data
    `);
    
    if (result.records.length === 0) {
      // Fallback: manual export if apoc is not available
      console.log('⚠️  APOC not available, using manual export...');
      
      const nodesResult = await session.run('MATCH (n) RETURN n');
      const relationshipsResult = await session.run('MATCH ()-[r]->() RETURN r');
      
      const backup = {
        metadata: {
          timestamp: new Date().toISOString(),
          description: 'Complete database backup after processing issues #17 and #19',
          nodeCount: nodesResult.records.length,
          relationshipCount: relationshipsResult.records.length
        },
        nodes: nodesResult.records.map(record => ({
          id: record.get('n').identity.toNumber(),
          labels: record.get('n').labels,
          properties: record.get('n').properties
        })),
        relationships: relationshipsResult.records.map(record => ({
          id: record.get('r').identity.toNumber(),
          type: record.get('r').type,
          startNode: record.get('r').start.toNumber(),
          endNode: record.get('r').end.toNumber(),
          properties: record.get('r').properties
        }))
      };
      
      await fs.writeFile(backupPath, JSON.stringify(backup, null, 2));
      console.log(`✅ Manual backup created: ${backupName}`);
      console.log(`📊 Exported ${backup.metadata.nodeCount} nodes and ${backup.metadata.relationshipCount} relationships`);
      
    } else {
      // Use APOC export
      const allData = result.records.map(record => record.get('data')).join('\n');
      await fs.writeFile(backupPath, allData);
      console.log(`✅ APOC backup created: ${backupName}`);
    }
    
    // Get current database statistics
    const statsResult = await session.run(`
      MATCH (n)
      WITH labels(n) as nodeLabels, count(n) as nodeCount
      UNWIND nodeLabels as label
      RETURN label, sum(nodeCount) as count
      ORDER BY count DESC
    `);
    
    console.log('\n📈 Database Statistics:');
    statsResult.records.forEach(record => {
      console.log(`   ${record.get('label')}: ${record.get('count').toNumber()}`);
    });
    
    console.log(`\n💾 Backup saved to: ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    process.exit(1);
  } finally {
    await session.close();
    await driver.close();
  }
}

createBackup().catch(console.error);