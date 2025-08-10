#!/bin/bash

# Import Functions for Albion Research Agent
# This script provides utility functions for importing Albion Online data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Configuration
NEO4J_URI=${NEO4J_URI:-"bolt://localhost:7687"}
NEO4J_USER=${NEO4J_USER:-"neo4j"}  
NEO4J_PASSWORD=${NEO4J_PASSWORD:-"albmarket123"}
DATA_DIR="$(pwd)/../verified-data"

# Check if Neo4j is running
check_neo4j_connection() {
    print_status "Checking Neo4j connection..."
    
    if ! command -v cypher-shell &> /dev/null; then
        NEO4J_HOME=${NEO4J_HOME:-"$HOME/.neo4j/neo4j-current"}
        CYPHER_SHELL="$NEO4J_HOME/bin/cypher-shell"
    else
        CYPHER_SHELL="cypher-shell"
    fi
    
    if ! echo "RETURN 1;" | $CYPHER_SHELL -a "$NEO4J_URI" -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" &> /dev/null; then
        print_error "Cannot connect to Neo4j at $NEO4J_URI"
        print_status "Make sure Neo4j is running: ./start-neo4j.sh"
        exit 1
    fi
    
    print_success "Neo4j connection verified"
}

# Import items from JSON file
import_items() {
    local file_path=$1
    
    if [[ ! -f "$file_path" ]]; then
        print_error "File not found: $file_path"
        return 1
    fi
    
    print_status "Importing items from $file_path..."
    
    # Use Node.js to import via the database package
    node -e "
        const fs = require('fs');
        const { createConnection, getConnection } = require('../src/connection');
        const { DatabaseUtils } = require('../src/utils');
        
        async function importItems() {
            try {
                const connection = createConnection();
                await connection.connect();
                const utils = new DatabaseUtils(connection);
                
                const data = JSON.parse(fs.readFileSync('$file_path', 'utf8'));
                const items = Array.isArray(data) ? data : data.items || [];
                
                console.log('📦 Importing', items.length, 'items...');
                const result = await utils.batchCreateItems(items, 500);
                
                console.log('✅ Import completed:');
                console.log('  - Processed:', result.processed);
                console.log('  - Errors:', result.errors.length); 
                console.log('  - Duration:', result.duration + 'ms');
                
                await connection.disconnect();
            } catch (error) {
                console.error('❌ Import failed:', error.message);
                process.exit(1);
            }
        }
        
        importItems();
    "
    
    print_success "Items import completed"
}

# Import prices from JSON file  
import_prices() {
    local file_path=$1
    
    if [[ ! -f "$file_path" ]]; then
        print_error "File not found: $file_path"
        return 1
    fi
    
    print_status "Importing prices from $file_path..."
    
    # Use Node.js to import via the database package
    node -e "
        const fs = require('fs');
        const { createConnection, getConnection } = require('../src/connection');
        const { DatabaseUtils } = require('../src/utils');
        
        async function importPrices() {
            try {
                const connection = createConnection();
                await connection.connect();
                const utils = new DatabaseUtils(connection);
                
                const data = JSON.parse(fs.readFileSync('$file_path', 'utf8'));
                const prices = Array.isArray(data) ? data : data.prices || [];
                
                console.log('💰 Importing', prices.length, 'price records...');
                const result = await utils.batchCreatePrices(prices, 500);
                
                console.log('✅ Import completed:');
                console.log('  - Processed:', result.processed);
                console.log('  - Errors:', result.errors.length);
                console.log('  - Duration:', result.duration + 'ms');
                
                await connection.disconnect();
            } catch (error) {
                console.error('❌ Import failed:', error.message);
                process.exit(1);
            }
        }
        
        importPrices();
    "
    
    print_success "Prices import completed"
}

