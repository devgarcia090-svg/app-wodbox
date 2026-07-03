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
  membership_start: string | null;
  classes_remaining: number | null;
  plan_classes: number | null;
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

  // Handle auth deep links (invite / password reset). Works with any scheme:
  // wodbox:// in standalone builds, exp:// in Expo Go.
  const handleAuthUrl = async (url: string) => {
    try {
      // PKCE flow: ...?code=xxx
      const parsed = Linking.parse(url);
      const code = parsed.queryParams?.code as string | undefined;
      if (code) {
        await supabase.auth.exchangeCodeForSession(code);
        return;
      }
      // Implicit flow: ...#access_token=xxx&refresh_token=xxx
      const hash = url.split('#')[1];
      if (!hash) return;
      const params = new URLSearchParams(hash);
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      }
    } catch (e) {
      console.warn('[AuthContext] handleAuthUrl error:', e);
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
    // onAuthStateChange handles everything including the initial session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession) {
        setLoading(true);
        setSession(newSession);
        fetchProfile(newSession.user.id);
      } else {
        setSession(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data && !error) {
        setProfile(data as Profile);
      } else {
        console.warn('[AuthContext] fetchProfile error:', error?.message);
      }
    } catch (e) {
      console.warn('[AuthContext] fetchProfile exception:', e);
    } finally {
      setLoading(false);
    }
  }

  const signOut = async () => {
    // Clear the device's push token before signing out — otherwise it stays
    // on this profile and, if another user logs in on the same device, they
    // start receiving this account's push notifications.
    if (session?.user.id) {
      await supabase.from('profiles').update({ push_token: null }).eq('id', session.user.id);
    }
    await supabase.auth.signOut();
  };

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
