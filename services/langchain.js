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
const { chromaCollections } = require('../utils/chromaStore');

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
async function getVectorContext(pdfId, question, k = 5) {
  try {
    console.log(`Retrieving vector context for PDF ${pdfId} with question: ${question}`);
    
    // Check if we already have this collection in memory
    if (!chromaCollections[pdfId]) {
      console.log(`Collection ${pdfId} not found in memory cache`);
      console.log('Attempting to recreate vector store...');
      
      // We can't retrieve from disk, so return empty result
      return '';
    }
    
    console.log(`Found collection ${pdfId} in memory cache`);
    const vectorStore = chromaCollections[pdfId];
    
    // No need for filter since we're using the correct collection
    console.log(`Performing similarity search with k=${k}...`);
    const results = await vectorStore.similaritySearch(question, k);
    
    if (!results || results.length === 0) {
      console.log("No results found in vector store");
      return '';
    }
    
    console.log(`Found ${results.length} results in vector store`);
    return results.map(doc => doc.pageContent).join('\n\n');
  } catch (error) {
    console.error('Error retrieving from vector store:', error);
    return '';
  }
}

// Function to get context from knowledge graph
async function getGraphContext(pdfId, question, limit = 5) {
  try {
    const session = neo4jDriver.session();
    
    // Use a hardcoded LIMIT value directly in the query instead of a parameter
    const result = await session.run(
      `MATCH (c:Chunk {graphId: $pdfId})
       WHERE c.content IS NOT NULL
       RETURN c.content AS content,
       null AS title,
       CASE 
         WHEN c.content CONTAINS $question THEN 3
         ELSE 1
       END AS relevance
       ORDER BY relevance DESC
       LIMIT 5`,  // Hardcoded value instead of parameter
      { pdfId, question }
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
    previousAnswer: ''
  };
  
  // Create the graph
  const pdfQuestionGraph = new StateGraph({
    channels: initialState
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
    
    const answer = await chain.invoke({
      vectorContext,
      graphContext,
      question,
      previousAnswer
    });
    
    return { ...state, answer };
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
    
    // Ensure we return a valid string (required by the Chat model)
    if (!result.answer || typeof result.answer !== 'string' || result.answer.trim() === '') {
      return "I couldn't find any relevant information in the PDF for your question. Please try rephrasing your question or ask about a different topic.";
    }
    
    return result.answer;
  } catch (error) {
    console.error('Error answering question:', error);
    return 'I encountered an error while trying to answer your question. Please try again later.';
  }
}

module.exports = {
  answerQuestion
}; 