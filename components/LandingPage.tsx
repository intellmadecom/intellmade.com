import React from 'react';
import { ToolType } from '../types';
import Pricing from './Pricing';

interface LandingPageProps {
  onSelect: (tool: ToolType) => void;
  onToggleSidebar?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onSelect, onToggleSidebar }) => {
  const tools = [
    {
      id: ToolType.IMAGE_GEN,
      title: 'Vision Studio',
      desc: 'Pro-grade 4K image generation with multi-subject replication logic.',
      icon: 'fa-palette',
      color: 'from-pink-500 to-rose-500',
      tag: 'Pro Visuals'
    },
    {
      id: ToolType.IMAGE_EDITOR,
      title: 'Nano Editor',
      desc: 'Flash-powered image editing. Add filters, remove objects, and transform scenes with text.',
      icon: 'fa-wand-sparkles',
      color: 'from-emerald-500 to-teal-500',
      tag: 'Flash Image'
    },
    {
      id: ToolType.PROMPT_VIDEO,
      title: 'Cinema Engine',
      desc: 'High-fidelity cinematic video generation from simple text descriptions.',
      icon: 'fa-wand-magic-sparkles',
      color: 'from-purple-500 to-indigo-500',
      tag: 'Veo 3.1'
    },
    {
      id: ToolType.VOICE_CHAT,
      title: 'Live Voice',
      desc: 'Real-time, low-latency audio conversations with human-like reasoning.',
      icon: 'fa-microphone-lines',
      color: 'from-blue-400 to-indigo-500',
      tag: 'Native Audio'
    },
    {
      id: ToolType.ANIMATE_IMAGE,
      title: 'Motion Studio',
      desc: 'Breathe life into static photos with temporal motion synthesis.',
      icon: 'fa-film',
      color: 'from-blue-600 to-cyan-400',
      tag: 'Animation'
    },
    {
      id: ToolType.GENERAL_INTEL,
      title: 'Neural Chat',
      desc: 'Advanced reasoning grounded with real-time Google Search results.',
      icon: 'fa-brain',
      color: 'from-blue-500 to-cyan-500',
      tag: 'Inference'
    }
  ];

  return (
    <div className="relative min-h-screen animate-fadeIn pb-20">
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-purple-600/5 blur-[120px] pointer-events-none"></div>

      {/* Hero: Why IntellMade? */}
      <div className="relative z-10 mb-20 pt-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8">
          The Creative Command Center
        </div>
        <h1 className="text-6xl md:text-9xl font-outfit font-extrabold mb-10 tracking-tight leading-[0.9]">
          One App. <br />
          <span className="gradient-text">Infinite Power.</span>
        </h1>
        
        <div className="max-w-4xl space-y-8 mb-16">
          <p className="text-2xl text-gray-300 leading-relaxed font-light">
            Stop switching between dozen subscriptions. <span className="text-white font-bold">IntellMade</span> unifies the world's most advanced AI models into a single high-performance workspace.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                <i className="fas fa-bolt-lightning text-yellow-400"></i>
              </div>
              <div>
                <h4 className="font-black uppercase tracking-widest text-xs mb-1">Unmatched Speed</h4>
                <p className="text-gray-500 text-sm">Flash-lite engines for near-instant generation and real-time voice latency.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                <i className="fas fa-layer-group text-blue-400"></i>
              </div>
              <div>
                <h4 className="font-black uppercase tracking-widest text-xs mb-1">Seamless Workflow</h4>
                <p className="text-gray-500 text-sm">Move assets between tools—generate a character, then edit it instantly.</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => onSelect(ToolType.IMAGE_GEN)}
            className="px-10 py-5 bg-white text-black font-black text-sm uppercase tracking-widest rounded-2xl hover:scale-[1.05] transition-all shadow-2xl shadow-white/5"
          >
            Get Started
          </button>
          <button 
            onClick={() => {
              const el = document.getElementById('pricing');
              el?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-10 py-5 glass text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
          >
            See Plans
          </button>
        </div>
      </div>

      {/* Main Tool Grid */}
      <div className="relative z-10 mb-32">
        <div className="flex items-center gap-4 mb-12">
          <h2 className="text-4xl font-outfit font-black">Studios</h2>
          <div className="h-px flex-1 bg-white/5"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => onSelect(tool.id)}
              className="group relative glass p-10 rounded-[3rem] text-left transition-all duration-500 hover:-translate-y-2 hover:border-white/20 hover:shadow-2xl flex flex-col h-full border-white/5"
            >
              <div className={`w-16 h-16 bg-gradient-to-br ${tool.color} rounded-3xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform duration-500`}>
                <i className={`fas ${tool.icon} text-white text-2xl`}></i>
              </div>
              
              <div className="mb-4">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2 block">{tool.tag}</span>
                <h3 className="text-3xl font-black group-hover:text-white transition-colors tracking-tight">{tool.title}</h3>
              </div>
              
              <p className="text-gray-400 text-sm mb-10 leading-relaxed flex-grow">
                {tool.desc}
              </p>
              
              <div className="flex items-center text-[10px] font-black text-indigo-400 group-hover:translate-x-3 transition-transform uppercase tracking-[0.2em]">
                Enter Studio <i className="fas fa-arrow-right ml-4"></i>
              </div>

              <div className={`absolute inset-0 bg-gradient-to-br ${tool.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500 rounded-[3rem]`}></div>
            </button>
          ))}
        </div>
      </div>

      <div id="pricing" className="space-y-32">
        <Pricing />
        
        <div className="glass rounded-[4rem] p-12 lg:p-24 overflow-hidden border-white/5 shadow-inner text-center bg-indigo-600/5">
          <div className="max-w-4xl mx-auto space-y-10">
            <h2 className="text-5xl md:text-7xl font-outfit font-extrabold tracking-tighter">Ready to lead the AI revolution?</h2>
            <p className="text-gray-400 text-xl max-w-2xl mx-auto leading-relaxed">
              Join thousands of creators, engineers, and designers building the future on IntellMade.
            </p>
            <button 
              onClick={() => onSelect(ToolType.IMAGE_GEN)}
              className="px-14 py-6 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl font-black uppercase tracking-[0.2em] text-sm hover:scale-105 transition-all shadow-2xl shadow-indigo-900/40"
            >
              Start Creating Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;