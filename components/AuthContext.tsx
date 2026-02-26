// =============================================================
// AUTH CONTEXT — Manages login state across the entire app
// =============================================================

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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
  promptFreeCredits: () => void; // ✅ triggers "sign in for free credits" modal
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);

  // ── Fetch credits — reads from profiles table (matches Express backend) ──
  const fetchCredits = useCallback(async (token: string) => {
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/get-credits`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
      })
      const data = await res.json()
      if (data.success) {
        setCredits(data.data.credits)
      }
    } catch (err) {
      console.error('Error fetching credits:', err)
      // Fallback: query Supabase directly
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('credits_remaining')
          .single()
        if (profile) setCredits(profile.credits_remaining)
      } catch {
        setCredits(100)
      }
    }
  }, [])

  const refreshCredits = useCallback(async () => {
    const token = localStorage.getItem('access_token')
    if (token) await fetchCredits(token)
  }, [fetchCredits])

  // ✅ Show auth modal with "get free credits" context
  const promptFreeCredits = useCallback(() => {
    setPendingAction('free_credits')
    setShowAuthModal(true)
  }, [])

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()
        if (currentSession) {
          setSession(currentSession)
          setUser(currentSession.user)
          localStorage.setItem('access_token', currentSession.access_token)
          await fetchCredits(currentSession.access_token)
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'SIGNED_IN' && newSession) {
          setSession(newSession)
          setUser(newSession.user)
          localStorage.setItem('access_token', newSession.access_token)
          setShowAuthModal(false)
          await fetchCredits(newSession.access_token)
        } else if (event === 'SIGNED_OUT') {
          setSession(null)
          setUser(null)
          setCredits(null)
          localStorage.removeItem('access_token')
        } else if (event === 'TOKEN_REFRESHED' && newSession) {
          setSession(newSession)
          localStorage.setItem('access_token', newSession.access_token)
          await fetchCredits(newSession.access_token)
        }
      }
    )

    return () => { subscription.unsubscribe() }
  }, [fetchCredits])

  const signOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setUser(null)
    setCredits(null)
    localStorage.removeItem('access_token')
  }

  const requireAuth = useCallback((action?: string): boolean => {
    if (session && user) return true
    if (action) setPendingAction(action)
    setShowAuthModal(true)
    return false
  }, [session, user])

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
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

export default AuthContext