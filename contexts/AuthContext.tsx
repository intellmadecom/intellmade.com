import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

// ✅ CENTRAL PRICING CONFIG - Adjust these to your actual costs
export const TOOL_COSTS = {
  IMAGE_GEN: 1,      
  VIDEO_GEN: 10,     // Video usually costs more
  ANIMATE: 5,        
  VOICE_CHAT: 1,     
  ANALYSIS: 1        
};

const AuthContext = createContext<any>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [credits, setCredits] = useState<number | null>(null);

  const authChannel = new BroadcastChannel('intellmade_auth_sync');

  const fetchCredits = useCallback(async (email: string) => {
    const { data, error } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('email', email)
      .single();
    
    if (!error && data) {
      setCredits(data.credits);
    } else {
      setCredits(0);
    }
  }, []);

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

      // 2. Log transaction
      await supabase.from('credit_transactions').insert({
        email: user.email,
        amount: -amount,
        type: 'usage',
        description: description || `Used ${toolKey}`
      });

      setCredits(data.credits);
      return true;
    } catch (err) {
      console.error("Credit deduction failed:", err);
      return false;
    }
  }, [user, credits]);

  useEffect(() => {
    // Listen for login from the "New Tab" magic link
    authChannel.onmessage = (msg) => {
      if (msg.data.type === 'AUTH_COMPLETE') {
        window.location.reload(); 
      }
    };

    const init = async () => {
      const { data: { session: s } } = await supabase.auth.getSession();
      if (s) {
        setSession(s);
        setUser(s.user);
        await fetchCredits(s.user.email!);
      }
      setIsLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (event === 'SIGNED_IN' && s) {
        setSession(s);
        setUser(s.user);
        await fetchCredits(s.user.email!);
        setShowAuthModal(false);
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