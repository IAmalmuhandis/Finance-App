import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { List } from "lucide-react-native";
import * as api from "../lib/api";
import { THEME } from "../theme";

const fmt = (n: number) => "₦" + n.toLocaleString("en-NG", { maximumFractionDigits: 0 });

export default function TransactionsScreen() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<api.TransactionRow[]>([]);
  const [summary, setSummary] = useState<api.TransactionsResponse["summary"] | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const { data, error } = await api.fetchTransactions(1, search);
    setLoading(false);
    if (error || !data) {
      setErr(error || "Failed to load");
      return;
    }
    setRows(data.transactions);
    setSummary(data.summary);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 300);
    return () => clearTimeout(t);
  }, [search, load]);

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <List size={20} color={THEME.colors.textSecondary} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search description…"
          placeholderTextColor={THEME.colors.textMuted}
        />
      </View>
      {summary && (
        <View style={styles.sumRow}>
          <View style={styles.sumPill}>
            <Text style={styles.sumL}>In</Text>
            <Text style={[styles.sumV, { color: THEME.colors.accentGreen }]}>{fmt(summary.totalCredit)}</Text>
          </View>
          <View style={styles.sumPill}>
            <Text style={styles.sumL}>Out</Text>
            <Text style={[styles.sumV, { color: THEME.colors.accentRed }]}>{fmt(summary.totalDebit)}</Text>
          </View>
          <View style={styles.sumPill}>
            <Text style={styles.sumL}>Net</Text>
            <Text style={[styles.sumV, { color: THEME.colors.primary }]}>{fmt(summary.net)}</Text>
          </View>
        </View>
      )}
      {err ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{err}</Text>
        </View>
      ) : null}
      {loading && rows.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={THEME.colors.primary} />
        </View>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(t) => String(t._id)}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={THEME.colors.primary} />
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        ListEmptyComponent={
          !loading ? <Text style={styles.muted}>No transactions. Sync data on the web app, then pull to refresh.</Text> : null
        }
        renderItem={({ item: t }) => (
          <View style={styles.row}>
            <View style={styles.dateCol}>
              <Text style={styles.dateT}>{t.date ? new Date(t.date).toLocaleDateString() : "—"}</Text>
            </View>
            <View style={styles.bodyCol}>
              <Text numberOfLines={1} style={styles.desc}>
                {t.description || t.category || "—"}
              </Text>
              <Text style={styles.sub}>{(t as { category?: string }).category || t.type || ""}</Text>
            </View>
            <Text
              style={[
                styles.amt,
                { color: t.type === "CREDIT" ? THEME.colors.accentGreen : THEME.colors.text },
              ]}
            >
              {fmt(t.amount || 0)}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background, padding: 12 },
  searchRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  search: {
    flex: 1,
    backgroundColor: THEME.colors.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: THEME.colors.text,
    fontSize: 15,
  },
  sumRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  sumPill: { backgroundColor: THEME.colors.surface, borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 10, padding: 8, minWidth: "30%", flex: 1 },
  sumL: { color: THEME.colors.textMuted, fontSize: 11 },
  sumV: { fontWeight: "700", fontSize: 15, marginTop: 2 },
  errorBox: { backgroundColor: THEME.colors.accentRed + "10", borderRadius: 8, padding: 10, marginBottom: 8 },
  errorText: { color: THEME.colors.accentAmber, fontSize: 14 },
  centered: { padding: 24, alignItems: "center" },
  muted: { color: THEME.colors.textMuted, fontSize: 14, textAlign: "center", marginTop: 20 },
  row: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: THEME.colors.border,
    alignItems: "center",
  },
  dateCol: { width: 80 },
  dateT: { color: THEME.colors.textMuted, fontSize: 12 },
  bodyCol: { flex: 1, paddingRight: 8 },
  desc: { color: THEME.colors.text, fontSize: 15 },
  sub: { color: THEME.colors.textSecondary, fontSize: 12, marginTop: 2 },
  amt: { fontSize: 15, fontWeight: "600" },
});
