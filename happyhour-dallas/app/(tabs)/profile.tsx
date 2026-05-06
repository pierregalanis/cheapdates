import { View, Text, TouchableOpacity, Switch, ScrollView, StyleSheet, ActivityIndicator, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';
import { useLocationStore } from '@/store/locationStore';
import { supabase } from '@/lib/supabase';
import { LINKS } from '@/constants/links';
import { BADGE_META } from '@/lib/checkin';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_NEIGHBORHOODS = [
  'Deep Ellum', 'Uptown', 'Oak Cliff', 'Bishop Arts',
  'Lower Greenville', 'Knox-Henderson', 'Design District', 'Lakewood',
  'Addison', 'Frisco', 'Plano', 'Richardson', 'Irving', 'Garland',
];

// ─── Settings row ─────────────────────────────────────────────────────────────

function SettingsRow({
  icon, label, sub, right, onPress, danger,
}: {
  icon: string; label: string; sub?: string;
  right?: React.ReactNode; onPress?: () => void; danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.settingsRow}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.settingsIcon, danger && styles.settingsIconDanger]}>
        <Ionicons name={icon as any} size={17} color={danger ? COLORS.status.error : COLORS.orange} />
      </View>
      <View style={styles.settingsLabel}>
        <Text style={[styles.settingsLabelText, danger && { color: COLORS.status.error }]}>{label}</Text>
        {sub && <Text style={styles.settingsSub}>{sub}</Text>}
      </View>
      {right ?? (onPress && !danger && (
        <Ionicons name="chevron-forward" size={15} color={COLORS.muted} />
      ))}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { user, profile, refreshProfile, ownedRestaurant, signOut } = useAuthStore();
  const { isSharing, permissionGranted, loading: locationLoading, toggle } = useLocationStore();

  const [stats, setStats] = useState({ checkins: 0, reviews: 0, stamps: 0 });
  const [badges, setBadges] = useState<Array<{ badge_type: string; badge_name: string }>>([]);
  const [earnedNeighborhoods, setEarnedNeighborhoods] = useState<string[]>([]);
  const [socialCounts, setSocialCounts] = useState({ following: 0, followers: 0 });

  useEffect(() => {
    if (!user) return;
    refreshProfile();
    Promise.all([
      supabase.from('checkins').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('passport_stamps').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('user_badges').select('badge_type, badge_name').eq('user_id', user.id),
      supabase.from('passport_stamps').select('neighborhood').eq('user_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
    ]).then(([c, r, s, b, stamps, following, followers]) => {
      setStats({ checkins: c.count ?? 0, reviews: r.count ?? 0, stamps: s.count ?? 0 });
      setBadges((b.data as any[]) ?? []);
      setEarnedNeighborhoods((stamps.data ?? []).map((s: any) => s.neighborhood));
      setSocialCounts({ following: following.count ?? 0, followers: followers.count ?? 0 });
    });
  }, [user?.id]);

  const handleSignOut = async () => { await signOut(); };
  const handleLocationToggle = () => { if (user) toggle(user.id); };

  // ── Signed out ──
  if (!user) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.gateContent}>
          <LinearGradient
            colors={['rgba(255,107,26,0.15)', 'rgba(255,107,26,0.04)', 'transparent']}
            style={styles.gateIconArea}
          >
            <Ionicons name="person-outline" size={52} color={COLORS.orange} />
          </LinearGradient>
          <Text style={styles.gateTitle}>Join Cheap Dates</Text>
          <Text style={styles.gateSub}>
            Track check-ins, earn rewards,{'\n'}save your favorite spots, and{'\n'}climb the leaderboard
          </Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.signInText}>Sign In / Create Account</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Signed in ──
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Avatar + name ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <Ionicons name="person" size={48} color={COLORS.orange} />
          </View>
          <Text style={styles.displayName}>{profile?.full_name ?? user.email}</Text>
          {profile?.full_name && (
            <Text style={styles.emailSub}>{user.email}</Text>
          )}
          <TouchableOpacity style={styles.levelPill} onPress={() => router.push('/leaderboard' as any)}>
            <Ionicons name="ribbon-outline" size={12} color={COLORS.gold} />
            <Text style={styles.levelText}>
              {profile?.level ?? 'Newcomer'} · {profile?.points ?? 0} pts
            </Text>
            <Ionicons name="chevron-forward" size={11} color={COLORS.gold} />
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <View style={styles.statsRow}>
          {[
            { label: 'Check-ins', value: String(stats.checkins) },
            { label: 'Reviews',   value: String(stats.reviews)  },
            { label: 'Stamps',    value: String(stats.stamps)   },
          ].map((stat) => (
            <View key={stat.label} style={styles.statBox}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Badges ── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <Text style={styles.sectionCount}>{badges.length} earned</Text>
          </View>

          {badges.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyCardText}>Check in to earn your first badge</Text>
            </View>
          ) : (
            <View style={styles.badgeGrid}>
              {badges.map((badge) => {
                const meta = BADGE_META[badge.badge_type] ?? { emoji: '🏅', color: COLORS.orange, description: '' };
                return (
                  <View key={badge.badge_type} style={[styles.badgeChip, { borderColor: meta.color + '40', backgroundColor: meta.color + '12' }]}>
                    <Text style={styles.badgeEmoji}>{meta.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.badgeName, { color: meta.color }]}>{badge.badge_name}</Text>
                      {meta.description ? (
                        <Text style={styles.badgeDesc}>{meta.description}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Passport ── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Dallas Passport</Text>
            <Text style={styles.sectionCount}>{earnedNeighborhoods.length}/{ALL_NEIGHBORHOODS.length}</Text>
          </View>
          <View style={styles.passportGrid}>
            {ALL_NEIGHBORHOODS.map((hood) => {
              const earned = earnedNeighborhoods.includes(hood);
              return (
                <View
                  key={hood}
                  style={[
                    styles.passportStamp,
                    earned ? styles.passportStampEarned : styles.passportStampEmpty,
                  ]}
                >
                  <Text style={[styles.passportStampIcon, !earned && { opacity: 0.25 }]}>
                    {earned ? '🗺️' : '○'}
                  </Text>
                  <Text
                    style={[styles.passportStampName, earned ? styles.passportStampNameEarned : styles.passportStampNameEmpty]}
                    numberOfLines={2}
                  >
                    {hood}
                  </Text>
                  {earned && (
                    <View style={styles.passportStampCheck}>
                      <Ionicons name="checkmark" size={9} color={COLORS.orange} />
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Social ── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Social</Text>
          </View>
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialStat} onPress={() => router.push({ pathname: '/friends' as any, params: { tab: 'following' } })}>
              <Text style={styles.socialCount}>{socialCounts.following}</Text>
              <Text style={styles.socialLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.socialDivider} />
            <TouchableOpacity style={styles.socialStat} onPress={() => router.push({ pathname: '/friends' as any, params: { tab: 'followers' } })}>
              <Text style={styles.socialCount}>{socialCounts.followers}</Text>
              <Text style={styles.socialLabel}>Followers</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.socialBtns}>
            <TouchableOpacity style={styles.socialBtn} onPress={() => router.push('/friends' as any)}>
              <Ionicons name="person-add-outline" size={15} color={COLORS.orange} />
              <Text style={styles.socialBtnText}>Find Friends</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialBtn} onPress={() => router.push('/activity' as any)}>
              <Ionicons name="pulse-outline" size={15} color={COLORS.orange} />
              <Text style={styles.socialBtnText}>Activity Feed</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Location sharing ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.locationCard}>
            {isSharing && (
              <LinearGradient
                colors={['rgba(52,199,89,0.18)', 'transparent']}
                style={styles.locationActiveBar}
              >
                <View style={styles.locationActiveDot} />
                <Text style={styles.locationActiveText}>Sharing your location with nearby restaurants</Text>
              </LinearGradient>
            )}
            <View style={styles.locationToggleRow}>
              <View style={styles.locationIconBg}>
                <Ionicons
                  name={isSharing ? 'navigate' : 'navigate-outline'}
                  size={18}
                  color={isSharing ? COLORS.status.success : COLORS.muted}
                />
              </View>
              <View style={styles.locationLabelWrap}>
                <Text style={styles.locationLabel}>Share my location</Text>
                <Text style={styles.locationSub}>
                  {isSharing ? 'Active · foreground only' : "Off · restaurants can't see you"}
                </Text>
              </View>
              {locationLoading ? (
                <ActivityIndicator size="small" color={COLORS.orange} />
              ) : (
                <Switch
                  value={isSharing}
                  onValueChange={handleLocationToggle}
                  trackColor={{ false: COLORS.overlay.inputBg, true: 'rgba(52,199,89,0.35)' }}
                  thumbColor={isSharing ? COLORS.status.success : COLORS.muted}
                  ios_backgroundColor={COLORS.overlay.inputBg}
                />
              )}
            </View>
            {!permissionGranted && !isSharing && (
              <View style={styles.permissionNote}>
                <Ionicons name="information-circle-outline" size={13} color={COLORS.amber} />
                <Text style={styles.permissionNoteText}>
                  Location permission required. Enable in Settings if prompted.
                </Text>
              </View>
            )}
            <View style={styles.locationPrivacyNote}>
              <Ionicons name="shield-checkmark-outline" size={13} color={COLORS.muted} />
              <Text style={styles.locationPrivacyText}>
                Optional and anonymous. Only active while the app is open. Restaurants see you're nearby — never your exact name or profile.
              </Text>
            </View>
          </View>
        </View>

        {/* ── Restaurant owner ── */}
        {ownedRestaurant && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Restaurant</Text>
            <TouchableOpacity activeOpacity={0.82} onPress={() => router.push('/owner/dashboard' as any)}>
              <LinearGradient
                colors={['rgba(255,107,26,0.18)', 'rgba(255,107,26,0.06)']}
                style={styles.ownerCard}
              >
                <View style={styles.ownerLeft}>
                  <Text style={styles.ownerName}>{ownedRestaurant.name}</Text>
                  {ownedRestaurant.neighborhood && (
                    <Text style={styles.ownerNeighborhood}>{ownedRestaurant.neighborhood}</Text>
                  )}
                </View>
                <View style={styles.ownerRight}>
                  {ownedRestaurant.is_verified && (
                    <View style={styles.ownerVerified}>
                      <Ionicons name="checkmark-circle" size={13} color={COLORS.orange} />
                      <Text style={styles.ownerVerifiedText}>Verified</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={COLORS.orange} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Account settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsCard}>
            <SettingsRow
              icon="trophy-outline"
              label="Leaderboard"
              sub="See where you rank in Dallas"
              onPress={() => router.push('/leaderboard' as any)}
            />
            <View style={styles.rowSep} />
            <SettingsRow
              icon="notifications-outline"
              label="Notifications"
              sub="Deal alerts, reminders, friends"
              onPress={() => Linking.openSettings()}
            />
            <View style={styles.rowSep} />
            <SettingsRow
              icon="person-outline"
              label="Edit Profile"
              sub="Name, bio, neighborhood"
              onPress={() => router.push('/edit-profile' as any)}
            />
            <View style={styles.rowSep} />
            <SettingsRow
              icon="help-circle-outline"
              label="Help & Support"
              sub={LINKS.support.replace('mailto:', '')}
              onPress={() => Linking.openURL(LINKS.support)}
            />
            <View style={styles.rowSep} />
            <SettingsRow
              icon="log-out-outline"
              label="Sign Out"
              onPress={handleSignOut}
              danger
            />
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.footerLinks}>
            <TouchableOpacity onPress={() => Linking.openURL(LINKS.privacy)}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL(LINKS.terms)}>
              <Text style={styles.footerLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>·</Text>
            <TouchableOpacity onPress={() => Linking.openURL(LINKS.support)}>
              <Text style={styles.footerLink}>Support</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.version}>Cheap Dates · v1.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },

  header: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.border.subtle,
  },
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 24, color: COLORS.cream },

  scrollContent: { paddingBottom: 48 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingTop: SPACING.xl, paddingBottom: SPACING.lg },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.overlay.orange10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.border.default,
    marginBottom: SPACING.md,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 12, elevation: 5,
  },
  displayName: { fontFamily: FONTS.dmMedium, fontSize: 16, color: COLORS.cream, marginBottom: 2 },
  emailSub: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted, marginBottom: SPACING.sm },
  levelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(232,168,48,0.12)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: 'rgba(232,168,48,0.25)',
  },
  levelText: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.gold },

  // Stats
  statsRow: {
    flexDirection: 'row', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.xl,
  },
  statBox: {
    flex: 1, alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg, paddingVertical: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  statValue: { fontFamily: FONTS.playfair, fontSize: 22, color: COLORS.orange },
  statLabel: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted, marginTop: 2 },

  // Section
  section: { marginHorizontal: SPACING.lg, marginBottom: SPACING.xl },
  sectionTitleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  sectionTitle: {
    fontFamily: FONTS.dmMedium, fontSize: 11,
    color: COLORS.muted, letterSpacing: 0.8, textTransform: 'uppercase',
  },
  sectionCount: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },

  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    padding: SPACING.lg, alignItems: 'center',
  },
  emptyCardText: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted },

  // Badges
  badgeGrid: { gap: SPACING.sm },
  badgeChip: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    borderRadius: RADIUS.lg, borderWidth: 1,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  badgeEmoji: { fontSize: 24 },
  badgeName: { fontFamily: FONTS.dmMedium, fontSize: 13 },
  badgeDesc: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted, marginTop: 1 },

  // Passport
  passportGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
  },
  passportStamp: {
    width: '31%', aspectRatio: 1,
    borderRadius: RADIUS.lg, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    padding: SPACING.xs, position: 'relative',
  },
  passportStampEarned: {
    backgroundColor: COLORS.overlay.orange10,
    borderColor: COLORS.border.default,
  },
  passportStampEmpty: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border.subtle,
  },
  passportStampIcon: { fontSize: 20, marginBottom: 4 },
  passportStampName: {
    fontFamily: FONTS.dmMedium, fontSize: 10,
    textAlign: 'center', lineHeight: 13,
  },
  passportStampNameEarned: { color: COLORS.cream },
  passportStampNameEmpty: { color: COLORS.muted },
  passportStampCheck: {
    position: 'absolute', top: 5, right: 5,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: COLORS.orange,
    alignItems: 'center', justifyContent: 'center',
  },

  // Social
  socialRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
  socialStat: { flex: 1, alignItems: 'center', paddingVertical: SPACING.md },
  socialCount: { fontFamily: FONTS.playfair, fontSize: 22, color: COLORS.orange },
  socialLabel: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted, marginTop: 2 },
  socialDivider: { width: 1, backgroundColor: COLORS.border.subtle, marginVertical: SPACING.sm },
  socialBtns: { flexDirection: 'row', gap: SPACING.sm },
  socialBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  socialBtnText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange },

  // Location card
  locationCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle, overflow: 'hidden',
  },
  locationActiveBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderBottomWidth: 1, borderBottomColor: 'rgba(52,199,89,0.20)',
  },
  locationActiveDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: COLORS.status.success },
  locationActiveText: { fontFamily: FONTS.dmMedium, fontSize: 11, color: COLORS.status.success, flex: 1 },
  locationToggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg,
  },
  locationIconBg: {
    width: 36, height: 36, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  locationLabelWrap: { flex: 1 },
  locationLabel: { fontFamily: FONTS.dmMedium, fontSize: 15, color: COLORS.cream },
  locationSub: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, marginTop: 2 },
  permissionNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm,
  },
  permissionNoteText: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.amber, flex: 1, lineHeight: 17 },
  locationPrivacyNote: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    padding: SPACING.lg, paddingTop: 0,
    borderTopWidth: 1, borderTopColor: COLORS.border.subtle, marginTop: SPACING.xs,
  },
  locationPrivacyText: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, flex: 1, lineHeight: 17 },

  // Settings card
  settingsCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border.subtle, overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
  },
  settingsIcon: {
    width: 34, height: 34, borderRadius: RADIUS.sm,
    backgroundColor: COLORS.overlay.orange10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  settingsIconDanger: {
    backgroundColor: 'rgba(255,59,48,0.08)', borderColor: 'rgba(255,59,48,0.20)',
  },
  settingsLabel: { flex: 1 },
  settingsLabelText: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.cream },
  settingsSub: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted, marginTop: 1 },
  rowSep: { height: 1, backgroundColor: COLORS.border.subtle, marginLeft: 58 },

  // Owner card
  ownerCard: {
    borderRadius: RADIUS.xl, padding: SPACING.lg,
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border.strong,
  },
  ownerLeft: { flex: 1 },
  ownerName: { fontFamily: FONTS.dmMedium, fontSize: 16, color: COLORS.cream, marginBottom: 2 },
  ownerNeighborhood: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  ownerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  ownerVerified: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ownerVerifiedText: { fontFamily: FONTS.dmMedium, fontSize: 11, color: COLORS.orange },

  // Footer
  footer: { alignItems: 'center', paddingBottom: SPACING.xl },
  footerLinks: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm,
  },
  footerLink: { fontFamily: FONTS.dmMedium, fontSize: 12, color: COLORS.muted },
  footerDot: { fontFamily: FONTS.dmRegular, fontSize: 10, color: COLORS.muted },
  version: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted, textAlign: 'center' },

  // Gate (signed out)
  gateContent: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  gateIconArea: {
    width: 110, height: 110, borderRadius: 55,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xl,
  },
  gateTitle: {
    fontFamily: FONTS.playfair, fontSize: 26,
    color: COLORS.cream, textAlign: 'center', marginBottom: SPACING.sm,
  },
  gateSub: {
    fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.muted,
    textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl,
  },
  signInBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.xxl, paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  signInText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#FFFFFF' },
});
