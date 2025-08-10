# ALB Market Database Package

Neo4j database setup and management for ALB Market graph-based marketplace platform.

## Overview

This package provides Neo4j database connectivity, schema management, and data import utilities for the ALB Market platform. It includes connection pooling, transaction handling, and specialized tools for importing Albion Online game data.

## Directory Structure

```
packages/database/
├── src/
│   ├── connection.ts    # Neo4j driver setup and connection management
│   ├── schema.ts        # Schema definitions, constraints, and indexes
│   ├── utils.ts         # Query helpers and batch operations
│   └── index.ts         # Main exports
├── scripts/
│   ├── setup-neo4j.sh       # Neo4j installation script
│   ├── init-schema.cypher   # Initial constraints/indexes
│   ├── import-functions.sh  # Import utilities for Research Agent
│   ├── test-connection.js   # Connection test script
│   ├── start-neo4j.sh      # Start Neo4j service
│   ├── stop-neo4j.sh       # Stop Neo4j service
│   └── status-neo4j.sh     # Check Neo4j status
├── migrations/         # Schema migration files
├── backups/           # Database backups (gitignored)
├── seeds/            # Seed data files
└── verified-data/    # Verified game data for import
```

## Quick Start

### 1. One-Command Development Setup
```bash
# From project root - starts everything including Neo4j in Docker
pnpm start
```

This single command will:
- Start Neo4j in Docker container
- Automatically restore database from backup (3,790 items)
- Start backend and frontend development servers
- Show access URLs for all services

### 2. Alternative: Database Only
```bash
# Start just Neo4j in Docker
pnpm db:up

# Stop Neo4j
pnpm db:down

# View logs
pnpm db:logs
```

### 3. Access Points
- **Neo4j Browser:** http://localhost:7474
- **Bolt Protocol:** bolt://localhost:7687
- **Credentials:** neo4j / albmarket123
- **Database Status:** 3,790 items loaded from backup

## Environment Configuration

**No manual configuration needed!** Docker Compose handles everything automatically.

The following environment variables are automatically configured:
```bash
# Neo4j Configuration (Docker managed)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=albmarket123

# Neo4j Browser
NEO4J_BROWSER_URL=http://localhost:7474
```

For custom configurations, create `.env.local` in project root to override defaults.

## Database Schema

### Node Types
- **Item**: Game items with id, name, category, tier, enchantment
- **Recipe**: Crafting recipes with id, name, building
- **City**: Market cities with name and coordinates

### Relationships
- **CRAFTED_FROM**: Items → Input Items (quantity)
- **PRICED_AT**: Items → Cities (price, timestamp, quality, orders)
- **REQUIRES**: Recipes → Items (quantity, nutrition)

### Constraints & Indexes
- Unique constraints on Item.id, Recipe.id, City.name
- Composite uniqueness on (Item.name, tier, enchantment)
- Performance indexes on frequently queried properties
- Relationship property indexes for price data

## Usage Examples

### Basic Connection
```typescript
import { createConnection, getConnection } from '@alb-market/database';

// Initialize connection
const connection = createConnection();
await connection.connect();

// Execute query
const items = await connection.executeQuery(
  'MATCH (i:Item {category: $category}) RETURN i',
  { category: 'Weapon' }
);

// Close connection
await connection.disconnect();
```

### Schema Management
```typescript
import { SchemaManager } from '@alb-market/database';

const schemaManager = new SchemaManager();
await schemaManager.initializeSchema();
await schemaManager.validateSchema();
```

### Batch Operations
```typescript
import { DatabaseUtils } from '@alb-market/database';

const utils = new DatabaseUtils();

// Batch import items
const result = await utils.batchCreateItems(items, 1000);
console.log(`Processed: ${result.processed}, Errors: ${result.errors.length}`);

// Get database statistics
const stats = await utils.getDatabaseStats();
console.log(`Items: ${stats.itemCount}, Prices: ${stats.priceCount}`);
```

## Import Functions for Research Agent

The Research Agent can use these import utilities:

