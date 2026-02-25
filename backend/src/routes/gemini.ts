// =============================================================
// GEMINI AI ROUTES
// =============================================================
// These routes handle all AI generation features.
// ALL routes require login.
//
// CHAT:
//   POST /api/ai/chat              - Send a chat message, get a response
//   POST /api/ai/chat/stream       - Send a chat message, stream the response
//
// IMAGE:
//   POST /api/ai/image/generate    - Generate an image from a prompt
//   POST /api/ai/image/clone       - Clone/recreate an image with references
//   POST /api/ai/image/analyze     - Analyze an image (describe, answer questions)
//
// VIDEO:
//   POST /api/ai/video/from-image  - Generate a video from an image (Veo)
//   POST /api/ai/video/from-prompt - Generate a video from a text prompt (Veo)
//   GET  /api/ai/video/status/:operationName - Check video generation status
//   POST /api/ai/video/analyze     - Analyze a video
//
// AUDIO:
//   POST /api/ai/audio/transcribe  - Transcribe audio to text
//
// VOICE:
//   GET  /api/ai/voice/config      - Get voice chat WebSocket configuration
// =============================================================

import { Router } from 'express';
import { GeminiController } from '../controllers/geminiController';
import { requireAuth } from '../middleware/auth';
import {
    aiGenerationRateLimit,
    imageGenerationRateLimit,
    videoGenerationRateLimit,
} from '../middleware/rateLimit';

const router = Router();

// All AI routes require authentication
router.use(requireAuth);

// ----- CHAT -----

// Send a chat message and get a complete response
router.post('/chat', aiGenerationRateLimit, GeminiController.chat);

// Send a chat message and stream the response (Server-Sent Events)
router.post('/chat/stream', aiGenerationRateLimit, GeminiController.chatStream);

// ----- IMAGE -----

// Generate a new image from a text prompt
router.post('/image/generate', imageGenerationRateLimit, GeminiController.generateImage);

// Clone/recreate an image using reference images
router.post('/image/clone', imageGenerationRateLimit, GeminiController.cloneImage);

// Analyze an image (describe it, answer questions about it)
router.post('/image/analyze', aiGenerationRateLimit, GeminiController.analyzeImage);

// ----- VIDEO -----

// Generate a video from an uploaded image (Photo Animator / Veo)
router.post('/video/from-image', videoGenerationRateLimit, GeminiController.generateVideoFromImage);

// Generate a video from a text prompt (Prompt Video / Veo)
router.post('/video/from-prompt', videoGenerationRateLimit, GeminiController.generateVideoFromPrompt);

// Check the status of a video generation operation
router.get('/video/status/:operationName', GeminiController.checkVideoStatus);

// Analyze a video (describe it, answer questions about it)
router.post('/video/analyze', aiGenerationRateLimit, GeminiController.analyzeVideo);

// ----- AUDIO -----

// Transcribe audio to text
router.post('/audio/transcribe', aiGenerationRateLimit, GeminiController.transcribeAudio);

// ----- VOICE CHAT -----

// Get the configuration for live voice chat (WebSocket URL, etc.)
router.get('/voice/config', GeminiController.getVoiceChatConfig);

export default router;
