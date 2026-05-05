import * as Location from 'expo-location';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from './supabase';

// ─── Config ───────────────────────────────────────────────────────────────────

const UPDATE_INTERVAL_MS  = 60_000; // update DB at most once per minute
const MIN_DISTANCE_M      = 50;     // or when user moves >50m
const ACCURACY            = Location.Accuracy.Balanced;

// ─── Module state ─────────────────────────────────────────────────────────────

let watchSub: Location.LocationSubscription | null = null;
let appStateSub: { remove: () => void } | null = null;
let lastFlushAt = 0;
let currentUserId: string | null = null;

// ─── Permission request ───────────────────────────────────────────────────────

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getLocationPermissionStatus(): Promise<Location.PermissionStatus> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status;
}

// ─── Core watch ───────────────────────────────────────────────────────────────

async function startWatch(userId: string): Promise<void> {
  if (watchSub) return; // already watching

  watchSub = await Location.watchPositionAsync(
    { accuracy: ACCURACY, timeInterval: UPDATE_INTERVAL_MS, distanceInterval: MIN_DISTANCE_M },
    async (loc) => {
      const now = Date.now();
      if (now - lastFlushAt < UPDATE_INTERVAL_MS) return;
      lastFlushAt = now;
      await upsertLocation(userId, loc.coords);
    }
  );
}

function stopWatch(): void {
  watchSub?.remove();
  watchSub = null;
}

// ─── Supabase upsert ──────────────────────────────────────────────────────────

async function upsertLocation(
  userId: string,
  coords: { latitude: number; longitude: number; accuracy: number | null }
): Promise<void> {
  const { error } = await supabase.from('user_locations').upsert(
    {
      user_id:   userId,
      latitude:  coords.latitude,
      longitude: coords.longitude,
      accuracy:  coords.accuracy,
      is_sharing: true,
    },
    { onConflict: 'user_id' }
  );
  if (error) console.warn('[location] upsert failed:', error.message);
}

async function setSharing(userId: string, sharing: boolean): Promise<void> {
  const { error } = await supabase.from('user_locations').upsert(
    { user_id: userId, is_sharing: sharing },
    { onConflict: 'user_id' }
  );
  if (error) console.warn('[location] setSharing failed:', error.message);
}

// ─── AppState handler — pause on background, resume on foreground ─────────────

function handleAppState(state: AppStateStatus): void {
  if (!currentUserId) return;
  if (state === 'active') {
    startWatch(currentUserId);
  } else {
    stopWatch(); // foreground-only: pause when backgrounded
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function startSharingLocation(userId: string): Promise<boolean> {
  const granted = await requestLocationPermission();
  if (!granted) return false;

  currentUserId = userId;

  // Grab current position immediately for a fast first write
  try {
    const loc = await Location.getCurrentPositionAsync({ accuracy: ACCURACY });
    await upsertLocation(userId, loc.coords);
    lastFlushAt = Date.now();
  } catch {
    // Non-fatal — watch will catch up
  }

  await startWatch(userId);

  // Register AppState listener if not already registered
  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', handleAppState);
  }

  return true;
}

export async function stopSharingLocation(userId: string): Promise<void> {
  stopWatch();
  appStateSub?.remove();
  appStateSub = null;
  currentUserId = null;
  await setSharing(userId, false);
}

export function isSharingLocation(): boolean {
  return watchSub !== null;
}

// ─── Restaurant portal helper ─────────────────────────────────────────────────
// Fetch all currently-sharing users within ~radiusMiles of a point.
// No PostGIS needed — Haversine filter is done client-side on the small result set.

export async function getNearbySharing(opts: {
  latitude: number;
  longitude: number;
  radiusMiles?: number;
  staleAfterMinutes?: number;
}): Promise<Array<{ user_id: string; latitude: number; longitude: number; updated_at: string }>> {
  const radius     = opts.radiusMiles     ?? 5;
  const staleAfter = opts.staleAfterMinutes ?? 10;

  const since = new Date(Date.now() - staleAfter * 60_000).toISOString();

  const { data, error } = await supabase
    .from('user_locations')
    .select('user_id, latitude, longitude, updated_at')
    .eq('is_sharing', true)
    .gte('updated_at', since);

  if (error || !data) return [];

  // Haversine distance filter
  return data.filter((row) => {
    const dlat = ((row.latitude  - opts.latitude)  * Math.PI) / 180;
    const dlng = ((row.longitude - opts.longitude) * Math.PI) / 180;
    const a =
      Math.sin(dlat / 2) ** 2 +
      Math.cos((opts.latitude  * Math.PI) / 180) *
      Math.cos((row.latitude   * Math.PI) / 180) *
      Math.sin(dlng / 2) ** 2;
    const distMiles = 3_958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return distMiles <= radius;
  });
}
