// =============================================================
// USER ROUTES
// =============================================================
// These routes handle user-specific data like galleries and history.
// ALL routes require login.
//
// USAGE:
//   GET  /api/user/usage            - Get your usage statistics
//
// GALLERY:
//   GET  /api/user/images           - Get your generated images
//   GET  /api/user/videos           - Get your generated videos
//
// CONVERSATIONS:
//   GET  /api/user/conversations           - Get all your conversations
//   POST /api/user/conversations           - Create a new conversation
//   GET  /api/user/conversations/:id/messages - Get messages in a conversation
//
// TRANSCRIPTIONS:
//   GET  /api/user/transcriptions   - Get your transcription history
// =============================================================

import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(requireAuth);

// ----- USAGE STATISTICS -----

// Get your usage summary (credits used, per-tool breakdown)
router.get('/usage', UserController.getUsageSummary);

// ----- GENERATED CONTENT GALLERIES -----

// Get your generated images (supports ?limit=50&offset=0)
router.get('/images', UserController.getImages);

// Get your generated videos (supports ?limit=50&offset=0)
router.get('/videos', UserController.getVideos);

// ----- CHAT CONVERSATIONS -----

// Get all your chat conversations
router.get('/conversations', UserController.getConversations);

// Create a new conversation
router.post('/conversations', UserController.createConversation);

// Get all messages in a specific conversation
router.get('/conversations/:conversationId/messages', UserController.getMessages);

// ----- TRANSCRIPTIONS -----

// Get your audio transcription history
router.get('/transcriptions', UserController.getTranscriptions);

export default router;
