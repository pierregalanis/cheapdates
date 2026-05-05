import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '@/store/authStore';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Data ─────────────────────────────────────────────────────────────────────

const NEIGHBORHOODS = [
  'Uptown', 'Deep Ellum', 'Design District', 'Oak Cliff',
  'Bishop Arts', 'Lower Greenville', 'Lake Highlands', 'Lakewood',
  'Knox-Henderson', 'Downtown', 'Turtle Creek', 'East Dallas',
  'Preston Hollow', 'Addison', 'Plano', 'Frisco',
];

const BIO_MAX = 160;

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function EditProfileScreen() {
  const { profile, updateProfile } = useAuthStore();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [neighborhood, setNeighborhood] = useState(profile?.neighborhood ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [nameFocused, setNameFocused] = useState(false);
  const [bioFocused, setBioFocused] = useState(false);

  const isDirty =
    fullName !== (profile?.full_name ?? '') ||
    bio !== (profile?.bio ?? '') ||
    neighborhood !== (profile?.neighborhood ?? '');

  const canSave = fullName.trim().length > 0 && isDirty && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setSaveError('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const { error } = await updateProfile({
      full_name: fullName.trim(),
      bio: bio.trim() || undefined,
      neighborhood: neighborhood || undefined,
    });

    setSaving(false);
    if (error) {
      setSaveError('Could not save changes. Please try again.');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Avatar (display only) */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              <Ionicons name="person" size={44} color={COLORS.orange} />
            </View>
            <Text style={styles.avatarHint}>Profile photo coming soon</Text>
          </View>

          {/* Full name */}
          <Text style={styles.fieldLabel}>Display Name</Text>
          <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
            <Ionicons
              name="person-outline"
              size={17}
              color={nameFocused ? COLORS.orange : COLORS.muted}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              placeholderTextColor={COLORS.faded}
              autoCapitalize="words"
              returnKeyType="next"
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              keyboardAppearance="dark"
            />
          </View>

          {/* Bio */}
          <View style={styles.labelRow}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <Text style={[
              styles.charCount,
              bio.length > BIO_MAX * 0.9 && { color: bio.length >= BIO_MAX ? COLORS.status.error : COLORS.amber },
            ]}>
              {bio.length}/{BIO_MAX}
            </Text>
          </View>
          <View style={[styles.inputWrap, styles.inputWrapTall, bioFocused && styles.inputWrapFocused]}>
            <TextInput
              style={[styles.input, styles.bioInput]}
              value={bio}
              onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
              placeholder="Tell the city who you are…"
              placeholderTextColor={COLORS.faded}
              multiline
              numberOfLines={3}
              returnKeyType="default"
              onFocus={() => setBioFocused(true)}
              onBlur={() => setBioFocused(false)}
              keyboardAppearance="dark"
              textAlignVertical="top"
            />
          </View>

          {/* Neighborhood */}
          <Text style={styles.fieldLabel}>Your Neighborhood</Text>
          <Text style={styles.fieldSub}>Shown on your leaderboard profile</Text>
          <View style={styles.neighborhoodGrid}>
            {NEIGHBORHOODS.map((n) => {
              const active = neighborhood === n;
              return (
                <TouchableOpacity
                  key={n}
                  style={[styles.nChip, active && styles.nChipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setNeighborhood(active ? '' : n);
                  }}
                >
                  <Text style={[styles.nChipText, active && styles.nChipTextActive]}>{n}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {saveError ? (
            <Text style={styles.errorText}>{saveError}</Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.dark },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.subtle,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: RADIUS.md,
    backgroundColor: COLORS.overlay.inputBg,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.subtle,
  },
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 20, color: COLORS.cream },
  saveBtn: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    minWidth: 60,
    alignItems: 'center',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  saveBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  saveBtnText: { fontFamily: FONTS.dmMedium, fontSize: 14, color: '#fff' },

  scrollContent: { padding: SPACING.lg, paddingBottom: 60 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: SPACING.xl },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.overlay.orange10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.border.default,
    marginBottom: SPACING.sm,
  },
  avatarHint: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },

  // Fields
  fieldLabel: {
    fontFamily: FONTS.dmMedium, fontSize: 12,
    color: COLORS.muted, letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm, marginTop: SPACING.lg,
  },
  fieldSub: {
    fontFamily: FONTS.dmRegular, fontSize: 12,
    color: COLORS.muted, marginTop: -SPACING.sm + 2,
    marginBottom: SPACING.md,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    marginTop: SPACING.lg,
  },
  charCount: { fontFamily: FONTS.dmRegular, fontSize: 12, color: COLORS.muted },

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
  inputWrapTall: { height: 90, alignItems: 'flex-start', paddingVertical: SPACING.md },
  inputWrapFocused: { borderColor: COLORS.orange, backgroundColor: 'rgba(255,107,26,0.06)' },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, fontFamily: FONTS.dmRegular, fontSize: 15, color: COLORS.cream },
  bioInput: { textAlignVertical: 'top', paddingTop: 0, lineHeight: 22 },

  // Neighborhood grid
  neighborhoodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  nChip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1.5, borderColor: COLORS.border.default,
  },
  nChipActive: {
    backgroundColor: COLORS.orange, borderColor: COLORS.orange,
    shadowColor: COLORS.orange, shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 5,
  },
  nChipText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.muted },
  nChipTextActive: { color: '#fff' },

  errorText: {
    fontFamily: FONTS.dmRegular, fontSize: 13,
    color: COLORS.status.error,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});
