// =============================================================
// AUTH CONTEXT — Manages login state across the entire app
// =============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  credits: number | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  pendingAction: string | null;
  setPendingAction: (action: string | null) => void;
  signOut: () => Promise<void>;
  requireAuth: (action?: string) => boolean;
  refreshCredits: () => Promise<void>;
  promptFreeCredits: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  // ── Load credits directly from Supabase profiles table ──
  const fetchCredits = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching credits:', error.message);
        setCredits(100); // fallback to 100 free credits
        return;
      }

      setCredits(data?.credits_remaining ?? 100);
    } catch (err) {
      console.error('Error fetching credits:', err);
      setCredits(100);
    }
  }, []);

  const refreshCredits = useCallback(async () => {
    if (user) await fetchCredits(user.id);
  }, [user, fetchCredits]);

  const promptFreeCredits = useCallback(() => {
    setPendingAction('free_credits');
    setShowAuthModal(true);
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          localStorage.setItem('access_token', currentSession.access_token);
          await fetchCredits(currentSession.user.id);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
       if (event === 'SIGNED_IN' && newSession) {
  setSession(newSession);
  setUser(newSession.user);
  localStorage.setItem('access_token', newSession.access_token);
  setShowAuthModal(false);
  await fetchCredits(newSession.user.id);
  const returnUrl = localStorage.getItem('auth_return_url');
  if (returnUrl) {
    localStorage.removeItem('auth_return_url');
    if (returnUrl !== window.location.href) {
      window.location.href = returnUrl;
    }
  }

        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setCredits(null);
          localStorage.removeItem('access_token');
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession);
          localStorage.setItem('access_token', newSession.access_token);
          await fetchCredits(newSession.user.id);
        }
      }
    );

    return () => { subscription.unsubscribe(); };
  }, [fetchCredits]);

  // ── Listen for credits-updated events from payment/deduction ──
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (typeof e.detail?.credits === 'number') {
        setCredits(e.detail.credits);
      } else if (user) {
        fetchCredits(user.id);
      }
    };
    window.addEventListener('credits-updated', handler as EventListener);
    return () => window.removeEventListener('credits-updated', handler as EventListener);
  }, [user, fetchCredits]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setCredits(null);
    localStorage.removeItem('access_token');
  };

  const requireAuth = useCallback((action?: string): boolean => {
    if (session && user) return true;
    if (action) setPendingAction(action);
    setShowAuthModal(true);
    return false;
  }, [session, user]);

  const value: AuthContextType = {
    user,
    session,
    credits,
    isLoggedIn: !!session && !!user,
    isLoading,
    showAuthModal,
    setShowAuthModal,
    pendingAction,
    setPendingAction,
    signOut,
    requireAuth,
    refreshCredits,
    promptFreeCredits,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
};

export default AuthContext;