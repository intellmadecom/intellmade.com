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
  attachment?: {
    data: string;
    mimeType: string;
    preview?: string;
  };
  groundingSources?: { title: string; uri: string }[];
}