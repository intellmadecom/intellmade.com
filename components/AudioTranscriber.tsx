
import React, { useState, useRef } from 'react';
import { GeminiService } from '../services/gemini';
import { fileToBase64, downloadText } from '../utils/helpers';

const AudioTranscriber: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [status, setStatus] = useState('Ready to transcribe');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleTranscribe(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('Recording...');
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setStatus('Microphone access denied');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setStatus('Processing audio...');
    }
  };

  const cancelProcess = () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      }
      setIsRecording(false);
    }
    setLoading(false);
    setStatus('Ready to transcribe');
  };

  const handleTranscribe = async (blob: Blob) => {
    setLoading(true);
    setTranscription(null);
    try {
      const base64 = await fileToBase64(blob);
      const result = await GeminiService.transcribeAudio(base64, 'audio/webm');
      setTranscription(result);
      setStatus('Transcription complete');
    } catch (error) {
      console.error(error);
      setStatus('Transcription failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn pt-2">
      <div className="mb-10 text-center">
        <h2 className="text-4xl font-outfit font-bold mb-2">Speech Logic</h2>
        <p className="text-gray-400">Accurate audio transcription powered by IntellMade Flash Intelligence.</p>
      </div>

      <div className="flex flex-col items-center justify-center space-y-12">
        <div className="flex flex-col items-center gap-8">
            <div className="relative group">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={loading}
                className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                  isRecording 
                  ? 'bg-indigo-600 animate-pulse scale-110 shadow-indigo-500/50' 
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className={`fas ${isRecording ? 'fa-microphone' : 'fa-microphone'} text-4xl text-white`}></i>
              </button>
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-ping"></div>
              )}
            </div>

            <div className="flex gap-4">
              {isRecording ? (
                <button
                  onClick={stopRecording}
                  className="px-8 py-3 bg-red-600 text-white rounded-xl font-black text-lg shadow-xl shadow-red-900/40 hover:scale-105 transition-all flex items-center gap-3"
                >
                  <i className="fas fa-stop"></i>
                  <span>STOP RECORDING</span>
                </button>
              ) : (
                <button
                  onClick={startRecording}
                  disabled={loading}
                  className={`px-8 py-3 rounded-xl font-black text-lg transition-all shadow-xl flex items-center gap-3 ${
                    loading ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 text-white hover:scale-105 shadow-indigo-900/40'
                  }`}
                >
                  <i className="fas fa-play"></i>
                  <span>{loading ? 'Transcribing...' : 'START RECORDING'}</span>
                </button>
              )}

              {(isRecording || loading) && (
                <button
                  onClick={cancelProcess}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-gray-400 rounded-xl font-bold hover:bg-white/10 transition-all flex items-center gap-2"
                >
                  <i className="fas fa-xmark"></i>
                  <span>CANCEL</span>
                </button>
              )}
            </div>
        </div>

        <div className="text-center">
          <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${
            isRecording ? 'bg-indigo-500/10 text-indigo-500' : 'bg-indigo-500/10 text-indigo-400'
          }`}>
            {status}
          </span>
        </div>

        <div className="w-full glass rounded-[2.5rem] p-8 min-h-[300px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold flex items-center">
              <i className="fas fa-quote-left text-indigo-500 mr-3"></i> Transcript
            </h3>
            {transcription && (
              <button 
                onClick={() => downloadText(transcription, 'transcript.txt')}
                className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition-all"
              >
                <i className="fas fa-download mr-2"></i> Download Text
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {transcription ? (
              <div className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                {transcription}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30">
                {loading ? (
                  <div className="flex flex-col items-center space-y-6">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    </div>
                    <button
                      onClick={cancelProcess}
                      className="px-4 py-1.5 rounded-lg border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/5 transition-all"
                    >
                      Interrupt Processing
                    </button>
                  </div>
                ) : (
                  <>
                    <i className="fas fa-align-left text-5xl mb-4"></i>
                    <p>Recording results will appear here</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioTranscriber;
