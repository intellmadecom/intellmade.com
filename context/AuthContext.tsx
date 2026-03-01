import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

// ✅ CENTRAL PRICING CONFIG - Matches your specific requirements
export const TOOL_COSTS = {
  IMAGE_GEN: 10,      
  VIDEO_GEN: 45,     
  ANIMATE: 45,        
  VOICE_CHAT: 10,     
  ANALYSIS: 10        
};

const AuthContext = createContext<any>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  // ✅ Cross-tab synchronization channel
  const authChannel = new BroadcastChannel('intellmade_auth_sync');

  const fetchCredits = useCallback(async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('credits')
        .eq('email', email)
        .single();
      
      if (!error && data) {
        setCredits(data.credits);
      } else {
        // Fallback for new users without a row yet
        setCredits(0);
      }
    } catch (err) {
      console.error("Error fetching credits:", err);
      setCredits(0);
    }
  }, []);

  // ✅ GLOBAL DEDUCTION FUNCTION - Call this in any tool component
  const deductCredit = useCallback(async (toolKey: keyof typeof TOOL_COSTS, description?: string) => {
    const amount = TOOL_COSTS[toolKey] || 1;
    
    if (!user?.email || credits === null || credits < amount) return false;
    
    try {
      // 1. Update the user_credits table
      const { data, error } = await supabase
        .from('user_credits')
        .update({ credits: credits - amount })
        .eq('email', user.email)
        .select()
        .single();

      if (error) throw error;

      // 2. Log the transaction (matches your Edge Function logic)
      await supabase.from('credit_transactions').insert({
        email: user.email,
        amount: -amount,
        type: 'usage',
        description: description || `Used ${toolKey}`
      });

      setCredits(data.credits); // Update Sidebar UI instantly
      return true;
    } catch (err) {
      console.error("Credit deduction failed:", err);
      return false;
    }
  }, [user, credits]);

  useEffect(() => {
    // ✅ Sync logic: If a new tab logs in, refresh this tab to pick up the session
    authChannel.onmessage = (msg) => {
      if (msg.data.type === 'AUTH_COMPLETE') {
        window.location.reload(); 
      }
    };

    const init = async () => {
      try {
        const { data: { session: s } } = await supabase.auth.getSession();
        if (s) {
          setSession(s);
          setUser(s.user);
          await fetchCredits(s.user.email!);
        }
      } catch (err) {
        console.error("Init session error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_IN' && s) {
        setSession(s);
        setUser(s.user);
        await fetchCredits(s.user.email!);
        setShowAuthModal(false);
        // ✅ Tell other tabs that login is complete
        authChannel.postMessage({ type: 'AUTH_COMPLETE' });
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setCredits(null);
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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;