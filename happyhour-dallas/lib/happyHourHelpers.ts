import type { Restaurant } from '@/store/restaurantStore';

const CUISINE_EMOJI: [string, string][] = [
  ['sushi', '🍣'],
  ['japanese', '🍱'],
  ['mexican', '🌮'],
  ['italian', '🍝'],
  ['pizza', '🍕'],
  ['bbq', '🍖'],
  ['seafood', '🦞'],
  ['wine', '🍷'],
  ['cocktail', '🍸'],
  ['beer', '🍺'],
  ['american', '🍔'],
  ['rooftop', '🏙️'],
  ['music', '🎵'],
];

type RestaurantLike = Pick<Restaurant, 'cuisine_type'> & { vibe_tags?: string[] | null };

export function getRestaurantEmoji(r: RestaurantLike): string {
  const cuisine = r.cuisine_type?.toLowerCase() ?? '';
  for (const [key, emoji] of CUISINE_EMOJI) {
    if (cuisine.includes(key)) return emoji;
  }
  const tags = (r.vibe_tags ?? []).join(' ').toLowerCase();
  if (tags.includes('rooftop')) return '🏙️';
  if (tags.includes('music')) return '🎵';
  if (tags.includes('wine')) return '🍷';
  return '🍸';
}

export function getTopDeals(r: Restaurant): string[] {
  if (!r.menu_items?.length) return [];
  return r.menu_items
    .filter((item) => item.is_available && item.happy_hour_price != null)
    .slice(0, 3)
    .map((item) => {
      const p = item.happy_hour_price!;
      return `$${Number.isInteger(p) ? p : p.toFixed(2)} ${item.name}`;
    });
}

function parseTimeMinutes(t: string): number {
  const parts = t.split(':').map(Number);
  return parts[0] * 60 + (parts[1] ?? 0);
}

function formatEndTime(endTime: string): string {
  const [h, m] = endTime.split(':').map(Number);
  const hour12 = h % 12 || 12;
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export interface ActiveHH {
  minLeft: number;
  endTime: string;
}

export function getActiveHappyHour(r: Restaurant): ActiveHH | null {
  if (!r.happy_hours?.length) return null;
  const now = new Date();
  const todayDow = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  for (const hh of r.happy_hours) {
    if (!hh.is_active || hh.day_of_week !== todayDow) continue;
    const startMin = parseTimeMinutes(hh.start_time);
    const endMin = parseTimeMinutes(hh.end_time);
    if (nowMin >= startMin && nowMin < endMin) {
      return { minLeft: endMin - nowMin, endTime: formatEndTime(hh.end_time) };
    }
  }
  return null;
}

// Vibe-tag-to-filter-chip mapping
const VIBE_CHIP_MAP: Record<string, string[]> = {
  rooftop:    ['Rooftop'],
  datenight:  ['Date Night'],
  dogfriendly: ['Dog Friendly'],
  livemusic:  ['Live Music'],
  patio:      ['Patio'],
};

export function matchesChip(r: Restaurant, chipId: string): boolean {
  if (chipId === 'now') return getActiveHappyHour(r) !== null;
  if (chipId === 'drinks') return (r.cuisine_type ?? '').toLowerCase().includes('bar') || (r.cuisine_type ?? '').toLowerCase().includes('cocktail');
  if (chipId === 'food') return !!(r.menu_items?.some((i) => i.category?.toLowerCase() === 'food' && i.happy_hour_price != null));
  if (chipId === 'under5') return !!(r.menu_items?.some((i) => i.happy_hour_price != null && i.happy_hour_price < 5));
  const vibes = VIBE_CHIP_MAP[chipId];
  if (vibes) {
    const tags = (r.vibe_tags ?? []).map((t) => t.toLowerCase());
    return vibes.some((v) => tags.includes(v.toLowerCase()));
  }
  return true;
}