```bash
# Import all data from verified-data directory
./scripts/import-functions.sh all

# Import specific data types
./scripts/import-functions.sh items ../verified-data/items.json
./scripts/import-functions.sh prices ../verified-data/prices.json
./scripts/import-functions.sh recipes ../verified-data/recipes.json

# Validate and clean data
./scripts/import-functions.sh validate
./scripts/import-functions.sh clean 7  # Clean data older than 7 days
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm start` | **ONE-COMMAND STARTUP** - Start everything with Docker |
| `pnpm db:up` | Start Neo4j in Docker |
| `pnpm db:down` | Stop Neo4j Docker container |
| `pnpm db:logs` | View Neo4j Docker logs |
| `pnpm db:init-schema` | Initialize database schema |
| `pnpm db:test-connection` | Test database connection |
| `pnpm db:import` | Run import functions script |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:seed` | Run database seeds |

### Docker vs Local Commands
- **Recommended:** Use Docker commands (`pnpm start`, `pnpm db:up/down/logs`)
- **Legacy:** Local installation scripts still available in `scripts/` directory

## Performance Optimization

### Indexes
- All frequently queried properties have indexes
- Composite indexes for complex queries
- Relationship property indexes for price data

### Connection Pooling
- Configurable connection pool size (default: 100)
- Connection timeout handling
- Automatic connection retry logic

### Batch Processing
- Configurable batch sizes for large imports
- Progress tracking and error handling
- Transaction-based consistency

## Data Integrity

### Constraints
- Unique constraints prevent data duplication
- Composite constraints ensure logical consistency
- Required field validation

### Validation Tools
- Data integrity verification
- Orphaned relationship detection
- Missing field identification
- Duplicate detection

## Security

- Parameterized queries prevent injection
- Connection encryption configuration
- Credential management via environment variables
- Transaction isolation levels

## Backup & Recovery

### Current Database Status
- **Items Loaded:** 3,790 items from backup
- **Backup Location:** `/packages/database/backups/`
- **Auto-restore:** Automatic restoration from latest backup on empty database

### Manual Backup Operations
```bash
# Create new backup (from within packages/database)
npm run backup

# Restore from backup (automatic on startup if database empty)  
npm run restore

# Manual restore (from within packages/database)
npm run restore
```

### Docker Persistent Storage
- Database data persists between container restarts
- Backups are mounted from local filesystem
- No data loss when stopping/starting containers

### Automated Backups
- Timestamped backup creation
- Configurable retention policies
- JSON format for easy restoration
- Automatic restoration on first startup

## Troubleshooting

### Connection Issues
1. Ensure Docker is running and Neo4j container is up: `pnpm db:logs`
2. Check if container is healthy: `docker ps` (look for alb-market-neo4j)
3. Restart if needed: `pnpm db:down && pnpm db:up`
4. Verify URI format: `bolt://localhost:7687`

### Performance Issues
1. Check query execution plans with `EXPLAIN`/`PROFILE`
2. Verify indexes are being used
3. Monitor connection pool usage

### Data Issues
1. Run integrity checks: `./scripts/import-functions.sh validate`
2. Check for orphaned relationships
3. Verify constraint violations

## Development

### Testing
```bash
# Run connection tests
pnpm db:test-connection

# Run all tests
pnpm test
```

### Schema Changes
1. Create migration file in `migrations/`
2. Update schema.ts with new constraints/indexes
3. Test on development data
4. Document breaking changes

## Architecture Decisions

### Graph Database Choice
- **Neo4j** chosen for complex relationship modeling
- Optimized for traversal queries (crafting chains, price analysis)
- ACID transactions for data consistency
- Cypher query language for intuitive graph operations

### Connection Management
- Singleton pattern for connection reuse
- Connection pooling for concurrent access
- Graceful error handling and retry logic
- Environment-based configuration

### Data Import Strategy
- Batch processing for large datasets
- Progress tracking and error reporting
- Transaction-based consistency
- Idempotent operations for safe re-runs