import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/gemini';

const VeoPromptVideo: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [loading, setLoading] = useState(false);
  const [resultVideo, setResultVideo] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResultVideo(null);
    setStatus('Inception... (2-3 mins)');
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const videoUrl = await GeminiService.generateVideo(prompt, aspectRatio, controller.signal);
      setResultVideo(videoUrl);
      setIsPlaying(true);
    } catch (error: any) {
      if (error.message?.includes('cancelled')) {
        setStatus('Generation stopped.');
      } else {
        console.error(error);
        setStatus('Dream failed.');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      setStatus('Generation stopped.');
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const stopVideo = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const handleDownload = () => {
    if (resultVideo) {
      const a = document.createElement('a');
      a.href = resultVideo;
      a.download = `veo-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const getCanvasAspectRatio = () => aspectRatio === '16:9' ? 16/9 : 9/16;

  return (
    <div className="h-[calc(100vh-theme(spacing.16)-theme(spacing.12))] flex flex-col gap-4 animate-fadeIn overflow-hidden">
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="w-72 shrink-0 flex flex-col gap-4 overflow-y-auto internal-scroll pr-1">
          <div className="glass p-6 rounded-[2.5rem] flex-1 flex flex-col gap-6 border-white/5">
            <div>
              <h2 className="text-xl font-outfit font-black mb-1">Cinema Engine</h2>
              <p className="text-[9px] text-gray-500 uppercase tracking-[0.2em]">Prompt to 720p Video</p>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Narrative</label>
              <textarea 
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="A rainy night in Neo-Tokyo, slow camera pan..."
                className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-purple-500 h-40 resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Canvas Orientation</label>
              <div className="grid grid-cols-2 gap-2">
                {(['16:9', '9:16'] as const).map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-3 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1.5 ${
                      aspectRatio === ratio ? 'bg-purple-600/20 border-purple-500 text-purple-400' : 'bg-white/5 border-white/5 text-gray-600'
                    }`}
                  >
                    <div className={`w-6 h-4 border ${aspectRatio === ratio ? 'border-purple-400' : 'border-gray-500'} rounded-[1px] ${ratio === '9:16' ? 'rotate-90' : ''}`}></div>
                    <span className="text-[9px] font-black uppercase tracking-tighter">{ratio === '16:9' ? 'Landscape' : 'Portrait'}</span>
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <button
                onClick={handleStopGeneration}
                className="mt-auto w-full py-5 rounded-2xl font-black text-xs flex items-center justify-center space-x-2 transition-all uppercase tracking-widest bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30"
              >
                <i className="fas fa-stop"></i>
                <span>Stop Generation</span>
              </button>
            ) : (
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || loading}
                className={`mt-auto w-full py-5 rounded-2xl font-black text-xs flex items-center justify-center space-x-2 transition-all uppercase tracking-widest ${
                  !prompt.trim() || loading ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl shadow-purple-900/20 hover:scale-[1.02]'
                }`}
              >
                <i className="fas fa-clapperboard"></i>
                <span>Action</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 glass rounded-[3rem] bg-black/60 flex flex-col overflow-hidden border-white/5 relative">
          <div className="flex-1 flex items-center justify-center p-12">
            <div 
              className="relative shadow-[0_0_100px_rgba(168,85,247,0.1)] transition-all duration-700 ease-in-out bg-[#020202] flex items-center justify-center overflow-hidden border border-white/5"
              style={{ 
                aspectRatio: getCanvasAspectRatio(),
                maxHeight: '100%',
                maxWidth: '100%',
                width: aspectRatio === '16:9' ? '100%' : 'auto',
                height: aspectRatio === '16:9' ? 'auto' : '100%'
              }}
            >
              {resultVideo ? (
                <div className="w-full h-full relative group">
                  <video 
                    ref={videoRef}
                    src={resultVideo} 
                    autoPlay 
                    loop 
                    className="w-full h-full object-cover" 
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                  />
                  
                  {/* Custom Controls Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-6">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={togglePlay}
                        className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                      >
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-xl`}></i>
                      </button>
                      <button 
                        onClick={stopVideo}
                        className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                      >
                        <i className="fas fa-stop text-xl"></i>
                      </button>
                    </div>

                    <div className="flex gap-3">
                      <button 
                        onClick={handleDownload}
                        className="px-6 py-3 bg-purple-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-110 transition-transform flex items-center gap-2"
                      >
                        <i className="fas fa-download"></i> Download Video
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  {loading ? (
                    <div className="space-y-6">
                      <div className="w-20 h-20 rounded-full border-4 border-purple-500/10 border-t-purple-500 animate-spin mx-auto"></div>
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-400 animate-pulse">{status}</p>
                    </div>
                  ) : (
                    <div className="opacity-10 scale-[2.0]">
                      <i className="fas fa-video text-6xl text-white"></i>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VeoPromptVideo;