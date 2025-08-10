import neo4j, { Driver, Session } from 'neo4j-driver';
import * as dotenv from 'dotenv';

dotenv.config();

export interface Neo4jConfig {
  uri: string;
  user: string;
  password: string;
  maxConnections?: number;
  maxConnectionTimeout?: number;
  connectionAcquisitionTimeout?: number;
}

class Neo4jConnection {
  private driver: Driver | null = null;
  private config: Neo4jConfig;

  constructor(config?: Partial<Neo4jConfig>) {
    this.config = {
      uri: config?.uri || process.env.NEO4J_URI || 'bolt://localhost:7687',
      user: config?.user || process.env.NEO4J_USER || 'neo4j',
      password: config?.password || process.env.NEO4J_PASSWORD || 'password',
      maxConnections: config?.maxConnections || 100,
      maxConnectionTimeout: config?.maxConnectionTimeout || 30000,
      connectionAcquisitionTimeout: config?.connectionAcquisitionTimeout || 60000,
    };
  }

  async connect(): Promise<void> {
    if (this.driver) {
      return;
    }

    try {
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.user, this.config.password),
        {
          maxConnectionPoolSize: this.config.maxConnections,
          connectionTimeout: this.config.maxConnectionTimeout,
          connectionAcquisitionTimeout: this.config.connectionAcquisitionTimeout,
          // Disable encryption for local development
          encrypted: this.config.uri.startsWith('bolt://') ? 'ENCRYPTION_OFF' : 'ENCRYPTION_ON',
        }
      );

      // Test the connection
      await this.driver.verifyConnectivity();
      console.log('✅ Neo4j connection established successfully');
    } catch (error) {
      console.error('❌ Failed to connect to Neo4j:', error);
      throw new Error(`Neo4j connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async disconnect(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
      console.log('✅ Neo4j connection closed');
    }
  }

  getDriver(): Driver {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized. Call connect() first.');
    }
    return this.driver;
  }

  getSession(database?: string): Session {
    const driver = this.getDriver();
    return driver.session({ database });
  }

  async executeQuery<T = any>(
    query: string,
    parameters: Record<string, any> = {},
    database?: string
  ): Promise<T[]> {
    const session = this.getSession(database);
    try {
      const result = await session.run(query, parameters);
      return result.records.map(record => record.toObject());
    } catch (error) {
      console.error('Query execution failed:', error);
      console.error('Query:', query);
      console.error('Parameters:', parameters);
      throw error;
    } finally {
      await session.close();
    }
  }

  async executeWrite<T = any>(
    query: string,
    parameters: Record<string, any> = {},
    database?: string
  ): Promise<T[]> {
    const session = this.getSession(database);
    try {
      const result = await session.executeWrite(tx => tx.run(query, parameters));
      return result.records.map(record => record.toObject());
    } catch (error) {
      console.error('Write query execution failed:', error);
      console.error('Query:', query);
      console.error('Parameters:', parameters);
      throw error;
    } finally {
      await session.close();
    }
  }

  async executeRead<T = any>(
    query: string,
    parameters: Record<string, any> = {},
    database?: string
  ): Promise<T[]> {
    const session = this.getSession(database);
    try {
      const result = await session.executeRead(tx => tx.run(query, parameters));
      return result.records.map(record => record.toObject());
    } catch (error) {
      console.error('Read query execution failed:', error);
      console.error('Query:', query);
      console.error('Parameters:', parameters);
      throw error;
    } finally {
      await session.close();
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.executeQuery('RETURN 1 as test');
      return true;
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  async getDatabaseInfo(): Promise<any> {
    try {
      const result = await this.executeQuery(`
        CALL dbms.components() YIELD name, versions, edition
        RETURN name, versions, edition
      `);
      return result;
    } catch (error) {
      console.error('Failed to get database info:', error);
      return null;
    }
  }
}

// Singleton instance
let neo4jInstance: Neo4jConnection | null = null;

export function createConnection(config?: Partial<Neo4jConfig>): Neo4jConnection {
  if (!neo4jInstance) {
    neo4jInstance = new Neo4jConnection(config);
  }
  return neo4jInstance;
}

export function getConnection(): Neo4jConnection {
  if (!neo4jInstance) {
    throw new Error('Neo4j connection not initialized. Call createConnection() first.');
  }
  return neo4jInstance;
}

export default Neo4jConnection;
export { Neo4jConnection };