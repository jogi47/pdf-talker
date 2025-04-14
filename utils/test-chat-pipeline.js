/**
 * Test the complete chat pipeline
 * This script tests all components of the chat system including vector search and LLM generation
 * Run with: node utils/test-chat-pipeline.js <pdfId> "<test question>"
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { chromaClient } = require('./chromaStore');
const { answerQuestion } = require('../services/langchain');
const PDF = require('../models/PDF');

// Get command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: node utils/test-chat-pipeline.js <pdfId> "<test question>"');
  process.exit(1);
}

const pdfId = args[0];
const testQuestion = args[1];

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-talker')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

async function testChatPipeline() {
  try {
    console.log('Starting chat pipeline test...');
    
    // 1. Check ChromaDB connection
    console.log('\n=== Testing ChromaDB Connection ===');
    const heartbeat = await chromaClient.heartbeat();
    console.log(`ChromaDB heartbeat: ${heartbeat}`);
    
    // 2. Verify PDF exists
    console.log('\n=== Verifying PDF in Database ===');
    const pdf = await PDF.findById(pdfId);
    if (!pdf) {
      console.error(`PDF with ID ${pdfId} not found in database`);
      process.exit(1);
    }
    console.log(`PDF found: ${pdf.title} (processed: ${pdf.processed})`);
    
    // 3. Check if collection exists in ChromaDB
    console.log('\n=== Checking ChromaDB Collection ===');
    const collections = await chromaClient.listCollections();
    if (collections.includes(pdfId)) {
      console.log(`Collection ${pdfId} exists in ChromaDB`);
      
      // Get collection details
      const collection = await chromaClient.getCollection({
        name: pdfId
      });
      
      const count = await collection.count();
      console.log(`Collection contains ${count} documents`);
    } else {
      console.error(`Collection ${pdfId} not found in ChromaDB!`);
      process.exit(1);
    }
    
    // 4. Test direct document retrieval
    console.log('\n=== Testing Direct Document Retrieval ===');
    console.log(`Test question: "${testQuestion}"`);
    
    // Create embeddings for the test question
    const { OpenAIEmbeddings } = require('@langchain/openai');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    
    const embedding = await embeddings.embedQuery(testQuestion);
    console.log('Created embedding for question');
    
    // Query the collection directly
    const collection = await chromaClient.getCollection({
      name: pdfId
    });
    
    const queryResponse = await collection.query({
      queryEmbeddings: [embedding],
      nResults: 5
    });
    
    if (queryResponse.documents[0] && queryResponse.documents[0].length > 0) {
      console.log(`Direct query successful! Found ${queryResponse.documents[0].length} documents`);
      console.log('\nFirst result preview:');
      console.log(queryResponse.documents[0][0].substring(0, 200) + '...');
    } else {
      console.error('Direct query returned no results');
    }
    
    // 5. Test the complete question answering pipeline
    console.log('\n=== Testing Complete Question Answering Pipeline ===');
    console.log(`Asking question: "${testQuestion}"`);
    
    console.time('Answer generation');
    const result = await answerQuestion(pdfId, testQuestion);
    console.timeEnd('Answer generation');
    
    console.log('\nAnswer:');
    console.log(result);
    
    // 6. Cleanup
    mongoose.disconnect();
    console.log('\nTest completed successfully.');
  } catch (error) {
    console.error('Error testing chat pipeline:', error);
  }
}

testChatPipeline().catch(console.error); 