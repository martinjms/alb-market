// ALB Market Database Package
// Main exports for Neo4j database functionality

export { default as Neo4jConnection, createConnection, getConnection } from './connection';
export type { Neo4jConfig } from './connection';

export { default as SchemaManager, CYPHER_QUERIES } from './schema';
export type {
  ItemNode,
  RecipeNode,
  CityNode,
  PriceRelationship,
  CraftedFromRelationship,
  RequiresRelationship,
} from './schema';

export { default as DatabaseUtils, dbUtils } from './utils';
export type { QueryOptions, BatchOperationResult } from './utils';

// Re-export commonly used types from neo4j-driver
export type { Driver, Session, Result, Record } from 'neo4j-driver';