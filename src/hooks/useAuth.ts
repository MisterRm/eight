import { useState, useEffect, useCallback } from 'react';
import { supabase, Profile } from '../lib/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    // Retry sampai 3x dengan delay supaya tidak gagal karena timing
    for (let i = 0; i < 3; i++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (error) { console.error('fetchProfile error:', error.message); }
        if (data) return data as Profile;
      } catch (err) {
        console.error('fetchProfile exception:', err);
      }
      // Tunggu sebelum retry
      await new Promise(r => setTimeout(r, 500));
    }
    return null;
  }, []);

  const ensureProfile = useCallback(async (authUser: any): Promise<Profile | null> => {
    const existing = await fetchProfile(authUser.id);
    if (existing) return existing;

    // Belum ada profile — buat dari user_metadata
    const meta = authUser.user_metadata || {};
    const fallbackUsername =
      meta.username ||
      (authUser.email ? authUser.email.split('@')[0] : `user${authUser.id.slice(0, 8)}`);

    try {
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
        console.error('ensureProfile insert error:', error.message);
        // Coba fetch lagi kalau insert gagal (mungkin sudah ada karena race condition)
        return await fetchProfile(authUser.id);
      }
      return data as Profile;
    } catch (err) {
      console.error('ensureProfile exception:', err);
      return null;
    }
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      setLoading(true);
      if (session?.user) {
        setUser(session.user);
        const p = await ensureProfile(session.user);
        if (mounted && p) setProfile(p);
      } else {
        setUser(null);
        setProfile(null);
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
