// =============================================================
// SIDEBAR — Navigation + Credits Display
// Credits come from AuthContext (already fetched via get-credits edge function)
// No separate API call needed here
// =============================================================

import React from 'react';
import { ToolType } from '../types';
import { useAuth } from './AuthContext';

interface SidebarProps {
  active: ToolType;
  onSelect: (tool: ToolType) => void;
}

const NAV_ITEMS = [
  { tool: ToolType.LANDING,           icon: 'fa-house',         label: 'HOME' },
  { tool: ToolType.VOICE_CHAT,        icon: 'fa-microphone',    label: 'LIVE VOICE STUDIO' },
  { tool: ToolType.IMAGE_GEN,         icon: 'fa-palette',       label: 'IMAGE GENERATOR' },
  { tool: ToolType.IMAGE_EDITOR,      icon: 'fa-pen-nib',       label: 'NANO EDITOR' },
  { tool: ToolType.PROMPT_VIDEO,      icon: 'fa-video',         label: 'VIDEO GENERATOR' },
  { tool: ToolType.ANIMATE_IMAGE,     icon: 'fa-film',          label: 'PHOTO ANIMATOR' },
  { tool: ToolType.IMAGE_CLONER,      icon: 'fa-clone',         label: 'AI CLONE STUDIO' },
  { tool: ToolType.GENERAL_INTEL,     icon: 'fa-brain',         label: 'AI ASSISTANT' },
  { tool: ToolType.VIDEO_ORACLE,      icon: 'fa-magnifying-glass', label: 'VIDEO INSIGHTS' },
  { tool: ToolType.IMAGE_ANALYZER,    icon: 'fa-camera',        label: 'IMAGE ANALYSIS' },
  { tool: ToolType.AUDIO_TRANSCRIBER, icon: 'fa-waveform-lines', label: 'SPEECH LOGIC' },
  { tool: ToolType.PRICING,           icon: 'fa-tag',           label: 'PRICING' },
];

const Sidebar: React.FC<SidebarProps> = ({ active, onSelect }) => {
  const { user, credits, isLoggedIn, setShowAuthModal, signOut } = useAuth();

  return (
    <div className="w-64 h-full flex flex-col bg-gray-950 border-r border-white/5 overflow-hidden">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/5 shrink-0">
        <span className="text-sm font-black tracking-[0.3em] text-white uppercase">INTELLMADE</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 internal-scroll">
        {NAV_ITEMS.map(({ tool, icon, label }) => (
          <button
            key={tool}
            onClick={() => onSelect(tool)}
            className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-all group ${
              active === tool
                ? 'bg-blue-600/15 text-white border-r-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-300 hover:bg-white/3'
            }`}
          >
            <i className={`fas ${icon} text-[11px] w-4 text-center ${active === tool ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'}`}></i>
            <span className="text-[10px] font-black tracking-widest uppercase">{label}</span>
          </button>
        ))}
      </nav>

      {/* ── Credits footer ── */}
      <div className="shrink-0 border-t border-white/5 p-4 space-y-3">
        {isLoggedIn ? (
          <>
            {/* Credit bar */}
            <div
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => onSelect(ToolType.PRICING)}
              title="Top up credits"
            >
              <div className="flex items-center gap-2">
                <i className="fas fa-bolt text-[9px] text-purple-400"></i>
                <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">CREDITS</span>
              </div>
              {/* ✅ Show actual credits from AuthContext — no extra API call */}
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                credits !== null && credits <= 20
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
              }`}>
                {credits !== null ? (
                  <>
                    <span>{credits}</span>
                    {credits <= 20 && <span className="text-red-500">!</span>}
                  </>
                ) : (
                  <span className="animate-pulse">···</span>
                )}
              </div>
            </div>

            {/* Top up button */}
            <button
              onClick={() => onSelect(ToolType.PRICING)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/3 hover:bg-white/6 border border-white/5 transition-all group"
            >
              <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest group-hover:text-gray-400">TOP UP</span>
              <i className="fas fa-arrow-right text-[9px] text-gray-700 group-hover:text-gray-400"></i>
            </button>

            {/* User email + sign out */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-full bg-blue-600/20 border border-blue-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[8px] font-black text-blue-400 uppercase">
                    {user?.email?.[0] ?? '?'}
                  </span>
                </div>
                <span className="text-[9px] text-gray-600 truncate">{user?.email}</span>
              </div>
              <button
                onClick={signOut}
                title="Sign out"
                className="text-gray-700 hover:text-gray-400 transition-colors ml-2 shrink-0"
              >
                <i className="fas fa-arrow-right-from-bracket text-[10px]"></i>
              </button>
            </div>
          </>
        ) : (
          /* Guest state — prompt sign in */
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full flex flex-col gap-1.5 px-3 py-3 rounded-xl bg-purple-500/5 border border-purple-500/15 hover:bg-purple-500/10 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">CREDITS</span>
              <span className="text-[9px] font-black text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">FREE</span>
            </div>
            {/* ✅ Show "Sign in to get 100 free" instead of "Start backend to load" */}
            <span className="text-[8px] text-purple-400/70 font-bold uppercase tracking-widest">
              Sign in → get 100 free credits
            </span>
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;