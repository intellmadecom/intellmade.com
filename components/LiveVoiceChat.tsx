
import { GoogleGenAI, Modality } from '@google/genai';
import React, { useState, useRef, useEffect } from 'react';

const LiveVoiceChat: React.FC = () => {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState('Standby');
  const [transcriptions, setTranscriptions] = useState<{ role: string, text: string }[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
    return buffer;
  };

  const startSession = async () => {
    try {
      setStatus('Connecting...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const gainNode = outputCtx.createGain();
      gainNode.connect(outputCtx.destination);
      audioContextRef.current = outputCtx;
      gainNodeRef.current = gainNode;
      
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setStatus('Active');
            setActive(true);
            const source = inputCtx.createMediaStreamSource(stream);
            const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const int16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
              // CRITICAL: Solely rely on sessionPromise resolves and then call `session.sendRealtimeInput`, **do not** add other condition checks.
              sessionPromise.then(s => { 
                s.sendRealtimeInput({ media: { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' } }); 
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputCtx.destination);
          },
          onmessage: async (message: any) => {
            if (message.serverContent?.outputTranscription) setTranscriptions(prev => [...prev, { role: 'model', text: message.serverContent.outputTranscription.text }]);
            if (message.serverContent?.inputTranscription) setTranscriptions(prev => [...prev, { role: 'user', text: message.serverContent.inputTranscription.text }]);

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
              const buffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
              const source = outputCtx.createBufferSource();
              source.buffer = buffer;
              source.connect(gainNodeRef.current!);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => { sourcesRef.current.delete(source); if (sourcesRef.current.size === 0) setIsSpeaking(false); };
            }
          },
          onclose: () => { setActive(false); setStatus('Standby'); },
          onerror: () => setStatus('Error')
        },
        config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } }, inputAudioTranscription: {}, outputAudioTranscription: {} }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { setStatus('Failed'); }
  };

  const stopSession = () => { sessionRef.current?.close(); setActive(false); setStatus('Standby'); };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 gap-8 overflow-hidden">
      <div className="relative">
        <div className={`w-48 h-48 rounded-full border-4 border-blue-500/20 flex items-center justify-center transition-all ${active ? 'scale-105' : 'scale-100'}`}>
          <div className={`w-40 h-40 rounded-full flex items-center justify-center shadow-2xl transition-all ${active ? 'bg-blue-600 shadow-blue-500/50' : 'bg-gray-800'}`}>
            <i className={`fas ${active ? 'fa-microphone' : 'fa-microphone-slash'} text-5xl text-white`}></i>
          </div>
        </div>
        {active && <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-20"></div>}
      </div>

      <div className="text-center">
        <div className={`px-4 py-1.5 rounded-full glass border-blue-500/30 font-black text-xs uppercase tracking-widest ${active ? 'text-blue-400' : 'text-gray-500'}`}>{status}</div>
      </div>

      <button onClick={active ? stopSession : startSession} className={`px-10 py-4 rounded-2xl font-black text-sm uppercase transition-all shadow-xl flex items-center gap-3 ${active ? 'bg-red-600/20 text-red-500 border border-red-500/30' : 'bg-blue-600 text-white'}`}>
        <i className={`fas ${active ? 'fa-power-off' : 'fa-play'}`}></i>
        <span>{active ? 'Terminate' : 'Start Session'}</span>
      </button>

      {transcriptions.length > 0 && (
        <div className="w-full max-w-xl flex-1 overflow-y-auto internal-scroll glass rounded-[2rem] p-4 space-y-3">
          {transcriptions.slice(-10).map((t, i) => (
            <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] text-[11px] py-1.5 px-4 rounded-xl ${t.role === 'user' ? 'bg-blue-600/20 text-blue-300' : 'bg-white/5 text-gray-400'}`}>
                <span className="font-black opacity-30 mr-2">{t.role === 'user' ? 'YOU' : 'AI'}</span> {t.text}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveVoiceChat;
