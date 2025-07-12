import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  refreshSession: () => Promise<{ data: any, error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Enhanced session cleanup function
    const clearCorruptedSession = async (force = false) => {
      try {
        console.warn('Clearing corrupted session data');
        
        // Force sign out from Supabase
        await supabase.auth.signOut();
        
        // Clear all authentication-related localStorage items
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            keysToRemove.push(key);
          }
        }
        
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // Also clear sessionStorage
        const sessionKeysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase'))) {
            sessionKeysToRemove.push(key);
          }
        }
        
        sessionKeysToRemove.forEach(key => sessionStorage.removeItem(key));
        
        // Reset auth state
        setSession(null);
        setUser(null);
      } catch (error) {
        console.warn('Error during session cleanup:', error);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        
        // Handle token refresh errors and sign out events
        if ((event === 'TOKEN_REFRESHED' && !session) || event === 'SIGNED_OUT') {
          console.warn('Token refresh failed, clearing session');
          await clearCorruptedSession();
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session with error handling
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (error) {
        console.error('Session retrieval error:', error);
        if (error.message.includes('Invalid Refresh Token') || 
            error.message.includes('refresh_token_not_found') ||
            error.message.includes('Refresh Token Not Found')) {
          await clearCorruptedSession();
          return;
        }
      }
      
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(async (error) => {
      console.error('Failed to get session:', error);
      if (error.message && (error.message.includes('Invalid Refresh Token') || error.message.includes('refresh_token_not_found'))) {
        await clearCorruptedSession();
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: any) => {
    const redirectUrl = `${window.location.origin}/auth/verify`;
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: metadata,
        }
      });
      return { error };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      // Clear any remaining session data
      localStorage.removeItem('supabase.auth.token');
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) {
          localStorage.removeItem(key);
        }
      });
      return { error };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const refreshSession = async (): Promise<{ data: any, error: any }> => {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Error refreshing session:', error);
        return { data: null, error };
      }
      return { data, error: null };
    } catch (error) {
      console.error('Error refreshing session:', error);
      return { data: null, error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}