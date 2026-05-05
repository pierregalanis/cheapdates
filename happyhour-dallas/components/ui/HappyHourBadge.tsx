import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

interface Props {
  minLeft: number;
  endTime?: string;
  style?: object;
}

function countdownColor(min: number) {
  if (min <= 0)  return COLORS.muted;
  if (min <= 30) return COLORS.status.error;
  if (min <= 60) return COLORS.amber;
  return COLORS.orange;
}

function formatCountdown(min: number) {
  if (min <= 0) return 'Ended';
  if (min < 60) return `${min}m left`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h left`;
}

export default function HappyHourBadge({ minLeft, endTime, style }: Props) {
  const color = countdownColor(minLeft);
  return (
    <View style={[styles.badge, { borderColor: color + '40', backgroundColor: color + '15' }, style]}>
      <Ionicons name="time-outline" size={11} color={color} />
      <Text style={[styles.text, { color }]}>
        {formatCountdown(minLeft)}{endTime ? ` · until ${endTime}` : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  text: { fontFamily: FONTS.dmMedium, fontSize: 11 },
});
