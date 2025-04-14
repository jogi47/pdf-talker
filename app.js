const express = require('express');
const path = require('path');
const multer = require('multer');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');
// Add ChromaDB client
const { chromaClient } = require('./utils/chromaStore');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Set up EJS as view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set up Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'PDF Talker API Documentation'
}));

// Endpoint to get the Swagger spec as JSON
app.get('/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function(req, file, cb) {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are allowed'));
    }
    cb(null, true);
  }
});

// Make upload available to routes
app.locals.upload = upload;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-talker')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Failed to connect to MongoDB', err));

// Import routes
const indexRoutes = require('./routes/index');
const pdfRoutes = require('./routes/pdf');
const chatRoutes = require('./routes/chat');

// Use routes
app.use('/', indexRoutes);
app.use('/pdf', pdfRoutes);
app.use('/chat', chatRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    error: err.message || 'Something went wrong!' 
  });
});

// Check ChromaDB connection before starting the server
async function startServer() {
  try {
    // Test connection to ChromaDB
    const heartbeat = await chromaClient.heartbeat();
    console.log(`ChromaDB connection successful! Heartbeat: ${heartbeat}`);
    
    // Start server only after confirming ChromaDB is available
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    console.error('Failed to connect to ChromaDB:', error.message);
    console.error('Please ensure the ChromaDB server is running at http://localhost:8000');
    process.exit(1);
  }
}

// Start the server with ChromaDB check
startServer();

module.exports = app; 