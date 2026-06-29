import { useState, useEffect, useCallback } from 'react';
import { supabase, Profile } from '../lib/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        console.error('Error fetching profile:', error.message);
        return null;
      }
      return data as Profile;
    } catch (err) {
      console.error('Error fetching profile:', err);
      return null;
    }
  }, []);

  // Kalau user sudah login tapi belum ada row profile (misal konfirmasi email
  // dilakukan setelah insert diblok RLS), buat otomatis dari user_metadata.
  const ensureProfile = useCallback(async (authUser: any): Promise<Profile | null> => {
    const existing = await fetchProfile(authUser.id);
    if (existing) return existing;

    const meta = authUser.user_metadata || {};
    const fallbackUsername =
      meta.username ||
      (authUser.email ? authUser.email.split('@')[0] : `user${authUser.id.slice(0, 8)}`);

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        id: authUser.id,
        username: fallbackUsername,
        display_name: meta.display_name || fallbackUsername,
        avatar_url: null,
        bio: 'Penggemar anime 🎌',
      })
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error auto-creating profile:', error.message);
      return null;
    }
    return data as Profile;
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    if (p) setProfile(p);
  }, [user, fetchProfile]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          setUser(session.user);
          const p = await ensureProfile(session.user);
          if (mounted && p) setProfile(p);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      if (mounted) setLoading(true);
      if (session?.user) {
        if (mounted) setUser(session.user);
        const p = await ensureProfile(session.user);
        if (mounted && p) setProfile(p);
      } else {
        if (mounted) { setUser(null); setProfile(null); }
      }
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [ensureProfile]);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  return { user, profile, loading, signOut, refreshProfile, setProfile };
}
