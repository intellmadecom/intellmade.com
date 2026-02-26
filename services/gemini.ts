import { GoogleGenAI, Type, GenerateContentResponse, Modality } from "@google/genai";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function deductCredit(tool: string): Promise<void> {
  try {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/deduct-credits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ tool }),
    });
    const data = await res.json();
    if (data.success) {
      window.dispatchEvent(new CustomEvent('credits-updated', { detail: { credits: data.data.remaining } }));
    }
  } catch (err) {
    console.error('Credit deduction failed (non-fatal):', err);
  }
}

export class GeminiService {
  private static getAI() {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  static async checkApiKey() {
    // @ts-ignore
    if (!window.aistudio) return true;
    // @ts-ignore
    return await window.aistudio.hasSelectedApiKey();
  }

  static async promptApiKey() {
    // @ts-ignore
    if (!window.aistudio) return;
    // @ts-ignore
    await window.aistudio.openSelectKey();
  }

  static async analyzeImage(base64Image: string, prompt: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: prompt }
        ]
      }
    });
    await deductCredit('image_analyzer');
    return response.text || "No analysis generated.";
  }

  static async analyzeVideo(base64Video: string, mimeType: string, prompt: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Video } },
          { text: prompt }
        ]
      }
    });
    await deductCredit('video_analyzer');
    return response.text || "No insights found.";
  }

  static async transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: mimeType, data: base64Audio } },
          { text: "Transcribe the following audio precisely. If there is multiple speakers, distinguish them. Output only the transcript." }
        ]
      }
    });
    await deductCredit('audio_transcriber');
    return response.text || "No transcription available.";
  }

  static async chat(messages: { role: string, content: string }[], usePro = true, useSearch = false) {
    const ai = this.getAI();
    const model = useSearch ? 'gemini-3-flash-preview' : (usePro ? 'gemini-3-pro-preview' : 'gemini-3-flash-preview');

    const history = messages.slice(0, -1).map(m => {
      const parts: any[] = [{ text: m.content }];
      if (m.attachment) {
        parts.push({ inlineData: { mimeType: m.attachment.mimeType, data: m.attachment.data } });
      }
      return { role: m.role as 'user' | 'model', parts };
    });

    const config: any = {
      systemInstruction: "You are an expert AI assistant. Provide concise, accurate, and helpful responses."
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    const chat = ai.chats.create({
      model: model,
      history: history,
      config: config
    });

    const lastMessage = messages[messages.length - 1];
    const lastParts: any[] = [{ text: lastMessage.content }];
    if (lastMessage.attachment) {
      lastParts.push({ inlineData: { mimeType: lastMessage.attachment.mimeType, data: lastMessage.attachment.data } });
    }
    const result = await chat.sendMessage({ message: lastParts });

    await deductCredit('general_intelligence');

    const text = result.text;
    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const sources = groundingChunks?.map((chunk: any) => ({
      title: chunk.web?.title || 'Source',
      uri: chunk.web?.uri
    })).filter((s: any) => s.uri) || [];

    return { text, sources };
  }

  static async generateImage(prompt: string, aspectRatio: string = "1:1", references: string[] = []): Promise<string> {
    const ai = this.getAI();
    const parts: any[] = references.map(base64 => ({
      inlineData: { mimeType: 'image/png', data: base64 }
    }));
    parts.push({ text: prompt });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts },
      config: {
        imageConfig: { aspectRatio, imageSize: '4K' }
      }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        await deductCredit('image_creator');
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from model.");
  }

  static async cloneImage(base64Image: string, modifications: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: modifications || "Generate a new image that is a direct high-fidelity clone of this one." }
        ]
      }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        await deductCredit('image_cloner');
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data returned from model.");
  }

  static async editImage(base64Image: string, prompt: string): Promise<string> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/png', data: base64Image } },
          { text: prompt }
        ]
      }
    });
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        await deductCredit('image_editor');
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Image editing failed.");
  }

  static async generateVideo(prompt: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string> {
    const ai = this.getAI();
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio }
    });
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Video generation failed.");
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await videoResponse.blob();
    await deductCredit('prompt_video');
    return URL.createObjectURL(blob);
  }

  static async animateImage(base64Image: string, prompt: string, aspectRatio: '16:9' | '9:16' = '16:9', backgroundBase64?: string): Promise<string> {
    const ai = this.getAI();
    const isCompositing = !!backgroundBase64;
    const model = isCompositing ? 'veo-3.1-generate-preview' : 'veo-3.1-fast-generate-preview';
    let payload: any = {
      model: model,
      prompt: prompt || 'Animate this photo.',
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: isCompositing ? '16:9' : aspectRatio }
    };
    if (isCompositing && backgroundBase64) {
      payload.referenceImages = [
        { image: { imageBytes: base64Image, mimeType: 'image/png' }, referenceType: 'ASSET' },
        { image: { imageBytes: backgroundBase64, mimeType: 'image/png' }, referenceType: 'ASSET' }
      ];
    } else {
      payload.image = { imageBytes: base64Image, mimeType: 'image/png' };
    }
    let operation = await ai.models.generateVideos(payload);
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("Animation failed.");
    const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await videoResponse.blob();
    await deductCredit('photo_animator');
    return URL.createObjectURL(blob);
  }

  static async generateEditingInstructions(prompt: string, metadata: { duration: number, name: string }): Promise<any> {
    const ai = this.getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `You are an expert video editor. Analyze the user request and provide programmatic editing instructions in JSON format.
      User Request: "${prompt}"
      Video Metadata: ${JSON.stringify(metadata)}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trim: { type: Type.OBJECT, properties: { start: { type: Type.NUMBER }, end: { type: Type.NUMBER } }, required: ['start', 'end'] },
            resize: { type: Type.STRING },
            speed: { type: Type.NUMBER },
            captions: { type: Type.OBJECT, properties: { enabled: { type: Type.BOOLEAN }, style: { type: Type.STRING }, position: { type: Type.STRING }, source: { type: Type.STRING } }, required: ['enabled', 'style', 'position', 'source'] },
            music: { type: Type.OBJECT, properties: { enabled: { type: Type.BOOLEAN }, volume: { type: Type.NUMBER } }, required: ['enabled', 'volume'] },
            effects: { type: Type.OBJECT, properties: { fade_in: { type: Type.BOOLEAN }, fade_out: { type: Type.BOOLEAN } }, required: ['fade_in', 'fade_out'] },
            watermark: { type: Type.OBJECT, properties: { enabled: { type: Type.BOOLEAN }, text: { type: Type.STRING } }, required: ['enabled', 'text'] },
            export: { type: Type.OBJECT, properties: { format: { type: Type.STRING }, quality: { type: Type.STRING } }, required: ['format', 'quality'] }
          },
          required: ['trim', 'resize', 'speed', 'captions', 'music', 'effects', 'watermark', 'export']
        }
      }
    });

    try {
      return JSON.parse(response.text || '{}');
    } catch (e) {
      console.error("Failed to parse AI response as JSON", e);
      return null;
    }
  }
}