const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const PDF = require('../models/PDF');
const Chat = require('../models/Chat');
const { answerQuestion } = require('../services/langchain');
const { convertSpeechToText } = require('../utils/speechToText');

// Set up multer for audio uploads
const audioStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/audio/');
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const audioUpload = multer({
  storage: audioStorage,
  fileFilter: function(req, file, cb) {
    // Accept common audio formats
    const fileTypes = /webm|mp3|wav|ogg/;
    const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = fileTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Audio files only!'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// GET: List all chats for a PDF
router.get('/pdf/:pdfId', async (req, res) => {
  try {
    const pdfId = req.params.pdfId;
    
    // Find the PDF
    const pdf = await PDF.findById(pdfId);
    if (!pdf) {
      return res.status(404).render('error', {
        error: 'PDF not found'
      });
    }
    
    // Find all chats for this PDF
    const chats = await Chat.find({ pdfId }).sort({ updatedAt: -1 });
    
    res.render('chat/list', {
      title: `Chats for ${pdf.title}`,
      pdf,
      chats
    });
  } catch (error) {
    console.error('Error listing chats:', error);
    res.status(500).render('error', {
      error: 'Failed to load chats'
    });
  }
});

// POST: Create a new chat for a PDF
router.post('/pdf/:pdfId/new', async (req, res) => {
  try {
    const pdfId = req.params.pdfId;
    
    // Find the PDF
    const pdf = await PDF.findById(pdfId);
    if (!pdf) {
      return res.status(404).render('error', {
        error: 'PDF not found'
      });
    }
    
    // Create a new chat
    const chat = new Chat({
      pdfId,
      title: req.body.title || 'New Chat',
      messages: []
    });
    
    await chat.save();
    
    res.redirect(`/chat/${chat._id}`);
  } catch (error) {
    console.error('Error creating chat:', error);
    res.status(500).render('error', {
      error: 'Failed to create chat'
    });
  }
});

// GET: View a specific chat
router.get('/:chatId', async (req, res) => {
  try {
    const chatId = req.params.chatId;
    
    // Find the chat and populate PDF details
    const chat = await Chat.findById(chatId).populate('pdfId');
    
    if (!chat) {
      return res.status(404).render('error', {
        error: 'Chat not found'
      });
    }
    
    res.render('chat/view', {
      title: chat.title,
      chat,
      pdf: chat.pdfId
    });
  } catch (error) {
    console.error('Error viewing chat:', error);
    res.status(500).render('error', {
      error: 'Failed to load chat'
    });
  }
});

// POST: Send a message in the chat
router.post('/:chatId/message', async (req, res) => {
  try {
    const chatId = req.params.chatId;
    const { message } = req.body;
    
    if (!message || message.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message cannot be empty'
      });
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId).populate('pdfId');
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }
    
    // Check if PDF is processed
    if (!chat.pdfId.processed) {
      return res.status(400).json({
        success: false,
        error: 'PDF is still being processed, please wait'
      });
    }
    
    // Add user message to chat
    chat.messages.push({
      role: 'user',
      content: message
    });
    
    await chat.save();
    
    // Get answer using LangChain
    let answer = await answerQuestion(chat.pdfId._id.toString(), message);
    
    // Ensure we have a valid answer
    if (!answer || answer.trim() === '') {
      answer = "I'm sorry, I couldn't generate a response. Please try asking a different question.";
    }
    
    // Add assistant response to chat
    chat.messages.push({
      role: 'assistant',
      content: answer
    });
    
    await chat.save();
    
    res.json({
      success: true,
      message: answer
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
});

// POST: Upload audio and send message
router.post('/:chatId/audio', audioUpload.single('audio'), async (req, res) => {
  try {
    const chatId = req.params.chatId;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No audio file provided'
      });
    }
    
    // Find the chat
    const chat = await Chat.findById(chatId).populate('pdfId');
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }
    
    // Check if PDF is processed
    if (!chat.pdfId.processed) {
      return res.status(400).json({
        success: false,
        error: 'PDF is still being processed, please wait'
      });
    }
    
    // Convert speech to text
    const transcribedText = await convertSpeechToText(req.file.path);
    
    if (!transcribedText || transcribedText.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Could not transcribe audio'
      });
    }
    
    // Add user message to chat
    chat.messages.push({
      role: 'user',
      content: transcribedText
    });
    
    await chat.save();
    
    // Get answer using LangChain
    let answer = await answerQuestion(chat.pdfId._id.toString(), transcribedText);
    
    // Ensure we have a valid answer
    if (!answer || answer.trim() === '') {
      answer = "I'm sorry, I couldn't generate a response. Please try asking a different question.";
    }
    
    // Add assistant response to chat
    chat.messages.push({
      role: 'assistant',
      content: answer
    });
    
    await chat.save();
    
    // Remove the audio file after processing
    if (fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.json({
      success: true,
      transcribedText,
      message: answer
    });
  } catch (error) {
    console.error('Error processing audio message:', error);
    // Clean up the audio file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      error: 'Failed to process audio'
    });
  }
});

// DELETE: Delete a chat
router.delete('/:chatId', async (req, res) => {
  try {
    const chatId = req.params.chatId;
    
    // Find and delete the chat
    const chat = await Chat.findByIdAndDelete(chatId);
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chat'
    });
  }
});

module.exports = router; 