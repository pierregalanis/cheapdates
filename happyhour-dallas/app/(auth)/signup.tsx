import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { LINKS } from '@/constants/links';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/authStore';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';
import * as AppleAuthentication from 'expo-apple-authentication';

export default function SignupScreen() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [nameFocused, setNameFocused]     = useState(false);
  const [emailFocused, setEmailFocused]   = useState(false);
  const [passFocused, setPassFocused]     = useState(false);

  const nameInputRef = useRef<TextInput>(null);

  const { signUp, signInWithApple } = useAuthStore();

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    const { error: appleError, cancelled } = await signInWithApple();
    setLoading(false);
    if (cancelled) return;
    if (appleError) {
      Alert.alert('Apple Sign-In Failed', appleError.message);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/(tabs)');
  };

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error: signUpError, session } = await signUp(
      email.trim().toLowerCase(),
      password,
      fullName.trim()
    );
    setLoading(false);

    if (signUpError) {
      const msg = signUpError.message.toLowerCase();
      setError(
        msg.includes('already registered') || msg.includes('already been registered')
          ? 'An account with this email already exists.'
          : msg.includes('weak password') || msg.includes('password')
          ? 'Password is too weak. Try a longer one.'
          : 'Something went wrong. Please try again.'
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } else if (session) {
      // Email confirmation is disabled — user is already signed in
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    } else {
      // Email confirmation is enabled — ask them to check email
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" />
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>🎉</Text>
          <Text style={styles.successTitle}>You're in!</Text>
          <Text style={styles.successSub}>
            Check your email to confirm your account, then come back and sign in.
          </Text>
          <TouchableOpacity style={styles.successBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={styles.successBtnText}>Go to Sign In</Text>
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
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
          </TouchableOpacity>

          <View style={styles.headingArea}>
            <Text style={styles.heading}>Create your{'\n'}account</Text>
            <Text style={styles.subheading}>
              Join thousands of Dallas happy hour hunters
            </Text>
          </View>

          {error && (
            <View style={styles.errorBox}>
              <Ionicons name="warning-outline" size={15} color={COLORS.status.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            {/* Full name */}
            <TouchableOpacity
              activeOpacity={1}
              onPress={() => nameInputRef.current?.focus()}
            >
              <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
                <Ionicons
                  name="person-outline"
                  size={17}
                  color={nameFocused ? COLORS.orange : COLORS.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  ref={nameInputRef}
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor={COLORS.faded}
                  autoCapitalize="words"
                  value={fullName}
                  onChangeText={setFullName}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                  keyboardAppearance="dark"
                />
              </View>
            </TouchableOpacity>

            {/* Email */}
            <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused]}>
              <Ionicons
                name="mail-outline"
                size={17}
                color={emailFocused ? COLORS.orange : COLORS.muted}
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
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardAppearance="dark"
              />
            </View>

            {/* Password */}
            <View style={[styles.inputWrap, passFocused && styles.inputWrapFocused]}>
              <Ionicons
                name="lock-closed-outline"
                size={17}
                color={passFocused ? COLORS.orange : COLORS.muted}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Password (min 8 chars)"
                placeholderTextColor={COLORS.faded}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                keyboardAppearance="dark"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={COLORS.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.createBtn, loading && styles.btnDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.createBtnText}>Create Account</Text>
                <Ionicons name="arrow-forward" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <>
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={999}
                style={styles.appleBtn}
                onPress={handleAppleSignIn}
              />
            </>
          )}

          <Text style={styles.termsText}>
            By creating an account you agree to our{' '}
            <Text style={styles.termsLink} onPress={() => Linking.openURL(LINKS.terms)}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink} onPress={() => Linking.openURL(LINKS.privacy)}>Privacy Policy</Text>
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={styles.footerLink}>Sign in →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xxxl,
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

  form: { gap: SPACING.md, marginBottom: SPACING.xl },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.border.default,
    height: 54,
    paddingHorizontal: SPACING.md,
  },
  inputWrapFocused: {
    borderColor: COLORS.orange,
    backgroundColor: 'rgba(255,107,26,0.06)',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: {
    flex: 1,
    fontFamily: FONTS.dmRegular,
    fontSize: 15,
    color: COLORS.cream,
    height: '100%',
  },
  eyeBtn: { padding: 4 },

  createBtn: {
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
    marginBottom: SPACING.lg,
  },
  btnDisabled: { opacity: 0.6 },
  createBtnText: { fontFamily: FONTS.dmMedium, fontSize: 16, color: '#FFFFFF' },

  termsText: {
    fontFamily: FONTS.dmRegular,
    fontSize: 12,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.xl,
  },
  termsLink: { color: COLORS.amber },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: { fontFamily: FONTS.dmRegular, fontSize: 14, color: COLORS.muted },
  footerLink: { fontFamily: FONTS.dmMedium, fontSize: 14, color: COLORS.orange },

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginVertical: SPACING.lg,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border.subtle },
  dividerText: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },
  appleBtn: { height: 52 },

  // Success state
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxxl,
  },
  successEmoji: { fontSize: 64, marginBottom: SPACING.xl },
  successTitle: {
    fontFamily: FONTS.playfair,
    fontSize: 32,
    color: COLORS.cream,
    marginBottom: SPACING.md,
  },
  successSub: {
    fontFamily: FONTS.dmRegular,
    fontSize: 15,
    color: COLORS.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: SPACING.xxl,
  },
  successBtn: {
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
  successBtnText: { fontFamily: FONTS.dmMedium, fontSize: 15, color: '#FFFFFF' },
});
