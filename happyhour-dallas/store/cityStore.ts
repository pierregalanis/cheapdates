import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CITIES, DEFAULT_CITY, type CityConfig } from '@/constants/cities';

const CITY_KEY = 'selected_city_id';

interface CityState {
  selectedCity: CityConfig;
  hydrated: boolean;
  setCity: (cityId: string) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useCityStore = create<CityState>((set) => ({
  selectedCity: DEFAULT_CITY,
  hydrated: false,

  setCity: async (cityId: string) => {
    const city = CITIES.find((c) => c.id === cityId) ?? DEFAULT_CITY;
    set({ selectedCity: city });
    await AsyncStorage.setItem(CITY_KEY, cityId);
  },

  hydrate: async () => {
    const saved = await AsyncStorage.getItem(CITY_KEY);
    const city = saved ? (CITIES.find((c) => c.id === saved) ?? DEFAULT_CITY) : DEFAULT_CITY;
    set({ selectedCity: city, hydrated: true });
  },
}));
