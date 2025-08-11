# Database Package

This package manages all Neo4j database operations for ALB Market.

## Directory Structure

```
packages/database/
├── scripts/           # Import/export scripts (Neo4j Specialist maintains)
│   ├── import-functions.sh    # Core import functions
│   ├── import-item.cypher    # Item import query
│   └── ...
├── backups/          # Database backups in JSON format
│   └── *.json       # Place existing backups here
├── migrations/       # Schema migrations
└── seeds/           # Seed data
```

## Architecture Decision

**Data Flow:**
```
Research Agent → Execute Scripts → Neo4j Database → JSON Backups
```

**Key Principles:**
1. **Neo4j Specialist** creates and maintains all database scripts
2. **Research Agent** can EXECUTE scripts but cannot modify them
3. **Backups** are in JSON format for easy restoration
4. **Scripts** are versioned and immutable once created

## Using Existing Backups

If you have backups from the previous project:
1. Place them in `packages/database/backups/`
2. Restore using:
   ```bash
   source packages/database/scripts/import-functions.sh
   restore_backup "packages/database/backups/your-backup.json"
   ```

## Import Functions Available

Research Agent can call these functions:
- `import_item` - Import a single item
- `import_recipe` - Import crafting recipe relationships
- `import_price` - Import market price data
- `create_backup` - Create a new backup
- `restore_backup` - Restore from a backup
- `import_batch` - Import multiple items from JSON

## Security

- Database credentials stored in `.credentials`
- Scripts have execute-only permissions for Research Agent
- Backups are gitignored (contain sensitive data)

## Backup Strategy

1. **After Major Imports:** Create timestamped backup
2. **Before Schema Changes:** Create migration backup
3. **Daily:** Automated backup (when in production)
4. **Retention:** Keep last 30 days of backups