import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GeminiService } from '../services/gemini';
import { ChatMessage } from '../types';
import { downloadText, fileToBase64 } from '../utils/helpers';

const GeneralIntelligence: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [usePro, setUsePro] = useState(true);
  const [useSearch, setUseSearch] = useState(false);
  const [attachment, setAttachment] = useState<{ file: File, preview: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Auto-expand textarea as user types
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [input]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment({ file, preview: URL.createObjectURL(file) });
    }
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleScreenshot = async () => {
    try {
      // @ts-ignore
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      await new Promise(resolve => video.onloadedmetadata = resolve);
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'screenshot.png', { type: 'image/png' });
          setAttachment({ file, preview: URL.createObjectURL(file) });
        }
        stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      }, 'image/png');
    } catch (err) {
      console.error('Screenshot failed:', err);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && !attachment) || loading) return;

    let attachedData: { data: string; mimeType: string; preview: string } | undefined;
    if (attachment) {
      const base64 = await fileToBase64(attachment.file);
      attachedData = { data: base64, mimeType: attachment.file.type, preview: attachment.preview };
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
      attachment: attachedData,
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setAttachment(null);
    setLoading(true);

    // Reset textarea height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const response = await GeminiService.chat([...messages, userMsg], usePro, useSearch);
      setMessages(prev => [...prev, {
        role: 'model',
        content: response.text,
        timestamp: Date.now(),
        groundingSources: response.sources,
      }]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter, new line on Shift+Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-3 shrink-0 glass border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full animate-pulse ${usePro ? 'bg-blue-500' : 'bg-emerald-500'}`}></div>
          <h2 className="text-sm font-black uppercase tracking-widest">
            {useSearch ? 'Search Mode' : usePro ? 'Pro Reasoning' : 'Flash Mode'}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setUseSearch(v => !v)}
            className={`px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase transition-all ${
              useSearch ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-900 border-gray-800 text-gray-500'
            }`}
          >
            <i className="fas fa-magnifying-glass mr-1"></i>Search
          </button>
          <div className="flex bg-gray-900 p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => { setUsePro(true); setUseSearch(false); }}
              className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${usePro && !useSearch ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
            >PRO</button>
            <button
              onClick={() => setUsePro(false)}
              className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${!usePro ? 'bg-emerald-600 text-white' : 'text-gray-500'}`}
            >FLASH</button>
          </div>
        </div>
      </div>

      {/* ── Message area ── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto internal-scroll px-6 py-6 space-y-5">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-10 select-none">
            <i className="fas fa-brain text-7xl mb-4"></i>
            <p className="text-lg font-bold tracking-widest uppercase">Inference Engine Ready</p>
            <p className="text-xs mt-2 opacity-60">Shift+Enter for new line · Enter to send</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-5 py-3 rounded-[1.5rem] text-sm leading-relaxed ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-white/5 border border-white/10 text-gray-200'
            }`}>
              {/* Attachment preview */}
              {msg.attachment && (
                <div className="mb-3 rounded-xl overflow-hidden border border-white/10">
                  {msg.attachment.mimeType.startsWith('image/') ? (
                    <img
                      src={msg.attachment.preview || `data:${msg.attachment.mimeType};base64,${msg.attachment.data}`}
                      alt="attachment"
                      className="max-h-56 w-auto object-contain"
                    />
                  ) : (
                    <div className="p-3 bg-white/5 flex items-center gap-2">
                      <i className="fas fa-file text-blue-400"></i>
                      <span className="text-[10px] uppercase font-bold tracking-widest">{msg.attachment.mimeType}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {/* Grounding sources */}
              {msg.groundingSources && msg.groundingSources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap gap-1">
                  {msg.groundingSources.map((src, sIdx) => (
                    <a
                      key={sIdx}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] bg-white/5 px-2 py-0.5 rounded text-blue-400 border border-white/5 hover:bg-white/10 transition-colors"
                    >{src.title}</a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 px-5 py-3 rounded-[1.5rem] flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-75"></div>
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-150"></div>
            </div>
          </div>
        )}
      </div>

      {/* ── Input area — pinned to bottom, auto-expands upward ── */}
      <div className="shrink-0 glass border-t border-white/5 px-4 py-3">
        <div className="max-w-5xl mx-auto space-y-2">

          {/* Attachment preview strip */}
          {attachment && (
            <div className="flex items-center gap-3 px-3 py-2 bg-white/5 rounded-2xl border border-white/10 animate-fadeIn">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/10 shrink-0">
                {attachment.file.type.startsWith('image/') ? (
                  <img src={attachment.preview} className="w-full h-full object-cover" alt="preview" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800">
                    <i className="fas fa-file text-xs text-gray-400"></i>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold truncate text-gray-300">{attachment.file.name}</p>
                <p className="text-[8px] text-gray-500 uppercase tracking-widest">{(attachment.file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button
                type="button"
                onClick={() => setAttachment(null)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-gray-500 hover:text-red-400 transition-colors flex items-center justify-center"
              >
                <i className="fas fa-times text-xs"></i>
              </button>
            </div>
          )}

          {/* Textarea row */}
          <div className="relative flex items-end gap-2 bg-gray-900 border border-white/5 rounded-2xl px-3 py-2 focus-within:border-blue-500/50 transition-colors">
            {/* Left action buttons */}
            <div className="flex items-center gap-1 shrink-0 pb-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-blue-400 hover:bg-white/5 transition-all"
                title="Attach file"
              >
                <i className="fas fa-paperclip text-sm"></i>
              </button>
              <button
                type="button"
                onClick={handleScreenshot}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-emerald-400 hover:bg-white/5 transition-all"
                title="Capture screenshot"
              >
                <i className="fas fa-camera text-sm"></i>
              </button>
            </div>

            {/* Auto-expanding textarea */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={e => {
                const item = e.clipboardData.items[0];
                if (item?.type.startsWith('image/')) {
                  const file = item.getAsFile();
                  if (file) setAttachment({ file, preview: URL.createObjectURL(file) });
                }
              }}
              placeholder="Prompt assistant…  (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 bg-transparent text-sm resize-none focus:outline-none text-gray-100 placeholder-gray-600 leading-relaxed py-2 overflow-y-auto"
              style={{ maxHeight: '180px', minHeight: '40px' }}
            />

            {/* Send button */}
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={(!input.trim() && !attachment) || loading}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-blue-500 hover:bg-blue-500/10 transition-colors disabled:opacity-30 shrink-0 pb-1"
            >
              <i className="fas fa-paper-plane text-sm"></i>
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,video/*,audio/*,.pdf,.txt,.csv"
          />
        </div>
      </div>
    </div>
  );
};

export default GeneralIntelligence;