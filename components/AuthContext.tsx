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

  // ✅ Create a communication channel between tabs
  const authChannel = new BroadcastChannel('auth_channel');

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
      console.error("Credits error:", err);
      setCredits(100);
    }
  }, []);

  useEffect(() => {
    // ✅ Listen for login events from other tabs (like the magic link tab)
    authChannel.onmessage = (event) => {
      if (event.data.type === 'LOGIN_SUCCESS') {
        const { session: newSession } = event.data;
        setSession(newSession);
        setUser(newSession.user);
        fetchCredits(newSession.user.id);
        setShowAuthModal(false);
      }
    };

    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s) {
        setSession(s);
        setUser(s.user);
        await fetchCredits(s.user.id);
      }
      setIsLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_IN' && s) {
        setSession(s);
        setUser(s.user);
        await fetchCredits(s.user.id);
        setShowAuthModal(false);

        // ✅ If this is the "New Tab" opened by the email, notify the "Old Tab"
        authChannel.postMessage({ type: 'LOGIN_SUCCESS', session: s });

        // ✅ If we have a pending download in THIS tab, keep it, 
        // otherwise if it's just a verification tab, close it.
        const hasData = !!localStorage.getItem('intellmade_has_state'); 
        if (!hasData && window.name !== 'original_tab') {
           // Optional: window.close(); // Browsers often block this, so redirecting is safer
           // window.location.href = '/'; 
        }
      }
    });

    return () => {
      subscription.unsubscribe();
      authChannel.close();
    };
  }, [fetchCredits]);

  const requireAuth = (action?: string) => {
    if (session) return true;
    window.name = 'original_tab'; // Mark this tab
    if (action) setPendingAction(action);
    setShowAuthModal(true);
    return false;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setCredits(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, credits, isLoggedIn: !!session, isLoading, showAuthModal, setShowAuthModal, pendingAction, setPendingAction, signOut, requireAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;