import { supabase } from '@/lib/supabase';

export interface CheckInResult {
  success: boolean;
  pointsEarned: number;
  isDuplicate: boolean;
  isNewNeighborhood: boolean;
  badgesEarned: string[];
  leveledUpTo: string | null;
  error?: string;
}

const POINTS_PER_CHECKIN = 10;
const POINTS_NEW_NEIGHBORHOOD = 30; // per brief

// ─── Level system ─────────────────────────────────────────────────────────────

const LEVEL_THRESHOLDS = [
  { name: 'Happy Hour Hero', minPoints: 1000 },
  { name: 'VIP',             minPoints: 500  },
  { name: 'Regular',         minPoints: 100  },
  { name: 'Newcomer',        minPoints: 0    },
];

function calcLevel(points: number): string {
  return LEVEL_THRESHOLDS.find((l) => points >= l.minPoints)?.name ?? 'Newcomer';
}

// ─── Badge definitions ────────────────────────────────────────────────────────

// Milestone badges by total check-in count
const CHECKIN_MILESTONES: Array<{ count: number; badge_type: string; badge_name: string }> = [
  { count: 1,  badge_type: 'first_timer',       badge_name: 'First Timer'        },
  { count: 5,  badge_type: 'check_in_5',        badge_name: 'Getting Started'    },
  { count: 10, badge_type: 'check_in_10',       badge_name: 'Local Regular'      },
  { count: 25, badge_type: 'check_in_25',       badge_name: 'Happy Hour Veteran' },
];

// Neighborhood-specific check-in badges
const NEIGHBORHOOD_BADGE_MAP: Record<string, { badge_name: string; neighborhood: string; threshold: number }> = {
  uptown_regular:     { badge_name: 'Uptown Regular',     neighborhood: 'Uptown',          threshold: 3 },
  deep_ellum_regular: { badge_name: 'Ellum Regular',      neighborhood: 'Deep Ellum',      threshold: 3 },
  oak_cliff_regular:  { badge_name: 'Oak Cliff Regular',  neighborhood: 'Oak Cliff',       threshold: 3 },
  bishop_arts_fan:    { badge_name: 'Bishop Arts Fan',    neighborhood: 'Bishop Arts',     threshold: 2 },
  greenville_local:   { badge_name: 'Greenville Local',   neighborhood: 'Lower Greenville',threshold: 3 },
};

// Passport stamp count badges
const STAMP_MILESTONES: Array<{ count: number; badge_type: string; badge_name: string }> = [
  { count: 5,  badge_type: 'neighborhood_explorer', badge_name: 'Neighborhood Explorer' },
  { count: 8,  badge_type: 'neighborhood_pro',      badge_name: 'Neighborhood Pro'      },
  { count: 10, badge_type: 'dallas_explorer',       badge_name: 'Dallas Explorer'       },
];

// ─── Main check-in function ───────────────────────────────────────────────────

export async function checkIn(
  userId: string,
  restaurantId: string,
  neighborhood: string | null
): Promise<CheckInResult> {
  // Prevent double check-in within the same calendar day
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: existing } = await supabase
    .from('checkins')
    .select('id')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .gte('created_at', today.toISOString())
    .maybeSingle();

  if (existing) {
    return { success: false, pointsEarned: 0, isDuplicate: true, isNewNeighborhood: false, badgesEarned: [], leveledUpTo: null };
  }

  // Determine if this neighborhood stamp is new
  let isNewNeighborhood = false;
  if (neighborhood) {
    const { data: stamp } = await supabase
      .from('passport_stamps')
      .select('id')
      .eq('user_id', userId)
      .eq('neighborhood', neighborhood)
      .maybeSingle();
    isNewNeighborhood = !stamp;
  }

  const pointsEarned = POINTS_PER_CHECKIN + (isNewNeighborhood ? POINTS_NEW_NEIGHBORHOOD : 0);

  // Fetch current points before update (for level-up detection)
  const { data: profileBefore } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();
  const pointsBefore = profileBefore?.points ?? 0;

  // Insert check-in row
  const { error: checkinError } = await supabase
    .from('checkins')
    .insert({ user_id: userId, restaurant_id: restaurantId, points_earned: pointsEarned });

  if (checkinError) {
    return { success: false, pointsEarned: 0, isDuplicate: false, isNewNeighborhood: false, badgesEarned: [], leveledUpTo: null, error: checkinError.message };
  }

  // Upsert passport stamp for neighborhood
  if (neighborhood) {
    await supabase
      .from('passport_stamps')
      .upsert({ user_id: userId, restaurant_id: restaurantId, neighborhood }, { onConflict: 'user_id,neighborhood' });
  }

  // Increment user's points (RPC, fallback to direct update)
  const pointsAfter = pointsBefore + pointsEarned;
  const { error: rpcError } = await supabase.rpc('increment_user_points', { p_user_id: userId, p_points: pointsEarned });
  if (rpcError) {
    const newLevel = calcLevel(pointsAfter);
    await supabase.from('profiles').update({ points: pointsAfter, level: newLevel }).eq('id', userId);
  }

  // Detect level-up
  const levelBefore = calcLevel(pointsBefore);
  const levelAfter = calcLevel(pointsAfter);
  const leveledUpTo = levelAfter !== levelBefore ? levelAfter : null;

  // Award badges
  const badgesEarned = await awardBadges(userId, neighborhood, isNewNeighborhood);

  return { success: true, pointsEarned, isDuplicate: false, isNewNeighborhood, badgesEarned, leveledUpTo };
}

