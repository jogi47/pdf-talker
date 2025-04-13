const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');
const { Document } = require('langchain/document');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
// Import required ChromaDB JS client
const { ChromaClient } = require('chromadb');
const neo4j = require('neo4j-driver');
const { neo4jDriver } = require('../config/database');
// Import the shared chromaStore
const { chromaCollections } = require('./chromaStore');

// Function to read and parse a PDF file
async function parsePDF(filePath) {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return {
      text: data.text,
      pageCount: data.numpages
    };
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

// Function to split text into chunks
async function splitTextIntoChunks(text) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200
  });
  
  const chunks = await splitter.splitText(text);
  return chunks.map((chunk, index) => 
    new Document({
      pageContent: chunk,
      metadata: { chunk_id: index }
    })
  );
}

// Function to create vector store from documents
async function createVectorStore(documents, collectionName) {
  try {
    console.log(`Creating vector store for collection: ${collectionName}`);
    console.log(`Document count: ${documents.length}`);
    
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    
    // Use in-memory ChromaDB instance
    console.log('Creating in-memory vector store...');
    const vectorStore = await Chroma.fromDocuments(
      documents,
      embeddings,
      {
        collectionName: collectionName,
        // Don't specify path or url to use in-memory storage
      }
    );
    console.log(`Vector store created successfully for ${collectionName}`);
    
    // Save to memory cache for retrieval across modules
    chromaCollections[collectionName] = vectorStore;
    console.log(`Saved collection to memory cache`);
    
    return vectorStore;
  } catch (error) {
    console.error('Error creating vector store:', error);
    throw new Error(`Failed to create vector store: ${error.message}`);
  }
}

// Function to create knowledge graph
async function createKnowledgeGraph(documents, graphId) {
  const session = neo4jDriver.session();
  
  try {
    // Create a unique constraint for nodes
    await session.run(`
      CREATE CONSTRAINT IF NOT EXISTS FOR (n:Chunk) REQUIRE n.id IS UNIQUE
    `);
    
    // Create a node for each document chunk
    for (const doc of documents) {
      await session.run(`
        MERGE (c:Chunk {id: $chunkId, content: $content, graphId: $graphId})
      `, {
        chunkId: `${graphId}_${doc.metadata.chunk_id}`,
        content: doc.pageContent,
        graphId: graphId
      });
      
      // If not the first chunk, create a NEXT relationship to the previous chunk
      if (doc.metadata.chunk_id > 0) {
        await session.run(`
          MATCH (prev:Chunk {id: $prevId})
          MATCH (curr:Chunk {id: $currId})
          MERGE (prev)-[:NEXT]->(curr)
        `, {
          prevId: `${graphId}_${doc.metadata.chunk_id - 1}`,
          currId: `${graphId}_${doc.metadata.chunk_id}`
        });
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error creating knowledge graph:', error);
    throw new Error('Failed to create knowledge graph');
  } finally {
    await session.close();
  }
}

// Main function to process PDF
async function processPDF(pdf) {
  try {
    // Parse the PDF
    const { text, pageCount } = await parsePDF(pdf.filePath);
    
    // Split the text into chunks
    const documents = await splitTextIntoChunks(text);
    
    // Create a unique ID for this PDF
    const uniqueId = pdf._id.toString();
    
    // Create vector store
    await createVectorStore(documents, uniqueId);
    
    // Create knowledge graph
    await createKnowledgeGraph(documents, uniqueId);
    
    // Update the PDF document in the database
    return {
      totalPages: pageCount,
      chunkCount: documents.length,
      processed: true,
      vectorStoreId: uniqueId,
      graphStoreId: uniqueId
    };
  } catch (error) {
    console.error('Error processing PDF:', error);
    throw error;
  }
}

module.exports = {
  parsePDF,
  splitTextIntoChunks,
  createVectorStore,
  createKnowledgeGraph,
  processPDF
}; 