/**
 * Debug script for testing ChromaDB functionality
 * Run with: node debug-chroma.js
 */

const path = require('path');
const fs = require('fs');
const { ChromaClient } = require('chromadb');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
require('dotenv').config();

async function testChromaConnection() {
  console.log('===== ChromaDB Debug Tool =====');
  
  // Step 1: Check if chroma_db directory exists
  const chromaPath = path.resolve('./chroma_db');
  console.log(`ChromaDB path: ${chromaPath}`);
  
  if (fs.existsSync(chromaPath)) {
    console.log(`✅ ChromaDB directory exists`);
    
    // Print directory contents
    const files = fs.readdirSync(chromaPath);
    console.log(`Directory contents (${files.length} items):`);
    files.forEach(file => {
      const stats = fs.statSync(path.join(chromaPath, file));
      console.log(`- ${file} (${stats.isDirectory() ? 'directory' : 'file'}, ${(stats.size / 1024).toFixed(2)} KB)`);
    });
  } else {
    console.log(`❌ ChromaDB directory does not exist`);
    
    // Try to create the directory
    try {
      fs.mkdirSync(chromaPath, { recursive: true });
      console.log(`✅ Created ChromaDB directory`);
    } catch (err) {
      console.error(`❌ Failed to create ChromaDB directory: ${err.message}`);
    }
  }
  
  // Step 2: Test basic ChromaClient functionality
  try {
    console.log('\nTesting ChromaClient initialization...');
    const client = new ChromaClient({ path: './chroma_db' });
    console.log('✅ ChromaClient initialized successfully');
    
    // Try to list collections
    console.log('\nListing collections...');
    const collections = await client.listCollections();
    console.log(`✅ Found ${collections.length} collections`);
    
    if (collections.length > 0) {
      console.log('Collections:');
      collections.forEach(col => {
        console.log(`- ${col.name} (${col.metadata ? JSON.stringify(col.metadata) : 'no metadata'})`);
      });
      
      // Try to retrieve a collection
      const firstCollection = collections[0].name;
      console.log(`\nTesting retrieval of collection "${firstCollection}"...`);
      
      const collection = await client.getCollection({ name: firstCollection });
      console.log('✅ Retrieved collection');
      
      // Count items
      const count = await collection.count();
      console.log(`Collection has ${count} embeddings`);
      
      // If there are items, query one
      if (count > 0) {
        console.log('\nTesting query functionality...');
        const queryResult = await collection.query({
          nResults: 1,
          queryTexts: ["test query"]
        });
        console.log('✅ Query successful');
        console.log(`Returned ${queryResult.ids[0].length} results`);
      }
    } else {
      console.log('No collections found. Creating a test collection...');
      
      // Try to create a test collection
      const testCollection = await client.createCollection({
        name: 'test_collection',
        metadata: { description: 'Test collection for debugging' }
      });
      
      console.log('✅ Test collection created');
      
      // Try to add a test item
      console.log('\nAdding test item to collection...');
      await testCollection.add({
        ids: ["test1"],
        documents: ["This is a test document"],
        metadatas: [{ source: "debug script" }]
      });
      
      console.log('✅ Added test item to collection');
      
      // Verify it was added
      const count = await testCollection.count();
      console.log(`Collection now has ${count} embeddings`);
    }
  } catch (error) {
    console.error(`❌ ChromaClient test failed: ${error.message}`);
    console.error(error);
  }
  
  // Step 3: Test LangChain integration
  try {
    console.log('\nTesting LangChain integration...');
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY
    });
    console.log('✅ OpenAI Embeddings initialized');
    
    // Test with an existing collection if available
    const client = new ChromaClient({ path: './chroma_db' });
    const collections = await client.listCollections();
    
    if (collections.length > 0) {
      const firstCollection = collections[0].name;
      console.log(`Testing LangChain with collection "${firstCollection}"...`);
      
      // Try to create a vector store from existing collection
      const vectorStore = await Chroma.fromExistingCollection(
        embeddings,
        {
          collectionName: firstCollection,
          path: './chroma_db',
          url: undefined,
          chromaClient: client
        }
      );
      
      console.log('✅ Vector store created from existing collection');
      
      // Try a similarity search
      console.log('\nPerforming similarity search...');
      const results = await vectorStore.similaritySearch("test query", 1);
      
      console.log(`✅ Similarity search returned ${results.length} results`);
      if (results.length > 0) {
        console.log(`First result: "${results[0].pageContent.substring(0, 100)}..."`);
      }
    }
  } catch (error) {
    console.error(`❌ LangChain integration test failed: ${error.message}`);
    console.error(error);
  }
  
  console.log('\n===== ChromaDB Debug Complete =====');
}

// Run the test
testChromaConnection().catch(err => {
  console.error('Unhandled error in test:', err);
}); 