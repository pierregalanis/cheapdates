import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HappyHour {
  id: string;
  restaurant_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  label: string | null;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category: string;
  name: string;
  description: string | null;
  regular_price: number | null;
  happy_hour_price: number | null;
  is_featured: boolean;
  is_available: boolean;
}

export interface Deal {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | 'bogo' | 'free_item' | 'other';
  discount_value: number | null;
  min_purchase: number | null;
  valid_days: number[] | null;
  start_time: string | null;
  end_time: string | null;
  is_active: boolean;
}

export interface Review {
  id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  visit_date: string | null;
  helpful_count: number;
  restaurant_reply: string | null;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null };
}

export interface Restaurant {
  id: string;
  owner_id: string | null;
  name: string;
  slug: string | null;
  description: string | null;
  address: string;
  neighborhood: string | null;
  city: string;
  state: string;
  zip_code: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  cuisine_type: string | null;
  vibe_tags: string[] | null;
  logo_url: string | null;
  photos: string[] | null;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  is_verified: boolean;
  subscription_tier: 'basic' | 'verified' | 'pro' | 'elite';
  crowd_level: 0 | 1 | 2 | 3 | 4;
  crowd_updated_at: string | null;
  average_rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  happy_hours?: HappyHour[];
  menu_items?: MenuItem[];
  deals?: Deal[];
  reviews?: Review[];
}

// ─── Store ────────────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface RestaurantState {
  restaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  searchResults: Restaurant[];
  favorites: string[];
  favoriteRestaurants: Restaurant[];
  loading: boolean;
  searchLoading: boolean;
  favoritesLoading: boolean;
  error: string | null;
  lastFetched: number | null;

  fetchRestaurants: (filters?: {
    neighborhood?: string;
    vibe?: string;
    happeningNow?: boolean;
    city?: string;
    force?: boolean;
  }) => Promise<void>;

  fetchRestaurantById: (id: string) => Promise<void>;
  searchRestaurants: (query: string) => Promise<void>;
  clearSearch: () => void;

  toggleFavorite: (restaurantId: string) => Promise<void>;
  fetchFavorites: (userId: string) => Promise<void>;
  fetchFavoriteRestaurants: (userId: string) => Promise<void>;
}

export const useRestaurantStore = create<RestaurantState>((set, get) => ({
  restaurants: [],
  selectedRestaurant: null,
  searchResults: [],
  favorites: [],
  favoriteRestaurants: [],
  loading: false,
  searchLoading: false,
  favoritesLoading: false,
  error: null,
  lastFetched: null,

  fetchRestaurants: async (filters = {}) => {
    const { lastFetched, restaurants } = get();
    const isFiltered = !!(filters.neighborhood || filters.vibe || filters.happeningNow || filters.city);
    if (!filters.force && !isFiltered && restaurants.length > 0 && lastFetched && Date.now() - lastFetched < CACHE_TTL_MS) {
      return;
    }

    set({ loading: true, error: null });
    try {
      let query = supabase
        .from('restaurants')
        .select('*, happy_hours(*), menu_items(*), deals(*)')
        .eq('status', 'approved')
        .eq('city', filters.city ?? 'Dallas')
        .order('is_verified', { ascending: false })
        .order('average_rating', { ascending: false });

      if (filters.neighborhood) {
        query = query.eq('neighborhood', filters.neighborhood);
      }
      if (filters.vibe) {
        query = query.contains('vibe_tags', [filters.vibe]);
      }

      const { data, error } = await query;
      if (error) throw error;
      set({ restaurants: (data as Restaurant[]) ?? [], loading: false, lastFetched: Date.now() });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  fetchRestaurantById: async (id: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          happy_hours (*),
          menu_items (*),
          deals (*),
          reviews (*, profiles(full_name, avatar_url))
        `)
        .eq('id', id)
        .single();
      if (error) throw error;
      set({ selectedRestaurant: data as Restaurant, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },

  searchRestaurants: async (query: string) => {
    if (!query.trim()) {
      set({ searchResults: [] });
      return;
    }
    set({ searchLoading: true });
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*, happy_hours(*)')
        .eq('status', 'approved')
        .or(
          `name.ilike.%${query}%,neighborhood.ilike.%${query}%,zip_code.ilike.%${query}%,cuisine_type.ilike.%${query}%`
        )
        .limit(20);
      if (error) throw error;
      set({ searchResults: (data as Restaurant[]) ?? [], searchLoading: false });
    } catch (err) {
      set({ searchLoading: false });
    }
  },

  clearSearch: () => set({ searchResults: [] }),

  toggleFavorite: async (restaurantId: string) => {
    const { favorites } = get();
    const isFav = favorites.includes(restaurantId);
    set({ favorites: isFav ? favorites.filter((id) => id !== restaurantId) : [...favorites, restaurantId] });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (isFav) {
      await supabase.from('favorites').delete().match({ user_id: user.id, restaurant_id: restaurantId });
    } else {
      await supabase.from('favorites').insert({ user_id: user.id, restaurant_id: restaurantId });
    }
  },

  fetchFavorites: async (userId: string) => {
    const { data } = await supabase
      .from('favorites')
      .select('restaurant_id')
      .eq('user_id', userId);
    set({ favorites: (data ?? []).map((f) => f.restaurant_id) });
  },

  fetchFavoriteRestaurants: async (userId: string) => {
    set({ favoritesLoading: true });
    try {
      const { data: favData } = await supabase
        .from('favorites')
        .select('restaurant_id')
        .eq('user_id', userId);
      const ids = (favData ?? []).map((f) => f.restaurant_id);
      set({ favorites: ids });
      if (!ids.length) {
        set({ favoriteRestaurants: [], favoritesLoading: false });
        return;
      }
      const { data, error } = await supabase
        .from('restaurants')
        .select('*, happy_hours(*), menu_items(*), deals(*)')
        .in('id', ids)
        .eq('status', 'approved');
      if (error) throw error;
      set({ favoriteRestaurants: (data as Restaurant[]) ?? [], favoritesLoading: false });
    } catch {
      set({ favoritesLoading: false });
    }
  },
}));
