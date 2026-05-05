import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

export default function MapScreenWeb() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.iconRing}>
          <Ionicons name="map-outline" size={48} color={COLORS.orange} />
        </View>
        <Text style={styles.title}>Map view</Text>
        <Text style={styles.subtitle}>
          The interactive map is available in the{'\n'}iOS and Android apps
        </Text>
        <View style={styles.badge}>
          <Ionicons name="phone-portrait-outline" size={13} color={COLORS.orange} />
          <Text style={styles.badgeText}>Native app only</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  iconRing: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.overlay.orange10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.default,
    marginBottom: SPACING.xl,
  },
  title: { fontFamily: FONTS.playfair, fontSize: 26, color: COLORS.cream, marginBottom: SPACING.sm },
  subtitle: {
    fontFamily: FONTS.dmRegular, fontSize: 15,
    color: COLORS.muted, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl,
  },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.overlay.orange10,
    paddingHorizontal: 18, paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: COLORS.border.default,
  },
  badgeText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange },
});
