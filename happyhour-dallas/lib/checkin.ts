import { supabase } from '@/lib/supabase';

export interface CheckInResult {
  success: boolean;
  pointsEarned: number;
  isDuplicate: boolean;
  isNewNeighborhood: boolean;
  badgesEarned: string[];
  error?: string;
}

const POINTS_PER_CHECKIN = 10;
const POINTS_NEW_NEIGHBORHOOD = 25;

// badge_type → { badge_name, neighborhood, threshold }
const NEIGHBORHOOD_BADGE_MAP: Record<string, { badge_name: string; neighborhood: string; threshold: number }> = {
  uptown_regular:  { badge_name: 'Uptown Regular',  neighborhood: 'uptown',  threshold: 3 },
  ellum_explorer:  { badge_name: 'Ellum Explorer',   neighborhood: 'ellum',   threshold: 2 },
};

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
    return { success: false, pointsEarned: 0, isDuplicate: true, isNewNeighborhood: false, badgesEarned: [] };
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

  // Insert checkin row
  const { error: checkinError } = await supabase
    .from('checkins')
    .insert({ user_id: userId, restaurant_id: restaurantId, points_earned: pointsEarned });

  if (checkinError) {
    return { success: false, pointsEarned: 0, isDuplicate: false, isNewNeighborhood: false, badgesEarned: [], error: checkinError.message };
  }

  // Upsert passport stamp for neighborhood
  if (neighborhood) {
    await supabase
      .from('passport_stamps')
      .upsert({ user_id: userId, restaurant_id: restaurantId, neighborhood }, { onConflict: 'user_id,neighborhood' });
  }

  // Increment user's points (use RPC, fallback to direct update)
  const { error: rpcError } = await supabase.rpc('increment_user_points', { p_user_id: userId, p_points: pointsEarned });
  if (rpcError) {
    const { data: profileData } = await supabase.from('profiles').select('points').eq('id', userId).single();
    await supabase.from('profiles').update({ points: (profileData?.points ?? 0) + pointsEarned }).eq('id', userId);
  }

  // Check and award badges
  const badgesEarned = await awardBadges(userId, neighborhood, isNewNeighborhood);

  return { success: true, pointsEarned, isDuplicate: false, isNewNeighborhood, badgesEarned };
}

async function awardBadges(
  userId: string,
  neighborhood: string | null,
  isNewNeighborhood: boolean
): Promise<string[]> {
  const toAward: Array<{ user_id: string; badge_type: string; badge_name: string }> = [];

  // Fetch all current user checkins (needed for multiple counts below)
  const { data: allCheckins } = await supabase
    .from('checkins')
    .select('id, restaurants(neighborhood)')
    .eq('user_id', userId);

  const checkinList = allCheckins ?? [];

  // ── First Timer ──────────────────────────────────────────────────────────
  if (checkinList.length === 1) {
    toAward.push({ user_id: userId, badge_type: 'first_timer', badge_name: 'First Timer' });
  }

  // ── Neighborhood-specific badges ─────────────────────────────────────────
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

  // ── Neighborhood Pro — all 8 unlocked ────────────────────────────────────
  if (isNewNeighborhood) {
    const { count: unlockedCount } = await supabase
      .from('passport_stamps')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (unlockedCount === 8) {
      toAward.push({ user_id: userId, badge_type: 'neighborhood_pro', badge_name: 'Neighborhood Pro' });
    }
  }

  if (!toAward.length) return [];

  // Upsert — unique constraint on (user_id, badge_type) prevents duplicates
  const { data: inserted, error } = await supabase
    .from('user_badges')
    .upsert(toAward, { onConflict: 'user_id,badge_type', ignoreDuplicates: true })
    .select('badge_name');

  if (error) return [];
  return (inserted ?? []).map((b: any) => b.badge_name);
}
