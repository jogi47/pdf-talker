/**
 * ChromaDB in-memory storage
 * This module provides a shared store for ChromaDB collections across the application
 */

// Store ChromaDB collections in memory for the session
const chromaCollections = {};

module.exports = {
  chromaCollections
}; 