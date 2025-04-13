const mongoose = require('mongoose');
const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');

dotenv.config();

// MongoDB Connection
const connectMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-talker');
    console.log('MongoDB Connected');
  } catch (error) {
    console.error('MongoDB Connection Error:', error);
    process.exit(1);
  }
};

// Neo4j Connection
const neo4jDriver = neo4j.driver(
  process.env.NEO4J_URI || 'bolt://localhost:7687',
  neo4j.auth.basic(
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'password'
  )
);

// Test Neo4j Connection
const testNeo4jConnection = async () => {
  const session = neo4jDriver.session();
  try {
    const result = await session.run('RETURN 1 AS num');
    console.log('Neo4j Connected');
    return result;
  } catch (error) {
    console.error('Neo4j Connection Error:', error);
    process.exit(1);
  } finally {
    await session.close();
  }
};

module.exports = {
  connectMongoDB,
  neo4jDriver,
  testNeo4jConnection
}; 