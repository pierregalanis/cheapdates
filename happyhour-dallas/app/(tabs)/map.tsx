import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <View style={styles.iconRing}>
          <Ionicons name="map" size={48} color={COLORS.orange} />
        </View>
        <Text style={styles.title}>Neighborhood Map</Text>
        <Text style={styles.subtitle}>
          See every active happy hour on an{'\n'}interactive Dallas heat map
        </Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Coming Soon</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xxxl },
  iconRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,107,26,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,26,0.25)',
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
