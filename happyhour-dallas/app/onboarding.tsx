import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

const { width: W } = Dimensions.get('window');

export const ONBOARDING_KEY = 'has_seen_onboarding';

const SLIDES = [
  {
    key: 'discover',
    emoji: '🍸',
    gradient: ['rgba(255,107,26,0.22)', 'rgba(255,107,26,0.06)', 'transparent'] as const,
    glowColor: 'rgba(255,107,26,0.35)',
    title: 'Happy hours near\nyou, right now',
    body: 'Every active deal, sorted by what\'s happening tonight. No more Googling "happy hour near me."',
    detail: 'Hundreds of verified spots',
    detailIcon: 'location' as const,
  },
  {
    key: 'passport',
    emoji: '📖',
    gradient: ['rgba(232,168,48,0.22)', 'rgba(232,168,48,0.06)', 'transparent'] as const,
    glowColor: 'rgba(232,168,48,0.35)',
    title: 'Earn stamps,\nlevel up',
    body: 'Check in at spots across your city to collect neighborhood stamps, badges, and climb the leaderboard.',
    detail: 'Neighborhoods · Badges · Leaderboard',
    detailIcon: 'ribbon' as const,
  },
  {
    key: 'alerts',
    emoji: '🔔',
    gradient: ['rgba(52,199,89,0.20)', 'rgba(52,199,89,0.05)', 'transparent'] as const,
    glowColor: 'rgba(52,199,89,0.30)',
    title: 'Never miss\na deal',
    body: 'Get alerts before happy hour ends, when your favorite spots get busy, and when friends check in nearby.',
    detail: 'Optional · turn off anytime',
    detailIcon: 'shield-checkmark' as const,
  },
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList>(null);
  const dotAnim = useRef(SLIDES.map(() => new Animated.Value(0))).current;

  const animateDots = (toIndex: number) => {
    SLIDES.forEach((_, i) => {
      Animated.timing(dotAnim[i], {
        toValue: i === toIndex ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  };

  const goTo = (i: number) => {
    listRef.current?.scrollToIndex({ index: i, animated: true });
    setIndex(i);
    animateDots(i);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(auth)/login');
  };

  const skip = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      {/* Skip */}
      <TouchableOpacity style={styles.skipBtn} onPress={skip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Slides */}
      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <LinearGradient colors={item.gradient} style={styles.emojiArea}>
              <View style={[styles.emojiGlow, { shadowColor: item.glowColor }]}>
                <View style={styles.emojiRing}>
                  <Text style={styles.emoji}>{item.emoji}</Text>
                </View>
              </View>
            </LinearGradient>

            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>

            <View style={styles.detailPill}>
              <Ionicons name={item.detailIcon} size={13} color={COLORS.orange} />
              <Text style={styles.detailText}>{item.detail}</Text>
            </View>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => {
          const width = dotAnim[i].interpolate({ inputRange: [0, 1], outputRange: [7, 22] });
          const opacity = dotAnim[i].interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width, opacity, backgroundColor: i === index ? COLORS.orange : COLORS.muted }]}
            />
          );
        })}
      </View>

      {/* CTA */}
      <View style={styles.ctaArea}>
        {index < SLIDES.length - 1 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={() => goTo(index + 1)} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>Next</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.getStartedBtn} onPress={finish} activeOpacity={0.85}>
            <Text style={styles.getStartedText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        )}

        {index === SLIDES.length - 1 && (
          <TouchableOpacity style={styles.browseBtn} onPress={skip}>
            <Text style={styles.browseBtnText}>Browse without account</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },

  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  skipText: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.muted },

  slide: { width: W, paddingHorizontal: SPACING.xl, alignItems: 'center' },

  emojiArea: {
    width: 180, height: 180, borderRadius: 90,
    alignItems: 'center', justifyContent: 'center',
    marginTop: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  emojiGlow: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 12,
  },
  emojiRing: {
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: 'rgba(26,10,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,248,240,0.12)',
  },
  emoji: { fontSize: 64 },

  title: {
    fontFamily: FONTS.playfair,
    fontSize: 34,
    color: COLORS.cream,
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: SPACING.lg,
  },
  body: {
    fontFamily: FONTS.dmRegular,
    fontSize: 16,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  detailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.overlay.orange10,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },
  detailText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.orange },

  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  dot: { height: 7, borderRadius: 99 },

  ctaArea: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.sm, gap: SPACING.sm },

  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.full,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },
  nextBtnText: { fontFamily: FONTS.dmMedium, fontSize: 16, color: COLORS.cream },

  getStartedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.full,
    height: 56,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  getStartedText: { fontFamily: FONTS.dmMedium, fontSize: 16, color: '#fff' },

  browseBtn: { alignItems: 'center', paddingVertical: SPACING.sm },
  browseBtnText: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.muted },
});