// ─── Badge awarding ───────────────────────────────────────────────────────────

async function awardBadges(
  userId: string,
  neighborhood: string | null,
  isNewNeighborhood: boolean
): Promise<string[]> {
  const toAward: Array<{ user_id: string; badge_type: string; badge_name: string }> = [];

  // Fetch all current user check-ins
  const { data: allCheckins } = await supabase
    .from('checkins')
    .select('id, restaurants(neighborhood)')
    .eq('user_id', userId);

  const checkinList = allCheckins ?? [];
  const totalCheckins = checkinList.length;

  // ── Milestone badges (by total check-in count) ────────────────────────────
  for (const milestone of CHECKIN_MILESTONES) {
    if (totalCheckins === milestone.count) {
      toAward.push({ user_id: userId, badge_type: milestone.badge_type, badge_name: milestone.badge_name });
    }
  }

  // ── Neighborhood-specific badges ──────────────────────────────────────────
  if (neighborhood) {
    const hoodCount = checkinList.filter(
      (c: any) => c.restaurants?.neighborhood === neighborhood
    ).length;

    for (const [badge_type, def] of Object.entries(NEIGHBORHOOD_BADGE_MAP)) {
      if (def.neighborhood === neighborhood && hoodCount === def.threshold) {
        toAward.push({ user_id: userId, badge_type, badge_name: def.badge_name });
      }
    }
  }

  // ── Passport stamp count badges ───────────────────────────────────────────
  if (isNewNeighborhood) {
    const { count: stampCount } = await supabase
      .from('passport_stamps')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    for (const milestone of STAMP_MILESTONES) {
      if (stampCount === milestone.count) {
        toAward.push({ user_id: userId, badge_type: milestone.badge_type, badge_name: milestone.badge_name });
      }
    }
  }

  if (!toAward.length) return [];

  const { data: inserted, error } = await supabase
    .from('user_badges')
    .upsert(toAward, { onConflict: 'user_id,badge_type', ignoreDuplicates: true })
    .select('badge_name');

  if (error) return [];
  return (inserted ?? []).map((b: any) => b.badge_name);
}

// ─── Badge metadata (for UI display) ─────────────────────────────────────────

export const BADGE_META: Record<string, { emoji: string; color: string; description: string }> = {
  first_timer:           { emoji: '🎉', color: '#34C759', description: 'First check-in ever'            },
  check_in_5:            { emoji: '⭐', color: '#FFB347', description: '5 total check-ins'              },
  check_in_10:           { emoji: '🏆', color: '#FF6B1A', description: '10 total check-ins'             },
  check_in_25:           { emoji: '🌟', color: '#E8A830', description: '25 total check-ins'             },
  uptown_regular:        { emoji: '🍸', color: '#FF6B1A', description: '3 check-ins in Uptown'          },
  deep_ellum_regular:    { emoji: '🎵', color: '#FF6B1A', description: '3 check-ins in Deep Ellum'      },
  oak_cliff_regular:     { emoji: '🌮', color: '#FF6B1A', description: '3 check-ins in Oak Cliff'       },
  bishop_arts_fan:       { emoji: '🎨', color: '#FF6B1A', description: '2 check-ins in Bishop Arts'     },
  greenville_local:      { emoji: '🌿', color: '#34C759', description: '3 check-ins in Lower Greenville' },
  neighborhood_explorer: { emoji: '🗺️', color: '#0A84FF', description: '5 unique neighborhoods'         },
  neighborhood_pro:      { emoji: '🏙️', color: '#E8A830', description: '8 unique neighborhoods'         },
  dallas_explorer:       { emoji: '🤠', color: '#FF6B1A', description: '10 unique neighborhoods'        },
};
