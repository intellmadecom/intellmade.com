
import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../services/gemini';

interface EditInstructions {
  trim: { start: number; end: number };
  resize: "16:9" | "9:16" | "1:1";
  speed: number;
  captions: { enabled: boolean; style: string; position: string; source: string };
  music: { enabled: boolean; volume: number };
  effects: { fade_in: boolean; fade_out: boolean };
  watermark: { enabled: boolean; text: string };
  export: { format: string; quality: string };
}

interface EditorAsset {
  id: string;
  type: 'video' | 'image' | 'audio';
  url: string;
  name: string;
  duration?: number;
}

interface VideoEditorProps {
  assets: EditorAsset[];
  setAssets: React.Dispatch<React.SetStateAction<EditorAsset[]>>;
}

const VideoEditor: React.FC<VideoEditorProps> = ({ assets, setAssets }) => {
  const [timeline, setTimeline] = useState<EditorAsset[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [instructions, setInstructions] = useState<EditInstructions | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (assets.length > 0) {
      setTimeline(prev => [...prev, ...assets]);
      if (!selectedAssetId && assets.length > 0) {
        setSelectedAssetId(assets[0].id);
      }
      setAssets([]);
    }
  }, [assets]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newAsset: EditorAsset = {
        id: Math.random().toString(36).substr(2, 9),
        type: file.type.startsWith('video') ? 'video' : 'image',
        url,
        name: file.name
      };
      setTimeline(prev => [...prev, newAsset]);
      setSelectedAssetId(newAsset.id);
    }
  };

  const handleApplyAI = async () => {
    const selected = timeline.find(a => a.id === selectedAssetId);
    if (!selected || !aiPrompt.trim()) return;

    setIsProcessing(true);
    try {
      // Simulate/Probe duration if needed, default to 10
      const duration = selected.duration || 10;
      const res = await GeminiService.generateEditingInstructions(aiPrompt, {
        duration,
        name: selected.name
      });
      if (res) {
        setInstructions(res);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    for (let i = 0; i <= 100; i += 5) {
      setExportProgress(i);
      await new Promise(r => setTimeout(r, 100));
    }
    setIsExporting(false);
    alert(`Exported as MP4 (${instructions?.export.quality || 'Standard'})`);
  };

  const activeAsset = timeline.find(a => a.id === selectedAssetId);

  const getCanvasStyle = () => {
    if (!instructions) return { aspectRatio: '16/9' };
    switch (instructions.resize) {
      case '9:16': return { aspectRatio: '9/16', maxHeight: '100%' };
      case '1:1': return { aspectRatio: '1/1', maxHeight: '100%' };
      default: return { aspectRatio: '16/9' };
    }
  };

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.12))] flex flex-col gap-4 animate-fadeIn overflow-hidden">
      {isExporting && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mb-6"></div>
          <p className="text-white font-black text-xs uppercase tracking-[0.5em]">Synthesizing Final Master... {exportProgress}%</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-outfit font-black text-white flex items-center gap-2">
            <i className="fas fa-wand-magic-sparkles text-indigo-400"></i> AI Copilot Editor
          </h2>
          <button onClick={() => videoInputRef.current?.click()} className="bg-white/5 hover:bg-white/10 border border-white/10 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            <i className="fas fa-plus mr-2"></i> Import Media
          </button>
          <input type="file" ref={videoInputRef} className="hidden" accept="video/*,image/*" onChange={handleFileUpload} />
        </div>
        
        <button 
          onClick={handleExport}
          disabled={!activeAsset || !instructions}
          className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all ${
            activeAsset && instructions ? 'bg-indigo-600 text-white hover:scale-105' : 'bg-gray-800 text-gray-500 cursor-not-allowed'
          }`}
        >
          Render & Export
        </button>
      </div>

      <div className="flex-1 flex gap-6 min-h-0">
        {/* Left Sidebar: Controls */}
        <div className="w-80 shrink-0 flex flex-col gap-4 overflow-hidden">
          <div className="glass p-6 rounded-[2.5rem] flex flex-col gap-6 border-white/5 bg-indigo-500/5 h-full overflow-y-auto internal-scroll">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] block">AI Editor Chat</label>
              <div className="relative">
                <textarea 
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  placeholder="e.g. 'Make this a TikTok video with bold yellow captions at the bottom and fade out the end.'"
                  className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-indigo-500 h-40 resize-none leading-relaxed placeholder:text-gray-600"
                />
              </div>
              <button 
                onClick={handleApplyAI}
                disabled={isProcessing || !aiPrompt.trim()}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  isProcessing ? 'bg-gray-800 text-gray-600' : 'bg-white text-black hover:scale-[1.02]'
                }`}
              >
                {isProcessing ? <i className="fas fa-spinner animate-spin"></i> : <i className="fas fa-magic"></i>}
                {isProcessing ? 'Analyzing...' : 'Apply AI Magic'}
              </button>
            </div>

            <div className="mt-auto space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block">Project Assets</label>
              <div className="space-y-2">
                {timeline.map(asset => (
                  <div 
                    key={asset.id} 
                    onClick={() => setSelectedAssetId(asset.id)}
                    className={`flex items-center gap-3 p-2 rounded-xl border transition-all cursor-pointer ${
                      selectedAssetId === asset.id ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden shrink-0">
                      {asset.type === 'image' ? <img src={asset.url} className="w-full h-full object-cover" /> : <i className="fas fa-video text-xs"></i>}
                    </div>
                    <span className="text-[10px] font-bold truncate flex-1">{asset.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Center Canvas */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          <div className="glass rounded-[4rem] flex-1 flex items-center justify-center bg-black relative border-white/5 overflow-hidden">
            <div 
              className="relative shadow-[0_0_100px_rgba(79,70,229,0.15)] transition-all duration-700 bg-[#020202] flex items-center justify-center border border-white/10"
              style={getCanvasStyle()}
            >
              {activeAsset ? (
                <div className="w-full h-full relative">
                  {activeAsset.type === 'video' ? (
                    <video 
                      ref={videoPreviewRef} 
                      src={activeAsset.url} 
                      className="w-full h-full object-cover" 
                      autoPlay 
                      muted 
                      loop 
                      style={{ filter: instructions?.effects.fade_in ? 'brightness(1)' : 'none' }}
                    />
                  ) : (
                    <img src={activeAsset.url} className="w-full h-full object-cover" />
                  )}
                  
                  {/* Visual Simulation of Instructions */}
                  {instructions?.captions.enabled && (
                    <div className={`absolute left-0 right-0 p-8 flex justify-center z-20 pointer-events-none ${instructions.captions.position === 'bottom' ? 'bottom-10' : 'top-1/2 -translate-y-1/2'}`}>
                      <h4 className={`text-center font-black uppercase text-white ${
                        instructions.captions.style === 'bold' ? 'text-2xl bg-yellow-400 text-black px-4 py-1' : 'text-lg drop-shadow-2xl'
                      }`}>
                        {activeAsset.name.split('.')[0]} — AI Subtitle
                      </h4>
                    </div>
                  )}

                  {instructions?.watermark.enabled && (
                    <div className="absolute top-4 right-4 opacity-50 z-30 pointer-events-none">
                      <span className="text-[8px] font-black uppercase tracking-widest text-white">{instructions.watermark.text}</span>
                    </div>
                  )}

                  {instructions && (
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[8px] font-black text-indigo-400 uppercase tracking-widest z-40 border border-white/10">
                      AI Logic Active
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 opacity-10">
                  <i className="fas fa-wand-sparkles text-7xl"></i>
                  <p className="text-[10px] uppercase font-black tracking-[0.4em]">Import Media to Begin</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Sidebar: Programmatic Result */}
        <div className="w-72 shrink-0 flex flex-col gap-4">
          <div className="glass p-6 rounded-[2.5rem] flex-1 flex flex-col gap-6 overflow-hidden border-white/5 bg-gray-950/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Active Logic</h3>
              {instructions && <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>}
            </div>

            <div className="flex-1 overflow-y-auto internal-scroll pr-1">
              {instructions ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Instruction Tree</p>
                    <div className="bg-black/60 rounded-xl p-4 border border-white/5 font-mono text-[9px] text-gray-400 overflow-x-auto whitespace-pre">
                      {JSON.stringify(instructions, null, 2)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Modification List</p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-[10px] text-gray-300">
                        <i className="fas fa-crop text-indigo-500 w-4"></i>
                        <span>Resize: {instructions.resize}</span>
                      </li>
                      <li className="flex items-center gap-2 text-[10px] text-gray-300">
                        <i className="fas fa-gauge text-indigo-500 w-4"></i>
                        <span>Speed: {instructions.speed}x</span>
                      </li>
                      {instructions.captions.enabled && (
                        <li className="flex items-center gap-2 text-[10px] text-gray-300">
                          <i className="fas fa-closed-captioning text-indigo-500 w-4"></i>
                          <span>Captions: {instructions.captions.style}</span>
                        </li>
                      )}
                      {instructions.music.enabled && (
                        <li className="flex items-center gap-2 text-[10px] text-gray-300">
                          <i className="fas fa-music text-indigo-500 w-4"></i>
                          <span>Audio: Vol {Math.round(instructions.music.volume * 100)}%</span>
                        </li>
                      )}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center gap-4 opacity-20">
                  <i className="fas fa-microchip text-3xl"></i>
                  <p className="text-[9px] font-black uppercase tracking-[0.2em] leading-relaxed">AI will generate programmatic instructions based on your intent.</p>
                </div>
              )}
            </div>
            
            <div className="pt-4 border-t border-white/5">
              <button 
                onClick={() => setInstructions(null)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-500 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
              >
                Reset Scene
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoEditor;
