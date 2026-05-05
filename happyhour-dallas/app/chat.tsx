import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { useCityStore } from '@/store/cityStore';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

type HistoryItem = { role: 'user' | 'assistant'; content: string };

// ─── Suggestion chips shown before first user message ─────────────────────────

const SUGGESTIONS = [
  "What's happening right now?",
  'Best deals under $5?',
  'Least crowded spot?',
  'Best rated this week?',
  'Dog-friendly patios?',
  'How do I earn badges?',
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const { selectedCity } = useCityStore();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: `Hey! 🍸 I'm your Cheap Dates guide for ${selectedCity.name}. I have live access to prices, crowd levels, ratings, and happy hour times.\n\nWhat can I help you find?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, []);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scrollToBottom();

    // Build history excluding the opening greeting
    const history: HistoryItem[] = messages
      .slice(1)
      .map((m) => ({ role: m.role, content: m.content }));

    const { data, error } = await supabase.functions.invoke('chat', {
      body: { message: trimmed, city: selectedCity.name, history },
    });

    setLoading(false);

    const reply = error || !data?.reply
      ? "Sorry, I couldn't connect right now. Check your connection and try again."
      : data.reply;

    setMessages((prev) => [
      ...prev,
      { id: `a-${Date.now()}`, role: 'assistant', content: reply },
    ]);
    scrollToBottom();
  }, [loading, messages, selectedCity.name, scrollToBottom]);

  const hasSentMessage = messages.length > 1;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.cream} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <View style={styles.liveRow}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{selectedCity.name} · Live data</Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item }) => (
            <View style={[
              styles.row,
              item.role === 'user' ? styles.rowUser : styles.rowAssistant,
            ]}>
              {item.role === 'assistant' && (
                <LinearGradient
                  colors={['rgba(255,107,26,0.25)', 'rgba(255,107,26,0.10)']}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarEmoji}>🍸</Text>
                </LinearGradient>
              )}
              <View style={[
                styles.bubble,
                item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
              ]}>
                <Text style={[
                  styles.bubbleText,
                  item.role === 'user' && styles.bubbleTextUser,
                ]}>
                  {item.content}
                </Text>
              </View>
            </View>
          )}
          ListFooterComponent={
            loading ? (
              <View style={[styles.row, styles.rowAssistant]}>
                <LinearGradient
                  colors={['rgba(255,107,26,0.25)', 'rgba(255,107,26,0.10)']}
                  style={styles.avatar}
                >
                  <Text style={styles.avatarEmoji}>🍸</Text>
                </LinearGradient>
                <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={COLORS.orange} />
                </View>
              </View>
            ) : !hasSentMessage ? (
              <View style={styles.suggestions}>
                <Text style={styles.suggestionsLabel}>Try asking:</Text>
                <View style={styles.suggestionsGrid}>
                  {SUGGESTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={styles.suggestionChip}
                      onPress={() => send(s)}
                      activeOpacity={0.75}
                    >
                      <Text style={styles.suggestionText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about deals, crowds, hours…"
            placeholderTextColor={COLORS.faded}
            multiline
            maxLength={500}
            keyboardAppearance="dark"
            returnKeyType="send"
            onSubmitEditing={() => send(input)}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => send(input)}
            disabled={!input.trim() || loading}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
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
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontFamily: FONTS.playfair, fontSize: 20, color: COLORS.cream },
  liveRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  liveDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: COLORS.status.success,
  },
  liveText: { fontFamily: FONTS.dmRegular, fontSize: 11, color: COLORS.muted },

  messageList: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },

  row: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
  rowUser: { justifyContent: 'flex-end' },
  rowAssistant: { justifyContent: 'flex-start' },

  avatar: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border.default,
    flexShrink: 0,
  },
  avatarEmoji: { fontSize: 16 },

  bubble: {
    maxWidth: '78%',
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  bubbleUser: {
    backgroundColor: COLORS.orange,
    borderBottomRightRadius: 4,
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.card,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border.subtle,
  },
  typingBubble: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  bubbleText: {
    fontFamily: FONTS.dmRegular,
    fontSize: 15,
    color: COLORS.cream,
    lineHeight: 22,
  },
  bubbleTextUser: { color: '#fff' },

  suggestions: { marginTop: SPACING.xl },
  suggestionsLabel: {
    fontFamily: FONTS.dmMedium,
    fontSize: 12,
    color: COLORS.muted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
  },
  suggestionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  suggestionChip: {
    backgroundColor: COLORS.overlay.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border.default,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  suggestionText: { fontFamily: FONTS.dmMedium, fontSize: 13, color: COLORS.amber },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: COLORS.border.subtle,
    backgroundColor: COLORS.dark,
  },
  input: {
    flex: 1,
    fontFamily: FONTS.dmRegular,
    fontSize: 15,
    color: COLORS.cream,
    backgroundColor: COLORS.overlay.inputBg,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    borderColor: COLORS.border.default,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    maxHeight: 100,
    lineHeight: 22,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 21,
    backgroundColor: COLORS.orange,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.orange,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
