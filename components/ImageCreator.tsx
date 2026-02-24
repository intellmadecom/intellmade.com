import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { useAuth } from './AuthContext';

interface ImageCreatorProps {
  state: {
    prompt: string;
    image: string | null;
    subjectSlots: (string | null)[];
    aspectRatio: string;
  };
  setState: React.Dispatch<React.SetStateAction<{
    prompt: string;
    image: string | null;
    subjectSlots: (string | null)[];
    aspectRatio: string;
  }>>;
  onAnimateRequest?: (base64: string) => void;
}

const ImageCreator: React.FC<ImageCreatorProps> = ({ state, setState, onAnimateRequest }) => {
  const { prompt, image, subjectSlots, aspectRatio } = state;
  const [loading, setLoading] = useState(false);
  const { requireAuth } = useAuth();
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setState(prev => ({ ...prev, image: null }));
    abortControllerRef.current = new AbortController();

    try {
      const references = subjectSlots
        .filter(slot => slot !== null)
        .map(slot => slot!.split(',')[1]);
      
      let finalPrompt = `SCENE: ${prompt}. `;

      if (references.length > 0) {
        finalPrompt += `STRICT VISUAL REPLICATION: Replicate the subject from the provided references exactly. Maintain style consistency. `;
      }
        
      const url = await GeminiService.generateImage(finalPrompt, aspectRatio, references);
      if (!abortControllerRef.current.signal.aborted) {
        setState(prev => ({ ...prev, image: url }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!requireAuth('download')) return;
    if (!image) return;
    const link = document.createElement('a');
    link.href = image;
    link.download = 'intellmade-vision.png';
    link.click();
  };

  const assignToSlot = (img: string, index: number) => {
    const newSlots = [...subjectSlots];
    newSlots[index] = img;
    setState(prev => ({ ...prev, subjectSlots: newSlots }));
  };

  const ratios = ['1:1', '3:2', '4:3', '16:9', '9:16'];

  const getCanvasAspectRatio = () => {
    const parts = aspectRatio.split(':');
    return parseFloat(parts[0]) / parseFloat(parts[1]);
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.12))] flex gap-4 animate-fadeIn overflow-hidden">
      {/* Settings Column */}
      <div className="w-80 lg:w-96 shrink-0 flex flex-col gap-4 overflow-y-auto internal-scroll pr-2 pb-4">
        <div className="glass p-5 rounded-[2.5rem] flex flex-col gap-5 border-white/5 bg-gray-950/40">
          <div>
            <h2 className="text-xl font-outfit font-black mb-0.5 tracking-tight">Vision Studio</h2>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest">Image Generation Suite</p>
          </div>

          {/* Subject Slots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Character Memory</label>
              <i className="fas fa-fingerprint text-[10px] text-indigo-500"></i>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {subjectSlots.map((slot, idx) => (
                <div key={idx} className="relative group">
                  <div className={`aspect-square rounded-xl border flex items-center justify-center overflow-hidden transition-all ${slot ? 'border-indigo-500 bg-indigo-500/10' : 'border-dashed border-white/10 bg-black/40'}`}>
                    {slot ? <img src={slot} className="w-full h-full object-cover" /> : <i className="fas fa-plus text-white/5 text-[10px]"></i>}
                  </div>
                  {slot && (
                    <button onClick={() => assignToSlot('', idx)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-full flex items-center justify-center text-[8px] opacity-0 group-hover:opacity-100 transition-all z-10">
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Prompt</label>
            <textarea 
              value={prompt} 
              onChange={e => setState(prev => ({ ...prev, prompt: e.target.value }))} 
              placeholder="e.g. A cyberpunk nomad standing in neon rain..." 
              className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-indigo-500 h-40 resize-none leading-relaxed" 
            />
          </div>

          <div className="space-y-2.5 pt-3 border-t border-white/5">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Dimensions</label>
            <div className="grid grid-cols-5 gap-1.5">
              {ratios.map(r => (
                <button key={r} onClick={() => setState(prev => ({ ...prev, aspectRatio: r }))} className={`py-2 rounded-lg text-[8px] font-black border transition-all ${aspectRatio === r ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-gray-600 hover:bg-white/10'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={loading} className={`w-full py-5 rounded-2xl font-black text-[11px] transition-all flex items-center justify-center space-x-2 uppercase tracking-[0.2em] mt-auto ${loading ? 'bg-gray-800 text-gray-600' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40 hover:scale-[1.02] active:scale-95'}`}>
            {loading ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-wand-magic-sparkles"></i>}
            <span>{loading ? 'Synthesizing...' : (image ? 'Regenerate Art' : 'Generate Art')}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Column */}
      <div className="flex-1 glass rounded-[3rem] bg-black/40 flex flex-col overflow-hidden border-white/5 relative">
        <div className="flex-1 flex items-center justify-center p-8 md:p-12 lg:p-16">
          <div 
            className="relative shadow-[0_0_100px_rgba(79,70,229,0.15)] transition-all duration-700 ease-in-out bg-[#050505] flex items-center justify-center overflow-hidden border border-white/5"
            style={{ 
              aspectRatio: getCanvasAspectRatio(),
              maxHeight: '100%',
              maxWidth: '100%',
              width: getCanvasAspectRatio() > 1 ? '100%' : 'auto',
              height: getCanvasAspectRatio() > 1 ? 'auto' : '100%'
            }}
          >
            {image ? (
              <div className="w-full h-full relative group">
                <img src={image} className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center gap-4">
                  <div className="flex gap-3">
                    <button 
                      onClick={() => assignToSlot(image, subjectSlots.findIndex(s => s === null) !== -1 ? subjectSlots.findIndex(s => s === null) : 0)} 
                      className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                      title="Add to Character Memory"
                    >
                      <i className="fas fa-plus"></i>
                    </button>
                    <button 
                      onClick={() => onAnimateRequest?.(image.split(',')[1])} 
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
                    <div className="w-16 h-16 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500 animate-pulse">Rendering 4K Inference</p>
                  </div>
                ) : (
                  <div className="opacity-5 flex flex-col items-center gap-6">
                    <i className="fas fa-palette text-8xl"></i>
                    <p className="text-[10px] font-black uppercase tracking-[0.5em]">Studio Ready</p>
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

export default ImageCreator;