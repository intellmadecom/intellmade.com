// GEMINI SERVICE STUB
// Frontend handles actual Gemini API calls.
// This stub satisfies backend imports.

export class GeminiService {
  static async getVoiceChatConfig() {
    return {
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
      language: 'en-US',
      voice: 'default',
    };
  }

  static async generateText(prompt: string) {
    return { success: true, text: '' };
  }

  static async analyzeImage(imageBase64: string, prompt: string) {
    return { success: true, text: '' };
  }
}

export default GeminiService;