import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { Flame } from "lucide-react-native";
import * as api from "../lib/api";
import { THEME } from "../theme";

const CATEGORY_LABELS: Record<string, string> = {
  mindset: "Mindset",
  habits: "Habits",
  assets: "Assets",
  behavior: "Behavior",
  saving: "Saving",
};

function todayLocalStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatShortDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[Number(m) - 1]}`;
}

export default function FlashcardsScreen() {
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<api.FlashcardToday | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [marking, setMarking] = useState(false);
  const [history, setHistory] = useState<api.FlashcardHistoryDay[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    void loadToday();
    void loadHistory();
  }, []);

  async function loadToday() {
    setLoading(true);
    try {
      const res = await api.fetchFlashcardToday(todayLocalStr());
      if (res.data) {
        setToday(res.data);
        setFlipped(res.data.seen);
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await api.fetchFlashcardHistory(todayLocalStr(), 30);
      if (res.data) setHistory(res.data.days);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function reveal() {
    if (flipped || !today) return;
    setFlipped(true);
    setMarking(true);
    try {
      const res = await api.markFlashcardSeen(today.date);
      if (res.data) {
        setToday((prev) => (prev ? { ...prev, seen: true, streak: res.data!.streak } : prev));
        void loadHistory();
      }
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content}>
      {today ? (
        <View style={styles.streakPill}>
          <Flame size={14} color={THEME.colors.gold} />
          <Text style={styles.streakText}>
            {today.streak} day{today.streak === 1 ? "" : "s"}
          </Text>
        </View>
      ) : null}

      {!today ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No flashcards yet — check back soon.</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.card} onPress={() => void reveal()} disabled={marking} activeOpacity={0.85}>
          <Text style={styles.category}>{CATEGORY_LABELS[today.card.category] ?? today.card.category}</Text>
          <Text style={styles.front}>{today.card.front}</Text>
          {flipped ? (
            <View style={styles.backWrap}>
              <Text style={styles.source}>{today.card.source}</Text>
              {today.card.back ? <Text style={styles.back}>{today.card.back}</Text> : null}
            </View>
          ) : (
            <Text style={styles.tapHint}>Tap to reveal source &amp; why it matters</Text>
          )}
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Past 30 days</Text>
      {historyLoading ? (
        <ActivityIndicator color={THEME.colors.primary} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {history.map((d) => (
            <View key={d.date} style={[styles.historyCard, d.seen && styles.historyCardSeen]}>
              <Text style={styles.historyDate}>{formatShortDate(d.date)}</Text>
              <Text style={styles.historyFront} numberOfLines={3}>
                {d.card.front}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: THEME.colors.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  streakPill: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: THEME.colors.goldSoft,
    borderWidth: 1,
    borderColor: THEME.colors.gold + "66",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
  },
  streakText: { color: THEME.colors.gold, fontSize: 12, fontFamily: THEME.fonts.uiSemibold },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: THEME.colors.border,
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
  },
  emptyText: { color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.ui },
  card: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 24,
    padding: 24,
  },
  category: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontFamily: THEME.fonts.uiSemibold,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  front: { color: THEME.colors.text, fontSize: 19, fontFamily: THEME.fonts.display, lineHeight: 26 },
  tapHint: { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.ui, marginTop: 18 },
  backWrap: { marginTop: 18, borderTopWidth: 1, borderTopColor: THEME.colors.border, paddingTop: 14 },
  source: { color: THEME.colors.primary, fontSize: 12, fontFamily: THEME.fonts.uiSemibold, textTransform: "uppercase" },
  back: { color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.ui, marginTop: 6, lineHeight: 19 },
  sectionTitle: {
    color: THEME.colors.primary,
    fontSize: 16,
    fontFamily: THEME.fonts.display,
    marginTop: 28,
    marginBottom: 10,
  },
  historyCard: {
    width: 128,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 14,
    padding: 12,
  },
  historyCardSeen: { borderColor: THEME.colors.primary + "44", backgroundColor: THEME.colors.primary + "0D" },
  historyDate: { color: THEME.colors.textMuted, fontSize: 10, fontFamily: THEME.fonts.ui },
  historyFront: { color: THEME.colors.textSecondary, fontSize: 12, fontFamily: THEME.fonts.ui, marginTop: 4 },
});
