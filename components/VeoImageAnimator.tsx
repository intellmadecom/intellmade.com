import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../services/gemini';
import { fileToBase64 } from '../utils/helpers';
import { useAuth } from './AuthContext';

const LOADING_MESSAGES = [
  "ANALYZING SPATIAL DATA...",
  "MAPPING MOTION VECTORS...",
  "SYNTHESIZING TEMPORAL FRAMES...",
  "FINALIZING CINEMATIC RENDER..."
];

interface VeoImageAnimatorProps {
  state: {
    file: File | Blob | null;
    preview: string | null;
    bgFile: File | null;
    bgPreview: string | null;
    prompt: string;
    aspectRatio: '16:9' | '9:16';
    resultVideo: string | null;
  };
  setState: React.Dispatch<React.SetStateAction<{
    file: File | Blob | null;
    preview: string | null;
    bgFile: File | null;
    bgPreview: string | null;
    prompt: string;
    aspectRatio: '16:9' | '9:16';
    resultVideo: string | null;
  }>>;
}

const VeoImageAnimator: React.FC<VeoImageAnimatorProps> = ({ state, setState }) => {
  const { file, preview, bgFile, bgPreview, prompt, aspectRatio, resultVideo } = state;
  const [loading, setLoading] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const { requireAuth } = useAuth();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let interval: number | null = null;
    if (loading) {
      interval = window.setInterval(() => setMessageIndex(i => (i + 1) % LOADING_MESSAGES.length), 3000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [loading]);

  const handleAnimate = async () => {
    if (!file) return;
    setLoading(true);
    setState(prev => ({ ...prev, resultVideo: null }));
    
    try {
      const base64 = await fileToBase64(file);
      const bgBase64 = bgFile ? await fileToBase64(bgFile) : undefined;
      
      const finalPrompt = prompt || 'Animate this photo with natural, cinematic motion.';
      
      const videoUrl = await GeminiService.animateImage(base64, finalPrompt, aspectRatio, bgBase64);
      setState(prev => ({ ...prev, resultVideo: videoUrl }));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!requireAuth('download')) return;
    if (!resultVideo) return;
    const link = document.createElement('a');
    link.href = resultVideo;
    link.download = 'intellmade-master.mp4';
    link.click();
  };

  const getCanvasAspectRatio = () => aspectRatio === '16:9' ? 16/9 : 9/16;

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.12))] flex gap-4 animate-fadeIn overflow-hidden">
      {/* Settings Column */}
      <div className="w-80 lg:w-96 shrink-0 flex flex-col gap-4 overflow-y-auto internal-scroll pr-1 pb-4">
        <div className="glass p-6 rounded-[2.5rem] flex flex-col gap-6 border-white/5 bg-gray-950/40">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-outfit font-black mb-1">Motion Master</h2>
              <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em]">Static to Cinematics</p>
            </div>
            {preview && (
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                <i className="fas fa-video text-blue-500 text-[10px] animate-pulse"></i>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">Hero Asset</label>
              <div onClick={() => fileInputRef.current?.click()} className={`aspect-square rounded-2xl border-2 flex items-center justify-center cursor-pointer overflow-hidden bg-black/40 transition-all ${preview ? 'border-blue-500/50 shadow-lg shadow-blue-500/5' : 'border-dashed border-white/5 hover:border-white/10'}`}>
                {preview ? <img src={preview} className="w-full h-full object-cover" /> : <i className="fas fa-plus text-white/10 text-xs"></i>}
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={e => {
                  const s = e.target.files?.[0];
                  if(s) setState(prev => ({ ...prev, file: s, preview: URL.createObjectURL(s), resultVideo: null }));
                }} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Environment</label>
              <div onClick={() => bgInputRef.current?.click()} className={`aspect-square rounded-2xl border-2 flex items-center justify-center cursor-pointer overflow-hidden bg-black/40 transition-all ${bgPreview ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/5' : 'border-dashed border-white/5 hover:border-white/10'}`}>
                {bgPreview ? <img src={bgPreview} className="w-full h-full object-cover" /> : <i className="fas fa-mountain-sun text-white/10 text-xs"></i>}
                <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={e => {
                  const s = e.target.files?.[0];
                  if(s) setState(prev => ({ ...prev, bgFile: s, bgPreview: URL.createObjectURL(s), aspectRatio: '16:9', resultVideo: null }));
                }} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Movement Script</label>
            <textarea 
              value={prompt}
              onChange={e => setState(prev => ({ ...prev, prompt: e.target.value }))}
              placeholder="e.g. Cinematic slow motion, hair flowing in the wind..."
              className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white h-24 resize-none leading-relaxed focus:border-blue-500 outline-none transition-all placeholder:text-gray-700"
            />
          </div>

          <div className="space-y-3 pt-3 border-t border-white/5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Master Ratio</label>
            <div className="flex gap-2">
              {(['16:9', '9:16'] as const).map(ratio => (
                <button key={ratio} onClick={() => !bgPreview && setState(prev => ({ ...prev, aspectRatio: ratio }))} className={`flex-1 py-2.5 rounded-xl border text-[9px] font-black uppercase transition-all ${aspectRatio === ratio ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/5 text-gray-600'}`}>
                  {ratio === '16:9' ? 'Wide' : 'Tall'}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAnimate}
            disabled={!file || loading}
            className={`mt-auto w-full py-5 rounded-2xl font-black text-xs flex items-center justify-center space-x-2 transition-all uppercase tracking-widest ${!file || loading ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-xl shadow-blue-900/40 hover:scale-[1.02] active:scale-95'}`}
          >
            {loading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-bolt"></i>}
            <span>{loading ? 'Processing...' : 'Action'}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Column */}
      <div className="flex-1 glass rounded-[3rem] bg-black flex flex-col overflow-hidden border-white/5 relative">
        <div className="flex-1 flex items-center justify-center p-8 md:p-12 lg:p-16">
          <div 
            className="relative shadow-[0_0_100px_rgba(59,130,246,0.1)] transition-all duration-700 bg-[#020202] flex items-center justify-center overflow-hidden border border-white/5"
            style={{ 
              aspectRatio: getCanvasAspectRatio(),
              maxHeight: '100%',
              maxWidth: '100%',
              width: aspectRatio === '16:9' ? '100%' : 'auto',
              height: aspectRatio === '16:9' ? 'auto' : '100%'
            }}
          >
            {resultVideo ? (
              <div className="w-full h-full group relative">
                <video src={resultVideo} controls autoPlay loop className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4">
                  <button 
                    onClick={handleDownload}
                    className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-110 transition-transform cursor-pointer"
                  >
                    <i className="fas fa-download mr-3"></i> Download Final Cut
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                {loading ? (
                  <div className="space-y-6">
                    <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden mx-auto border border-white/5">
                      <div className="h-full bg-blue-500 animate-[loading_2s_infinite] shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 animate-pulse">{LOADING_MESSAGES[messageIndex]}</p>
                  </div>
                ) : (
                  <div className="opacity-5 scale-125 flex flex-col items-center gap-6">
                    <i className="fas fa-film text-9xl"></i>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Theater State Ready</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes loading {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 100%; transform: translateX(0%); }
          100% { width: 0%; transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default VeoImageAnimator;