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
      const { data, error } = await supabase
        .from('profiles')
        .select('credits_remaining')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setCredits(data?.credits_remaining ?? 100);
    } catch (err) {
      console.error("Error fetching credits:", err);
      setCredits(100); // Fallback to default
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
    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s) {
          setSession(s);
          setUser(s.user);
          localStorage.setItem('access_token', s.access_token);
          await fetchCredits(s.user.id);
        }
      } catch (err) {
        console.error("Session init error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && s) {
        setSession(s);
        setUser(s.user);
        localStorage.setItem('access_token', s.access_token);
        setShowAuthModal(false);
        await fetchCredits(s.user.id);

        // ✅ FIX: This ensures the app doesn't refresh or open new tabs unnecessarily
        // We only redirect if we are NOT on the page the magic link was meant for.
        const returnUrl = localStorage.getItem('auth_return_url');
        if (returnUrl && returnUrl !== window.location.href) {
          localStorage.removeItem('auth_return_url');
          window.location.href = returnUrl;
        }
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setCredits(null);
        localStorage.removeItem('access_token');
        localStorage.removeItem('auth_return_url');
      } else if (event === 'TOKEN_REFRESHED' && s) {
        setSession(s);
        localStorage.setItem('access_token', s.access_token);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchCredits]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setCredits(null);
    localStorage.removeItem('access_token');
  };

  const requireAuth = useCallback((action?: string): boolean => {
    if (session && user) return true;
    if (action) {
      setPendingAction(action);
      // Save current URL so magic link knows where to come back to
      localStorage.setItem('auth_return_url', window.location.href);
    }
    setShowAuthModal(true);
    return false;
  }, [session, user]);

  return (
    <AuthContext.Provider value={{ 
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
      promptFreeCredits 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export default AuthContext;