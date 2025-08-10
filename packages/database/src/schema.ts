import { getConnection, Neo4jConnection } from './connection';

export interface ItemNode {
  id: string;
  name: string;
  category: string;
  tier: number;
  enchantment: number;
  iconUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RecipeNode {
  id: string;
  name: string;
  building: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CityNode {
  name: string;
  coordinates?: {
    x: number;
    y: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PriceRelationship {
  price: number;
  timestamp: Date;
  quality: number;
  sellOrderCount?: number;
  buyOrderCount?: number;
}

export interface CraftedFromRelationship {
  quantity: number;
}

export interface RequiresRelationship {
  quantity: number;
  nutrition?: number;
}

export class SchemaManager {
  private connection: Neo4jConnection;

  constructor(connection?: Neo4jConnection) {
    this.connection = connection || getConnection();
  }

  async initializeSchema(): Promise<void> {
    console.log('🚀 Initializing Neo4j schema...');
    
    await this.createConstraints();
    await this.createIndexes();
    
    console.log('✅ Schema initialization completed');
  }

  private async createConstraints(): Promise<void> {
    console.log('📋 Creating constraints...');

    const constraints = [
      // Item constraints
      'CREATE CONSTRAINT item_id_unique IF NOT EXISTS FOR (i:Item) REQUIRE i.id IS UNIQUE',
      
      // Recipe constraints
      'CREATE CONSTRAINT recipe_id_unique IF NOT EXISTS FOR (r:Recipe) REQUIRE r.id IS UNIQUE',
      
      // City constraints
      'CREATE CONSTRAINT city_name_unique IF NOT EXISTS FOR (c:City) REQUIRE c.name IS UNIQUE',
      
      // Composite constraints for better data integrity
      'CREATE CONSTRAINT item_name_tier_enchantment IF NOT EXISTS FOR (i:Item) REQUIRE (i.name, i.tier, i.enchantment) IS UNIQUE',
    ];

    for (const constraint of constraints) {
      try {
        await this.connection.executeWrite(constraint);
        console.log(`✅ Created constraint: ${constraint.split(' ')[2]}`);
      } catch (error: any) {
        // Ignore if constraint already exists
        if (error.code !== 'Neo.ClientError.Schema.ConstraintAlreadyExists') {
          console.error(`❌ Failed to create constraint: ${constraint}`, error);
          throw error;
        }
      }
    }
  }

  private async createIndexes(): Promise<void> {
    console.log('🔍 Creating indexes...');

    const indexes = [
      // Item indexes
      'CREATE INDEX item_name IF NOT EXISTS FOR (i:Item) ON (i.name)',
      'CREATE INDEX item_category IF NOT EXISTS FOR (i:Item) ON (i.category)',
      'CREATE INDEX item_tier IF NOT EXISTS FOR (i:Item) ON (i.tier)',
      'CREATE INDEX item_enchantment IF NOT EXISTS FOR (i:Item) ON (i.enchantment)',
      'CREATE INDEX item_category_tier IF NOT EXISTS FOR (i:Item) ON (i.category, i.tier)',
      
      // Recipe indexes
      'CREATE INDEX recipe_name IF NOT EXISTS FOR (r:Recipe) ON (r.name)',
      'CREATE INDEX recipe_building IF NOT EXISTS FOR (r:Recipe) ON (r.building)',
      
      // City indexes
      'CREATE INDEX city_name IF NOT EXISTS FOR (c:City) ON (c.name)',
      
      // Relationship indexes for performance
      'CREATE INDEX price_timestamp IF NOT EXISTS FOR ()-[p:PRICED_AT]-() ON (p.timestamp)',
      'CREATE INDEX price_value IF NOT EXISTS FOR ()-[p:PRICED_AT]-() ON (p.price)',
      'CREATE INDEX crafted_quantity IF NOT EXISTS FOR ()-[c:CRAFTED_FROM]-() ON (c.quantity)',
    ];

    for (const index of indexes) {
      try {
        await this.connection.executeWrite(index);
        console.log(`✅ Created index: ${index.split(' ')[2]}`);
      } catch (error: any) {
        // Ignore if index already exists
        if (error.code !== 'Neo.ClientError.Schema.IndexAlreadyExists') {
          console.error(`❌ Failed to create index: ${index}`, error);
          throw error;
        }
      }
    }
  }

  async validateSchema(): Promise<boolean> {
    try {
      console.log('🔍 Validating schema...');
      
      const constraints = await this.connection.executeQuery('SHOW CONSTRAINTS');
      const indexes = await this.connection.executeQuery('SHOW INDEXES');
      
      console.log(`✅ Found ${constraints.length} constraints`);
      console.log(`✅ Found ${indexes.length} indexes`);
      
      return true;
    } catch (error) {
      console.error('❌ Schema validation failed:', error);
      return false;
    }
  }

  async dropSchema(): Promise<void> {
    console.log('🗑️ Dropping schema...');
    
    try {
      // Drop all constraints
      const constraints = await this.connection.executeQuery('SHOW CONSTRAINTS');
      for (const constraint of constraints) {
        const name = constraint.name;
        await this.connection.executeWrite(`DROP CONSTRAINT ${name} IF EXISTS`);
      }
      
      // Drop all indexes
      const indexes = await this.connection.executeQuery('SHOW INDEXES WHERE type = "BTREE"');
      for (const index of indexes) {
        const name = index.name;
        await this.connection.executeWrite(`DROP INDEX ${name} IF EXISTS`);
      }
      
      console.log('✅ Schema dropped successfully');
    } catch (error) {
      console.error('❌ Failed to drop schema:', error);
      throw error;
    }
  }

  async getSchemaInfo(): Promise<{
    constraints: any[];
    indexes: any[];
    nodeLabels: any[];
    relationshipTypes: any[];
  }> {
    try {
      const [constraints, indexes, nodeLabels, relationshipTypes] = await Promise.all([
        this.connection.executeQuery('SHOW CONSTRAINTS'),
        this.connection.executeQuery('SHOW INDEXES'),
        this.connection.executeQuery('CALL db.labels()'),
        this.connection.executeQuery('CALL db.relationshipTypes()'),
      ]);

      return {
        constraints,
        indexes,
        nodeLabels,
        relationshipTypes,
      };
    } catch (error) {
      console.error('❌ Failed to get schema info:', error);
      throw error;
    }
  }
}

// Common Cypher queries for the schema
export const CYPHER_QUERIES = {
  // Item queries
  CREATE_ITEM: `
    MERGE (i:Item {id: $id})
    SET i.name = $name,
        i.category = $category,
        i.tier = $tier,
        i.enchantment = $enchantment,
        i.iconUrl = $iconUrl,
        i.updatedAt = datetime()
    ON CREATE SET i.createdAt = datetime()
    RETURN i
  `,
  
  FIND_ITEM_BY_ID: `
    MATCH (i:Item {id: $id})
    RETURN i
  `,
  
  FIND_ITEMS_BY_CATEGORY: `
    MATCH (i:Item {category: $category})
    RETURN i
    ORDER BY i.tier, i.enchantment, i.name
  `,
  
  // Recipe queries
  CREATE_RECIPE: `
    MERGE (r:Recipe {id: $id})
    SET r.name = $name,
        r.building = $building,
        r.updatedAt = datetime()
    ON CREATE SET r.createdAt = datetime()
    RETURN r
  `,
  
  // City queries
  CREATE_CITY: `
    MERGE (c:City {name: $name})
    SET c.coordinates = $coordinates,
        c.updatedAt = datetime()
    ON CREATE SET c.createdAt = datetime()
    RETURN c
  `,
  
  // Relationship queries
  CREATE_PRICE_RELATIONSHIP: `
    MATCH (i:Item {id: $itemId}), (c:City {name: $cityName})
    MERGE (i)-[p:PRICED_AT]->(c)
    SET p.price = $price,
        p.timestamp = datetime($timestamp),
        p.quality = $quality,
        p.sellOrderCount = $sellOrderCount,
        p.buyOrderCount = $buyOrderCount
    RETURN p
  `,
  
  CREATE_CRAFTED_FROM_RELATIONSHIP: `
    MATCH (output:Item {id: $outputId}), (input:Item {id: $inputId})
    MERGE (output)-[c:CRAFTED_FROM]->(input)
    SET c.quantity = $quantity
    RETURN c
  `,
  
  CREATE_RECIPE_REQUIRES_RELATIONSHIP: `
    MATCH (r:Recipe {id: $recipeId}), (i:Item {id: $itemId})
    MERGE (r)-[req:REQUIRES]->(i)
    SET req.quantity = $quantity,
        req.nutrition = $nutrition
    RETURN req
  `,
  
  // Analysis queries
  GET_ITEM_PRICES: `
    MATCH (i:Item {id: $itemId})-[p:PRICED_AT]->(c:City)
    RETURN i.name as itemName, c.name as cityName, 
           p.price as price, p.timestamp as timestamp, p.quality as quality
    ORDER BY p.timestamp DESC
  `,
  
  GET_CRAFTING_CHAIN: `
    MATCH (output:Item {id: $itemId})-[c:CRAFTED_FROM*]->(input:Item)
    RETURN output, c, input
  `,
  
  GET_MARKET_OVERVIEW: `
    MATCH (i:Item)-[p:PRICED_AT]->(c:City)
    WHERE p.timestamp > datetime($since)
    RETURN i.category as category, 
           count(DISTINCT i) as itemCount,
           count(DISTINCT c) as cityCount,
           avg(p.price) as avgPrice,
           min(p.price) as minPrice,
           max(p.price) as maxPrice
    ORDER BY category
  `,
};

export default SchemaManager;