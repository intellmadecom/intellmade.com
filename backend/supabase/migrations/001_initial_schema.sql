-- =============================================================
-- INTELLMADE STUDIO - Database Schema
-- =============================================================
-- Run this SQL in your Supabase project:
-- Go to https://supabase.com → Your Project → SQL Editor → New Query
-- Paste this entire file and click "Run"
-- =============================================================

-- ----- PROFILES TABLE -----
-- Stores user profile information linked to Supabase Auth
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    stripe_customer_id TEXT DEFAULT NULL,
    subscription_plan TEXT DEFAULT 'free' CHECK (subscription_plan IN ('free', 'basic', 'pro', 'enterprise')),
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'canceled', 'past_due', 'trialing')),
    subscription_stripe_id TEXT DEFAULT NULL,
    subscription_current_period_end TIMESTAMPTZ DEFAULT NULL,
    gemini_api_key_encrypted TEXT DEFAULT NULL,
    credits_remaining INTEGER DEFAULT 50,
    credits_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----- USAGE LOGS TABLE -----
-- Tracks every AI tool usage for billing and analytics
CREATE TABLE IF NOT EXISTS usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    model_used TEXT DEFAULT 'gemini-2.0-flash',
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    credits_consumed INTEGER DEFAULT 1,
    status TEXT DEFAULT 'success' CHECK (status IN ('success', 'failed', 'pending')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----- GENERATED IMAGES TABLE -----
-- Stores metadata for images created by Image Creator and Image Cloner
CREATE TABLE IF NOT EXISTS generated_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    image_url TEXT NOT NULL,
    aspect_ratio TEXT DEFAULT '1:1',
    model_used TEXT DEFAULT 'imagen-3.0-generate-002',
    subject_references JSONB DEFAULT '[]',
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----- GENERATED VIDEOS TABLE -----
-- Stores metadata for videos created by Photo Animator and Prompt Video
CREATE TABLE IF NOT EXISTS generated_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    prompt TEXT DEFAULT '',
    video_url TEXT NOT NULL,
    thumbnail_url TEXT DEFAULT '',
    source_image_url TEXT DEFAULT '',
    aspect_ratio TEXT DEFAULT '16:9',
    duration_seconds NUMERIC DEFAULT 0,
    tool_used TEXT NOT NULL CHECK (tool_used IN ('animate_image', 'prompt_video')),
    model_used TEXT DEFAULT 'veo-2.0-generate-001',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----- CHAT CONVERSATIONS TABLE -----
-- Stores General Intelligence chat conversations
CREATE TABLE IF NOT EXISTS chat_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Conversation',
    model_used TEXT DEFAULT 'gemini-2.0-flash',
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----- CHAT MESSAGES TABLE -----
-- Stores individual messages in a conversation
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----- TRANSCRIPTIONS TABLE -----
-- Stores audio transcription results
CREATE TABLE IF NOT EXISTS transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    original_filename TEXT DEFAULT '',
    transcription_text TEXT NOT NULL,
    language TEXT DEFAULT 'en',
    duration_seconds NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----- PAYMENT HISTORY TABLE -----
-- Stores all payment transactions from Stripe
CREATE TABLE IF NOT EXISTS payment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_payment_intent_id TEXT NOT NULL,
    stripe_invoice_id TEXT DEFAULT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT DEFAULT 'succeeded' CHECK (status IN ('succeeded', 'failed', 'pending', 'refunded')),
    description TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----- INDEXES for faster queries -----
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_videos_user_id ON generated_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user_id ON chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_transcriptions_user_id ON transcriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);

-- ----- ROW LEVEL SECURITY (RLS) -----
-- This makes sure users can only see their own data

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read and update only their own profile
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Usage logs: users can only view their own logs
CREATE POLICY "Users can view their own usage logs"
    ON usage_logs FOR SELECT
    USING (auth.uid() = user_id);

-- Generated images: users can view and create their own images
CREATE POLICY "Users can view their own images"
    ON generated_images FOR SELECT
    USING (auth.uid() = user_id OR is_public = TRUE);

CREATE POLICY "Users can create their own images"
    ON generated_images FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own images"
    ON generated_images FOR DELETE
    USING (auth.uid() = user_id);

-- Generated videos: users can view and create their own videos
CREATE POLICY "Users can view their own videos"
    ON generated_videos FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own videos"
    ON generated_videos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own videos"
    ON generated_videos FOR DELETE
    USING (auth.uid() = user_id);

-- Chat conversations: users can manage their own conversations
CREATE POLICY "Users can view their own conversations"
    ON chat_conversations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own conversations"
    ON chat_conversations FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
    ON chat_conversations FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
    ON chat_conversations FOR DELETE
    USING (auth.uid() = user_id);

-- Chat messages: users can manage messages in their own conversations
CREATE POLICY "Users can view their own messages"
    ON chat_messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
    ON chat_messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Transcriptions: users can manage their own transcriptions
CREATE POLICY "Users can view their own transcriptions"
    ON transcriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transcriptions"
    ON transcriptions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own transcriptions"
    ON transcriptions FOR DELETE
    USING (auth.uid() = user_id);

-- Payment history: users can only view their own payments
CREATE POLICY "Users can view their own payments"
    ON payment_history FOR SELECT
    USING (auth.uid() = user_id);

-- ----- AUTOMATIC PROFILE CREATION -----
-- When a new user signs up via Supabase Auth, automatically create their profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it already exists, then create it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ----- AUTO-UPDATE "updated_at" COLUMN -----
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_chat_conversations_updated_at ON chat_conversations;
CREATE TRIGGER update_chat_conversations_updated_at
    BEFORE UPDATE ON chat_conversations
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----- MONTHLY CREDITS RESET FUNCTION -----
-- Call this from a Supabase cron job or external scheduler
CREATE OR REPLACE FUNCTION public.reset_monthly_credits()
RETURNS void AS $$
BEGIN
    UPDATE profiles
    SET 
        credits_remaining = CASE subscription_plan
            WHEN 'free' THEN 50
            WHEN 'basic' THEN 500
            WHEN 'pro' THEN 2000
            WHEN 'enterprise' THEN 999999
            ELSE 50
        END,
        credits_reset_at = NOW() + INTERVAL '30 days'
    WHERE credits_reset_at <= NOW()
    AND subscription_status IN ('active', 'trialing');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
