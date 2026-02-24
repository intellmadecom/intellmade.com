// =============================================================
// AUTH MODAL — Magic Link Login Popup
// =============================================================
// This is the popup that appears when a user needs to sign in.
// Flow:
//   1. User enters their email
//   2. We send them a magic link via Supabase
//   3. They click the link in their inbox
//   4. They're automatically logged in with 100 free credits
//
// No passwords, no Google sign-in, just email.
// =============================================================

import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

const AuthModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Don't render if modal is not visible
  if (!showAuthModal) return null;

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic email check
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      setStatus('error');
      return;
    }

    try {
      setStatus('sending');
      setErrorMessage('');

      // Send the magic link via Supabase
      // redirectTo tells Supabase where to send the user after they click the link
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          // This URL is where users land after clicking the magic link
          // In development: http://localhost:5173
          // In production: your actual website URL
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        console.error('Magic link error:', error);
        setErrorMessage(error.message || 'Failed to send magic link. Please try again.');
        setStatus('error');
        return;
      }

      // Success — magic link sent
      setStatus('sent');
    } catch (err) {
      console.error('Unexpected error:', err);
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
    // Dark overlay behind the popup
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleClose}
    >
      {/* The popup card — clicking inside it does NOT close the modal */}
      <div 
        className="relative w-full max-w-md mx-4 p-8 rounded-[2rem] border border-white/10 bg-[#0a0a0f]/95 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors text-lg cursor-pointer"
        >
          <i className="fas fa-times"></i>
        </button>

        {/* ===== STEP 1: Enter email ===== */}
        {status === 'idle' || status === 'error' || status === 'sending' ? (
          <>
            {/* Logo/Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 mb-4">
                <i className="fas fa-bolt text-2xl text-blue-400"></i>
              </div>
              <h2 className="text-2xl font-outfit font-extrabold text-white">Welcome to INTELLMADE</h2>
              <p className="text-gray-400 text-sm mt-2">Enter your email to get started with <span className="text-blue-400 font-bold">100 free credits</span></p>
            </div>

            {/* Email form */}
            <div className="space-y-4">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder="your@email.com"
                  className="w-full px-5 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  autoFocus
                  disabled={status === 'sending'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMagicLink(e);
                  }}
                />
              </div>

              {/* Error message */}
              {status === 'error' && errorMessage && (
                <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Send button */}
              <button
                onClick={handleSendMagicLink}
                disabled={status === 'sending' || !email}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer ${
                  status === 'sending'
                    ? 'bg-blue-500/30 text-blue-300 cursor-wait'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:brightness-110 active:scale-[0.98] shadow-lg shadow-blue-900/30'
                } ${!email ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {status === 'sending' ? (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-spinner fa-spin"></i>
                    Sending Magic Link...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <i className="fas fa-paper-plane"></i>
                    Send Magic Link
                  </span>
                )}
              </button>
            </div>

            {/* Footer note */}
            <p className="text-center text-gray-600 text-[10px] mt-6 uppercase tracking-widest">
              No password needed. We'll send a secure link to your inbox.
            </p>
          </>
        ) : null}

        {/* ===== STEP 2: Magic link sent — check inbox ===== */}
        {status === 'sent' ? (
          <div className="text-center py-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
              <i className="fas fa-envelope-open text-3xl text-green-400"></i>
            </div>
            <h2 className="text-2xl font-outfit font-extrabold text-white mb-3">Check Your Inbox</h2>
            <p className="text-gray-400 text-sm mb-2">
              We sent a magic link to:
            </p>
            <p className="text-blue-400 font-bold text-sm mb-6">{email}</p>
            <p className="text-gray-500 text-xs mb-8">
              Click the link in the email to sign in. It expires in 1 hour.
            </p>

            {/* Resend / Try different email */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setStatus('idle');
                }}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold uppercase tracking-widest transition-all border border-white/10 cursor-pointer"
              >
                Use Different Email
              </button>
              <button
                onClick={handleSendMagicLink}
                className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 text-xs font-bold uppercase tracking-widest transition-all border border-white/5 cursor-pointer"
              >
                Resend Link
              </button>
            </div>

            <p className="text-gray-600 text-[10px] mt-6 uppercase tracking-widest">
              Don't see it? Check your spam folder.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AuthModal;