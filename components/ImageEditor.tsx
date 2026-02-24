
import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { fileToBase64 } from '../utils/helpers';

interface ImageEditorProps {
  onAnimateRequest?: (base64: string) => void;
}

const ImageEditor: React.FC<ImageEditorProps> = ({ onAnimateRequest }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = async () => {
    if (!file || !prompt) return;
    setLoading(true);
    setResult(null);

    try {
      const base64 = await fileToBase64(file);
      const editedUrl = await GeminiService.editImage(base64, prompt);
      setResult(editedUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Add a retro filter",
    "Remove the background",
    "Make it black and white",
    "Add a cinematic glow",
    "Transform into a sketch",
    "Add a sunset atmosphere"
  ];

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.12))] flex gap-4 animate-fadeIn overflow-hidden">
      {/* Settings Column */}
      <div className="w-80 lg:w-96 shrink-0 flex flex-col gap-4 overflow-y-auto internal-scroll pr-2 pb-4">
        <div className="glass p-5 rounded-[2.5rem] flex flex-col gap-5 border-white/5 bg-gray-950/40">
          <div>
            <h2 className="text-xl font-outfit font-black mb-0.5 tracking-tight">Nano Editor</h2>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">Flash-Powered Image Editing</p>
          </div>

          {/* Source Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Source Image</label>
              <i className="fas fa-image text-[10px] text-emerald-500"></i>
            </div>
            <div 
              onClick={() => fileInputRef.current?.click()} 
              className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all group relative ${
                preview ? 'border-emerald-500/50 bg-black/40' : 'border-white/10 hover:border-white/20 bg-black/20'
              }`}
            >
              {preview ? (
                <img src={preview} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 opacity-30 group-hover:opacity-60 transition-opacity">
                  <i className="fas fa-upload text-xl"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest">Upload Image</span>
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

          {/* Editing Prompt */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Editing Instructions</label>
            <textarea 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)} 
              placeholder="e.g. Add a retro filter, remove the person in the background..." 
              className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-emerald-500 h-28 resize-none leading-relaxed" 
            />
          </div>

          {/* Quick Prompts */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Quick Actions</label>
            <div className="flex flex-wrap gap-2">
              {quickPrompts.map(p => (
                <button 
                  key={p}
                  onClick={() => setPrompt(p)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[9px] font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <button 
            onClick={handleEdit}
            disabled={loading || !file || !prompt}
            className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-xs transition-all ${
              loading || !file || !prompt 
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg shadow-emerald-500/20'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <i className="fas fa-circle-notch animate-spin"></i> Processing...
              </span>
            ) : (
              'Apply Changes'
            )}
          </button>

          <div className="mt-auto p-3 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
            <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Engine:</p>
            <p className="text-[10px] text-gray-400 italic leading-tight">Gemini 2.5 Flash Image — Optimized for low-latency visual transformations.</p>
          </div>
        </div>
      </div>

      {/* Main Canvas Column */}
      <div className="flex-1 glass rounded-[3rem] bg-black/40 flex flex-col overflow-hidden border-white/5 relative">
        <div className="flex-1 flex items-center justify-center p-8 md:p-12 lg:p-16">
          <div 
            className="relative shadow-[0_0_100px_rgba(16,185,129,0.1)] transition-all duration-700 ease-in-out bg-[#050505] flex items-center justify-center overflow-hidden border border-white/5"
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
                    <a 
                      href={result} 
                      download="intellmade-edit.png" 
                      className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                    >
                      <i className="fas fa-download"></i>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5">
                {loading ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500/10 border-t-emerald-500 animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 animate-pulse">Processing Visual Matrix</p>
                  </div>
                ) : (
                  <div className="opacity-5 flex flex-col items-center gap-6">
                    <i className="fas fa-image-edit-auto text-8xl"></i>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Waiting for Input</p>
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

export default ImageEditor;
