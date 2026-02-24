// =============================================================
// CREDIT COSTS — How many credits each AI action uses
// =============================================================
// Adjust these values to balance your credit economy.
// Lower = more generous, Higher = more premium.
// =============================================================

export const CREDIT_COSTS = {
    // Chat / Text
    chat: 1,              // 1 credit per chat message
    chat_stream: 1,       // 1 credit per streamed response

    // Image Generation
    image_generate: 5,    // 5 credits per image generated
    image_clone: 5,       // 5 credits per AI clone image
    image_edit: 3,        // 3 credits per image edit
    image_analyze: 2,     // 2 credits per image analysis

    // Video Generation
    video_from_image: 15, // 15 credits per video from image
    video_from_prompt: 15,// 15 credits per video from prompt

    // Audio / Voice
    audio_transcribe: 3,  // 3 credits per transcription
    voice_generate: 5,    // 5 credits per voice generation
    voice_clone: 10,      // 10 credits per voice clone

    // Photo Animation
    photo_animate: 10,    // 10 credits per photo animation
};

export type CreditAction = keyof typeof CREDIT_COSTS;

// Get the cost for a specific action
export function getCreditCost(action: CreditAction): number {
    return CREDIT_COSTS[action] || 1;
}