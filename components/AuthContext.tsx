// =============================================================
// AUTH CONTEXT — Manages login state across the entire app
// =============================================================
// This file does 3 things:
//   1. Tracks if the user is logged in or not
//   2. Provides a function to show/hide the login popup
//   3. Stores the user's session token in localStorage
//
// HOW TO USE IN ANY COMPONENT:
//   import { useAuth } from './AuthContext';
//   const { user, session, showAuthModal, isLoggedIn, credits } = useAuth();
// =============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

// What the auth context provides to all components
interface AuthContextType {
  user: User | null;              // The logged-in user (or null if not logged in)
  session: Session | null;        // The session with access token
  credits: number | null;         // The user's current credit balance
  isLoggedIn: boolean;            // Simple true/false check
  isLoading: boolean;             // True while checking if user is logged in
  showAuthModal: boolean;         // Whether the login popup is visible
  setShowAuthModal: (show: boolean) => void;  // Show/hide the login popup
  pendingAction: string | null;   // What the user was trying to do before login
  setPendingAction: (action: string | null) => void;
  signOut: () => Promise<void>;   // Log out
  requireAuth: (action?: string) => boolean; // Check auth, show modal if not logged in
  refreshCredits: () => Promise<void>; // Manually re-fetch credits (call after purchase)
}

// Create the context (this is like a global container for auth data)
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The provider component — wrap your entire app with this
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null); // ✅ credits state

  // ── Fetch (or create) credits for a given email ──────────────────────────
  const fetchCredits = useCallback(async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('email', email)
        .single();

      if (error || !data) {
        // New user — grant 100 free credits
        await supabase
          .from('user_credits')
          .insert({ email, credits: 100 });
        setCredits(100);
      } else {
        setCredits(data.credits);
      }
    } catch (err) {
      console.error('Error fetching credits:', err);
      setCredits(0);
    }
  }, []);

  // Expose a manual refresh so Pricing can call it after a purchase
  const refreshCredits = useCallback(async () => {
    if (user?.email) {
      await fetchCredits(user.email);
    }
  }, [user, fetchCredits]);

  useEffect(() => {
    // Check if user is already logged in when the app loads
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          localStorage.setItem('access_token', currentSession.access_token);
          // ✅ Fetch credits on load
          if (currentSession.user?.email) {
            await fetchCredits(currentSession.user.email);
          }
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // Listen for login/logout events (this fires when magic link is clicked)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession) {
          setSession(newSession);
          setUser(newSession.user);
          localStorage.setItem('access_token', newSession.access_token);
          setShowAuthModal(false); // Close the login popup
          // ✅ Fetch credits on sign-in
          if (newSession.user?.email) {
            await fetchCredits(newSession.user.email);
          }
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setCredits(null); // ✅ Clear credits on sign-out
          localStorage.removeItem('access_token');
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession);
          localStorage.setItem('access_token', newSession.access_token);
        }
      }
    );

    // Cleanup when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchCredits]);

  // Log out
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setCredits(null); // ✅ Clear credits on sign-out
    localStorage.removeItem('access_token');
  };

  // Check if user is logged in — if not, show the login popup
  // Returns true if logged in, false if not (and shows modal)
  const requireAuth = useCallback((action?: string): boolean => {
    if (session && user) {
      return true; // User is logged in, proceed
    }
    // User is NOT logged in — show the popup
    if (action) setPendingAction(action);
    setShowAuthModal(true);
    return false;
  }, [session, user]);

  const value: AuthContextType = {
    user,
    session,
    credits,          // ✅ exposed
    isLoggedIn: !!session && !!user,
    isLoading,
    showAuthModal,
    setShowAuthModal,
    pendingAction,
    setPendingAction,
    signOut,
    requireAuth,
    refreshCredits,   // ✅ exposed
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth in any component
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
};

export default AuthContext;