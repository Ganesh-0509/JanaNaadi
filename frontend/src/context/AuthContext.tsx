import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthUser {
  id: string;
  email: string;
  role: string;
  token: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  supabase: SupabaseClient;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        // Use app_metadata for role (server-only, cannot be edited by the user).
        // Never trust user_metadata for RBAC — it is writable by the client.
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: (session.user.app_metadata as Record<string, string>)?.role || 'analyst',
          token: session.access_token,
        });
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email || '',
          role: (session.user.app_metadata as Record<string, string>)?.role || 'analyst',
          token: session.access_token,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, supabase }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
