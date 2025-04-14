/**
 * ChromaDB client configuration
 * This module provides a shared client for ChromaDB across the application
 */
const { ChromaClient } = require('chromadb');

// Create a ChromaDB client connected to the server
const chromaClient = new ChromaClient({
  path: 'http://localhost:8000'
});

// Store ChromaDB collections in memory for the session
const chromaCollections = {};

module.exports = {
  chromaClient,
  chromaCollections
}; 