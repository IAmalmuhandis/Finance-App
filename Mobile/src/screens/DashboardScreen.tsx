import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { LayoutDashboard, TrendingUp, Wallet } from "lucide-react-native";
import * as api from "../lib/api";
import { THEME } from "../theme";

const fmt = (n: number) => "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [stats, setStats] = useState<api.DashboardResponse["stats"] | null>(null);
  const [recents, setRecents] = useState<unknown[]>([]);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const { data, error, status } = await api.fetchDashboard("thisMonth");
    setLoading(false);
    if (error || !data) {
      setErr(error || `Load failed (${status})`);
      return;
    }
    setStats(data.stats);
    setRecents(data.recentTransactions || []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={THEME.colors.primary} />
      }
    >
      {loading && !stats ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : null}
      {err ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{err}</Text>
        </View>
      ) : null}
      {stats && (
        <>
          <View style={styles.header}>
            <LayoutDashboard color={THEME.colors.primary} size={28} />
            <Text style={styles.title}>This month</Text>
          </View>
          <View style={styles.cardRow}>
            <View style={[styles.card, { borderColor: THEME.colors.accentGreen + "44" }]}>
              <Text style={styles.cardLabel}>Income</Text>
              <Text style={[styles.cardValue, { color: THEME.colors.accentGreen }]}>
                {fmt(stats.totalIncome)}
              </Text>
            </View>
            <View style={[styles.card, { borderColor: THEME.colors.accentRed + "44" }]}>
              <Text style={styles.cardLabel}>Expenses</Text>
              <Text style={[styles.cardValue, { color: THEME.colors.accentRed }]}>
                {fmt(stats.totalExpenses)}
              </Text>
            </View>
          </View>
          <View style={styles.wideCard}>
            <View style={styles.wideRow}>
              <Wallet size={20} color={THEME.colors.primary} />
              <Text style={styles.wideLabel}>Net position</Text>
            </View>
            <Text
              style={[
                styles.wideValue,
                { color: stats.netPosition >= 0 ? THEME.colors.accentGreen : THEME.colors.accentRed },
              ]}
            >
              {fmt(stats.netPosition)}
            </Text>
            <Text style={styles.savings}>
              Savings rate: {stats.savingsRate != null ? stats.savingsRate.toFixed(1) : "0"}%
            </Text>
          </View>
        </>
      )}

      <View style={styles.recentHeader}>
        <TrendingUp size={18} color={THEME.colors.textSecondary} />
        <Text style={styles.recentTitle}>Recent activity</Text>
      </View>
      {recents.length === 0 && !loading ? (
        <Text style={styles.muted}>No transactions this period. Import statements on the web, then pull to refresh.</Text>
      ) : (
        recents.slice(0, 8).map((t: any, i: number) => (
          <View key={String(t?._id || i)} style={styles.line}>
            <Text style={styles.lineDate}>
              {t?.date ? new Date(t.date).toLocaleDateString() : "—"}
            </Text>
            <Text style={styles.lineDesc} numberOfLines={1}>
              {t?.description || t?.category || "Transaction"}
            </Text>
            <Text
              style={[
                styles.lineAmt,
                { color: t?.type === "CREDIT" ? THEME.colors.accentGreen : THEME.colors.text },
              ]}
            >
              {t?.amount != null ? fmt(t.amount) : "—"}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 32 },
  centered: { padding: 32, alignItems: "center" },
  errorBox: {
    backgroundColor: THEME.colors.accentRed + "12",
    borderWidth: 1,
    borderColor: THEME.colors.accentRed + "33",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: THEME.colors.accentAmber, fontSize: 14 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  title: { color: THEME.colors.text, fontSize: 20, fontWeight: "700" },
  cardRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  card: {
    flex: 1,
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  cardLabel: { color: THEME.colors.textSecondary, fontSize: 12 },
  cardValue: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  wideCard: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 16,
  },
  wideRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  wideLabel: { color: THEME.colors.textSecondary, fontSize: 13 },
  wideValue: { fontSize: 24, fontWeight: "800", marginTop: 4 },
  savings: { color: THEME.colors.textSecondary, fontSize: 12, marginTop: 4 },
  recentHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 20, marginBottom: 8 },
  recentTitle: { color: THEME.colors.textSecondary, fontSize: 13, fontWeight: "600" },
  muted: { color: THEME.colors.textMuted, fontSize: 14, lineHeight: 20 },
  line: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: 8,
  },
  lineDate: { color: THEME.colors.textMuted, width: 72, fontSize: 12 },
  lineDesc: { color: THEME.colors.text, flex: 1, fontSize: 14 },
  lineAmt: { fontSize: 14, fontWeight: "600" },
});
