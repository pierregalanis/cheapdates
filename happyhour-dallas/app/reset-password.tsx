import React, { useState, useEffect } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Supabase sends the recovery link as:
  // happyhourdallas://reset-password#access_token=...&refresh_token=...&type=recovery
  // Expo Linking parses the hash as a query string on some platforms.
  useEffect(() => {
    const handleUrl = async (url: string) => {
      // Parse hash fragment (access_token, refresh_token)
      const hashStart = url.indexOf('#');
      if (hashStart === -1) return;
      const hash = url.slice(hashStart + 1);
      const params = Object.fromEntries(
        hash.split('&').map((p) => {
          const [k, ...v] = p.split('=');
          return [k, decodeURIComponent(v.join('='))];
        })
      );
      if (params.type !== 'recovery' || !params.access_token) return;

      const { error } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token ?? '',
      });
      if (!error) setSessionReady(true);
    };

    // Check initial URL (app already open or cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url);
    });

    // Listen for URL events while app is open
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => sub.remove();
  }, []);

  const validatePassword = () => {
    if (password.length < 8) return 'Password must be at least 8 characters.';
    if (password !== confirm) return 'Passwords do not match.';
    return null;
  };

  const handleReset = async () => {
    const validationError = validatePassword();
    if (validationError) { setError(validationError); return; }

    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.successBox}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color={COLORS.status.success} />
          </View>
          <Text style={styles.successTitle}>Password updated!</Text>
          <Text style={styles.successBody}>
            You're all set. Sign in with your new password.
          </Text>
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.submitBtnText}>Go to Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="light" />

      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={COLORS.cream} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Set new{'\n'}password</Text>
          <Text style={styles.subtitle}>
            Choose a strong password for your account.
          </Text>

          {!sessionReady && (
            <View style={styles.warningPill}>
              <Ionicons name="information-circle-outline" size={15} color={COLORS.amber} />
              <Text style={styles.warningText}>
                Open the reset link from your email to continue.
              </Text>
            </View>
          )}

          {/* Password field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>New password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={(t) => { setPassword(t); setError(null); }}
                autoCapitalize="none"
                returnKeyType="next"
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPass((v) => !v)}
              >
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm field */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm password</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Repeat your password"
                placeholderTextColor={COLORS.muted}
                secureTextEntry={!showConfirm}
                value={confirm}
                onChangeText={(t) => { setConfirm(t); setError(null); }}
                autoCapitalize="none"
                returnKeyType="done"
                onSubmitEditing={handleReset}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowConfirm((v) => !v)}
              >
                <Ionicons
                  name={showConfirm ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Strength hint */}
          {password.length > 0 && (
            <StrengthBar password={password} />
          )}

          {/* Error */}
          {error && (
            <View style={styles.errorPill}>
              <Ionicons name="alert-circle-outline" size={14} color={COLORS.status.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.submitBtn, (!sessionReady || loading) && styles.submitBtnDisabled]}
            onPress={handleReset}
            disabled={!sessionReady || loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitBtnText}>Update Password</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StrengthBar({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = [COLORS.status.error, COLORS.amber, COLORS.orange, COLORS.status.success];
  const label = score === 0 ? '' : labels[score - 1];
  const color = score === 0 ? COLORS.muted : colors[score - 1];

  return (
    <View style={strengthStyles.row}>
      {[0, 1, 2, 3].map((i) => (
        <View
          key={i}
          style={[
            strengthStyles.segment,
            { backgroundColor: i < score ? color : COLORS.border.default },
          ]}
        />
      ))}
      {label ? <Text style={[strengthStyles.label, { color }]}>{label}</Text> : null}
    </View>
  );
}

const strengthStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: SPACING.md },
  segment: { flex: 1, height: 3, borderRadius: 99 },
  label: { fontFamily: FONTS.dmMedium, fontSize: 12, marginLeft: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  kav: { flex: 1 },

  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border.default,
  },

  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },

  title: {
    fontFamily: FONTS.playfair,
    fontSize: 38,
    color: COLORS.cream,
    lineHeight: 44,
    letterSpacing: -0.5,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontFamily: FONTS.dmRegular,
    fontSize: 15,
    color: COLORS.muted,
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },

  warningPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(232,168,48,0.12)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(232,168,48,0.25)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  warningText: {
    flex: 1,
    fontFamily: FONTS.dmRegular,
    fontSize: 13,
    color: COLORS.amber,
    lineHeight: 18,
  },

  fieldGroup: { marginBottom: SPACING.lg },
  label: {
    fontFamily: FONTS.dmMedium,
    fontSize: 13,
    color: COLORS.cream,
    marginBottom: SPACING.sm,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    paddingHorizontal: SPACING.md,
  },
  input: {
    flex: 1,
    height: 50,
    fontFamily: FONTS.dmRegular,
    fontSize: 15,
    color: COLORS.cream,
  },
  eyeBtn: { padding: SPACING.sm },

  errorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(255,59,48,0.1)',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255,59,48,0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  errorText: {
    flex: 1,
    fontFamily: FONTS.dmRegular,
    fontSize: 13,
    color: COLORS.status.error,
  },

  submitBtn: {
    backgroundColor: COLORS.orange,
    borderRadius: RADIUS.full,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  submitBtnDisabled: { opacity: 0.5, shadowOpacity: 0 },
  submitBtnText: { fontFamily: FONTS.dmMedium, fontSize: 16, color: '#fff' },

  // Success state
  successBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  successIcon: {
    marginBottom: SPACING.xl,
  },
  successTitle: {
    fontFamily: FONTS.playfair,
    fontSize: 32,
    color: COLORS.cream,
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  successBody: {
    fontFamily: FONTS.dmRegular,
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
});
