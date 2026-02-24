import React, { useState, useEffect, useRef } from 'react';
import { ToolType } from './types';
import { AuthProvider } from './contexts/AuthContext';

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

// Session duration: 6 hours in milliseconds
const SESSION_DURATION_MS = 6 * 60 * 60 * 1000;
const SESSION_KEY = 'intellmade_session_start';

const App: React.FC = () => {
  const [currentTool, setCurrentTool] = useState<ToolType>(ToolType.LANDING);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);

  // Session expiry state
  const [sessionWarning, setSessionWarning] = useState<'soon' | 'expired' | null>(null);
  const [timeLeft, setTimeLeft] = useState('');
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Lifted state for Image Creator
  const [imageCreatorState, setImageCreatorState] = useState({
    prompt: '',
    image: null as string | null,
    subjectSlots: [null, null, null, null, null] as (string | null)[],
    aspectRatio: '1:1'
  });

  // Lifted state for Photo Animator
  const [animatorState, setAnimatorState] = useState({
    file: null as File | Blob | null,
    preview: null as string | null,
    bgFile: null as File | null,
    bgPreview: null as string | null,
    prompt: '',
    aspectRatio: '16:9' as '16:9' | '9:16',
    resultVideo: null as string | null
  });

  // ── Session timer ──────────────────────────────────────────
  const startSessionTimer = () => {
    // Record session start if not already set
    if (!sessionStorage.getItem(SESSION_KEY)) {
      sessionStorage.setItem(SESSION_KEY, Date.now().toString());
    }

    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);

    sessionTimerRef.current = setInterval(() => {
      const start = parseInt(sessionStorage.getItem(SESSION_KEY) || '0');
      const elapsed = Date.now() - start;
      const remaining = SESSION_DURATION_MS - elapsed;

      if (remaining <= 0) {
        // Session expired — clear workspace
        setSessionWarning('expired');
        clearWorkspace();
        clearInterval(sessionTimerRef.current!);
        setTimeLeft('');
      } else if (remaining <= 15 * 60 * 1000) {
        // Warn when 15 minutes left
        setSessionWarning('soon');
        const mins = Math.ceil(remaining / 60000);
        setTimeLeft(`${mins}m`);
      } else {
        setSessionWarning(null);
        setTimeLeft('');
      }
    }, 30000); // check every 30 seconds
  };

  const clearWorkspace = () => {
    setImageCreatorState({
      prompt: '',
      image: null,
      subjectSlots: [null, null, null, null, null],
      aspectRatio: '1:1'
    });
    setAnimatorState({
      file: null,
      preview: null,
      bgFile: null,
      bgPreview: null,
      prompt: '',
      aspectRatio: '16:9',
      resultVideo: null
    });
    sessionStorage.removeItem(SESSION_KEY);
    setCurrentTool(ToolType.LANDING);
  };

  const dismissWarning = () => setSessionWarning(null);

  const extendSession = () => {
    sessionStorage.setItem(SESSION_KEY, Date.now().toString());
    setSessionWarning(null);
    setTimeLeft('');
  };

  useEffect(() => {
    checkKey();
    handleStripeReturn();
    startSessionTimer();
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, []);

  // ── Stripe return handler ──────────────────────────────────
  const handleStripeReturn = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const payment = urlParams.get('payment');
    if (payment === 'success' || payment === 'canceled') {
      setCurrentTool(ToolType.PRICING);
      const savedTool = sessionStorage.getItem('pre_stripe_tool') as ToolType | null;
      if (savedTool) {
        setTimeout(() => {
          setCurrentTool(savedTool);
          sessionStorage.removeItem('pre_stripe_tool');
        }, 4000);
      }
    }
  };

  const handleToolSelect = (tool: ToolType) => {
    if (tool === ToolType.PRICING && currentTool !== ToolType.PRICING) {
      sessionStorage.setItem('pre_stripe_tool', currentTool);
    }
    setCurrentTool(tool);
  };

  const checkKey = async () => {
    const status = await GeminiService.checkApiKey();
    setHasApiKey(status);
  };

  const handleOpenKey = async () => {
    await GeminiService.promptApiKey();
    setHasApiKey(true);
  };

  const toggleSidebar = () => setIsSidebarVisible(!isSidebarVisible);

  const handleAnimateSharedImage = (base64: string) => {
    const dataUrl = `data:image/png;base64,${base64}`;
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        setAnimatorState(prev => ({
          ...prev,
          file: blob,
          preview: dataUrl,
          resultVideo: null
        }));
        setCurrentTool(ToolType.ANIMATE_IMAGE);
      });
  };

  const show = (tool: ToolType) => currentTool === tool;

  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-gray-950 overflow-hidden">
        <div className={`fixed lg:sticky top-0 h-screen z-40 transition-transform duration-300 ease-in-out ${isSidebarVisible ? 'translate-x-0' : '-translate-x-full lg:hidden'}`}>
          <Sidebar
            active={currentTool}
            onSelect={(tool) => {
              handleToolSelect(tool);
              if (window.innerWidth < 1024) setIsSidebarVisible(false);
            }}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* ── Header ── */}
          <header className="sticky top-0 z-30 h-16 flex items-center justify-between glass border-b border-white/5 shrink-0 px-4 md:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="hover:bg-white/10 transition-colors text-gray-400 w-10 h-10 rounded-xl flex items-center justify-center z-50"
              >
                <i className="fas fa-bars"></i>
              </button>
              {currentTool !== ToolType.LANDING && (
                <button
                  onClick={() => setCurrentTool(ToolType.LANDING)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <i className="fas fa-house text-xs"></i>
                  <span className="text-xs font-bold uppercase tracking-widest hidden sm:inline">Home</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-xs font-black tracking-widest text-gray-500 uppercase hidden md:block">INTELLMADE STUDIO</h1>

              {/* ── Session warning banner ── */}
              {sessionWarning === 'soon' && (
                <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-xl animate-pulse">
                  <i className="fas fa-clock text-amber-400 text-[10px]"></i>
                  <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                    Session expires in {timeLeft}
                  </span>
                  <button
                    onClick={extendSession}
                    className="text-[9px] text-amber-300 hover:text-white underline ml-1 transition-colors"
                  >
                    Extend
                  </button>
                  <button onClick={dismissWarning} className="text-amber-600 hover:text-amber-400 ml-1 text-[10px]">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              )}

              {sessionWarning === 'expired' && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-xl">
                  <i className="fas fa-triangle-exclamation text-red-400 text-[10px]"></i>
                  <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                    Session expired — workspace cleared
                  </span>
                  <button
                    onClick={() => { setSessionWarning(null); startSessionTimer(); }}
                    className="text-[9px] text-red-300 hover:text-white underline ml-1 transition-colors"
                  >
                    Start new
                  </button>
                </div>
              )}

              {!hasApiKey && (
                <button
                  onClick={handleOpenKey}
                  className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/30 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-yellow-500/20 transition-all"
                >
                  <i className="fas fa-key mr-2"></i> Key
                </button>
              )}
            </div>
          </header>

          {/* ── Main content — all tools rendered, shown/hidden via CSS ── */}
          <main className={`flex-1 w-full internal-scroll ${currentTool === ToolType.GENERAL_INTEL ? 'overflow-hidden p-0' : 'overflow-y-auto max-w-7xl mx-auto p-4 md:p-6 pb-12'}`}>

            {/* Tools that are always mounted — state survives navigation */}
            <div style={{ display: show(ToolType.LANDING) ? 'block' : 'none' }}>
              <LandingPage onSelect={handleToolSelect} onToggleSidebar={toggleSidebar} />
            </div>

            <div style={{ display: show(ToolType.PRICING) ? 'block' : 'none' }}>
              <Pricing />
            </div>

            {hasApiKey ? (
              <>
                <div style={{ display: show(ToolType.IMAGE_GEN) ? 'block' : 'none' }}>
                  <ImageCreator
                    state={imageCreatorState}
                    setState={setImageCreatorState}
                    onAnimateRequest={handleAnimateSharedImage}
                  />
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
              /* No API key — show prompt on any tool page except landing/pricing */
              !show(ToolType.LANDING) && !show(ToolType.PRICING) && (
                <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center">
                  <div className="bg-yellow-500/10 border border-yellow-500/50 p-8 rounded-2xl max-w-md">
                    <i className="fas fa-key text-4xl text-yellow-500 mb-4"></i>
                    <h2 className="text-2xl font-bold mb-2">API Key Required</h2>
                    <p className="text-gray-400 mb-6">
                      To use advanced AI features, you must select a paid API key from Google AI Studio.
                    </p>
                    <button
                      onClick={handleOpenKey}
                      className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-3 px-6 rounded-xl transition-all"
                    >
                      Select API Key
                    </button>
                  </div>
                </div>
              )
            )}
          </main>
        </div>
      </div>
      {/* Auth modal — controlled by AuthContext.setShowAuthModal */}
      <AuthModal />
    </AuthProvider>
  );
};

export default App;