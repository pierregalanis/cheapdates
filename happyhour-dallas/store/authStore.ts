import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

export interface UserProfile {
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  neighborhood: string | null;
  points: number;
  level: string;
}

export interface OwnedRestaurant {
  id: string;
  name: string;
  is_verified: boolean;
  neighborhood: string | null;
  crowd_level: number;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  ownedRestaurant: OwnedRestaurant | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null; session: import('@supabase/supabase-js').Session | null }>;
  signInWithApple: () => Promise<{ error: Error | null; cancelled?: boolean }>;
  signOut: () => Promise<void>;
  setSession: (session: Session | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  fetchOwnedRestaurant: (userId: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: { full_name?: string; bio?: string; neighborhood?: string }) => Promise<{ error: string | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  ownedRestaurant: null,
  loading: true,

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  },

  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    return { error: error as Error | null, session: data.session };
  },

  signInWithApple: async () => {
    try {
      const rawNonce = Math.random().toString(36).substring(2);
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      const { identityToken } = credential;
      if (!identityToken) throw new Error('No identity token from Apple');

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: identityToken,
        nonce: rawNonce,
      });

      return { error: error as Error | null };
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string };
      if (err.code === 'ERR_REQUEST_CANCELED') return { error: null, cancelled: true };
      return { error: new Error(err.message ?? 'Apple sign-in failed') };
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, profile: null, ownedRestaurant: null });
  },

  setSession: (session) => {
    set({ session, user: session?.user ?? null, loading: false });
    if (session?.user) {
      get().fetchProfile(session.user.id);
    } else {
      set({ profile: null });
    }
  },

  fetchProfile: async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, bio, neighborhood, points, level')
      .eq('id', userId)
      .single();
    if (data) set({ profile: data as UserProfile });
    get().fetchOwnedRestaurant(userId);
  },

  fetchOwnedRestaurant: async (userId: string) => {
    const { data } = await supabase
      .from('restaurants')
      .select('id, name, is_verified, neighborhood, crowd_level')
      .eq('owner_id', userId)
      .maybeSingle();
    set({ ownedRestaurant: data ?? null });
  },

  refreshProfile: async () => {
    const { user } = get();
    if (user) await get().fetchProfile(user.id);
  },

  updateProfile: async (updates) => {
    const { user } = get();
    if (!user) return { error: 'Not signed in' };
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    if (!error) await get().fetchProfile(user.id);
    return { error: error?.message ?? null };
  },
}));
