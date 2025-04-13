const { ChatOpenAI } = require('@langchain/openai');
const { Chroma } = require('@langchain/community/vectorstores/chroma');
const { OpenAIEmbeddings } = require('@langchain/openai');
const { StateGraph, END } = require('@langchain/langgraph');
const { StringOutputParser } = require('@langchain/core/output_parsers');
const { PromptTemplate } = require('@langchain/core/prompts');
const { neo4jDriver } = require('../config/database');

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

// Function to get context from vector store
async function getVectorContext(pdfId, question, k = 5) {
  try {
    const vectorStore = await Chroma.fromExistingCollection(
      embeddings,
      {
        collectionName: pdfId,
        url: process.env.CHROMA_URL || 'http://localhost:8000'
      }
    );
    
    const results = await vectorStore.similaritySearch(question, k);
    return results.map(doc => doc.pageContent).join('\n\n');
  } catch (error) {
    console.error('Error retrieving from vector store:', error);
    return '';
  }
}

// Function to get context from knowledge graph
async function getGraphContext(pdfId, question) {
  const session = neo4jDriver.session();
  
  try {
    // First, find the most relevant chunks based on the question
    const result = await session.run(`
      MATCH (c:Chunk {graphId: $graphId})
      WITH c, apoc.text.similarity(c.content, $question) AS similarity
      ORDER BY similarity DESC
      LIMIT 3
      MATCH path = (c)-[:NEXT*0..2]-(related)
      RETURN related.content AS content
      LIMIT 5
    `, {
      graphId: pdfId,
      question: question
    });
    
    return result.records.map(record => record.get('content')).join('\n\n');
  } catch (error) {
    console.error('Error retrieving from knowledge graph:', error);
    return '';
  } finally {
    await session.close();
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
    const pdfQuestionGraph = createPDFQuestionGraph(pdfId);
    
    const result = await pdfQuestionGraph.invoke({
      question
    });
    
    return result.answer;
  } catch (error) {
    console.error('Error answering question:', error);
    return 'I encountered an error while trying to answer your question. Please try again.';
  }
}

module.exports = {
  answerQuestion
}; 