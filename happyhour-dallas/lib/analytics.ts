import { AppState, AppStateStatus } from 'react-native';
import { supabase } from './supabase';

// ─── Event catalogue ──────────────────────────────────────────────────────────
// Mirrors the analytics_events.event_type column values

export const EVENT = {
  // Navigation
  SCREEN_VIEW:           'screen_view',
  // Discovery
  SEARCH:                'search',
  FILTER_APPLIED:        'filter_applied',
  // Restaurant
  RESTAURANT_VIEW:       'restaurant_view',
  RESTAURANT_SHARE:      'restaurant_share',
  // Engagement
  FAVORITE_ADD:          'favorite_add',
  FAVORITE_REMOVE:       'favorite_remove',
  CHECKIN:               'checkin',
  REVIEW_SUBMIT:         'review_submit',
  RESERVATION_START:     'reservation_start',
  RESERVATION_COMPLETE:  'reservation_complete',
  // Notifications
  NOTIFICATION_RECEIVED: 'notification_received',
  NOTIFICATION_TAPPED:   'notification_tapped',
  REMINDER_SET:          'reminder_set',
  // Auth
  SIGN_UP:               'sign_up',
  SIGN_IN:               'sign_in',
  SIGN_OUT:              'sign_out',
  // Passport
  STAMP_EARNED:          'stamp_earned',
  BADGE_EARNED:          'badge_earned',
  LEVEL_UP:              'level_up',
} as const;

export type EventName = typeof EVENT[keyof typeof EVENT];

// ─── Queue item ───────────────────────────────────────────────────────────────

interface QueuedEvent {
  event_type: EventName;
  user_id: string | null;
  restaurant_id: string | null;
  data: Record<string, unknown> | null;
  created_at: string;
  session_id: string;
}

// ─── Session ──────────────────────────────────────────────────────────────────

const SESSION_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
let currentUserId: string | null = null;
let queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let appStateSubscription: { remove: () => void } | null = null;
let initialized = false;

// ─── Core track function ──────────────────────────────────────────────────────

export function track(
  event: EventName,
  props?: {
    restaurantId?: string;
    data?: Record<string, unknown>;
  }
): void {
  const item: QueuedEvent = {
    event_type: event,
    user_id: currentUserId,
    restaurant_id: props?.restaurantId ?? null,
    data: props?.data ?? null,
    created_at: new Date().toISOString(),
    session_id: SESSION_ID,
  };

  queue.push(item);

  // Flush immediately for high-priority events, debounce the rest
  const highPriority: EventName[] = [
    EVENT.CHECKIN,
    EVENT.RESERVATION_COMPLETE,
    EVENT.REVIEW_SUBMIT,
    EVENT.SIGN_UP,
  ];

  if (highPriority.includes(event)) {
    flush();
  } else {
    scheduledFlush();
  }
}

// ─── Convenience wrappers ─────────────────────────────────────────────────────

export const Analytics = {
  screen: (name: string) =>
    track(EVENT.SCREEN_VIEW, { data: { screen: name } }),

  restaurantView: (restaurantId: string, name: string) =>
    track(EVENT.RESTAURANT_VIEW, { restaurantId, data: { name } }),

  search: (query: string, resultCount: number) =>
    track(EVENT.SEARCH, { data: { query, result_count: resultCount } }),

  filterApplied: (filter: string) =>
    track(EVENT.FILTER_APPLIED, { data: { filter } }),

  favoriteAdd: (restaurantId: string) =>
    track(EVENT.FAVORITE_ADD, { restaurantId }),

  favoriteRemove: (restaurantId: string) =>
    track(EVENT.FAVORITE_REMOVE, { restaurantId }),

  checkin: (restaurantId: string, crowdLevel?: number) =>
    track(EVENT.CHECKIN, { restaurantId, data: { crowd_level: crowdLevel } }),

  reviewSubmit: (restaurantId: string, rating: number) =>
    track(EVENT.REVIEW_SUBMIT, { restaurantId, data: { rating } }),

  reservationStart: (restaurantId: string) =>
    track(EVENT.RESERVATION_START, { restaurantId }),

  reservationComplete: (restaurantId: string, partySize: number) =>
    track(EVENT.RESERVATION_COMPLETE, { restaurantId, data: { party_size: partySize } }),

  reminderSet: (restaurantId: string) =>
    track(EVENT.REMINDER_SET, { restaurantId }),

  signUp: () =>
    track(EVENT.SIGN_UP),

  signIn: () =>
    track(EVENT.SIGN_IN),

  signOut: () =>
    track(EVENT.SIGN_OUT),

  stampEarned: (neighborhood: string) =>
    track(EVENT.STAMP_EARNED, { data: { neighborhood } }),

  levelUp: (newLevel: string, points: number) =>
    track(EVENT.LEVEL_UP, { data: { new_level: newLevel, points } }),
};

// ─── Flush ────────────────────────────────────────────────────────────────────

async function flush(): Promise<void> {
  if (queue.length === 0) return;

  const batch = [...queue];
  queue = [];

  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  const { error } = await supabase.from('analytics_events').insert(batch);
  if (error) {
    // Put events back if Supabase is unavailable (cap at 100 to avoid unbounded growth)
    queue = [...batch, ...queue].slice(-100);
    console.warn('[analytics] flush failed:', error.message);
  }
}

function scheduledFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    flush();
  }, 10_000); // batch window: 10 seconds
}

// ─── Init / teardown ──────────────────────────────────────────────────────────

export function initAnalytics(userId: string | null): void {
  currentUserId = userId;

  if (initialized) return;
  initialized = true;

  // Flush when app goes to background so we don't lose queued events
  appStateSubscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'background' || state === 'inactive') {
      flush();
    }
  });
}

export function setAnalyticsUser(userId: string | null): void {
  currentUserId = userId;
}

export function teardownAnalytics(): void {
  flush();
  appStateSubscription?.remove();
  appStateSubscription = null;
  initialized = false;
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
}
