const express = require('express');
const router = express.Router();
const PDF = require('../models/PDF');

// GET: Home page - Display all PDFs
router.get('/', async (req, res) => {
  try {
    const pdfs = await PDF.find().sort({ uploadDate: -1 });
    res.render('index', { 
      title: 'PDF Talker',
      pdfs
    });
  } catch (error) {
    console.error('Error fetching PDFs:', error);
    res.status(500).render('error', { 
      error: 'Failed to load PDFs'
    });
  }
});

module.exports = router; 