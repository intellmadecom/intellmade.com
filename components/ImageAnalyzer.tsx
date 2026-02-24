
import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { fileToBase64, downloadText } from '../utils/helpers';

const ImageAnalyzer: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('Identify the objects in this image and explain the overall composition and theme.');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setAnalysis(null);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const executeAnalysis = async (specificPrompt: string) => {
    if (!file) return;
    setLoading(true);
    setAnalysis(null);
    setPrompt(specificPrompt);
    
    try {
      const base64 = await fileToBase64(file);
      const result = await GeminiService.analyzeImage(base64, specificPrompt);
      setAnalysis(result);
    } catch (error) {
      console.error(error);
      setAnalysis("Analysis failed. Try a different image format.");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = () => executeAnalysis(prompt);
  const handleReadTextTrigger = () => executeAnalysis('Read all text in the image exactly as it appears.');

  return (
    <div className="max-w-6xl mx-auto animate-fadeIn p-4">
      <div className="mb-10">
        <h2 className="text-4xl font-outfit font-bold mb-2">Lense Lab</h2>
        <p className="text-gray-400">AI-powered visual recognition and deep content understanding.</p>
      </div>

      <div className="grid lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col glass rounded-3xl overflow-hidden border-white/5">
            <div className="flex items-center justify-between p-3 bg-white/5 border-b border-white/5">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Input Media</span>
            </div>
            
            <div 
              onClick={() => fileInputRef.current?.click()}
              className={`aspect-square flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden bg-gray-900/30 relative group ${
                preview ? '' : 'border-2 border-dashed border-gray-700 hover:border-gray-500 m-4 rounded-2xl'
              }`}
            >
              {preview ? (
                <>
                  <img ref={imageRef} src={preview} alt="Analysis Target" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white font-bold">Change Image</p>
                  </div>
                  <button
                    onClick={handleClear}
                    className="absolute top-4 right-4 w-8 h-8 bg-red-500/80 hover:bg-red-600 text-white rounded-lg flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-10"
                  >
                    <i className="fas fa-times text-xs"></i>
                  </button>
                </>
              ) : (
                <>
                  <i className="fas fa-camera text-4xl text-gray-700 mb-4"></i>
                  <p className="text-gray-500 font-medium text-sm">Select photo</p>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileChange} 
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {['Describe this scene', 'Identify colors', 'Find objects'].map(p => (
                <button 
                  key={p} 
                  onClick={() => setPrompt(p)}
                  className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider hover:bg-white/10 transition-all text-gray-400"
                >
                  {p}
                </button>
              ))}
            </div>
            
            <button
              onClick={handleReadTextTrigger}
              disabled={!file || loading}
              className={`w-full py-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-emerald-400 font-bold text-sm flex items-center justify-center gap-2 transition-all hover:bg-emerald-500/10 ${
                !file || loading ? 'opacity-50 cursor-not-allowed grayscale' : ''
              }`}
            >
              <i className="fas fa-font"></i>
              Read all text in image
            </button>

            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500 min-h-[100px] text-sm"
              placeholder="Custom analysis prompt..."
            />
          </div>

          <button
            onClick={handleAnalyze}
            disabled={!file || loading}
            className={`w-full py-4 rounded-xl font-bold flex items-center justify-center space-x-2 transition-all ${
              !file || loading ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
            }`}
          >
            {loading ? <i className="fas fa-circle-notch animate-spin"></i> : <i className="fas fa-microscope"></i>}
            <span>{loading ? 'Scanning...' : 'Analyze Image'}</span>
          </button>
        </div>

        <div className="lg:col-span-3">
          <div className="glass h-full rounded-3xl p-8 flex flex-col min-h-[400px]">
             <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <h3 className="text-xl font-bold">Lab Results</h3>
                {analysis && (
                  <button 
                    onClick={() => downloadText(analysis, 'image-analysis.txt')}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
                  >
                    <i className="fas fa-download mr-1"></i> Download
                  </button>
                )}
             </div>
             <div className="flex-1 overflow-y-auto">
               {analysis ? (
                 <div className="prose prose-invert max-w-none text-gray-300">
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl mb-6">
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1">PROMPT USED</p>
                      <p className="text-sm italic">"{prompt}"</p>
                    </div>
                    {analysis.split('\n').map((line, i) => (
                      <p key={i} className="mb-4 leading-relaxed">{line}</p>
                    ))}
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                    {loading ? (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-1 bg-emerald-500/20 rounded-full overflow-hidden mb-4">
                           <div className="w-1/2 h-full bg-emerald-500 animate-[loading_1.5s_infinite]"></div>
                        </div>
                        <p className="animate-pulse">IntellMade Pro is processing visual data...</p>
                      </div>
                    ) : (
                      <>
                        <i className="fas fa-flask text-6xl mb-4"></i>
                        <p className="text-lg">Detailed analysis will appear here after scanning.</p>
                      </>
                    )}
                 </div>
               )}
             </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
};

export default ImageAnalyzer;
