const mongoose = require('mongoose');

const PDFSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  fileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  fileSize: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    default: 0
  },
  chunkCount: {
    type: Number,
    default: 0
  },
  processed: {
    type: Boolean,
    default: false
  },
  vectorStoreId: {
    type: String,
    sparse: true
  },
  graphStoreId: {
    type: String,
    sparse: true
  }
});

module.exports = mongoose.model('PDF', PDFSchema); 