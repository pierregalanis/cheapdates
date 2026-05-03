import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      { redirectTo: 'happyhourdallas://reset-password' }
    );

    setLoading(false);

    if (resetError) {
      setError('Something went wrong. Please try again.');
    } else {
      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  if (sent) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.centerContent}>
          <Text style={styles.sentEmoji}>📬</Text>
          <Text style={styles.sentTitle}>Check your inbox</Text>
          <Text style={styles.sentSub}>
            We sent a password reset link to{'\n'}
            <Text style={styles.sentEmail}>{email}</Text>
          </Text>
          <TouchableOpacity style={styles.backToLoginBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.content}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
          </TouchableOpacity>

          <View style={styles.headingArea}>
            <Text style={styles.heading}>Reset{'\n'}password</Text>
            <Text style={styles.subheading}>
              Enter your email and we'll send you a link to reset your password.
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={15} color={COLORS.status.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
            <Ionicons
              name="mail-outline"
              size={17}
              color={focused ? COLORS.orange : COLORS.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={COLORS.faded}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              keyboardAppearance="dark"
            />
          </View>

          <TouchableOpacity
            style={[styles.resetBtn, loading && styles.btnDisabled]}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.resetBtnText}>Send Reset Link</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.back()} style={styles.cancelRow}>
            <Text style={styles.cancelText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  kav: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
  },

  backBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
    marginBottom: SPACING.xxl,
  },

  headingArea: { marginBottom: SPACING.xxl },
  heading: {
    fontFamily: FONTS.playfair,
    fontSize: 34,
    color: COLORS.cream,
    lineHeight: 40,
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  subheading: { fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.muted, lineHeight: 22 },

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,59,48,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.25)',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: { fontFamily: FONTS.dmRegular, fontSize: 13, color: COLORS.status.error, flex: 1 },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border.default,
    height: 54,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  inputWrapFocused: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255,107,26,0.06)',
  },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.cream },

  resetBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.full,
    height: 56,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
    marginBottom: SPACING.lg,
  },
  btnDisabled: { opacity: 0.6 },
  resetBtnText: { fontFamily: FONTS.dmMedium, fontSize: 16, color: '#FFFFFF' },

  cancelRow: { alignItems: 'center', paddingTop: SPACING.sm },
  cancelText: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.muted },

  // Sent state
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxxl,
  },
  sentEmoji: { fontSize: 64, marginBottom: SPACING.xl },
  sentTitle: {
    fontFamily: FONTS.playfair,
    fontSize: 30,
    color: COLORS.cream,
    marginBottom: SPACING.md,
  },
  sentSub: {
    fontFamily: FONTS.dmRegular,
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  sentEmail: { color: COLORS.amber, fontFamily: FONTS.dmMedium },
  backToLoginBtn: {
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  backToLoginText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#FFFFFF' },
});
