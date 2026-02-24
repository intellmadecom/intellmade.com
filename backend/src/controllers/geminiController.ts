// =============================================================
// GEMINI AI CONTROLLER
// =============================================================
// Handles all AI generation API endpoints:
//   - Chat / General Intelligence
//   - Image generation (Image Creator)
//   - Image analysis (Image Analyzer)
//   - Image cloning (Image Cloner)
//   - Video from image (Photo Animator)
//   - Video from prompt (Prompt Video)
//   - Video status polling
//   - Video analysis (Video Oracle)
//   - Audio transcription
//   - Voice chat configuration
// =============================================================

import { Response } from 'express';
import { AuthenticatedRequest, ToolName } from '../types';
import { GeminiService } from '../services/geminiService';
import { SupabaseService } from '../services/supabaseService';

export class GeminiController {

    // ==========================================
    // CHAT (General Intelligence)
    // ==========================================

    // Send a chat message and get a response
    static async chat(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId || !req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { messages, model, maxTokens, temperature, systemInstruction, conversationId } = req.body;

            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'Messages are required. Send an array of message objects.',
                });
                return;
            }

            // Deduct credits
            const creditResult = await SupabaseService.deductCredits(req.userId, ToolName.GENERAL_INTELLIGENCE);
            if (!creditResult.success) {
                res.status(403).json({
                    success: false,
                    error: `Not enough credits. You have ${creditResult.remaining} credits remaining.`,
                });
                return;
            }

            // Call Gemini
            const result = await GeminiService.chat({
                messages,
                model,
                maxTokens,
                temperature,
                systemInstruction,
            });

            // Log usage
            await SupabaseService.logUsage(req.userId, ToolName.GENERAL_INTELLIGENCE, {
                modelUsed: model || 'gemini-2.0-flash',
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                status: 'success',
            });

            // Save messages to conversation if conversationId is provided
            if (conversationId) {
                const lastUserMessage = messages[messages.length - 1];
                const userText = lastUserMessage?.parts?.[0]?.text || '';
                
                await SupabaseService.saveMessage(
                    conversationId,
                    req.userId,
                    'user',
                    userText,
                    [],
                    result.inputTokens
                );
                await SupabaseService.saveMessage(
                    conversationId,
                    req.userId,
                    'assistant',
                    result.response,
                    [],
                    result.outputTokens
                );
            }

            res.json({
                success: true,
                data: {
                    response: result.response,
                    inputTokens: result.inputTokens,
                    outputTokens: result.outputTokens,
                    creditsRemaining: creditResult.remaining,
                },
            });
        } catch (error: any) {
            console.error('Chat error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate response. Please try again.',
            });
        }
    }

    // Stream a chat response (Server-Sent Events)
    static async chatStream(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId || !req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { messages, model, maxTokens, temperature, systemInstruction } = req.body;

            if (!messages || !Array.isArray(messages) || messages.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'Messages are required.',
                });
                return;
            }

            // Deduct credits
            const creditResult = await SupabaseService.deductCredits(req.userId, ToolName.GENERAL_INTELLIGENCE);
            if (!creditResult.success) {
                res.status(403).json({
                    success: false,
                    error: `Not enough credits. You have ${creditResult.remaining} credits remaining.`,
                });
                return;
            }

            // Set up Server-Sent Events headers
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // Stream the response
            const stream = GeminiService.chatStream({
                messages,
                model,
                maxTokens,
                temperature,
                systemInstruction,
            });

            for await (const chunk of stream) {
                res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
            }

            // Send completion event
            res.write(`data: ${JSON.stringify({ done: true, creditsRemaining: creditResult.remaining })}\n\n`);
            res.end();

            // Log usage
            await SupabaseService.logUsage(req.userId, ToolName.GENERAL_INTELLIGENCE, {
                status: 'success',
            });
        } catch (error: any) {
            console.error('Chat stream error:', error);
            if (!res.headersSent) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to stream response.',
                });
            } else {
                res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
                res.end();
            }
        }
    }

    // ==========================================
    // IMAGE GENERATION (Image Creator)
    // ==========================================

    static async generateImage(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId || !req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { prompt, aspectRatio, numberOfImages } = req.body;

            if (!prompt) {
                res.status(400).json({
                    success: false,
                    error: 'A prompt is required to generate an image.',
                });
                return;
            }

            // Deduct credits
            const creditResult = await SupabaseService.deductCredits(req.userId, ToolName.IMAGE_CREATOR);
            if (!creditResult.success) {
                res.status(403).json({
                    success: false,
                    error: `Not enough credits. You have ${creditResult.remaining} credits remaining.`,
                });
                return;
            }

            // Generate the image
            const result = await GeminiService.generateImage({
                prompt,
                aspectRatio: aspectRatio || '1:1',
                numberOfImages: numberOfImages || 1,
            });

            // Log usage and save the image
            await SupabaseService.logUsage(req.userId, ToolName.IMAGE_CREATOR, {
                modelUsed: result.model,
                status: 'success',
                metadata: { prompt, aspectRatio },
            });

            // Save each generated image to the database
            for (const image of result.images) {
                await SupabaseService.saveGeneratedImage(req.userId, {
                    prompt,
                    imageUrl: `data:${image.mimeType};base64,${image.base64}`,
                    aspectRatio: aspectRatio || '1:1',
                    modelUsed: result.model,
                });
            }

            res.json({
                success: true,
                data: {
                    images: result.images,
                    prompt: result.prompt,
                    model: result.model,
                    creditsRemaining: creditResult.remaining,
                },
            });
        } catch (error: any) {
            console.error('Image generation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to generate image. Please try a different prompt.',
            });
        }
    }

    // ==========================================
    // IMAGE CLONING (Image Cloner)
    // ==========================================

    static async cloneImage(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId || !req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { prompt, aspectRatio, subjectReferences } = req.body;

            if (!prompt) {
                res.status(400).json({
                    success: false,
                    error: 'A prompt is required.',
                });
                return;
            }

            if (!subjectReferences || subjectReferences.length === 0) {
                res.status(400).json({
                    success: false,
                    error: 'At least one reference image is required for image cloning.',
                });
                return;
            }

            // Deduct credits
            const creditResult = await SupabaseService.deductCredits(req.userId, ToolName.IMAGE_CLONER);
            if (!creditResult.success) {
                res.status(403).json({
                    success: false,
                    error: `Not enough credits.`,
                });
                return;
            }

            const result = await GeminiService.generateImage({
                prompt,
                aspectRatio: aspectRatio || '1:1',
                numberOfImages: 1,
                subjectReferences,
            });

            await SupabaseService.logUsage(req.userId, ToolName.IMAGE_CLONER, {
                modelUsed: result.model,
                status: 'success',
                metadata: { prompt, referenceCount: subjectReferences.length },
            });

            res.json({
                success: true,
                data: {
                    images: result.images,
                    prompt: result.prompt,
                    creditsRemaining: creditResult.remaining,
                },
            });
        } catch (error: any) {
            console.error('Image cloning error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to clone image. Please try again.',
            });
        }
    }

    // ==========================================
    // IMAGE ANALYSIS (Image Analyzer)
    // ==========================================

    static async analyzeImage(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId || !req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { imageBase64, imageMimeType, question } = req.body;

            if (!imageBase64 || !imageMimeType) {
                res.status(400).json({
                    success: false,
                    error: 'An image is required for analysis.',
                });
                return;
            }

            // Deduct credits
            const creditResult = await SupabaseService.deductCredits(req.userId, ToolName.IMAGE_ANALYZER);
            if (!creditResult.success) {
                res.status(403).json({
                    success: false,
                    error: `Not enough credits.`,
                });
                return;
            }

            const result = await GeminiService.analyzeImage({
                imageBase64,
                imageMimeType,
                question,
            });

            await SupabaseService.logUsage(req.userId, ToolName.IMAGE_ANALYZER, {
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                status: 'success',
            });

            res.json({
                success: true,
                data: {
                    analysis: result.analysis,
                    creditsRemaining: creditResult.remaining,
                },
            });
        } catch (error: any) {
            console.error('Image analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to analyze image. Please try again.',
            });
        }
    }

    // ==========================================
    // VIDEO FROM IMAGE (Photo Animator)
    // ==========================================

    static async generateVideoFromImage(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId || !req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { imageBase64, imageMimeType, prompt, aspectRatio } = req.body;

            if (!imageBase64 || !imageMimeType) {
                res.status(400).json({
                    success: false,
                    error: 'An image is required to create a video.',
                });
                return;
            }

            // Deduct credits
            const creditResult = await SupabaseService.deductCredits(req.userId, ToolName.PHOTO_ANIMATOR);
            if (!creditResult.success) {
                res.status(403).json({
                    success: false,
                    error: `Not enough credits. Video generation costs 10 credits.`,
                });
                return;
            }

            const result = await GeminiService.generateVideoFromImage({
                imageBase64,
                imageMimeType,
                prompt,
                aspectRatio,
            });

            await SupabaseService.logUsage(req.userId, ToolName.PHOTO_ANIMATOR, {
                modelUsed: 'veo-2.0-generate-001',
                status: 'pending',
                metadata: { operationName: result.operationName },
            });

            res.json({
                success: true,
                data: {
                    operationName: result.operationName,
                    creditsRemaining: creditResult.remaining,
                    message: 'Video generation started. Use the operation name to check status.',
                },
            });
        } catch (error: any) {
            console.error('Video from image error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start video generation. Please try again.',
            });
        }
    }

    // ==========================================
    // VIDEO FROM PROMPT (Prompt Video)
    // ==========================================

    static async generateVideoFromPrompt(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId || !req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { prompt, aspectRatio } = req.body;

            if (!prompt) {
                res.status(400).json({
                    success: false,
                    error: 'A prompt is required to generate a video.',
                });
                return;
            }

            // Deduct credits
            const creditResult = await SupabaseService.deductCredits(req.userId, ToolName.PROMPT_VIDEO);
            if (!creditResult.success) {
                res.status(403).json({
                    success: false,
                    error: `Not enough credits. Video generation costs 10 credits.`,
                });
                return;
            }

            const result = await GeminiService.generateVideoFromPrompt({
                prompt,
                aspectRatio,
            });

            await SupabaseService.logUsage(req.userId, ToolName.PROMPT_VIDEO, {
                modelUsed: 'veo-2.0-generate-001',
                status: 'pending',
                metadata: { operationName: result.operationName, prompt },
            });

            res.json({
                success: true,
                data: {
                    operationName: result.operationName,
                    creditsRemaining: creditResult.remaining,
                    message: 'Video generation started. Use the operation name to check status.',
                },
            });
        } catch (error: any) {
            console.error('Video from prompt error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to start video generation. Please try again.',
            });
        }
    }

    // ==========================================
    // VIDEO STATUS CHECK (Polling)
    // ==========================================

    static async checkVideoStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { operationName } = req.params;

            if (!operationName) {
                res.status(400).json({
                    success: false,
                    error: 'Operation name is required.',
                });
                return;
            }

            const result = await GeminiService.checkVideoStatus(operationName);

            if (result.done && result.videoBase64) {
                // Save the video to the database
                await SupabaseService.saveGeneratedVideo(req.userId, {
                    videoUrl: `data:${result.videoMimeType};base64,${result.videoBase64}`,
                    toolUsed: 'animate_image', // Could be either, but we'll track it
                });
            }

            res.json({
                success: true,
                data: result,
            });
        } catch (error: any) {
            console.error('Video status check error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check video status.',
            });
        }
    }

    // ==========================================
    // VIDEO ANALYSIS (Video Oracle)
    // ==========================================

    static async analyzeVideo(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId || !req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { videoBase64, videoMimeType, question } = req.body;

            if (!videoBase64 || !videoMimeType) {
                res.status(400).json({
                    success: false,
                    error: 'A video is required for analysis.',
                });
                return;
            }

            // Deduct credits
            const creditResult = await SupabaseService.deductCredits(req.userId, ToolName.VIDEO_ANALYZER);
            if (!creditResult.success) {
                res.status(403).json({
                    success: false,
                    error: `Not enough credits.`,
                });
                return;
            }

            const result = await GeminiService.analyzeVideo({
                videoBase64,
                videoMimeType,
                question,
            });

            await SupabaseService.logUsage(req.userId, ToolName.VIDEO_ANALYZER, {
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                status: 'success',
            });

            res.json({
                success: true,
                data: {
                    analysis: result.analysis,
                    creditsRemaining: creditResult.remaining,
                },
            });
        } catch (error: any) {
            console.error('Video analysis error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to analyze video. Please try again.',
            });
        }
    }

    // ==========================================
    // AUDIO TRANSCRIPTION
    // ==========================================

    static async transcribeAudio(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId || !req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            const { audioBase64, audioMimeType, language, originalFilename } = req.body;

            if (!audioBase64 || !audioMimeType) {
                res.status(400).json({
                    success: false,
                    error: 'An audio file is required for transcription.',
                });
                return;
            }

            // Deduct credits
            const creditResult = await SupabaseService.deductCredits(req.userId, ToolName.AUDIO_TRANSCRIBER);
            if (!creditResult.success) {
                res.status(403).json({
                    success: false,
                    error: `Not enough credits.`,
                });
                return;
            }

            const result = await GeminiService.transcribeAudio({
                audioBase64,
                audioMimeType,
                language,
            });

            // Save the transcription
            await SupabaseService.saveTranscription(req.userId, {
                originalFilename: originalFilename || 'audio_file',
                transcriptionText: result.transcription,
                language: language || 'en',
            });

            await SupabaseService.logUsage(req.userId, ToolName.AUDIO_TRANSCRIBER, {
                inputTokens: result.inputTokens,
                outputTokens: result.outputTokens,
                status: 'success',
            });

            res.json({
                success: true,
                data: {
                    transcription: result.transcription,
                    creditsRemaining: creditResult.remaining,
                },
            });
        } catch (error: any) {
            console.error('Audio transcription error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to transcribe audio. Please try again.',
            });
        }
    }

    // ==========================================
    // VOICE CHAT CONFIG
    // ==========================================

    static async getVoiceChatConfig(req: AuthenticatedRequest, res: Response): Promise<void> {
        try {
            if (!req.userId || !req.user) {
                res.status(401).json({ success: false, error: 'Not logged in.' });
                return;
            }

            // Deduct credits
            const creditResult = await SupabaseService.deductCredits(req.userId, ToolName.VOICE_CHAT);
            if (!creditResult.success) {
                res.status(403).json({
                    success: false,
                    error: `Not enough credits.`,
                });
                return;
            }

            const config = await GeminiService.getVoiceChatConfig();

            await SupabaseService.logUsage(req.userId, ToolName.VOICE_CHAT, {
                modelUsed: config.model,
                status: 'success',
            });

            res.json({
                success: true,
                data: {
                    ...config,
                    creditsRemaining: creditResult.remaining,
                },
            });
        } catch (error: any) {
            console.error('Voice chat config error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to get voice chat configuration.',
            });
        }
    }
}

export default GeminiController;
