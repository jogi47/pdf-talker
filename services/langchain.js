const { ChatOpenAI } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { OpenAIEmbeddings } = require('@langchain/openai');
// Import required ChromaDB JS client
const { ChromaClient } = require('chromadb');
const { StateGraph, END } = require('@langchain/langgraph');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { PromptTemplate } = require('@langchain/core/prompts');
const { neo4jDriver } = require('../config/database');
// Import the shared chromaStore
const { chromaClient, chromaCollections } = require('../utils/chromaStore');

// Initialize OpenAI models
const chatModel = new ChatOpenAI({
  openAIApiKey: process.env.OPENAI_API_KEY,
  modelName: 'gpt-4o',
  temperature: 0
});

const embeddings = new OpenAIEmbeddings({
  openAIApiKey: process.env.OPENAI_API_KEY
});

// Define prompts
const retrievalPrompt = PromptTemplate.fromTemplate(`
You are an AI assistant that helps users with questions about their PDF documents.
Use the following pieces of context to answer the question at the end.
If you don't know the answer, just say you don't know. DO NOT make up an answer.

Context:
{context}

Question: {question}

Answer:
`);

const knowledgeGraphPrompt = PromptTemplate.fromTemplate(`
You are an AI assistant that helps users with questions about their PDF documents.
Use the following information from the knowledge graph to enhance your answer.
The knowledge graph represents connections between different parts of the document.

Context from Vector DB:
{vectorContext}

Knowledge Graph Context:
{graphContext}

Question: {question}

Previous Answer: {previousAnswer}

Provide a comprehensive answer that incorporates both the context from the vector database and the knowledge graph structure.
`);

// Store ChromaDB collections in memory for the session
// Variable declaration removed as it's now imported from chromaStore

// Function to get context from vector store
async function getVectorContext(pdfId, question, k = 1) {
  try {
    console.log(`Retrieving vector context for PDF ${pdfId} with question: ${question}`);
    
    // Create embedding for query
    console.log(`Creating embedding for question...`);
    const embedding = await embeddings.embedQuery(question);
    
    // First try: Direct ChromaDB API approach (most reliable)
    try {
      console.log(`Trying direct ChromaDB API approach...`);
      const collection = await chromaClient.getCollection({
        name: pdfId
      });
      console.log(`Retrieved collection ${pdfId} directly from ChromaDB server`);
      
      // Query directly using ChromaDB API
      const queryResponse = await collection.query({
        queryEmbeddings: [embedding],
        nResults: k
      });
      
      if (queryResponse.documents[0] && queryResponse.documents[0].length > 0) {
        console.log(`Found ${queryResponse.documents[0].length} results using direct ChromaDB query`);
        return queryResponse.documents[0].join('\n\n');
      } else {
        console.log("No results found in direct ChromaDB query");
      }
    } catch (directError) {
      console.error(`Error with direct ChromaDB query: ${directError.message}`);
    }
    
    // Second try: Use LangChain but avoid problematic where clause
    try {
      console.log(`Attempting to use LangChain wrapper with direct access...`);
      const vectorStore = await Chroma.fromExistingCollection(
        embeddings,
        {
          collectionName: pdfId,
          url: 'http://localhost:8000',
          filter: null, // Explicitly set filter to null
          collectionMetadata: {
            'hnsw:space': 'cosine'
          }
        }
      );
      
      // Save to memory cache for future use
      chromaCollections[pdfId] = vectorStore;
      console.log(`Saved collection to memory cache for future use`);
      
      // Access the collection directly through LangChain
      if (vectorStore.collection) {
        console.log(`Accessing collection directly through LangChain...`);
        const langchainDirectResponse = await vectorStore.collection.query({
          queryEmbeddings: [embedding],
          nResults: k
        });
        
        if (langchainDirectResponse.documents[0] && langchainDirectResponse.documents[0].length > 0) {
          console.log(`Found ${langchainDirectResponse.documents[0].length} results through LangChain direct access`);
          return langchainDirectResponse.documents[0].join('\n\n');
        }
      }
    } catch (langchainError) {
      console.error(`Error with LangChain approach: ${langchainError.message}`);
    }
    
    console.log('No results found from any method');
    return '';
  } catch (error) {
    console.error('Error retrieving from vector store:', error);
    return '';
  }
}

// Function to get context from knowledge graph
async function getGraphContext(pdfId, question, limit = 5) {
  try {
    const session = neo4jDriver.session();
    
    // Ensure limit is an integer - Neo4j doesn't accept floats for LIMIT
    const limitInt = Math.floor(Number(limit));
    
    // Modified query to remove potential NULL content issues
    const result = await session.run(
      `MATCH (c:Chunk {graphId: $pdfId})
       WHERE c.content IS NOT NULL AND trim(c.content) <> ''
       RETURN c.content AS content,
       null AS title,
       CASE 
         WHEN c.content CONTAINS $question THEN 3
         ELSE 1
       END AS relevance
       ORDER BY relevance DESC
       LIMIT 1`,
      { 
        pdfId, 
        question, 
        limit: limitInt // Pass as integer 
      }
    );
    
    await session.close();
    
    if (result.records.length === 0) {
      console.log("No knowledge graph results found");
      return '';
    }
    
    return result.records
      .map(record => {
        const title = record.get('title');
        const content = record.get('content');
        return `${title ? title + ': ' : ''}${content}`;
      })
      .join('\n\n');
  } catch (error) {
    console.error('Error retrieving from knowledge graph:', error);
    return '';
  }
}

