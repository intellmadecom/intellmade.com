// =============================================================
// SUPABASE SERVICE
// =============================================================
// This file handles all database operations:
//   - User profiles (get, update)
//   - Usage logging (track tool usage)
//   - Saving generated content (images, videos, chats, etc.)
//   - Credit management (deduct, check balance)
// =============================================================

import { supabaseAdmin } from '../config/supabase';
import { UserProfile, UsageLog, UsageSummary, ToolName, TOOL_CREDIT_COSTS } from '../types';

export class SupabaseService {

    // ==========================================
    // USER PROFILES
    // ==========================================

    // Get a user's profile by their user ID
    static async getUserProfile(userId: string): Promise<UserProfile | null> {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            console.error('Error fetching user profile:', error.message);
            return null;
        }

        return data as UserProfile;
    }

    // Update a user's profile (e.g., change name, avatar, etc.)
    static async updateUserProfile(
        userId: string,
        updates: Partial<UserProfile>
    ): Promise<UserProfile | null> {
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            console.error('Error updating user profile:', error.message);
            return null;
        }

        return data as UserProfile;
    }

    // Save a user's encrypted Gemini API key
    static async saveUserApiKey(userId: string, encryptedKey: string): Promise<boolean> {
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ gemini_api_key_encrypted: encryptedKey })
            .eq('id', userId);

        if (error) {
            console.error('Error saving API key:', error.message);
            return false;
        }

        return true;
    }

    // ==========================================
    // CREDIT MANAGEMENT
    // ==========================================

    // Deduct credits from a user's balance
    static async deductCredits(userId: string, toolName: ToolName): Promise<{ success: boolean; remaining: number }> {
        const creditsToDeduct = TOOL_CREDIT_COSTS[toolName] || 1;

        // First, check if the user has enough credits
        const profile = await this.getUserProfile(userId);
        if (!profile) {
            return { success: false, remaining: 0 };
        }

        if (profile.credits_remaining < creditsToDeduct) {
            return { success: false, remaining: profile.credits_remaining };
        }

        // Deduct the credits
        const { data, error } = await supabaseAdmin
            .from('profiles')
            .update({
                credits_remaining: profile.credits_remaining - creditsToDeduct,
            })
            .eq('id', userId)
            .select('credits_remaining')
            .single();

        if (error) {
            console.error('Error deducting credits:', error.message);
            return { success: false, remaining: profile.credits_remaining };
        }

        return { success: true, remaining: data.credits_remaining };
    }

    // Add credits to a user's balance (e.g., after purchasing more)
    static async addCredits(userId: string, creditsToAdd: number): Promise<boolean> {
        const profile = await this.getUserProfile(userId);
        if (!profile) return false;

        const { error } = await supabaseAdmin
            .from('profiles')
            .update({
                credits_remaining: profile.credits_remaining + creditsToAdd,
            })
            .eq('id', userId);

        if (error) {
            console.error('Error adding credits:', error.message);
            return false;
        }

        return true;
    }

    // ==========================================
    // USAGE LOGGING
    // ==========================================

    // Log a tool usage event
    static async logUsage(
        userId: string,
        toolName: ToolName,
        details: {
            modelUsed?: string;
            inputTokens?: number;
            outputTokens?: number;
            status?: 'success' | 'failed' | 'pending';
            metadata?: Record<string, unknown>;
        } = {}
    ): Promise<UsageLog | null> {
        const creditsConsumed = TOOL_CREDIT_COSTS[toolName] || 1;

        const { data, error } = await supabaseAdmin
            .from('usage_logs')
            .insert({
                user_id: userId,
                tool_name: toolName,
                model_used: details.modelUsed || 'gemini-2.0-flash',
                input_tokens: details.inputTokens || 0,
                output_tokens: details.outputTokens || 0,
                credits_consumed: creditsConsumed,
                status: details.status || 'success',
                metadata: details.metadata || {},
            })
            .select()
            .single();

        if (error) {
            console.error('Error logging usage:', error.message);
            return null;
        }

        return data as UsageLog;
    }

    // Get a summary of a user's usage
    static async getUsageSummary(userId: string): Promise<UsageSummary | null> {
        const profile = await this.getUserProfile(userId);
        if (!profile) return null;

        // Get usage logs for the current billing period
        const { data: logs, error } = await supabaseAdmin
            .from('usage_logs')
            .select('tool_name, credits_consumed')
            .eq('user_id', userId)
            .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

        if (error) {
            console.error('Error fetching usage summary:', error.message);
            return null;
        }

        // Calculate totals per tool
        const toolMap = new Map<string, { count: number; creditsUsed: number }>();
        let totalCreditsUsed = 0;

        for (const log of logs || []) {
            const existing = toolMap.get(log.tool_name) || { count: 0, creditsUsed: 0 };
            existing.count += 1;
            existing.creditsUsed += log.credits_consumed;
            totalCreditsUsed += log.credits_consumed;
            toolMap.set(log.tool_name, existing);
        }

        const toolBreakdown = Array.from(toolMap.entries()).map(([toolName, stats]) => ({
            toolName,
            count: stats.count,
            creditsUsed: stats.creditsUsed,
        }));

        return {
            totalCreditsUsed,
            creditsRemaining: profile.credits_remaining,
            creditsResetAt: profile.credits_reset_at,
            toolBreakdown,
        };
    }

    // ==========================================
    // GENERATED IMAGES
    // ==========================================

    // Save a generated image record to the database
    static async saveGeneratedImage(
        userId: string,
        data: {
            prompt: string;
            imageUrl: string;
            aspectRatio?: string;
            modelUsed?: string;
            subjectReferences?: string[];
            isPublic?: boolean;
        }
    ): Promise<string | null> {
        const { data: record, error } = await supabaseAdmin
            .from('generated_images')
            .insert({
                user_id: userId,
                prompt: data.prompt,
                image_url: data.imageUrl,
                aspect_ratio: data.aspectRatio || '1:1',
                model_used: data.modelUsed || 'imagen-3.0-generate-002',
                subject_references: data.subjectReferences || [],
                is_public: data.isPublic || false,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error saving generated image:', error.message);
            return null;
        }

        return record.id;
    }

    // Get a user's generated images
    static async getUserImages(
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<{ images: any[]; total: number }> {
        const { data, error, count } = await supabaseAdmin
            .from('generated_images')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching user images:', error.message);
            return { images: [], total: 0 };
        }

        return { images: data || [], total: count || 0 };
    }

    // ==========================================
    // GENERATED VIDEOS
    // ==========================================

    // Save a generated video record to the database
    static async saveGeneratedVideo(
        userId: string,
        data: {
            prompt?: string;
            videoUrl: string;
            thumbnailUrl?: string;
            sourceImageUrl?: string;
            aspectRatio?: string;
            durationSeconds?: number;
            toolUsed: 'animate_image' | 'prompt_video';
            modelUsed?: string;
        }
    ): Promise<string | null> {
        const { data: record, error } = await supabaseAdmin
            .from('generated_videos')
            .insert({
                user_id: userId,
                prompt: data.prompt || '',
                video_url: data.videoUrl,
                thumbnail_url: data.thumbnailUrl || '',
                source_image_url: data.sourceImageUrl || '',
                aspect_ratio: data.aspectRatio || '16:9',
                duration_seconds: data.durationSeconds || 0,
                tool_used: data.toolUsed,
                model_used: data.modelUsed || 'veo-2.0-generate-001',
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error saving generated video:', error.message);
            return null;
        }

        return record.id;
    }

    // Get a user's generated videos
    static async getUserVideos(
        userId: string,
        limit: number = 50,
        offset: number = 0
    ): Promise<{ videos: any[]; total: number }> {
        const { data, error, count } = await supabaseAdmin
            .from('generated_videos')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching user videos:', error.message);
            return { videos: [], total: 0 };
        }

        return { videos: data || [], total: count || 0 };
    }

    // ==========================================
    // CHAT CONVERSATIONS & MESSAGES
    // ==========================================

    // Create a new chat conversation
    static async createConversation(
        userId: string,
        title?: string
    ): Promise<string | null> {
        const { data, error } = await supabaseAdmin
            .from('chat_conversations')
            .insert({
                user_id: userId,
                title: title || 'New Conversation',
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error creating conversation:', error.message);
            return null;
        }

        return data.id;
    }

    // Save a message to a conversation
    static async saveMessage(
        conversationId: string,
        userId: string,
        role: 'user' | 'assistant' | 'system',
        content: string,
        attachments: any[] = [],
        tokensUsed: number = 0
    ): Promise<string | null> {
        const { data, error } = await supabaseAdmin
            .from('chat_messages')
            .insert({
                conversation_id: conversationId,
                user_id: userId,
                role,
                content,
                attachments,
                tokens_used: tokensUsed,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error saving message:', error.message);
            return null;
        }

        // Update the conversation's message count
        await supabaseAdmin.rpc('', {}).catch(() => {}); // placeholder
        await supabaseAdmin
            .from('chat_conversations')
            .update({ message_count: conversationId }) // will be incremented by trigger ideally
            .eq('id', conversationId);

        return data.id;
    }

    // Get all conversations for a user
    static async getUserConversations(userId: string): Promise<any[]> {
        const { data, error } = await supabaseAdmin
            .from('chat_conversations')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Error fetching conversations:', error.message);
            return [];
        }

        return data || [];
    }

    // Get all messages in a conversation
    static async getConversationMessages(
        conversationId: string,
        userId: string
    ): Promise<any[]> {
        const { data, error } = await supabaseAdmin
            .from('chat_messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching messages:', error.message);
            return [];
        }

        return data || [];
    }

    // ==========================================
    // TRANSCRIPTIONS
    // ==========================================

    // Save a transcription result
    static async saveTranscription(
        userId: string,
        data: {
            originalFilename?: string;
            transcriptionText: string;
            language?: string;
            durationSeconds?: number;
        }
    ): Promise<string | null> {
        const { data: record, error } = await supabaseAdmin
            .from('transcriptions')
            .insert({
                user_id: userId,
                original_filename: data.originalFilename || '',
                transcription_text: data.transcriptionText,
                language: data.language || 'en',
                duration_seconds: data.durationSeconds || 0,
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error saving transcription:', error.message);
            return null;
        }

        return record.id;
    }

    // Get a user's transcriptions
    static async getUserTranscriptions(userId: string): Promise<any[]> {
        const { data, error } = await supabaseAdmin
            .from('transcriptions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching transcriptions:', error.message);
            return [];
        }

        return data || [];
    }

    // ==========================================
    // PAYMENT HISTORY
    // ==========================================

    // Save a payment record
    static async savePayment(
        userId: string,
        data: {
            stripePaymentIntentId: string;
            stripeInvoiceId?: string;
            amountCents: number;
            currency?: string;
            status?: 'succeeded' | 'failed' | 'pending' | 'refunded';
            description?: string;
        }
    ): Promise<string | null> {
        const { data: record, error } = await supabaseAdmin
            .from('payment_history')
            .insert({
                user_id: userId,
                stripe_payment_intent_id: data.stripePaymentIntentId,
                stripe_invoice_id: data.stripeInvoiceId || null,
                amount_cents: data.amountCents,
                currency: data.currency || 'usd',
                status: data.status || 'succeeded',
                description: data.description || '',
            })
            .select('id')
            .single();

        if (error) {
            console.error('Error saving payment:', error.message);
            return null;
        }

        return record.id;
    }

    // Get a user's payment history
    static async getPaymentHistory(userId: string): Promise<any[]> {
        const { data, error } = await supabaseAdmin
            .from('payment_history')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching payment history:', error.message);
            return [];
        }

        return data || [];
    }

    // ==========================================
    // FILE STORAGE (Supabase Storage)
    // ==========================================

    // Upload a file to Supabase Storage and return the public URL
    static async uploadFile(
        bucket: string,
        filePath: string,
        fileBuffer: Buffer,
        contentType: string
    ): Promise<string | null> {
        const { error } = await supabaseAdmin.storage
            .from(bucket)
            .upload(filePath, fileBuffer, {
                contentType,
                upsert: true,
            });

        if (error) {
            console.error('Error uploading file:', error.message);
            return null;
        }

        const { data: urlData } = supabaseAdmin.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return urlData.publicUrl;
    }

    // Delete a file from Supabase Storage
    static async deleteFile(bucket: string, filePath: string): Promise<boolean> {
        const { error } = await supabaseAdmin.storage
            .from(bucket)
            .remove([filePath]);

        if (error) {
            console.error('Error deleting file:', error.message);
            return false;
        }

        return true;
    }
}

export default SupabaseService;