# Import recipes from JSON file
import_recipes() {
    local file_path=$1
    
    if [[ ! -f "$file_path" ]]; then
        print_error "File not found: $file_path"
        return 1
    fi
    
    print_status "Importing recipes from $file_path..."
    
    # Create temporary Cypher script for recipes
    local temp_cypher=$(mktemp)
    
    # Convert JSON to Cypher using Node.js
    node -e "
        const fs = require('fs');
        const data = JSON.parse(fs.readFileSync('$file_path', 'utf8'));
        const recipes = Array.isArray(data) ? data : data.recipes || [];
        
        let cypher = '';
        
        recipes.forEach(recipe => {
            cypher += \`
MERGE (r:Recipe {id: '\${recipe.id}'})
SET r.name = '\${recipe.name}',
    r.building = '\${recipe.building}',
    r.updatedAt = datetime()
ON CREATE SET r.createdAt = datetime();
\`;
            
            if (recipe.requirements) {
                recipe.requirements.forEach(req => {
                    cypher += \`
MATCH (r:Recipe {id: '\${recipe.id}'}), (i:Item {id: '\${req.itemId}'})
MERGE (r)-[req:REQUIRES]->(i)
SET req.quantity = \${req.quantity};
\`;
                });
            }
        });
        
        fs.writeFileSync('$temp_cypher', cypher);
        console.log('Generated Cypher script with', recipes.length, 'recipes');
    "
    
    # Execute the Cypher script
    $CYPHER_SHELL -a "$NEO4J_URI" -u "$NEO4J_USER" -p "$NEO4J_PASSWORD" -f "$temp_cypher"
    
    # Clean up
    rm "$temp_cypher"
    
    print_success "Recipes import completed"
}

# Import all data from verified-data directory
import_all() {
    print_status "Starting full data import from $DATA_DIR..."
    
    check_neo4j_connection
    
    # Import in order of dependencies
    if [[ -f "$DATA_DIR/items.json" ]]; then
        import_items "$DATA_DIR/items.json"
    else
        print_warning "items.json not found in $DATA_DIR"
    fi
    
    if [[ -f "$DATA_DIR/recipes.json" ]]; then
        import_recipes "$DATA_DIR/recipes.json"  
    else
        print_warning "recipes.json not found in $DATA_DIR"
    fi
    
    if [[ -f "$DATA_DIR/prices.json" ]]; then
        import_prices "$DATA_DIR/prices.json"
    else
        print_warning "prices.json not found in $DATA_DIR"
    fi
    
    # Show final statistics
    print_status "Import summary:"
    node -e "
        const { createConnection } = require('../src/connection');
        const { DatabaseUtils } = require('../src/utils');
        
        async function showStats() {
            try {
                const connection = createConnection();
                await connection.connect();
                const utils = new DatabaseUtils(connection);
                
                const stats = await utils.getDatabaseStats();
                
                console.log('📊 Database Statistics:');
                console.log('  - Total nodes:', stats.nodeCount);
                console.log('  - Total relationships:', stats.relationshipCount); 
                console.log('  - Items:', stats.itemCount);
                console.log('  - Recipes:', stats.recipeCount);
                console.log('  - Cities:', stats.cityCount);
                console.log('  - Price records:', stats.priceCount);
                if (stats.lastPriceUpdate) {
                    console.log('  - Last price update:', stats.lastPriceUpdate.toISOString());
                }
                
                await connection.disconnect();
            } catch (error) {
                console.error('❌ Failed to get stats:', error.message);
            }
        }
        
        showStats();
    "
    
    print_success "Full import completed"
}

# Validate imported data
validate_data() {
    print_status "Validating imported data..."
    
    check_neo4j_connection
    
    node -e "
        const { createConnection } = require('../src/connection');
        const { DatabaseUtils } = require('../src/utils');
        
        async function validateData() {
            try {
                const connection = createConnection();
                await connection.connect();
                const utils = new DatabaseUtils(connection);
                
                const integrity = await utils.verifyDataIntegrity();
                
                console.log('🔍 Data Integrity Check:');
                console.log('  - Orphaned prices:', integrity.orphanedPrices);
                console.log('  - Duplicate items:', integrity.duplicateItems);
                console.log('  - Missing required fields:', integrity.missingRequiredFields);
                
                if (integrity.issues.length > 0) {
                    console.log('⚠️ Issues found:');
                    integrity.issues.forEach(issue => console.log('    -', issue));
                } else {
                    console.log('✅ No data integrity issues found');
                }
                
                await connection.disconnect();
            } catch (error) {
                console.error('❌ Validation failed:', error.message);
            }
        }
        
        validateData();
    "
}

# Clean old data
clean_old_data() {
    local days=${1:-30}
    
    print_status "Cleaning data older than $days days..."
    
    check_neo4j_connection
    
    node -e "
        const { createConnection } = require('../src/connection');
        const { DatabaseUtils } = require('../src/utils');
        
        async function cleanData() {
            try {
                const connection = createConnection();
                await connection.connect();
                const utils = new DatabaseUtils(connection);
                
                const deletedCount = await utils.cleanOldPrices($days);
                console.log('🧹 Cleaned', deletedCount, 'old price records');
                
                await connection.disconnect();
            } catch (error) {
                console.error('❌ Cleanup failed:', error.message);
            }
        }
        
        cleanData();
    "
}

# Show help
show_help() {
    echo "ALB Market Import Functions"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  items <file>     Import items from JSON file"
    echo "  prices <file>    Import prices from JSON file" 
    echo "  recipes <file>   Import recipes from JSON file"
    echo "  all              Import all data from verified-data directory"
    echo "  validate         Validate imported data integrity"
    echo "  clean [days]     Clean old price data (default: 30 days)"
    echo "  help             Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  NEO4J_URI       Neo4j connection URI (default: bolt://localhost:7687)"
    echo "  NEO4J_USER      Neo4j username (default: neo4j)"
    echo "  NEO4J_PASSWORD  Neo4j password (default: albmarket123)"
    echo ""
    echo "Examples:"
    echo "  $0 items ../verified-data/items.json"
    echo "  $0 prices ../verified-data/prices.json"
    echo "  $0 all"
    echo "  $0 validate"
    echo "  $0 clean 7"
}

# Main command dispatcher
main() {
    case ${1:-help} in
        "items")
            if [[ -z "$2" ]]; then
                print_error "Usage: $0 items <file>"
                exit 1
            fi
            check_neo4j_connection
            import_items "$2"
            ;;
        "prices")
            if [[ -z "$2" ]]; then
                print_error "Usage: $0 prices <file>"
                exit 1
            fi
            check_neo4j_connection
            import_prices "$2"
            ;;
        "recipes")
            if [[ -z "$2" ]]; then
                print_error "Usage: $0 recipes <file>"  
                exit 1
            fi
            check_neo4j_connection
            import_recipes "$2"
            ;;
        "all")
            import_all
            ;;
        "validate")
            validate_data
            ;;
        "clean")
            clean_old_data "$2"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Make sure we're in the scripts directory
cd "$(dirname "$0")"

# Run main function with all arguments
main "$@"