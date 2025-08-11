import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createConnection } from '../../database/src/connection';
import adminRoutes from './routes/admin';

// Load environment variables
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 4000;

// Initialize Neo4j connection
async function initializeDatabase() {
  try {
    const connection = createConnection({
      uri: process.env.NEO4J_URI || 'bolt://localhost:7687',
      user: process.env.NEO4J_USER || 'neo4j',
      password: process.env.NEO4J_PASSWORD || 'albmarket123'
    });
    
    await connection.connect();
    console.log('🎯 Database connection initialized');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
}

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'alb-market-backend'
  });
});

// API routes
app.get('/api', (_req, res) => {
  res.json({ message: 'ALB Market API - Coming Soon!' });
});

// Admin routes
app.use('/api/admin', adminRoutes);

async function startServer() {
  // Initialize database connection
  await initializeDatabase();
  
  // Start the server
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Admin panel: http://localhost:3000/admin`);
  });
}

// Start the application
startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});

export default app;