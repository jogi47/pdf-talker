const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PDF Talker API',
      version: '1.0.0',
      description: 'API documentation for the PDF Talker application',
      contact: {
        name: 'API Support',
        email: 'support@pdftalker.com'
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    components: {
      schemas: {
        PDF: {
          type: 'object',
          required: ['title', 'fileName', 'filePath', 'fileSize'],
          properties: {
            _id: {
              type: 'string',
              description: 'The PDF ID',
              example: '60d21b4667d0d8992e610c85'
            },
            title: {
              type: 'string',
              description: 'The title of the PDF',
              example: 'Research Paper'
            },
            fileName: {
              type: 'string',
              description: 'The name of the file',
              example: '1623423542-123456789-document.pdf'
            },
            filePath: {
              type: 'string',
              description: 'Path to the PDF file',
              example: 'uploads/1623423542-123456789-document.pdf'
            },
            uploadDate: {
              type: 'string',
              format: 'date-time',
              description: 'The date the PDF was uploaded',
              example: '2023-04-13T12:00:00Z'
            },
            fileSize: {
              type: 'number',
              description: 'Size of the file in bytes',
              example: 1048576
            },
            totalPages: {
              type: 'number',
              description: 'Total number of pages in the PDF',
              example: 10
            },
            chunkCount: {
              type: 'number',
              description: 'Number of chunks the PDF was split into',
              example: 15
            },
            processed: {
              type: 'boolean',
              description: 'Whether the PDF has been processed',
              example: true
            },
            vectorStoreId: {
              type: 'string',
              description: 'ID of the vector store collection',
              example: '60d21b4667d0d8992e610c85'
            },
            graphStoreId: {
              type: 'string',
              description: 'ID of the graph store collection',
              example: '60d21b4667d0d8992e610c85'
            }
          }
        },
        Chat: {
          type: 'object',
          required: ['pdfId'],
          properties: {
            _id: {
              type: 'string',
              description: 'The chat ID',
              example: '60d21b4667d0d8992e610c86'
            },
            pdfId: {
              type: 'string',
              description: 'The ID of the related PDF',
              example: '60d21b4667d0d8992e610c85'
            },
            title: {
              type: 'string',
              description: 'The title of the chat',
              example: 'New Chat'
            },
            messages: {
              type: 'array',
              description: 'List of messages in the chat',
              items: {
                type: 'object',
                properties: {
                  role: {
                    type: 'string',
                    enum: ['user', 'assistant'],
                    description: 'The role of the message sender',
                    example: 'user'
                  },
                  content: {
                    type: 'string',
                    description: 'The content of the message',
                    example: 'What is the main topic of this document?'
                  },
                  timestamp: {
                    type: 'string',
                    format: 'date-time',
                    description: 'When the message was sent',
                    example: '2023-04-13T12:05:00Z'
                  }
                }
              }
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the chat was created',
              example: '2023-04-13T12:00:00Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the chat was last updated',
              example: '2023-04-13T12:05:00Z'
            }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the operation was successful',
              example: false
            },
            error: {
              type: 'string',
              description: 'Error message',
              example: 'PDF not found'
            }
          }
        },
        MessageResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the operation was successful',
              example: true
            },
            message: {
              type: 'string',
              description: 'The AI response message',
              example: 'The main topic of this document is artificial intelligence.'
            }
          }
        },
        AudioResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Whether the operation was successful',
              example: true
            },
            transcribedText: {
              type: 'string',
              description: 'The transcribed text from audio',
              example: 'What is the main topic of this document?'
            },
            message: {
              type: 'string',
              description: 'The AI response message',
              example: 'The main topic of this document is artificial intelligence.'
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js', './app.js', './swagger-routes.js'], // files containing annotations as above
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec; 