import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext'; // ✅ Correct relative path

const AuthModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  if (!showAuthModal) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        emailRedirectTo: window.location.href, // ✅ Critical for magic link
      },
    });

    if (error) {
      setStatus('error');
    } else {
      setStatus('sent');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}>
      <div className="bg-[#0a0a0f] p-8 rounded-[2rem] border border-white/10 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-black text-white mb-2 text-center">Sign In</h2>
        <p className="text-gray-400 text-center mb-6 text-sm">Get 100 free credits instantly</p>
        
        {status === 'sent' ? (
          <div className="text-center text-green-400 font-bold p-4 bg-green-500/10 rounded-xl">
            Check your email for the magic link!
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full p-4 bg-white/5 border border-white/10 rounded-xl text-white outline-none focus:border-indigo-500"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button className="w-full py-4 bg-indigo-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-indigo-500">
              {status === 'sending' ? 'Sending...' : 'Get Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AuthModal;