import { Request } from 'express';

// =============================================================
// FRONTEND UI TYPES (Used by Sidebar, Landing, and App)
// =============================================================
export enum ToolType {
  LANDING = 'LANDING',
  ANIMATE_IMAGE = 'ANIMATE_IMAGE',
  GENERAL_INTEL = 'GENERAL_INTEL',
  PROMPT_VIDEO = 'PROMPT_VIDEO',
  VIDEO_ORACLE = 'VIDEO_ORACLE',
  IMAGE_ANALYZER = 'IMAGE_ANALYZER',
  VOICE_CHAT = 'VOICE_CHAT',
  IMAGE_GEN = 'IMAGE_GEN',
  AUDIO_TRANSCRIBER = 'AUDIO_TRANSCRIBER',
  IMAGE_CLONER = 'IMAGE_CLONER',
  IMAGE_EDITOR = 'IMAGE_EDITOR', 
  PRICING = 'PRICING'
}

export interface ToolMetadata {
  id: ToolType;
  title: string;
  description: string;
  icon: string;
  color: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  groundingSources?: { title: string; uri: string }[];
}

// =============================================================
// BACKEND & DATABASE TYPES (Your original file content)
// =============================================================

export interface UserProfile {
    id: string;
    email: string;
    full_name: string;
    avatar_url: string;
    stripe_customer_id: string | null;
    subscription_plan: 'free' | 'basic' | 'pro' | 'enterprise';
    subscription_status: 'active' | 'inactive' | 'canceled' | 'past_due' | 'trialing';
    subscription_stripe_id: string | null;
    subscription_current_period_end: string | null;
    gemini_api_key_encrypted: string | null;
    credits_remaining: number;
    credits_reset_at: string;
    created_at: string;
    updated_at: string;
}

export interface AuthenticatedRequest extends Request {
    user?: UserProfile;
    userId?: string;
}

export type SubscriptionPlan = 'free' | 'personal' | 'creator' | 'studio' | 'flex';

export interface PlanDetails {
    name: string;
    stripePriceId: string | null;
    monthlyPrice: number;
    credits: number;
    features: string[];
}

export interface PaymentRecord {
    id: string;
    user_id: string;
    stripe_payment_intent_id: string;
    stripe_invoice_id: string | null;
    amount_cents: number;
    currency: string;
    status: 'succeeded' | 'failed' | 'pending' | 'refunded';
    description: string;
    created_at: string;
}

// ----- GEMINI AI TYPES -----
export interface GeminiChatRequest {
    messages: GeminiMessage[];
    model?: string;
    maxTokens?: number;
    temperature?: number;
    systemInstruction?: string;
}

export interface GeminiMessage {
    role: 'user' | 'model';
    parts: GeminiPart[];
}

export interface GeminiPart {
    text?: string;
    inlineData?: {
        mimeType: string;
        data: string; 
    };
    fileData?: {
        mimeType: string;
        fileUri: string;
    };
}

export interface ImageGenerationRequest {
    prompt: string;
    aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
    numberOfImages?: number;
    subjectReferences?: string[]; 
}

export interface ImageGenerationResponse {
    images: GeneratedImage[];
    prompt: string;
    model: string;
}

export interface GeneratedImage {
    base64: string;
    mimeType: string;
    url?: string;
}

// ----- CREDIT LOGIC -----
export enum ToolName {
    GENERAL_INTELLIGENCE = 'general_intelligence',
    IMAGE_CREATOR = 'image_creator',
    IMAGE_CLONER = 'image_cloner',
    IMAGE_ANALYZER = 'image_analyzer',
    PHOTO_ANIMATOR = 'photo_animator',
    PROMPT_VIDEO = 'prompt_video',
    VIDEO_ANALYZER = 'video_analyzer',
    VOICE_CHAT = 'voice_chat',
    AUDIO_TRANSCRIBER = 'audio_transcriber',
    IMAGE_EDITOR = 'image_editor'
}

export const TOOL_CREDIT_COSTS: Record<ToolName, number> = {
    [ToolName.GENERAL_INTELLIGENCE]: 1,
    [ToolName.IMAGE_CREATOR]: 5,
    [ToolName.IMAGE_CLONER]: 5,
    [ToolName.IMAGE_ANALYZER]: 2,
    [ToolName.PHOTO_ANIMATOR]: 10,
    [ToolName.PROMPT_VIDEO]: 10,
    [ToolName.VIDEO_ANALYZER]: 3,
    [ToolName.VOICE_CHAT]: 2,
    [ToolName.AUDIO_TRANSCRIBER]: 2,
    [ToolName.IMAGE_EDITOR]: 3
};

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}