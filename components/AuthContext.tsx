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

  // Communication channel to talk between tabs
  const authChannel = new BroadcastChannel('intellmade_auth_sync');

  const fetchCredits = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('credits_remaining')
      .eq('id', userId)
      .single();
    if (!error && data) setCredits(data.credits_remaining);
  }, []);

  const deductCredit = useCallback(async () => {
    if (!user || credits === null || credits <= 0) return false;
    
    const { error } = await supabase
      .from('profiles')
      .update({ credits_remaining: credits - 1 })
      .eq('id', user.id);

    if (!error) {
      setCredits(prev => (prev !== null ? prev - 1 : 0));
      return true;
    }
    return false;
  }, [user, credits]);

  useEffect(() => {
    // Listen for login from the "New Tab"
    authChannel.onmessage = (msg) => {
      if (msg.data.type === 'AUTH_COMPLETE') {
        window.location.reload(); // Refresh the original tab to catch the session
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
        // Tell other tabs we are logged in
        authChannel.postMessage({ type: 'AUTH_COMPLETE' });
      }
    });

    return () => {
      subscription.unsubscribe();
      authChannel.close();
    };
  }, [fetchCredits]);

  return (
    <AuthContext.Provider value={{ 
      user, session, credits, isLoggedIn: !!session, isLoading, 
      showAuthModal, setShowAuthModal, deductCredit, fetchCredits 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;