// Create LangGraph for PDF question answering
function createPDFQuestionGraph(pdfId) {
  // Define the state
  const initialState = {
    question: '',
    vectorContext: '',
    graphContext: '',
    previousAnswer: '',
    answer: '', // Add explicit answer field to initial state
    finalAnswer: '' // Add finalAnswer field for clarity
  };
  
  // Create the graph with explicit output to ensure we get the full state
  const pdfQuestionGraph = new StateGraph({
    channels: initialState,
    // Explicitly set which channel names should be included in the final output
    include_all_state: true // This ensures all state properties are returned
  });
  
  // Add nodes
  
  // Node for retrieving context from vector store
  pdfQuestionGraph.addNode('retrieveVectorContext', async (state) => {
    const question = state.question;
    const vectorContext = await getVectorContext(pdfId, question);
    
    return { ...state, vectorContext };
  });
  
  // Node for initial answer based on vector context
  pdfQuestionGraph.addNode('generateInitialAnswer', async (state) => {
    const { question, vectorContext } = state;
    
    const chain = retrievalPrompt
      .pipe(chatModel)
      .pipe(new StringOutputParser());
    
    const previousAnswer = await chain.invoke({
      context: vectorContext,
      question
    });
    
    return { ...state, previousAnswer };
  });
  
  // Node for retrieving context from knowledge graph
  pdfQuestionGraph.addNode('retrieveGraphContext', async (state) => {
    const question = state.question;
    const graphContext = await getGraphContext(pdfId, question);
    
    return { ...state, graphContext };
  });
  
  // Node for final answer that incorporates knowledge graph
  pdfQuestionGraph.addNode('generateFinalAnswer', async (state) => {
    const { question, vectorContext, graphContext, previousAnswer } = state;
    
    const chain = knowledgeGraphPrompt
      .pipe(chatModel)
      .pipe(new StringOutputParser());
    
    try {
      const answer = await chain.invoke({
        vectorContext,
        graphContext,
        question,
        previousAnswer
      });
      
      console.log('Final answer generated successfully');
      
      // Explicitly update the state with answer property
      return { 
        ...state, 
        answer: answer,  // Set both answer properties to ensure one is available
        finalAnswer: answer
      };
    } catch (error) {
      console.error('Error generating final answer:', error);
      // If the final answer generation fails, use the previous answer as fallback
      return { 
        ...state, 
        answer: previousAnswer,
        finalAnswer: previousAnswer,
        error: error.message
      };
    }
  });
  
  // Define the edges
  pdfQuestionGraph.setEntryPoint("retrieveVectorContext");
  pdfQuestionGraph.addEdge('retrieveVectorContext', 'generateInitialAnswer');
  pdfQuestionGraph.addEdge('generateInitialAnswer', 'retrieveGraphContext');
  pdfQuestionGraph.addEdge('retrieveGraphContext', 'generateFinalAnswer');
  pdfQuestionGraph.addEdge('generateFinalAnswer', END);
  
  // Compile the graph
  const runnable = pdfQuestionGraph.compile();
  
  return runnable;
}

// Function to answer a question about a PDF
async function answerQuestion(pdfId, question) {
  try {
    if (!question || question.trim() === '') {
      return 'Your question is empty. Please ask a question about the PDF.';
    }
    
    // Create and invoke the graph
    const pdfQuestionGraph = createPDFQuestionGraph(pdfId);
    const result = await pdfQuestionGraph.invoke({ question });
    
    console.log('LangGraph result keys:', Object.keys(result));
    
    // Check which property contains the answer (might be answer or output)
    if (result.answer) {
      // If answer property exists and is valid
      if (typeof result.answer === 'string' && result.answer.trim() !== '') {
        return result.answer;
      }
    } else if (result.previousAnswer) {
      // If no answer but we have a previousAnswer (from initial generation)
      console.log('Using previousAnswer as fallback');
      return result.previousAnswer;
    } else if (result.output) {
      // Some versions of LangGraph may return output instead
      console.log('Using output property instead of answer');
      return result.output;
    } else if (result.generateFinalAnswer) {
      // The node name might be included in the result
      console.log('Using generateFinalAnswer property');
      return result.generateFinalAnswer;
    }
    
    // If we can't find the answer in any expected property, debug what we received
    console.log('Debug full result object:', JSON.stringify(result, null, 2));
    
    // Fallback error message
    return "I couldn't find any relevant information in the PDF for your question. Please try rephrasing your question or ask about a different topic.";
  } catch (error) {
    console.error('Error answering question:', error);
    return 'I encountered an error while trying to answer your question. Please try again later.';
  }
}

module.exports = {
  answerQuestion
}; 