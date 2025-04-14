/**
 * Test ChromaDB server connection
 * Run with: node utils/test-chroma-connection.js
 */
require('dotenv').config();

const { chromaClient } = require('./chromaStore');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { OpenAIEmbeddings } = require('@langchain/openai');

async function testChromaConnection() {
  try {
    console.log('Testing ChromaDB server connection at http://localhost:8000...');
    
    // Test basic ChromaClient connection
    const heartbeat = await chromaClient.heartbeat();
    console.log(`ChromaDB heartbeat: ${heartbeat}`);
    
    // List all collections
    const collections = await chromaClient.listCollections();
    console.log('Available collections:', collections);
    
    if (collections.length > 0) {
      // Try to access one collection with direct ChromaDB API
      const collectionName = collections[0];
      console.log(`Testing connection to collection: ${collectionName}`);
      
      // Get the collection directly from ChromaDB
      const collection = await chromaClient.getCollection({
        name: collectionName
      });
      
      console.log(`Successfully connected to collection: ${collectionName}`);
      
      // Test a query using direct ChromaDB API (bypassing LangChain)
      const testQuestion = "Who is Jigar Patel?";
      console.log(`Testing query: "${testQuestion}"`);
      
      // Create an embedding for the question
      const embeddings = new OpenAIEmbeddings({
        openAIApiKey: process.env.OPENAI_API_KEY
      });
      
      const embedding = await embeddings.embedQuery(testQuestion);
      
      // Query directly using ChromaDB's API (no where clause)
      const queryResponse = await collection.query({
        queryEmbeddings: [embedding],
        nResults: 5
      });
      
      if (queryResponse.documents[0] && queryResponse.documents[0].length > 0) {
        console.log(`Query successful! Found ${queryResponse.documents[0].length} results`);
        console.log('First result:', queryResponse.documents[0][0].substring(0, 100) + '...');
      } else {
        console.log('Query returned no results');
      }
      
      // Optional: Now also test connecting through LangChain with a fixed approach
      try {
        console.log("\nTesting LangChain integration with ChromaDB...");
        const vectorStore = await Chroma.fromExistingCollection(
          embeddings,
          {
            collectionName: collectionName,
            url: 'http://localhost:8000',
            filter: null, // Explicitly set filter to null to avoid where clause issues
            collectionMetadata: {
              'hnsw:space': 'cosine'
            }
          }
        );
        debugger;
        
        // Directly access the ChromaDB client through LangChain
        console.log("Using direct collection access through LangChain...");
        const directResults = await vectorStore.collection.query({
          queryEmbeddings: [embedding],
          nResults: 2
        });
        
        if (directResults.documents[0] && directResults.documents[0].length > 0) {
          console.log(`LangChain direct query successful! Found ${directResults.documents[0].length} results`);
          console.log('First result:', directResults.documents[0][0].substring(0, 100) + '...');
        } else {
          console.log('LangChain direct query returned no results');
        }
      } catch (langchainError) {
        console.error('Error with LangChain integration:', langchainError.message);
      }
    }
    
    console.log('ChromaDB connection test completed successfully!');
  } catch (error) {
    console.error('Error testing ChromaDB connection:', error);
  }
}

testChromaConnection().catch(console.error); 