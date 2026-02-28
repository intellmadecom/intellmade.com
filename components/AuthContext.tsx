import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext<any>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  const fetchCredits = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase.from('profiles').select('credits_remaining').eq('id', userId).single();
      setCredits(data?.credits_remaining ?? 100);
    } catch { setCredits(100); }
  }, []);

  const refreshCredits = useCallback(async () => {
    if (user) await fetchCredits(user.id);
  }, [user, fetchCredits]);

  const promptFreeCredits = useCallback(() => {
    setPendingAction('free_credits');
    setShowAuthModal(true);
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s) { setSession(s); setUser(s.user); localStorage.setItem('access_token', s.access_token); await fetchCredits(s.user.id); }
      } finally { setIsLoading(false); }
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_IN' && s) {
        setSession(s); setUser(s.user); localStorage.setItem('access_token', s.access_token); setShowAuthModal(false);
        await fetchCredits(s.user.id);
        const ret = localStorage.getItem('auth_return_url');
        if (ret) { localStorage.removeItem('auth_return_url'); if (ret !== window.location.href) window.location.href = ret; }
      } else if (event === 'SIGNED_OUT') {
        setSession(null); setUser(null); setCredits(null); localStorage.removeItem('access_token');
      } else if (event === 'TOKEN_REFRESHED' && s) {
        setSession(s); localStorage.setItem('access_token', s.access_token); await fetchCredits(s.user.id);
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchCredits]);

  const signOut = async () => { await supabase.auth.signOut(); setSession(null); setUser(null); setCredits(null); localStorage.removeItem('access_token'); };
  const requireAuth = useCallback((action?: string): boolean => { if (session && user) return true; if (action) setPendingAction(action); setShowAuthModal(true); return false; }, [session, user]);

  return <AuthContext.Provider value={{ user, session, credits, isLoggedIn: !!session && !!user, isLoading, showAuthModal, setShowAuthModal, pendingAction, setPendingAction, signOut, requireAuth, refreshCredits, promptFreeCredits }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be inside AuthProvider'); return ctx; };
export default AuthContext;