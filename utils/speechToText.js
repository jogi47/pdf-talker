const fs = require('fs');
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
    const audioStream = fs.createReadStream(audioFilePath);
    
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
      language: "en"
    });
    
    return transcription.text;
  } catch (error) {
    console.error('Error converting speech to text:', error);
    throw new Error('Failed to transcribe audio');
  }
}

module.exports = {
  convertSpeechToText
}; 