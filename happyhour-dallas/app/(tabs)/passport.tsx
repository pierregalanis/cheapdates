import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

export default function PassportScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Happy Hour Passport</Text>
        <Text style={styles.headerSub}>Collect stamps across Dallas neighborhoods</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.iconRing}>
          <Ionicons name="book" size={48} color={COLORS.gold} />
        </View>
        <Text style={styles.title}>Your Passport Awaits</Text>
        <Text style={styles.subtitle}>
          Check in at spots across{'\n'}Deep Ellum, Uptown, Oak Cliff{'\n'}and more to earn stamps
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Sign In to Start Collecting</Text>
        </View>
      </View>
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
  headerSub: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.muted, marginTop: 3 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(232,168,48,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232,168,48,0.25)',
    marginBottom: SPACING.xl,
  },
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
  badge: {
    backgroundColor: 'rgba(255,107,26,0.12)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.30)',
  },
  badgeText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange },
});
