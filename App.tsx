import React, { useState, useEffect, useRef } from 'react';
import { ToolType } from './types';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import VeoImageAnimator from './components/VeoImageAnimator';
import GeneralIntelligence from './components/GeneralIntelligence';
import VeoPromptVideo from './components/VeoPromptVideo';
import VideoAnalyzer from './components/VideoAnalyzer';
import ImageAnalyzer from './components/ImageAnalyzer';
import LiveVoiceChat from './components/LiveVoiceChat';
import ImageCreator from './components/ImageCreator';
import AudioTranscriber from './components/AudioTranscriber';
import ImageCloner from './components/ImageCloner';
import ImageEditor from './components/ImageEditor';
import Pricing from './components/Pricing';
import Sidebar from './components/Sidebar';
import AuthModal from './components/AuthModal';
import { GeminiService } from './services/gemini';

const SESSION_DURATION_MS = 3 * 60 * 60 * 1000;
const SESSION_KEY = 'intellmade_session_start';
const STATE_KEY = 'intellmade_workspace';
const LOW_CREDITS_THRESHOLD = 20;

const saveWorkspace = (data: object) => {
  try { sessionStorage.setItem(STATE_KEY, JSON.stringify({ ...data, _savedAt: Date.now() })); } catch {}
};

const loadWorkspace = () => {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (Date.now() - (data._savedAt || 0) > SESSION_DURATION_MS) { sessionStorage.removeItem(STATE_KEY); return null; }
    return data;
  } catch { return null; }
};

const defaultImageCreator = {
  prompt: '', image: null as string | null,
  subjectSlots: [null, null, null, null, null] as (string | null)[],
  aspectRatio: '1:1',
};

const defaultAnimator = {
  file: null as File | Blob | null, preview: null as string | null,
  bgFile: null as File | null, bgPreview: null as string | null,
  prompt: '', aspectRatio: '16:9' as '16:9' | '9:16', resultVideo: null as string | null,
};

