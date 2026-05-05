import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  startSharingLocation,
  stopSharingLocation,
  requestLocationPermission,
  getLocationPermissionStatus,
  isSharingLocation,
} from '@/lib/location';

const PREF_KEY = 'location_sharing_enabled';

interface LocationState {
  isSharing: boolean;
  permissionGranted: boolean;
  loading: boolean;

  // Call on sign-in — restores previous preference
  init: (userId: string) => Promise<void>;
  // Toggle from UI
  toggle: (userId: string) => Promise<void>;
  // Call on sign-out — stops sharing without persisting false
  teardown: (userId: string) => Promise<void>;
}

export const useLocationStore = create<LocationState>((set, get) => ({
  isSharing: false,
  permissionGranted: false,
  loading: false,

  init: async (userId: string) => {
    set({ loading: true });

    // Check current OS permission status (don't re-prompt here)
    const status = await getLocationPermissionStatus();
    const permissionGranted = status === 'granted';
    set({ permissionGranted });

    // Restore saved preference
    const saved = await AsyncStorage.getItem(PREF_KEY);
    const wasSharing = saved === 'true' && permissionGranted;

    if (wasSharing) {
      const started = await startSharingLocation(userId);
      set({ isSharing: started, loading: false });
    } else {
      set({ isSharing: false, loading: false });
    }
  },

  toggle: async (userId: string) => {
    const { isSharing } = get();
    set({ loading: true });

    if (isSharing) {
      await stopSharingLocation(userId);
      await AsyncStorage.setItem(PREF_KEY, 'false');
      set({ isSharing: false, loading: false });
    } else {
      const started = await startSharingLocation(userId);
      if (started) {
        await AsyncStorage.setItem(PREF_KEY, 'true');
        set({ isSharing: true, permissionGranted: true, loading: false });
      } else {
        // Permission denied
        set({ isSharing: false, permissionGranted: false, loading: false });
      }
    }
  },

  teardown: async (userId: string) => {
    if (isSharingLocation()) {
      await stopSharingLocation(userId);
    }
    set({ isSharing: false });
    // Don't clear the PREF_KEY — next sign-in should restore their preference
  },
}));
