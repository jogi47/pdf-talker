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
- Containerization: Docker setup for easy deployment

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
- **Deployment**:
  - Docker & Docker Compose: For containerization and orchestration

## Setup

### Prerequisites

- Node.js and npm (for local development)
- Docker and Docker Compose (for containerized setup)
- OpenAI API key

### Installation

#### Option 1: Standard Installation

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
   ```

4. Start the ChromaDB server:
   ```
   docker run -p 8000:8000 chromadb/chroma:latest
   ```

5. Run the application:
   ```
   npm start
   ```

   For development with auto-restart:
   ```
   npm run dev
   ```

6. Open your browser and navigate to `http://localhost:3000`

#### Option 2: Docker Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/pdf-talker.git
   cd pdf-talker
   ```

2. Create a `.env` file based on the `.env.docker` template:
   ```
   cp .env.docker .env
   ```

3. Edit the `.env` file and add your OpenAI API key.

4. Start all services using Docker Compose:
   ```
   docker-compose up -d
   ```

   This will start the following containers:
   - MongoDB database
   - Neo4j graph database
   - ChromaDB server
   - PDF Talker Node.js application

5. Open your browser and navigate to:
   - `http://localhost:3000` - PDF Talker application
   - `http://localhost:3000/api-docs` - API documentation
   - `http://localhost:7474` - Neo4j Browser (credentials: neo4j/password)
   - `http://localhost:8000` - ChromaDB server API

6. To stop all services:
   ```
   docker-compose down
   ```

   To stop and remove all data volumes:
   ```
   docker-compose down -v
   ```

#### Docker Helper Script

For convenience, a helper script is provided to manage Docker operations:

1. Make the script executable (if not already):
   ```
   chmod +x docker.sh
   ```

2. Use the script to manage containers:
   ```
   ./docker.sh start    # Start all containers
   ./docker.sh stop     # Stop all containers
   ./docker.sh restart  # Restart all containers
   ./docker.sh status   # Show container status
   ./docker.sh logs     # View container logs
   ./docker.sh clean    # Stop and remove volumes
   ./docker.sh help     # Show help message
   ```

The script will automatically create a `.env` file from the template if one doesn't exist.

### Docker Architecture

The Docker setup features:
- **Service Orchestration**: Docker Compose manages all services
- **Inter-container Communication**: Services communicate over a dedicated network
- **Health Checks**: Each service monitors its own health
- **Dependency Management**: The app waits for all services to be ready before starting
- **Data Persistence**: 
  - MongoDB and Neo4j data is stored in Docker volumes
  - ChromaDB data is stored in persistent volume for vector embeddings
- **Environment Isolation**: Configuration via environment variables

## Usage

1. Upload a PDF from the homepage
2. Wait for the PDF to be processed (status will change from "Processing" to "Ready")
3. Click on "Chat" to start a conversation about the PDF
4. Ask questions in natural language about the PDF content:
   - Type your question and click "Send"
   - Or click "Record" to use voice input, then stop when finished
5. View and manage your chat history

### Audio Input Support

PDF Talker supports the following audio formats for voice input:
- MP3 (.mp3)
- WAV (.wav)
- OGG/Vorbis (.ogg)
- WebM (.webm)
- FLAC (.flac)
- M4A (.m4a)
- MP4 audio (.mp4)
- MPEG audio (.mpeg, .mpga)
- OGG audio (.oga)

The maximum file size for audio uploads is 20MB.

## Utility Scripts

The application includes several utility scripts to help with maintenance and debugging:

1. Test ChromaDB connection:
   ```
   node utils/test-chroma-connection.js
   ```

2. Rebuild ChromaDB collections from existing PDFs:
   ```
   node utils/rebuild-chroma-collections.js
   ```

3. Test the complete chat pipeline with a specific PDF:
   ```
   node utils/test-chat-pipeline.js <pdfId> "Your test question"
   ```

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
│   ├── chromaStore.js              # ChromaDB client configuration
│   ├── test-chroma-connection.js   # Test ChromaDB connectivity
│   ├── test-chat-pipeline.js       # Test complete chat workflow
│   └── rebuild-chroma-collections.js # Recreate ChromaDB collections
├── views/               # EJS templates
│   ├── partials/        # Reusable template parts
│   ├── pdf/             # PDF-related templates
│   └── chat/            # Chat-related templates
├── .dockerignore        # Files to exclude from Docker build
├── .env                 # Environment variables
├── .env.docker          # Template for Docker environment variables
├── .gitignore           # Git ignore file
├── app.js               # Main application file
├── docker-compose.yml   # Docker Compose configuration
├── docker-start.sh      # Docker startup script
├── docker.sh            # Docker helper script
├── Dockerfile           # Docker image definition
├── package.json         # Project dependencies
├── swagger.js           # Swagger configuration
├── swagger-routes.js    # Swagger route annotations
├── wait-for-it.sh       # Service availability checker
└── README.md            # Project documentation
```

## Troubleshooting

### ChromaDB Issues
- The application requires a running ChromaDB server at http://localhost:8000
- If you encounter vector search errors, try rebuilding the collections with `node utils/rebuild-chroma-collections.js`
- To test ChromaDB connectivity, run `node utils/test-chroma-connection.js`

### Audio Processing Issues
- Ensure your audio file is in one of the supported formats
- Check that the file size is under 20MB
- If transcription fails, try a different audio format or check server logs for detailed error messages

## License

ISC 