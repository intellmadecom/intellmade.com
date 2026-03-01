import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { useAuth } from './AuthContext';
import { ToolType } from '../types';

interface ImageCreatorProps {
  state: any;
  setState: any;
  onAnimateRequest?: (base64: string) => void;
  onSelect?: (tool: ToolType) => void;
}

const ImageCreator: React.FC<ImageCreatorProps> = ({ state, setState, onAnimateRequest, onSelect }) => {
  const { prompt, image, subjectSlots, aspectRatio } = state;
  const [loading, setLoading] = useState(false);
  const { isLoggedIn, credits, deductCredit, setShowAuthModal } = useAuth();
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    // 1. Check Auth
    if (!isLoggedIn) {
      setShowAuthModal(true);
      return;
    }

    // 2. Check Credits
    if (credits !== null && credits <= 0) {
      alert("Out of credits!");
      onSelect?.(ToolType.PRICING);
      return;
    }

    setLoading(true);
    
    // 3. Deduct Credit in DB
    const success = await deductCredit();
    if (!success) {
      setLoading(false);
      return;
    }

    try {
      const references = subjectSlots
        .filter((slot: any) => slot !== null)
        .map((slot: any) => slot!.split(',')[1]);

      const url = await GeminiService.generateImage(`SCENE: ${prompt}`, aspectRatio, references);
      setState((prev: any) => ({ ...prev, image: url }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!isLoggedIn) {
        setShowAuthModal(true);
        return;
    }
    const link = document.createElement('a');
    link.href = image;
    link.download = 'vision.png';
    link.click();
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.12))] flex gap-4 p-4">
      {/* Settings Column */}
      <div className="w-80 flex flex-col gap-4">
        <div className="glass p-5 rounded-[2.5rem] bg-gray-900/50 border border-white/10">
          <h2 className="text-xl font-black text-white mb-4">Vision Studio</h2>
          
          <textarea
            value={prompt}
            onChange={e => setState((prev: any) => ({ ...prev, prompt: e.target.value }))}
            className="w-full h-32 bg-black/50 border border-white/10 rounded-xl p-3 text-white text-sm"
            placeholder="Describe your image..."
          />

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold mt-4 hover:bg-indigo-500 transition-all"
          >
            {loading ? 'Synthesizing...' : 'Generate Image (1 Credit)'}
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 glass rounded-[3rem] bg-black/40 flex items-center justify-center relative overflow-hidden">
        {image ? (
          <div className="relative group w-full h-full flex items-center justify-center p-10">
            <img src={image} className="max-h-full max-w-full rounded-2xl shadow-2xl" alt="Generated" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-4 transition-all">
               <button onClick={handleDownload} className="p-4 bg-white text-black rounded-full hover:scale-110 transition-transform">
                  <i className="fas fa-download"></i>
               </button>
            </div>
          </div>
        ) : (
          <div className="text-white/20 text-center">
            <i className="fas fa-palette text-6xl mb-4"></i>
            <p className="uppercase tracking-[0.3em] text-[10px]">Studio Ready</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageCreator;