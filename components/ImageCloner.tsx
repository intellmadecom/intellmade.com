import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { fileToBase64 } from '../utils/helpers';
import { useAuth } from './AuthContext';

interface ImageClonerProps {
  onAnimateRequest?: (base64: string) => void;
}

type CloneMode = 'direct' | 'stylized' | 'variation' | 'reimagine';

const ImageCloner: React.FC<ImageClonerProps> = ({ onAnimateRequest }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [modifications, setModifications] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeMode, setActiveMode] = useState<CloneMode | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { requireAuth } = useAuth();

  const executeAction = async (mode: CloneMode) => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setActiveMode(mode);

    let finalPrompt = modifications;
    switch (mode) {
      case 'direct': finalPrompt = modifications || "Generate a high-fidelity direct clone of this image."; break;
      case 'stylized': finalPrompt = `Transform this image into a new artistic style: ${modifications}`; break;
      case 'variation': finalPrompt = `Create a visually distinct variation of this scene while keeping the same characters: ${modifications}`; break;
      case 'reimagine': finalPrompt = `Complete reimagining of the concept: ${modifications}`; break;
    }

    try {
      const base64 = await fileToBase64(file);
      const clonedUrl = await GeminiService.cloneImage(base64, finalPrompt);
      setResult(clonedUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setActiveMode(null);
    }
  };

  const handleDownload = () => {
    if (!requireAuth('download')) return;
    if (!result) return;
    const link = document.createElement('a');
    link.href = result;
    link.download = 'intellmade-clone.png';
    link.click();
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.12))] flex gap-4 animate-fadeIn overflow-hidden">
      {/* Settings Column */}
      <div className="w-80 lg:w-96 shrink-0 flex flex-col gap-4 overflow-y-auto internal-scroll pr-2 pb-4">
        <div className="glass p-5 rounded-[2.5rem] flex flex-col gap-5 border-white/5 bg-gray-950/40">
          <div>
            <h2 className="text-xl font-outfit font-black mb-0.5 tracking-tight">Clone Studio</h2>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">Asset Mutation Engine</p>
          </div>

          {/* Source Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Source Asset</label>
              <i className="fas fa-file-image text-[10px] text-cyan-500"></i>
            </div>
            <div 
              onClick={() => fileInputRef.current?.click()} 
              className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group relative ${
                preview ? 'border-cyan-500/50 bg-black/40' : 'border-white/10 hover:border-white/20 bg-black/20'
              }`}
            >
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-30 group-hover:opacity-60 transition-opacity">
                  <i className="fas fa-upload text-xl"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Upload Reference</span>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={e => { 
                  const s = e.target.files?.[0]; 
                  if(s) {
                    setFile(s); 
                    setPreview(URL.createObjectURL(s)); 
                    setResult(null);
                  }
                }} 
              />
            </div>
          </div>

          {/* Modification Rules */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Modification Logic</label>
            <textarea 
              value={modifications} 
              onChange={e => setModifications(e.target.value)} 
              placeholder="e.g. Change hair color to blue, add sunglasses..." 
              className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-cyan-500 h-28 resize-none leading-relaxed" 
            />
          </div>

          {/* Logic Modes */}
          <div className="space-y-3 pt-3 border-t border-white/5">
            <label className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Mutation Modes</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'direct', label: 'Direct Clone', icon: 'fa-copy' },
                { id: 'stylized', label: 'Stylized', icon: 'fa-wand-magic' },
                { id: 'variation', label: 'Variation', icon: 'fa-code-branch' },
                { id: 'reimagine', label: 'Reimagine', icon: 'fa-lightbulb' }
              ].map(m => (
                <button 
                  key={m.id} 
                  onClick={() => executeAction(m.id as CloneMode)} 
                  disabled={loading || !file} 
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5 ${
                    activeMode === m.id 
                    ? 'bg-cyan-600 border-cyan-500 text-white' 
                    : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:text-gray-300'
                  } ${!file ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                >
                  <i className={`fas ${m.icon} text-xs`}></i>
                  <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto p-3 bg-cyan-500/5 rounded-xl border border-cyan-500/10">
            <p className="text-[8px] font-black text-cyan-400 uppercase tracking-widest mb-0.5">System Note:</p>
            <p className="text-[10px] text-gray-400 italic leading-tight">Gemini 2.5 Flash Image engine optimized for spatial high-fidelity cloning.</p>
          </div>
        </div>
      </div>

      {/* Main Canvas Column */}
      <div className="flex-1 glass rounded-[3rem] bg-black/40 flex flex-col overflow-hidden border-white/5 relative">
        <div className="flex-1 flex items-center justify-center p-8 md:p-12 lg:p-16">
          <div 
            className="relative shadow-[0_0_100px_rgba(6,182,212,0.1)] transition-all duration-700 ease-in-out bg-[#050505] flex items-center justify-center overflow-hidden border border-white/5"
            style={{ 
              aspectRatio: '1/1',
              maxHeight: '100%',
              maxWidth: '100%',
              width: '100%',
              height: 'auto'
            }}
          >
            {result ? (
              <div className="w-full h-full relative group">
                <img src={result} className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4">
                  <div className="flex gap-3">
                    <button 
                      onClick={() => onAnimateRequest?.(result.split(',')[1])} 
                      className="px-6 py-3 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-110 transition-transform"
                    >
                      <i className="fas fa-film mr-2"></i> Animate
                    </button>
                    <button 
                      onClick={handleDownload}
                      className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 transition-transform cursor-pointer"
                    >
                      <i className="fas fa-download"></i>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5">
                {loading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-cyan-500/10 border-t-cyan-500 animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-500 animate-pulse">Running Mutation Protocol</p>
                  </div>
                ) : (
                  <div className="opacity-5 flex flex-col items-center gap-6">
                    <i className="fas fa-dna text-8xl"></i>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Sequence Ready</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCloner;