/**
 * Rebuild ChromaDB collections from existing PDFs
 * This is useful if the ChromaDB server was deleted or reset
 * Run with: node utils/rebuild-chroma-collections.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const PDF = require('../models/PDF');
const { chromaClient } = require('./chromaStore');
const { processPDF } = require('./pdfProcessor');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pdf-talker')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  });

async function rebuildChromaCollections() {
  try {
    console.log('Starting to rebuild ChromaDB collections from existing PDFs...');
    
    // Check ChromaDB connection
    const heartbeat = await chromaClient.heartbeat();
    console.log(`ChromaDB heartbeat: ${heartbeat}`);
    
    // Get all processed PDFs from the database
    const pdfs = await PDF.find({ processed: true });
    console.log(`Found ${pdfs.length} processed PDFs in the database`);
    
    // List existing collections in ChromaDB
    const existingCollections = await chromaClient.listCollections();
    console.log(`Found ${existingCollections.length} existing collections in ChromaDB`);
    console.log('Existing collections:', existingCollections);
    
    let reprocessed = 0;
    let skipped = 0;
    
    // Reprocess each PDF
    for (const pdf of pdfs) {
      const pdfId = pdf._id.toString();
      
      // Check if collection already exists in ChromaDB
      if (existingCollections.includes(pdfId)) {
        console.log(`Collection ${pdfId} already exists, skipping...`);
        skipped++;
        continue;
      }
      
      console.log(`Reprocessing PDF: ${pdf.title} (${pdfId})`);
      
      try {
        // Reprocess the PDF
        const result = await processPDF(pdf);
        console.log(`Successfully reprocessed PDF: ${pdf.title}`);
        console.log(`Created vector store with ${result.chunkCount} chunks`);
        reprocessed++;
      } catch (error) {
        console.error(`Error reprocessing PDF ${pdf.title}:`, error);
      }
    }
    
    console.log('\nRebuild Summary:');
    console.log(`Total PDFs found: ${pdfs.length}`);
    console.log(`Skipped (already exists): ${skipped}`);
    console.log(`Successfully reprocessed: ${reprocessed}`);
    console.log(`Failed to reprocess: ${pdfs.length - skipped - reprocessed}`);
    
    // List collections after rebuild
    const finalCollections = await chromaClient.listCollections();
    console.log(`\nFinal collection count: ${finalCollections.length}`);
    
    mongoose.disconnect();
    console.log('MongoDB connection closed');
  } catch (error) {
    console.error('Error rebuilding ChromaDB collections:', error);
  }
}

rebuildChromaCollections().catch(console.error); 