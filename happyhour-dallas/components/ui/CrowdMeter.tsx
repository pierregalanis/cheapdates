import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING } from '@/constants/theme';

export const CROWD_CONFIG = {
  0: { label: 'Unknown',      color: COLORS.muted,  glow: 'rgba(138,106,80,0.05)' },
  1: { label: 'Quiet',        color: '#34C759',      glow: 'rgba(52,199,89,0.28)'  },
  2: { label: 'Getting Busy', color: '#FFB347',      glow: 'rgba(255,179,71,0.28)' },
  3: { label: 'Busy',         color: '#FF6B1A',      glow: 'rgba(255,107,26,0.38)' },
  4: { label: 'Packed 🔥',   color: '#FF3B30',      glow: 'rgba(255,59,48,0.38)'  },
} as const;

export type CrowdLevel = keyof typeof CROWD_CONFIG;

interface Props {
  level: number;
  showLabel?: boolean;
}

export default function CrowdMeter({ level, showLabel = false }: Props) {
  const cfg = CROWD_CONFIG[level as CrowdLevel] ?? CROWD_CONFIG[0];
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4].map((bar) => (
        <View
          key={bar}
          style={[styles.bar, bar <= level && { backgroundColor: cfg.color }]}
        />
      ))}
      {showLabel && (
        <Text style={[styles.label, { color: cfg.color }]}>{cfg.label}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bar: { width: 14, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,248,240,0.10)' },
  label: { fontFamily: FONTS.dmMedium, fontSize: 11, marginLeft: SPACING.xs },
});
