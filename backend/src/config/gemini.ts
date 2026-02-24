// =============================================================
// GOOGLE GEMINI AI CONFIGURATION
// =============================================================
// This file sets up the connection to Google's Gemini AI.
// Gemini is used for:
//   - Chat / General Intelligence conversations
//   - Image generation (Imagen 3)
//   - Image analysis and description
//   - Video generation (Veo 2)
//   - Video analysis and description
//   - Audio transcription
//   - Live voice chat
// =============================================================

import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Read the Gemini API key from your .env file
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
    console.error('========================================');
    console.error('ERROR: Missing GEMINI_API_KEY in .env file!');
    console.error('Get it from: https://aistudio.google.com/apikey');
    console.error('========================================');
    process.exit(1);
}

// Create the main Gemini AI client
export const genAI = new GoogleGenerativeAI(geminiApiKey);

// ----- MODEL NAMES -----
// These are the specific AI models used for different tasks

export const GEMINI_MODELS = {
    // For chat and text generation
    CHAT: 'gemini-2.0-flash',

    // For image generation
    IMAGE_GENERATION: 'imagen-3.0-generate-002',

    // For image understanding/analysis
    IMAGE_ANALYSIS: 'gemini-2.0-flash',

    // For video generation from images or text prompts
    VIDEO_GENERATION: 'veo-2.0-generate-001',

    // For video understanding/analysis
    VIDEO_ANALYSIS: 'gemini-2.0-flash',

    // For audio transcription
    AUDIO_TRANSCRIPTION: 'gemini-2.0-flash',

    // For live voice chat
    VOICE_CHAT: 'gemini-2.0-flash-live-001',
};

// ----- HELPER FUNCTIONS -----

// Get a text/chat model ready to use
export function getChatModel(modelName?: string): GenerativeModel {
    return genAI.getGenerativeModel({
        model: modelName || GEMINI_MODELS.CHAT,
    });
}

// Get an image analysis model ready to use
export function getVisionModel(): GenerativeModel {
    return genAI.getGenerativeModel({
        model: GEMINI_MODELS.IMAGE_ANALYSIS,
    });
}

// Get an audio model ready to use
export function getAudioModel(): GenerativeModel {
    return genAI.getGenerativeModel({
        model: GEMINI_MODELS.AUDIO_TRANSCRIPTION,
    });
}

// The base URL for Gemini API calls that need direct HTTP requests
// (Some features like image generation and video generation require direct API calls
//  instead of using the SDK)
export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Get the full API URL with the key included
export function getGeminiApiUrl(endpoint: string): string {
    return `${GEMINI_API_BASE_URL}/${endpoint}?key=${geminiApiKey}`;
}

// Create a Gemini client using a custom API key (for Enterprise users who bring their own key)
export function createCustomGeminiClient(customApiKey: string): GoogleGenerativeAI {
    return new GoogleGenerativeAI(customApiKey);
}

export default genAI;
