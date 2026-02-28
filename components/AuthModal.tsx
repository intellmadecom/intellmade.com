import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

const AuthModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!showAuthModal) return null;

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      setStatus('error');
      return;
    }

    try {
      setStatus('sending');
      setErrorMessage('');

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          // ✅ FIX: Redirect to current URL to stay in the same session/tab
          emailRedirectTo: window.location.href,
        },
      });

      if (error) {
        setErrorMessage(error.message || 'Failed to send magic link.');
        setStatus('error');
        return;
      }

      setStatus('sent');
    } catch (err) {
      setErrorMessage('Something went wrong. Please try again.');
      setStatus('error');
    }
  };

  const handleClose = () => {
    setShowAuthModal(false);
    setEmail('');
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={handleClose}>
      <div className="relative w-full max-w-md mx-4 p-8 rounded-[2rem] border border-white/10 bg-[#0a0a0f]/95 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer">
          <i className="fas fa-times"></i>
        </button>

        {status !== 'sent' ? (
          <>
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 mb-4">
                <i className="fas fa-bolt text-2xl text-blue-400"></i>
              </div>
              <h2 className="text-2xl font-outfit font-extrabold text-white">Welcome to INTELLMADE</h2>
              <p className="text-gray-400 text-sm mt-2">Enter your email for <span className="text-blue-400 font-bold">100 free credits</span></p>
            </div>

            <div className="space-y-4">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (status === 'error') setStatus('idle'); }}
                placeholder="your@email.com"
                className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/50"
                autoFocus
                disabled={status === 'sending'}
              />
              {status === 'error' && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">{errorMessage}</div>}
              <button
                onClick={handleSendMagicLink}
                disabled={status === 'sending' || !email}
                className="w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:brightness-110 active:scale-[0.98]"
              >
                {status === 'sending' ? 'Sending Magic Link...' : 'Send Magic Link'}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
              <i className="fas fa-envelope-open text-3xl text-green-400"></i>
            </div>
            <h2 className="text-2xl font-outfit font-extrabold text-white mb-3">Check Your Inbox</h2>
            <p className="text-blue-400 font-bold text-sm mb-6">{email}</p>
            <button onClick={() => setStatus('idle')} className="w-full py-3 rounded-xl bg-white/5 text-white text-xs font-bold uppercase tracking-widest border border-white/10">Use Different Email</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthModal;