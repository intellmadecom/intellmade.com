// =============================================================
// RATE LIMITING MIDDLEWARE
// =============================================================
// This file prevents users from making too many requests too quickly.
// This protects your server and your API budget from:
//   - Bots and automated scrapers
//   - Accidental infinite loops in frontend code
//   - Malicious users trying to abuse the system
// =============================================================

import rateLimit from 'express-rate-limit';

// ----- GENERAL API RATE LIMIT -----
// Allows 100 requests per 15 minutes per IP address
// This applies to ALL routes
export const generalRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes (in milliseconds)
    max: 100, // Maximum 100 requests per window
    message: {
        success: false,
        error: 'Too many requests. Please wait a few minutes and try again.',
    },
    standardHeaders: true, // Include rate limit info in response headers
    legacyHeaders: false,
});

// ----- AUTH RATE LIMIT -----
// Allows 10 login/signup attempts per 15 minutes per IP
// This prevents brute-force password attacks
export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // Maximum 10 attempts
    message: {
        success: false,
        error: 'Too many login attempts. Please wait 15 minutes and try again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ----- AI GENERATION RATE LIMIT -----
// Allows 30 AI generation requests per minute per IP
// AI calls are expensive, so this is stricter
export const aiGenerationRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Maximum 30 requests per minute
    message: {
        success: false,
        error: 'Too many AI requests. Please wait a moment and try again.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ----- VIDEO GENERATION RATE LIMIT -----
// Allows 5 video generation requests per 10 minutes per IP
// Video generation is very expensive and slow
export const videoGenerationRateLimit = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // Maximum 5 video requests per 10 minutes
    message: {
        success: false,
        error: 'Video generation is resource-intensive. Please wait a few minutes between requests.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ----- IMAGE GENERATION RATE LIMIT -----
// Allows 15 image generation requests per minute per IP
export const imageGenerationRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 15, // Maximum 15 image requests per minute
    message: {
        success: false,
        error: 'Too many image generation requests. Please wait a moment.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// ----- WEBHOOK RATE LIMIT -----
// Allows 50 webhook calls per minute (Stripe sends these)
export const webhookRateLimit = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 50,
    message: {
        success: false,
        error: 'Webhook rate limit exceeded.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});
