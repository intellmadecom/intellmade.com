import React, { useState, useEffect, useCallback } from 'react';
import { ToolType } from '../types';
import { useAuth } from './AuthContext';

interface SidebarProps {
  active: ToolType;
  onSelect: (tool: ToolType) => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// Credit costs per action (must match types/index.ts TOOL_CREDIT_COSTS)
const COSTS = {
  image:  5,
  video:  10,
  chat:   1,
  voice:  2,
  edit:   3,
};

const Sidebar: React.FC<SidebarProps> = ({ active, onSelect }) => {
  const { user, isLoggedIn, signOut, setShowAuthModal } = useAuth();
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string>('FREE');
  const [showBreakdown, setShowBreakdown] = useState(false);

  const fetchCredits = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;
      const res = await fetch(`${API_URL}/api/payments/credits`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCredits(data.data.credits ?? 0);
        setPlan((data.data.plan ?? 'free').toUpperCase());
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  }, []);

  // Fetch credits when isLoggedIn changes
  useEffect(() => {
    if (isLoggedIn) fetchCredits();
    else { setCredits(null); setPlan('FREE'); }
  }, [isLoggedIn, fetchCredits]);

  // Fallback: listen for access_token being written to localStorage
  // This catches magic link redirects where isLoggedIn may already be true
  // but fetchCredits ran before the token was available
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'access_token' && e.newValue) {
        fetchCredits();
      }
    };
    // Also try fetching on mount in case token already exists
    const token = localStorage.getItem('access_token');
    if (token) fetchCredits();

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fetchCredits]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.credits !== undefined) setCredits(detail.credits);
      if (detail?.plan) setPlan(detail.plan.toUpperCase());
    };
    window.addEventListener('credits-updated', handler);
    return () => window.removeEventListener('credits-updated', handler);
  }, []);

  const menuItems = [
    { id: ToolType.LANDING,           label: 'Home',              icon: 'fa-house' },
    { id: ToolType.VOICE_CHAT,        label: 'Live Voice Studio', icon: 'fa-microphone-lines' },
    { id: ToolType.IMAGE_GEN,         label: 'Image Generator',   icon: 'fa-palette' },
    { id: ToolType.IMAGE_EDITOR,      label: 'Nano Editor',       icon: 'fa-wand-sparkles' },
    { id: ToolType.PROMPT_VIDEO,      label: 'Video Generator',   icon: 'fa-wand-magic-sparkles' },
    { id: ToolType.ANIMATE_IMAGE,     label: 'Photo Animator',    icon: 'fa-film' },
    { id: ToolType.IMAGE_CLONER,      label: 'AI Clone Studio',   icon: 'fa-dna' },
    { id: ToolType.GENERAL_INTEL,     label: 'AI Assistant',      icon: 'fa-brain' },
    { id: ToolType.VIDEO_ORACLE,      label: 'Video Insights',    icon: 'fa-magnifying-glass-chart' },
    { id: ToolType.IMAGE_ANALYZER,    label: 'Image Analysis',    icon: 'fa-camera-retro' },
    { id: ToolType.AUDIO_TRANSCRIBER, label: 'Speech Logic',      icon: 'fa-file-audio' },
    { id: ToolType.PRICING,           label: 'Pricing',           icon: 'fa-tag' },
  ];

  const c = credits ?? 0;
  const planMax: Record<string, number> = {
    FREE: 100, PERSONAL: 700, CREATOR: 1800, STUDIO: 5000, FLEX: 100
  };
  const maxCredits = planMax[plan] || 100;
  const creditPct = Math.min((c / maxCredits) * 100, 100);
  const creditColor = creditPct > 50 ? 'bg-blue-500' : creditPct > 20 ? 'bg-amber-500' : 'bg-red-500';
  // Low credits = below 10% of plan max OR not enough for cheapest action (1 credit)
  const lowThreshold = Math.max(Math.floor(maxCredits * 0.10), 1);
  const lowCredits = credits !== null && isLoggedIn && c <= lowThreshold;

  // Dynamic breakdown
  const breakdown = [
    { label: 'Images',  icon: 'fa-image',        val: Math.floor(c / 12), cost: 12 },
    { label: 'Videos',  icon: 'fa-film',          val: Math.floor(c / 45), cost: 45 },
    { label: 'Edits',   icon: 'fa-wand-sparkles', val: Math.floor(c / 8),  cost: 8  },
    { label: 'Chats',   icon: 'fa-brain',         val: Math.floor(c / 2),  cost: 2  },
    { label: 'Voice',   icon: 'fa-microphone',    val: Math.floor(c / 2),  cost: 2  },
  ];

  return (
    <aside className="flex flex-col w-64 glass h-full border-r border-white/5 bg-gray-950/90 shadow-2xl">

      <div className="p-6 shrink-0">
        <h2 className="text-xl font-outfit font-black tracking-tighter text-white">INTELLMADE</h2>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto internal-scroll pb-6">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
              active === item.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                : 'hover:bg-white/5 text-gray-500 hover:text-gray-200'
            }`}
          >
            <i className={`fas ${item.icon} text-sm w-5 text-center`}></i>
            <span className="font-semibold text-[10px] uppercase tracking-widest leading-tight text-left">
              {item.label}
            </span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 shrink-0 space-y-3">

        {/* Credits Card */}
        <div className={`p-3 rounded-2xl border space-y-2 transition-all ${
          lowCredits 
            ? 'bg-red-500/10 border-red-500/30' 
            : 'bg-blue-600/10 border-blue-500/20'
        }`}>

          {/* Header row — click anywhere to toggle breakdown */}
          <div
            className={`flex items-center justify-between ${isLoggedIn && credits !== null && credits > 0 ? 'cursor-pointer select-none' : ''}`}
            onClick={() => { if (isLoggedIn && credits !== null && credits > 0) setShowBreakdown(v => !v); }}
          >
            <div className="flex items-center gap-1.5">
              {lowCredits && <i className="fas fa-triangle-exclamation text-red-400 text-[9px]"></i>}
              <p className={`text-[9px] font-black uppercase tracking-widest ${lowCredits ? 'text-red-400' : 'text-blue-400'}`}>
                {lowCredits ? 'Low Credits!' : 'Credits'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-white bg-blue-600/30 px-2 py-0.5 rounded-full">
                {plan}
              </span>
              {isLoggedIn && credits !== null && credits > 0 && (
                <i className={`fas fa-chevron-${showBreakdown ? 'up' : 'down'} text-gray-500 text-[9px]`}></i>
              )}
            </div>
          </div>

          {isLoggedIn ? (
            <>
              {/* Progress bar */}
              <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`${creditColor} h-full rounded-full transition-all duration-700`}
                  style={{ width: `${creditPct}%` }}
                />
              </div>

              {/* Credit count + top up */}
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-black text-white">
                  {credits === null
                    ? <span className="text-gray-500 text-[9px]">Start backend to load</span>
                    : <>{c.toLocaleString()}<span className="text-gray-500 font-normal"> credits</span></>
                  }
                </p>
                <button
                  onClick={() => onSelect(ToolType.PRICING)}
                  className={`text-[9px] font-black uppercase tracking-widest transition-colors ${
                    lowCredits ? 'text-red-400 hover:text-red-300' : 'text-blue-400 hover:text-blue-300'
                  }`}
                >
                  Top up →
                </button>
              </div>

              {/* Breakdown — toggleable */}
              {showBreakdown && credits !== null && (
                <div className="pt-1 border-t border-white/5 space-y-1.5">
                  <p className="text-[8px] text-gray-600 font-black uppercase tracking-widest">
                    Your {c} credits can buy:
                  </p>
                  {breakdown.map(item => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <i className={`fas ${item.icon} text-[8px] text-gray-500 w-3`}></i>
                        <span className="text-[9px] text-gray-400">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] font-black text-white">
                          {item.val > 999 ? '999+' : item.val}
                        </span>
                        <span className="text-[8px] text-gray-600">×{item.cost}cr</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="text-[10px] text-gray-500">Sign in to see credits</p>
          )}
        </div>

        {/* User / Auth */}
        {isLoggedIn && user ? (
          <div className="flex items-center gap-2 px-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-black text-white uppercase">
                {(user.email ?? 'U')[0]}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] text-white font-bold truncate">{user.email}</p>
              <p className="text-[8px] text-gray-500 uppercase tracking-widest">Logged in</p>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="text-gray-600 hover:text-red-400 transition-colors text-[10px]"
            >
              <i className="fas fa-right-from-bracket"></i>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-white/10 hover:text-white transition-all"
          >
            <i className="fas fa-right-to-bracket mr-2"></i> Sign In
          </button>
        )}

      </div>
    </aside>
  );
};

export default Sidebar;