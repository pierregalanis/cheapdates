import { COLORS } from '@/constants/theme';

// ─── Crowd Level ──────────────────────────────────────────────────────────────

export const CROWD_CONFIG = {
  0: { label: 'Unknown',      color: COLORS.muted,          glow: 'rgba(138,106,80,0.05)' },
  1: { label: 'Quiet',        color: COLORS.status.success, glow: 'rgba(52,199,89,0.28)'  },
  2: { label: 'Getting Busy', color: COLORS.amber,          glow: 'rgba(255,179,71,0.28)' },
  3: { label: 'Busy',         color: COLORS.orange,         glow: 'rgba(255,107,26,0.38)' },
  4: { label: 'Packed 🔥',   color: COLORS.status.error,   glow: 'rgba(255,59,48,0.38)'  },
} as const;

export type CrowdLevel = keyof typeof CROWD_CONFIG;

export function getCrowdConfig(level: number) {
  return CROWD_CONFIG[level as CrowdLevel] ?? CROWD_CONFIG[0];
}

// ─── Countdown & Time ─────────────────────────────────────────────────────────

export function getCountdownColor(minLeft: number): string {
  if (minLeft <= 30) return COLORS.status.error;
  if (minLeft <= 60) return COLORS.amber;
  return COLORS.orange;
}

export function formatCountdown(minLeft: number): string {
  if (minLeft <= 0) return 'Ended';
  if (minLeft < 60) return `${minLeft}m left`;
  const h = Math.floor(minLeft / 60);
  const m = minLeft % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h left`;
}

export function formatTime(timeStr: string): string {
  const [hourStr, minStr] = timeStr.split(':');
  const hour = parseInt(hourStr, 10);
  const min = (minStr ?? '00').padStart(2, '0');
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${min} ${period}`;
}

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DAY_FULL  = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function isHappyHourNow(
  happyHours: { day_of_week: number; start_time: string; end_time: string; is_active: boolean }[]
): boolean {
  const now  = new Date();
  const day  = now.getDay();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`;
  return happyHours.some(
    (hh) => hh.is_active && hh.day_of_week === day && time >= hh.start_time && time <= hh.end_time
  );
}

export function getMinutesUntilEnd(
  happyHours: { day_of_week: number; end_time: string; is_active: boolean }[]
): number {
  const now        = new Date();
  const day        = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const active     = happyHours.find((hh) => {
    if (!hh.is_active || hh.day_of_week !== day) return false;
    const [h, m] = hh.end_time.split(':').map(Number);
    return nowMinutes < h * 60 + m;
  });
  if (!active) return 0;
  const [h, m] = active.end_time.split(':').map(Number);
  return h * 60 + m - nowMinutes;
}

// ─── Gamification ─────────────────────────────────────────────────────────────

export function getHeroLevel(points: number): string {
  if (points >= 1000) return 'Happy Hour Hero';
  if (points >= 500)  return 'VIP';
  if (points >= 100)  return 'Regular';
  return 'Newcomer';
}

export function getHeroEmoji(points: number): string {
  if (points >= 1000) return '🏆';
  if (points >= 500)  return '⭐';
  if (points >= 100)  return '🍹';
  return '🆕';
}

export function getLevelProgress(points: number): number {
  if (points >= 1000) return 1;
  if (points >= 500)  return (points - 500) / 500;
  if (points >= 100)  return (points - 100) / 400;
  return points / 100;
}

export function getNextLevelPoints(points: number): number {
  if (points >= 1000) return 1000;
  if (points >= 500)  return 1000;
  if (points >= 100)  return 500;
  return 100;
}

// ─── Formatting ───────────────────────────────────────────────────────────────

export function generateInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2).replace(/\.00$/, '')}`;
}

export function formatRating(rating: number): string {
  return rating.toFixed(1);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '…';
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? singular + 's');
}