const AppInner: React.FC = () => {
  const { user, credits } = useAuth();
  const saved = loadWorkspace();

  // ✅ Restore last tool from localStorage (survives magic link new tab)
  const getInitialTool = (): ToolType => {
    if (saved?.currentTool) return saved.currentTool as ToolType;
    const lastTool = localStorage.getItem('last_tool') as ToolType;
    if (lastTool) return lastTool;
    return ToolType.LANDING;
  };

  const [currentTool, setCurrentTool] = useState<ToolType>(getInitialTool);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [showLowCreditsUpgrade, setShowLowCreditsUpgrade] = useState(false);
  const [sessionWarning, setSessionWarning] = useState<'soon' | 'expired' | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [imageCreatorState, setImageCreatorStateRaw] = useState({
    ...defaultImageCreator,
    prompt: saved?.imageCreator?.prompt ?? defaultImageCreator.prompt,
    image: saved?.imageCreator?.image ?? defaultImageCreator.image,
    subjectSlots: saved?.imageCreator?.subjectSlots ?? defaultImageCreator.subjectSlots,
    aspectRatio: saved?.imageCreator?.aspectRatio ?? defaultImageCreator.aspectRatio,
  });

  const [animatorState, setAnimatorStateRaw] = useState({
    ...defaultAnimator,
    preview: saved?.animator?.preview ?? defaultAnimator.preview,
    bgPreview: saved?.animator?.bgPreview ?? defaultAnimator.bgPreview,
    prompt: saved?.animator?.prompt ?? defaultAnimator.prompt,
    aspectRatio: saved?.animator?.aspectRatio ?? defaultAnimator.aspectRatio,
    resultVideo: saved?.animator?.resultVideo ?? defaultAnimator.resultVideo,
  });

  const setImageCreatorState: typeof setImageCreatorStateRaw = (update) => {
    setImageCreatorStateRaw(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      saveWorkspace({ currentTool, imageCreator: next, animator: animatorState });
      return next;
    });
  };

  const setAnimatorState: typeof setAnimatorStateRaw = (update) => {
    setAnimatorStateRaw(prev => {
      const next = typeof update === 'function' ? update(prev) : update;
      saveWorkspace({ currentTool, imageCreator: imageCreatorState, animator: next });
      return next;
    });
  };

  const handleToolSelect = (tool: ToolType) => {
    if (tool === ToolType.PRICING && currentTool !== ToolType.PRICING) {
      sessionStorage.setItem('pre_stripe_tool', currentTool);
    }
    setCurrentTool(tool);
    // ✅ Save to localStorage so magic link new tab can restore it
    localStorage.setItem('last_tool', tool);
    saveWorkspace({ currentTool: tool, imageCreator: imageCreatorState, animator: animatorState });
  };

  // ✅ After magic link sign-in, restore the tool they were on
  useEffect(() => {
    if (user) {
      const returnTool = localStorage.getItem('auth_return_tool') as ToolType | null;
      if (returnTool) {
        localStorage.removeItem('auth_return_tool');
        setCurrentTool(returnTool);
        localStorage.setItem('last_tool', returnTool);
      }
    }
  }, [user]);

  // Low credits popup
  useEffect(() => {
    if (user && credits !== null && credits <= LOW_CREDITS_THRESHOLD && credits > 0 && currentTool !== ToolType.PRICING) {
      setShowLowCreditsUpgrade(true);
    }
  }, [credits, user]);

  const startSessionTimer = () => {
    if (!sessionStorage.getItem(SESSION_KEY)) sessionStorage.setItem(SESSION_KEY, Date.now().toString());
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    sessionTimerRef.current = setInterval(() => {
      const start = parseInt(sessionStorage.getItem(SESSION_KEY) || '0');
      const remaining = SESSION_DURATION_MS - (Date.now() - start);
      if (remaining <= 0) {
        setSessionWarning('expired');
        clearWorkspaceAndStorage();
        clearInterval(sessionTimerRef.current!);
        setTimeLeft('');
      } else if (remaining <= 15 * 60 * 1000) {
        setSessionWarning('soon');
        setTimeLeft(`${Math.ceil(remaining / 60000)}m`);
      } else {
        setSessionWarning(null);
        setTimeLeft('');
      }
    }, 30000);
  };

  const clearWorkspaceAndStorage = () => {
    setImageCreatorStateRaw(defaultImageCreator);
    setAnimatorStateRaw(defaultAnimator);
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(STATE_KEY);
    setCurrentTool(ToolType.LANDING);
  };

  useEffect(() => {
    checkKey();
    handleStripeReturn();
    startSessionTimer();
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
  }, []);

  const handleStripeReturn = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const payment = searchParams.get('payment') || hashParams.get('payment');
    if (payment === 'success' || payment === 'canceled') {
      setCurrentTool(ToolType.PRICING);
      window.history.replaceState({}, '', window.location.pathname);
      const savedTool = sessionStorage.getItem('pre_stripe_tool') as ToolType | null;
      if (savedTool) {
        setTimeout(() => { setCurrentTool(savedTool); sessionStorage.removeItem('pre_stripe_tool'); }, 4000);
      }
    }
  };

  const checkKey = async () => { const status = await GeminiService.checkApiKey(); setHasApiKey(status); };
  const handleOpenKey = async () => { await GeminiService.promptApiKey(); setHasApiKey(true); };
  const toggleSidebar = () => setIsSidebarVisible(v => !v);

  const handleAnimateSharedImage = (base64: string) => {
    const dataUrl = `data:image/png;base64,${base64}`;
    fetch(dataUrl).then(r => r.blob()).then(blob => {
      setAnimatorState(prev => ({ ...prev, file: blob, preview: dataUrl, resultVideo: null }));
      handleToolSelect(ToolType.ANIMATE_IMAGE);
    });
  };

  const show = (tool: ToolType) => currentTool === tool;

  return (
    <div className="flex min-h-screen bg-gray-950 overflow-hidden">

      {showLowCreditsUpgrade && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[3rem] bg-gray-950 border border-white/10">
            <Pricing lowCreditsMode onClose={() => setShowLowCreditsUpgrade(false)} />
          </div>
        </div>
      )}

      <div className={`fixed lg:sticky top-0 h-screen z-40 transition-transform duration-300 ease-in-out ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full lg:hidden'}`}>
        <Sidebar active={currentTool} onSelect={(tool) => { handleToolSelect(tool); if (window.innerWidth < 1024) setIsSidebarVisible(false); }} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="sticky top-0 z-30 h-16 flex items-center justify-between glass border-b border-white/5 shrink-0 px-4 md:px-6">
          <div className="flex items-center gap-4">
            <button onClick={toggleSidebar} className="hover:bg-white/10 transition-colors text-gray-400 w-10 h-10 rounded-xl flex items-center justify-center z-50">
              <i className="fas fa-bars"></i>
            </button>
            {currentTool !== ToolType.LANDING && (
              <button onClick={() => handleToolSelect(ToolType.LANDING)} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <i className="fas fa-house text-xs"></i>
                <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Home</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-xs font-black tracking-widest text-gray-500 uppercase hidden md:block">INTELLMADE STUDIO</h1>

            {sessionWarning === 'soon' && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl animate-pulse">
                <i className="fas fa-clock text-amber-400 text-[10px]"></i>
                <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Session expires in {timeLeft}</span>
                <button onClick={() => { sessionStorage.setItem(SESSION_KEY, Date.now().toString()); setSessionWarning(null); }} className="text-[9px] text-amber-300 hover:text-white underline ml-1">Extend</button>
                <button onClick={() => setSessionWarning(null)} className="text-amber-600 hover:text-amber-400 ml-1 text-[10px]"><i className="fas fa-times"></i></button>
              </div>
            )}

            {sessionWarning === 'expired' && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl">
                <i className="fas fa-triangle-exclamation text-red-400 text-[10px]"></i>
                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Session expired — workspace cleared</span>
                <button onClick={() => { setSessionWarning(null); startSessionTimer(); }} className="text-[9px] text-red-300 hover:text-white underline ml-1">Start new</button>
              </div>
            )}

            {!hasApiKey && (
              <button onClick={handleOpenKey} className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500/20 transition-all">
                <i className="fas fa-key mr-2"></i> Key
              </button>
            )}

            {user ? (
              <div className="flex items-center gap-2">
                <div
                  onClick={() => handleToolSelect(ToolType.PRICING)}
                  title="Top up credits"
                  className={`flex items-center gap-1.5 border px-2.5 py-1.5 rounded-xl cursor-pointer transition-all ${
                    credits !== null && credits <= LOW_CREDITS_THRESHOLD
                      ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20 animate-pulse'
                      : 'bg-purple-500/10 border-purple-500/30 hover:bg-purple-500/20'
                  }`}
                >
                  <i className={`fas fa-bolt text-[9px] ${credits !== null && credits <= LOW_CREDITS_THRESHOLD ? 'text-red-400' : 'text-purple-400'}`}></i>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${credits !== null && credits <= LOW_CREDITS_THRESHOLD ? 'text-red-300' : 'text-purple-300'}`}>
                    {credits ?? '···'} CR
                  </span>
                  {credits !== null && credits <= LOW_CREDITS_THRESHOLD && (
                    <span className="text-[8px] text-red-400 font-black ml-0.5">LOW</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2.5 py-1.5 rounded-xl max-w-[140px]">
                  <i className="fas fa-circle text-green-400 text-[6px]"></i>
                  <span className="text-[10px] text-gray-400 truncate">{user.email}</span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => { localStorage.setItem('auth_return_tool', currentTool); handleToolSelect(ToolType.PRICING); }}
                className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 rounded-xl text-[10px] font-black text-purple-300 uppercase tracking-widest hover:bg-purple-500/20 transition-all"
              >
                <i className="fas fa-gift text-purple-400"></i>
                <span className="hidden sm:inline">100 Free Credits</span>
              </button>
            )}
          </div>
        </header>

        <main className={`flex-1 w-full internal-scroll ${currentTool === ToolType.GENERAL_INTEL ? 'overflow-hidden p-0' : 'overflow-y-auto max-w-7xl mx-auto p-4 md:p-6 pb-12'}`}>

          <div style={{ display: show(ToolType.LANDING) ? 'block' : 'none' }}>
            <LandingPage onSelect={handleToolSelect} onToggleSidebar={toggleSidebar} />
          </div>

          <div style={{ display: show(ToolType.PRICING) ? 'block' : 'none' }}>
            <Pricing />
          </div>

          {hasApiKey ? (
            <>
              <div style={{ display: show(ToolType.IMAGE_GEN) ? 'block' : 'none' }}>
                <ImageCreator state={imageCreatorState} setState={setImageCreatorState} onAnimateRequest={handleAnimateSharedImage} />
              </div>
              <div style={{ display: show(ToolType.ANIMATE_IMAGE) ? 'block' : 'none' }}>
                <VeoImageAnimator state={animatorState} setState={setAnimatorState} />
              </div>
              <div style={{ display: show(ToolType.GENERAL_INTEL) ? 'block' : 'none', height: '100%' }}>
                <GeneralIntelligence />
              </div>
              <div style={{ display: show(ToolType.PROMPT_VIDEO) ? 'block' : 'none' }}>
                <VeoPromptVideo />
              </div>
              <div style={{ display: show(ToolType.VIDEO_ORACLE) ? 'block' : 'none' }}>
                <VideoAnalyzer />
              </div>
              <div style={{ display: show(ToolType.IMAGE_ANALYZER) ? 'block' : 'none' }}>
                <ImageAnalyzer />
              </div>
              <div style={{ display: show(ToolType.VOICE_CHAT) ? 'block' : 'none' }}>
                <LiveVoiceChat />
              </div>
              <div style={{ display: show(ToolType.IMAGE_CLONER) ? 'block' : 'none' }}>
                <ImageCloner onAnimateRequest={handleAnimateSharedImage} />
              </div>
              <div style={{ display: show(ToolType.IMAGE_EDITOR) ? 'block' : 'none' }}>
                <ImageEditor onAnimateRequest={handleAnimateSharedImage} />
              </div>
              <div style={{ display: show(ToolType.AUDIO_TRANSCRIBER) ? 'block' : 'none' }}>
                <AudioTranscriber />
              </div>
            </>
          ) : (
            !show(ToolType.LANDING) && !show(ToolType.PRICING) && (
              <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
                <div className="bg-yellow-500/10 border border-yellow-500/50 p-8 rounded-2xl max-w-md">
                  <i className="fas fa-key text-4xl text-yellow-500 mb-4"></i>
                  <h2 className="text-2xl font-bold mb-2">API Key Required</h2>
                  <p className="text-gray-400 mb-6">To use advanced AI features, you must select a paid API key from Google AI Studio.</p>
                  <button onClick={handleOpenKey} className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all">
                    Select API Key
                  </button>
                </div>
              </div>
            )
          )}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <AuthProvider>
    <AppInner />
    <AuthModal />
  </AuthProvider>
);

export default App;