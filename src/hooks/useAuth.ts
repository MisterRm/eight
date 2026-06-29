import { useState, useEffect, useCallback } from 'react';
import { supabase, Profile } from '../lib/supabaseClient';

export function useAuth() {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Hanya fetch — trigger database yang buat profile, bukan kode ini
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    for (let i = 0; i < 5; i++) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (data) return data as Profile;
        if (error) console.error('fetchProfile error:', error.message);
      } catch (err) {
        console.error('fetchProfile exception:', err);
      }
      await new Promise(r => setTimeout(r, 600));
    }
    return null;
  }, []);

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
          const p = await fetchProfile(session.user.id);
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
        const p = await fetchProfile(session.user.id);
        if (mounted && p) setProfile(p);
      } else {
        setUser(null);
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [fetchProfile]);

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  return { user, profile, loading, signOut, refreshProfile, setProfile };
}
