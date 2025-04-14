const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Convert audio to text using OpenAI's Whisper API
 * @param {string} audioFilePath - Path to the audio file
 * @returns {Promise<string>} - Transcribed text
 */
async function convertSpeechToText(audioFilePath) {
  try {
    console.log(`Processing audio file: ${audioFilePath}`);
    
    // Check if file exists
    if (!fs.existsSync(audioFilePath)) {
      throw new Error(`Audio file not found at path: ${audioFilePath}`);
    }
    
    // Get file extension and check format
    const fileExt = path.extname(audioFilePath).toLowerCase();
    const fileName = path.basename(audioFilePath);
    console.log(`File extension: ${fileExt}, File name: ${fileName}`);
    
    // Check file size
    const stats = fs.statSync(audioFilePath);
    const fileSizeInMB = stats.size / (1024 * 1024);
    console.log(`File size: ${fileSizeInMB.toFixed(2)} MB`);
    
    // Ensure the file has the correct extension for OpenAI
    // OpenAI requires specific file formats
    if (!['.flac', '.m4a', '.mp3', '.mp4', '.mpeg', '.mpga', '.oga', '.ogg', '.wav', '.webm'].includes(fileExt)) {
      throw new Error(`Unsupported file format: ${fileExt}. Please upload an audio file in a supported format.`);
    }
    
    // For OpenAI Node.js SDK, we need to create a file object
    // that includes the name with extension
    const file = fs.createReadStream(audioFilePath);
    
    // Setting the name property of the stream
    // This is important for the OpenAI API to recognize the file format
    Object.defineProperty(file, 'name', {
      value: `audio${fileExt}`,
      writable: true
    });
    
    console.log(`Created file stream with name: audio${fileExt}`);
    
    // Perform transcription
    console.log('Sending to OpenAI Whisper API...');
    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: "whisper-1",
      language: "en"
    });
    
    console.log('Transcription received successfully');
    return transcription.text;
  } catch (error) {
    console.error('Error converting speech to text:', error);
    throw new Error('Failed to transcribe audio: ' + error.message);
  }
}

/**
 * Get the MIME type for a given file extension
 * @param {string} extension - File extension with dot (e.g., '.mp3')
 * @returns {string} - MIME type
 */
function getMimeType(extension) {
  const mimeTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.webm': 'audio/webm',
    '.m4a': 'audio/mp4',
    '.mp4': 'audio/mp4',
    '.flac': 'audio/flac',
    '.mpeg': 'audio/mpeg',
    '.mpga': 'audio/mpeg',
    '.oga': 'audio/ogg'
  };
  
  return mimeTypes[extension] || 'audio/mpeg'; // Default to mp3 if unknown
}

module.exports = {
  convertSpeechToText
}; 