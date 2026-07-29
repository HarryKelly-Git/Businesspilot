import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile, Business, Subscription } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  business: Business | null;
  subscription: Subscription | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshBusiness: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    // maybeSingle, not single: a missing profile row shouldn't surface an error.
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data) {
      setProfile(data);
    }
  }, []);

  const fetchBusiness = useCallback(async (userId: string) => {
    // order + limit + maybeSingle, NOT .single(): .single() throws when a user
    // has 0 or 2+ businesses, which set `business` to null and drove the
    // onboarding redirect loop. This tolerates any row count and returns the
    // newest business (or null) without erroring.
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      setBusiness(data);

      // maybeSingle here too: a new user has no subscription, and .single()
      // would error on zero rows.
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('business_id', data.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setSubscription(subData ?? null);
    } else {
      setBusiness(null);
      setSubscription(null);
    }
  }, []);

  // Loads profile + business. Deliberately called from OUTSIDE the
  // onAuthStateChange callback (see below) — running Supabase DB queries inside
  // that callback deadlocks against the auth lock the callback holds.
  const loadUserData = useCallback(
    async (userId: string) => {
      try {
        await Promise.all([fetchProfile(userId), fetchBusiness(userId)]);
      } catch (error) {
        console.error('[auth] failed to load user data:', error);
      }
    },
    [fetchProfile, fetchBusiness]
  );

  useEffect(() => {
    let mounted = true;
    let resolved = false;

    const finishLoading = () => {
      if (mounted && !resolved) {
        resolved = true;
        setLoading(false);
      }
    };

    // FAILSAFE: the app must never hang on the boot spinner. If auth hasn't
    // resolved within 8s (e.g. the Supabase auth lock stalls while recovering a
    // stored session), stop loading anyway and let the route guards send the
    // user to /auth. This is the guarantee that the infinite-spinner symptom
    // cannot recur, whatever the underlying cause.
    const failsafe = setTimeout(() => {
      if (!resolved) console.warn('[auth] init timed out after 8s — proceeding unauthenticated');
      finishLoading();
    }, 8000);

    // Single source of truth. Subscribing emits INITIAL_SESSION with the stored
    // session (or null), then fires again on SIGNED_IN / SIGNED_OUT / refresh.
    // The callback stays SYNCHRONOUS — no awaited Supabase calls inside it, or
    // it deadlocks against the auth lock it runs under.
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        console.log('[auth] event:', event, '· session:', !!newSession);

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Defer the DB fetches out of this callback (and out of the auth lock)
          // with a 0ms timer, then resolve loading once the data is in.
          const uid = newSession.user.id;
          setTimeout(() => {
            if (!mounted) return;
            loadUserData(uid).finally(finishLoading);
          }, 0);
        } else {
          setProfile(null);
          setBusiness(null);
          setSubscription(null);
          finishLoading();
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(failsafe);
      authSub.unsubscribe();
    };
  }, [loadUserData]);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { error };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signOut = async () => {
    // Clear local state first so the UI reflects sign-out immediately, even if
    // the network call is slow or the auth lock stalls.
    setUser(null);
    setSession(null);
    setProfile(null);
    setBusiness(null);
    setSubscription(null);
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[auth] signOut error:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const refreshBusiness = async () => {
    if (user) {
      await fetchBusiness(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        business,
        subscription,
        loading,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        refreshBusiness,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
