import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';
import { useAuthStore } from '@/store/authStore';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {user ? (
        <View style={styles.content}>
          <View style={styles.avatarRing}>
            <Ionicons name="person" size={48} color={COLORS.orange} />
          </View>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.level}>Newcomer · 0 pts</Text>

          <View style={styles.statsRow}>
            {[
              { label: 'Check-ins', value: '0' },
              { label: 'Reviews', value: '0' },
              { label: 'Stamps', value: '0' },
            ].map((stat) => (
              <View key={stat.label} style={styles.statBox}>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
            <Ionicons name="log-out-outline" size={18} color={COLORS.status.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.avatarRing}>
            <Ionicons name="person-outline" size={48} color={COLORS.muted} />
          </View>
          <Text style={styles.title}>Join HappyHour Dallas</Text>
          <Text style={styles.subtitle}>
            Track check-ins, earn rewards,{'\n'}save your favorite spots, and{'\n'}climb the leaderboard
          </Text>
          <TouchableOpacity style={styles.signInBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.signInText}>Sign In / Create Account</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,107,26,0.12)',
  },
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 24, color: COLORS.cream },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.overlay.orange10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.default,
    marginBottom: SPACING.lg,
  },
  email: { fontFamily: FONTS.dmMedium, fontSize: 16, color: COLORS.cream, marginBottom: 4 },
  level: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted, marginBottom: SPACING.xl },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  statValue: { fontFamily: FONTS.playfair, fontSize: 22, color: COLORS.orange },
  statLabel: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted, marginTop: 2 },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.30)',
    backgroundColor: 'rgba(255,59,48,0.08)',
  },
  signOutText: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.status.error },
  title: {
    fontFamily: FONTS.playfair,
    fontSize: 26,
    color: COLORS.cream,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONTS.dmRegular,
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  signInBtn: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  signInText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#FFFFFF' },
});
