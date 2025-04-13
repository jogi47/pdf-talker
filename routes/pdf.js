const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const PDF = require('../models/PDF');
const { processPDF } = require('../utils/pdfProcessor');

// GET: Display PDF upload form
router.get('/upload', (req, res) => {
  res.render('pdf/upload', { 
    title: 'Upload PDF'
  });
});

// POST: Handle PDF upload
router.post('/upload', async (req, res) => {
  try {
    const upload = req.app.locals.upload;
    
    upload.single('pdfFile')(req, res, async (err) => {
      if (err) {
        return res.status(400).render('pdf/upload', {
          title: 'Upload PDF',
          error: err.message
        });
      }
      
      if (!req.file) {
        return res.status(400).render('pdf/upload', {
          title: 'Upload PDF',
          error: 'Please select a PDF file to upload'
        });
      }
      
      // Create new PDF record
      const newPDF = new PDF({
        title: req.body.title || path.basename(req.file.originalname, '.pdf'),
        fileName: req.file.filename,
        filePath: req.file.path,
        fileSize: req.file.size,
        processed: false
      });
      
      // Save to database
      await newPDF.save();
      
      // Process the PDF in the background
      processPDF(newPDF)
        .then(async (updates) => {
          // Update the PDF record with processing results
          await PDF.findByIdAndUpdate(newPDF._id, updates);
          console.log(`PDF ${newPDF._id} processed successfully`);
        })
        .catch(error => {
          console.error(`Error processing PDF ${newPDF._id}:`, error);
        });
      
      res.redirect('/');
    });
  } catch (error) {
    console.error('Error uploading PDF:', error);
    res.status(500).render('error', {
      error: 'Failed to upload PDF'
    });
  }
});

// GET: Display a single PDF and its details
router.get('/:id', async (req, res) => {
  try {
    const pdf = await PDF.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).render('error', {
        error: 'PDF not found'
      });
    }
    
    res.render('pdf/view', {
      title: pdf.title,
      pdf
    });
  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.status(500).render('error', {
      error: 'Failed to load PDF details'
    });
  }
});

// GET: Delete a PDF
router.get('/:id/delete', async (req, res) => {
  try {
    const pdf = await PDF.findById(req.params.id);
    
    if (!pdf) {
      return res.status(404).render('error', {
        error: 'PDF not found'
      });
    }
    
    // Delete the file from the uploads folder
    if (fs.existsSync(pdf.filePath)) {
      fs.unlinkSync(pdf.filePath);
    }
    
    // Delete from database
    await PDF.findByIdAndDelete(req.params.id);
    
    // Redirect to home page
    res.redirect('/');
  } catch (error) {
    console.error('Error deleting PDF:', error);
    res.status(500).render('error', {
      error: 'Failed to delete PDF'
    });
  }
});

module.exports = router; 