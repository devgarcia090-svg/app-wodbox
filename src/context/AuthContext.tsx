import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';

export interface Profile {
  name: string;
  role: 'athlete' | 'admin';
  avatar_initials: string;
  avatar_color: string;
  avatar_url: string | null;
  plan: string;
  membership_status: 'active' | 'pending' | 'inactive';
  membership_expires: string | null;
  classes_remaining: number | null;
}

interface AuthContextValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  needsPasswordSetup: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  profile: null,
  loading: true,
  needsPasswordSetup: false,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Detect when user arrived via invite link and hasn't set a password yet
  const needsPasswordSetup = !!session?.user?.user_metadata?.invited;

  // Handle deep link tokens (invite / password reset links)
  const handleAuthUrl = async (url: string) => {
    if (!url.startsWith('wodbox://')) return;
    const hash = url.split('#')[1];
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const access_token = params.get('access_token');
    const refresh_token = params.get('refresh_token');
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
    }
  };

  useEffect(() => {
    // Handle app opened from a deep link while closed
    Linking.getInitialURL().then((url: string | null) => { if (url) handleAuthUrl(url); });

    // Handle deep links while app is open
    const linkSub = Linking.addEventListener('url', ({ url }: { url: string }) => handleAuthUrl(url));

    return () => linkSub.remove();
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, role, avatar_initials, avatar_color, avatar_url, plan, membership_status, membership_expires, classes_remaining')
        .eq('id', userId)
        .single();

      if (data && !error) setProfile(data as Profile);
    } finally {
      setLoading(false);
    }
  }

  const signOut = async () => { await supabase.auth.signOut(); };

  const refreshProfile = async () => {
    if (session?.user.id) await fetchProfile(session.user.id);
  };

  return (
    <AuthContext.Provider value={{ session, profile, loading, needsPasswordSetup, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
