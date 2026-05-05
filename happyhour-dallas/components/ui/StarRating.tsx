import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '@/constants/theme';

interface Props {
  rating: number;
  reviewCount?: number;
  size?: number;
  showStars?: boolean;
}

export default function StarRating({ rating, reviewCount, size = 11, showStars = false }: Props) {
  return (
    <View style={styles.row}>
      {showStars
        ? [1, 2, 3, 4, 5].map((i) => (
            <Ionicons
              key={i}
              name={i <= Math.round(rating) ? 'star' : 'star-outline'}
              size={size}
              color={COLORS.gold}
            />
          ))
        : <Ionicons name="star" size={size} color={COLORS.gold} />
      }
      <Text style={[styles.rating, { fontSize: size }]}>{rating.toFixed(1)}</Text>
      {reviewCount != null && (
        <Text style={[styles.count, { fontSize: size - 1 }]}>({reviewCount})</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  rating: { fontFamily: FONTS.dmMedium, color: COLORS.gold },
  count: { fontFamily: FONTS.dmRegular, color: COLORS.muted },
});
