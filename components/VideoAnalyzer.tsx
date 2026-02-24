import React, { useState, useRef, useEffect } from 'react';
import { GeminiService } from '../services/gemini';
import { fileToBase64, downloadText } from '../utils/helpers';
import { useAuth } from './AuthContext';

const VideoAnalyzer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Analyze this video and provide a detailed summary of its content, key events, and any notable visuals.');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { requireAuth } = useAuth();

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(selected));
      setAnalysis(null);
    }
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setLoading(true);
    setAnalysis(null);
    setStatus('Encoding video...');
    
    try {
      const base64 = await fileToBase64(file);
      setStatus('Analyzing visual data...');
      const result = await GeminiService.analyzeVideo(base64, file.type, prompt);
      setAnalysis(result);
      setStatus('');
    } catch (error) {
      console.error(error);
      setAnalysis("Error analyzing video.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!requireAuth('download')) return;
    if (!analysis) return;
    downloadText(analysis, 'video-analysis.txt');
  };

  return (
    <div className="w-full animate-fadeIn p-2 md:p-4">
      <div className="mb-4">
        <h2 className="text-2xl font-outfit font-bold mb-0">Video Insights</h2>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest">Multi-modal deep reasoning</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="flex flex-col glass rounded-2xl overflow-hidden border-white/5">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`aspect-video flex flex-col items-center justify-center cursor-pointer transition-all bg-gray-900/50 relative group ${
                file ? '' : 'border-2 border-dashed border-gray-700 hover:border-gray-500 m-2 rounded-xl'
              }`}
            >
              {previewUrl ? (
                <video 
                  ref={videoRef}
                  src={previewUrl} 
                  className="w-full h-full object-contain bg-black" 
                  controls
                />
              ) : (
                <>
                  <i className="fas fa-cloud-arrow-up text-3xl text-gray-700 mb-2"></i>
                  <p className="text-gray-500 font-bold text-[10px] uppercase tracking-widest">Upload Video</p>
                </>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="video/*" onChange={handleFileChange} />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest ml-1">Objective</label>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-orange-500 min-h-[100px] text-xs"
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all ${
              !file || loading ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-orange-600 text-white shadow-lg shadow-orange-500/10'
            }`}
          >
            {loading ? <i className="fas fa-brain animate-pulse"></i> : <i className="fas fa-magnifying-glass"></i>}
            <span className="text-sm">{loading ? 'Processing...' : 'Run Analysis'}</span>
          </button>
        </div>

        <div className="glass rounded-2xl p-6 flex flex-col h-full min-h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Analysis Result</h3>
            {analysis && (
              <button 
                onClick={handleSave} 
                className="text-[10px] font-bold text-orange-400 px-2 py-1 bg-orange-500/10 rounded border border-orange-500/20 cursor-pointer"
              >
                <i className="fas fa-download mr-1"></i> Save
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto pr-2">
            {analysis ? (
              <div className="text-xs text-gray-300 leading-relaxed space-y-3">
                {analysis.split('\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                {loading ? (
                  <p className="text-orange-400 font-bold text-[10px] animate-pulse uppercase tracking-widest">{status}</p>
                ) : (
                  <i className="fas fa-robot text-5xl mb-4"></i>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoAnalyzer;