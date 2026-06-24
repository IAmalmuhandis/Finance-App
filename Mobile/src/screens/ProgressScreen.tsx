import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { Trash2 } from "lucide-react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as api from "../lib/api";
import { formatNaira } from "../lib/calculator";
import { THEME } from "../theme";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function WealthChart({ series }: { series: { wealthRetained: number }[] }) {
  if (series.length < 2) return null;
  const max = Math.max(...series.map((p) => p.wealthRetained), 1);
  return (
    <View style={styles.chart}>
      <Text style={styles.chartLabel}>Wealth retained over time</Text>
      <View style={styles.chartBars}>
        {series.map((p, i) => (
          <View
            key={i}
            style={[
              styles.bar,
              {
                height: Math.max(4, (p.wealthRetained / max) * 72),
                opacity: 0.35 + (i / series.length) * 0.65,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const [progress, setProgress] = useState<api.ProgressResponse | null>(null);
  const [entries, setEntries] = useState<api.EntryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [p, e] = await Promise.all([api.fetchProgress(), api.fetchEntries()]);
    if (p.data) setProgress(p.data);
    if (e.data) setEntries(e.data.entries ?? []);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
  }

  async function deleteEntry(id: string) {
    const res = await api.deleteEntry(id);
    if (res.error) {
      Alert.alert("Error", res.error);
      return;
    }
    await load();
  }

  function confirmDelete(id: string) {
    Alert.alert("Delete entry?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteEntry(id) },
    ]);
  }

  function confirmClearAll() {
    Alert.alert("Clear all history?", "Every saved entry will be removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear all",
        style: "destructive",
        onPress: async () => {
          const res = await api.clearAllEntries();
          if (res.error) Alert.alert("Error", res.error);
          await load();
        },
      },
    ]);
  }

  if (loading && !progress) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={THEME.colors.primary} />
      </View>
    );
  }

  const empty = (progress?.entryCount ?? 0) === 0;

  return (
    <ScrollView
      style={styles.wrap}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.colors.primary} />}
    >
      {empty ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No entries yet — save your first split from the Calculator to start tracking wealth retained.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.hero}>
            <Text style={styles.heroLabel}>WEALTH RETAINED</Text>
            <Text style={styles.heroValue}>{formatNaira(progress?.wealthRetained ?? 0)}</Text>
          </View>

          <View style={styles.grid}>
            <Stat label="Total income" value={formatNaira(progress?.totalIncome ?? 0)} />
            <Stat label="Entries" value={String(progress?.entryCount ?? 0)} />
            <Stat label="Total given" value={formatNaira(progress?.totalGiven ?? 0)} />
            <Stat label="Personal spend" value={formatNaira(progress?.totalSpend ?? 0)} />
          </View>

          {progress?.firstAt && progress?.lastAt ? (
            <Text style={styles.range}>
              {formatDate(progress.firstAt).split(",")[0]} → {formatDate(progress.lastAt).split(",")[0]}
            </Text>
          ) : null}

          <WealthChart series={progress?.wealthSeries ?? []} />

          {(progress?.byBucket?.length ?? 0) > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Per-bucket totals</Text>
              {progress!.byBucket.map((b) => (
                <View key={b.name} style={styles.row}>
                  <Text style={styles.rowName}>{b.name}</Text>
                  <Text style={styles.rowVal}>{formatNaira(b.total)}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>History</Text>
              <TouchableOpacity onPress={confirmClearAll}>
                <Text style={styles.clearLink}>Clear all</Text>
              </TouchableOpacity>
            </View>
            {entries.map((e) => (
              <View key={e.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{formatNaira(e.grossAmount)}</Text>
                  <Text style={styles.historyMeta}>
                    {formatDate(e.createdAt)} · {e.mode}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => confirmDelete(e.id)} hitSlop={10}>
                  <Trash2 size={18} color={THEME.colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: THEME.colors.background },
  empty: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.card,
    padding: 24,
    marginTop: 24,
  },
  emptyText: { color: THEME.colors.textSecondary, fontSize: 14, textAlign: "center", lineHeight: 22 },
  hero: {
    backgroundColor: THEME.colors.goldSoft,
    borderWidth: 1,
    borderColor: "rgba(201, 162, 75, 0.3)",
    borderRadius: THEME.radius.card,
    padding: 20,
    marginBottom: 16,
  },
  heroLabel: {
    color: THEME.colors.gold,
    fontSize: 11,
    fontFamily: THEME.fonts.uiSemibold,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heroValue: {
    color: THEME.colors.gold,
    fontSize: 40,
    fontFamily: THEME.fonts.display,
    marginTop: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  stat: {
    width: "48%",
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.card,
    padding: 14,
  },
  statLabel: { color: THEME.colors.textMuted, fontSize: 12 },
  statValue: { color: THEME.colors.text, fontSize: 18, fontWeight: "700", marginTop: 4 },
  range: { color: THEME.colors.textMuted, fontSize: 12, marginBottom: 12 },
  chart: { marginBottom: 20 },
  chartLabel: { color: THEME.colors.textMuted, fontSize: 12, marginBottom: 8 },
  chartBars: { flexDirection: "row", alignItems: "flex-end", gap: 4, height: 80 },
  bar: { flex: 1, backgroundColor: THEME.colors.primary, borderRadius: 3 },
  section: { marginTop: 8 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { color: THEME.colors.text, fontSize: 15, fontWeight: "600" },
  clearLink: { color: THEME.colors.textMuted, fontSize: 12, textDecorationLine: "underline" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.card,
    padding: 12,
    marginBottom: 8,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.card,
    padding: 12,
    marginBottom: 8,
  },
  rowName: { color: THEME.colors.text, fontSize: 14, fontWeight: "600" },
  rowVal: { color: THEME.colors.text, fontSize: 14, fontWeight: "600" },
  historyMeta: { color: THEME.colors.textMuted, fontSize: 12, marginTop: 2 },
});
