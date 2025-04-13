# PDF Talker

A web application that allows users to upload PDF files and chat with them using AI. The application processes the PDF content, stores it in a vector database (ChromaDB) and knowledge graph (Neo4j), and enables natural language conversations about the PDF content.

## Features

- PDF Upload: Upload PDF files of any size
- PDF Processing: Automatic chunking and embedding of PDF content
- Vector Storage: ChromaDB for semantic search and retrieval
- Knowledge Graph: Neo4j for storing relationships between chunks
- Chat Interface: Ask questions about your PDF content in natural language
- Voice Input: Record and send voice messages to chat with PDFs using speech
- Chat History: View and manage your conversation history
- Agentic AI: LangGraph workflow for intelligent responses
- API Documentation: Interactive Swagger UI to explore and test the API

## Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: EJS templates, Bootstrap, JavaScript
- **Databases**:
  - MongoDB: For storing user data, PDF metadata, and chat history
  - ChromaDB: Vector database for PDF content embeddings
  - Neo4j: Graph database for knowledge relationships
- **AI**:
  - LangChain.js: For building AI workflows
  - LangGraph: For creating agentic AI systems
  - OpenAI: For embeddings, text generation, and speech-to-text conversion
- **Documentation**:
  - Swagger UI: Interactive API documentation

## Setup

### Prerequisites

- Node.js and npm
- MongoDB (running locally or remote)
- Neo4j (running locally or remote)
- ChromaDB (running locally or remote)
- OpenAI API key

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/pdf-talker.git
   cd pdf-talker
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the project root with the following variables:
   ```
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/pdf-talker
   NEO4J_URI=bolt://localhost:7687
   NEO4J_USER=neo4j
   NEO4J_PASSWORD=your_password
   OPENAI_API_KEY=your_openai_api_key
   CHROMA_URL=http://localhost:8000
   ```

4. Run the application:
   ```
   npm start
   ```

   For development with auto-restart:
   ```
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Usage

1. Upload a PDF from the homepage
2. Wait for the PDF to be processed (status will change from "Processing" to "Ready")
3. Click on "Chat" to start a conversation about the PDF
4. Ask questions in natural language about the PDF content:
   - Type your question and click "Send"
   - Or click "Record" to use voice input, then stop when finished
5. View and manage your chat history

## API Documentation

The application includes interactive API documentation powered by Swagger UI.

1. Start the application
2. Navigate to `http://localhost:3000/api-docs` in your browser
3. Explore and test the available API endpoints
4. You can also access the raw OpenAPI specification at `http://localhost:3000/swagger.json`

## Project Structure

```
pdf-talker/
├── config/              # Configuration files
├── models/              # MongoDB models
├── public/              # Static assets
│   ├── css/             # Stylesheets
│   └── js/              # Client-side JavaScript
├── routes/              # Express route handlers
├── services/            # Business logic and services
├── uploads/             # Uploaded PDF files
│   └── audio/           # Temporary audio recordings
├── utils/               # Utility functions
├── views/               # EJS templates
│   ├── partials/        # Reusable template parts
│   ├── pdf/             # PDF-related templates
│   └── chat/            # Chat-related templates
├── .env                 # Environment variables
├── app.js               # Main application file
├── package.json         # Project dependencies
├── swagger.js           # Swagger configuration
├── swagger-routes.js    # Swagger route annotations
└── README.md            # Project documentation
```

## License

ISC 