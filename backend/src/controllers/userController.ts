// =============================================================
// USER CONTROLLER
// =============================================================
// Handles user-specific data endpoints:
//   - Usage statistics and analytics
//   - Generated images gallery
//   - Generated videos gallery
//   - Chat conversation history
//   - Transcription history
//   - Delete generated content
// =============================================================

import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { SupabaseService } from '../services/supabaseService';

export class UserController {

    // ==========================================
    // USAGE STATISTICS
    // ==========================================

    // Get the user's usage summary (credits used, per-tool breakdown)
    static async getUsageSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const summary = await SupabaseService.getUsageSummary(req.userId);

            if (!summary) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to fetch usage statistics.',
                });
                return;
            }

            res.json({
                success: true,
                data: { usage: summary },
            });
        } catch (error: any) {
            console.error('Usage summary error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch usage statistics.',
            });
        }
    }

    // ==========================================
    // GENERATED IMAGES
    // ==========================================

    // Get the user's generated images (gallery)
    static async getImages(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            const result = await SupabaseService.getUserImages(req.userId, limit, offset);

            res.json({
                success: true,
                data: {
                    images: result.images,
                    total: result.total,
                    limit,
                    offset,
                },
            });
        } catch (error: any) {
            console.error('Get images error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch images.',
            });
        }
    }

    // ==========================================
    // GENERATED VIDEOS
    // ==========================================

    // Get the user's generated videos
    static async getVideos(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const limit = parseInt(req.query.limit as string) || 50;
            const offset = parseInt(req.query.offset as string) || 0;

            const result = await SupabaseService.getUserVideos(req.userId, limit, offset);

            res.json({
                success: true,
                data: {
                    videos: result.videos,
                    total: result.total,
                    limit,
                    offset,
                },
            });
        } catch (error: any) {
            console.error('Get videos error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch videos.',
            });
        }
    }

    // ==========================================
    // CHAT CONVERSATIONS
    // ==========================================

    // Get all conversations for the user
    static async getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const conversations = await SupabaseService.getUserConversations(req.userId);

            res.json({
                success: true,
                data: { conversations },
            });
        } catch (error: any) {
            console.error('Get conversations error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch conversations.',
            });
        }
    }

    // Create a new conversation
    static async createConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { title } = req.body;
            const conversationId = await SupabaseService.createConversation(req.userId, title);

            if (!conversationId) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to create conversation.',
                });
                return;
            }

            res.status(201).json({
                success: true,
                data: { conversationId },
            });
        } catch (error: any) {
            console.error('Create conversation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create conversation.',
            });
        }
    }

    // Get messages in a specific conversation
    static async getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { conversationId } = req.params;

            if (!conversationId) {
                res.status(400).json({
                    success: false,
                    error: 'Conversation ID is required.',
                });
                return;
            }

            const messages = await SupabaseService.getConversationMessages(conversationId, req.userId);

            res.json({
                success: true,
                data: { messages },
            });
        } catch (error: any) {
            console.error('Get messages error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch messages.',
            });
        }
    }

    // ==========================================
    // TRANSCRIPTIONS
    // ==========================================

    // Get the user's transcription history
    static async getTranscriptions(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const transcriptions = await SupabaseService.getUserTranscriptions(req.userId);

            res.json({
                success: true,
                data: { transcriptions },
            });
        } catch (error: any) {
            console.error('Get transcriptions error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch transcriptions.',
            });
        }
    }
}

export default UserController;
