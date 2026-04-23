import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { BarChart2, Sparkles } from "lucide-react-native";
import * as api from "../lib/api";
import { THEME } from "../theme";

export default function ReportsScreen() {
  const [loading, setLoading] = useState(true);
  const [gen, setGen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<api.BankAccount[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [month, setMonth] = useState("");
  const [reports, setReports] = useState<api.ReportRow[]>([]);
  const [active, setActive] = useState<api.ReportRow | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    const [a, r] = await Promise.all([api.fetchAccounts(), api.fetchReports()]);
    setLoading(false);
    if (a.data?.accounts) {
      setAccounts(a.data.accounts);
      setSelected((s) => (s.length ? s : a.data!.accounts.map((x) => x.id)));
    }
    if (a.error) {
      setErr(a.error);
    }
    if (r.data?.reports) {
      setReports(r.data.reports);
    }
    if (r.error && !a.error) {
      setErr(r.error);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const selectAll = () => {
    setSelected(accounts.map((a) => a.id));
  };

  const runGen = async () => {
    if (!selected.length) {
      setErr("Select at least one account");
      return;
    }
    setErr(null);
    setGen(true);
    const { data, error, status } = await api.postReportGenerate({ month: month || undefined, accountIds: selected });
    setGen(false);
    if (error || !data) {
      setErr(error || `Failed (${status})`);
      return;
    }
    setActive(data.report);
    void load();
  };

  const openOne = async (id: string) => {
    const { data, error } = await api.fetchReportById(id);
    if (error || !data) {
      setErr(String(error));
      return;
    }
    setActive(data.report);
  };

  const c = active?.content as Record<string, unknown> | undefined;
  const fa = c?.financialAudit as
    | { healthScore: number; healthLabel: string; flags: { level: string; message: string }[] }
    | undefined;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={THEME.colors.primary} />
      }
    >
      <View style={styles.titleRow}>
        <BarChart2 size={24} color={THEME.colors.primary} />
        <Text style={styles.h1}>Reports & audit</Text>
      </View>
      {err ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{err}</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardTitle}>
          <Sparkles size={18} color={THEME.colors.accentAmber} />
          <Text style={styles.h2}>Generate from your data</Text>
        </View>
        <Text style={styles.sub}>Uses transactions you saved (including from statement upload).</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Accounts</Text>
          <TouchableOpacity onPress={selectAll}>
            <Text style={styles.link}>All</Text>
          </TouchableOpacity>
        </View>
        {accounts.map((a) => (
          <TouchableOpacity key={a.id} style={styles.check} onPress={() => toggle(a.id)}>
            <Text style={styles.checkBox}>{selected.includes(a.id) ? "☑" : "☐"}</Text>
            <Text style={styles.checkL}>
              {a.bankName} — {a.nickname}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.label}>Month (optional, YYYY-MM)</Text>
        <TextInput
          style={styles.inp}
          value={month}
          onChangeText={setMonth}
          placeholder="Leave empty for all time in selected accounts"
          placeholderTextColor={THEME.colors.textMuted}
        />
        <TouchableOpacity style={styles.genBtn} onPress={() => void runGen()} disabled={gen}>
          {gen ? <ActivityIndicator color="#fff" /> : <Text style={styles.genT}>Run financial audit & report</Text>}
        </TouchableOpacity>
      </View>

      {active ? (
        <View style={styles.card}>
          <Text style={styles.h2}>{active.title}</Text>
          {fa ? (
            <View style={styles.auditBox}>
              <Text style={styles.auditTitle}>Health score: {fa.healthScore}/100 ({fa.healthLabel})</Text>
              {fa.flags?.map((f, i) => (
                <Text key={i} style={styles.flag}>
                  [{f.level}] {f.message}
                </Text>
              ))}
            </View>
          ) : null}
          {c?.executiveSummary ? (
            <Text style={styles.p}>
              <Text style={styles.bold}>Executive: </Text>
              {String(c.executiveSummary)}
            </Text>
          ) : null}
          {c?.detailedReconciliation ? (
            <Text style={styles.p}>
              <Text style={styles.bold}>Reconciliation: </Text>
              {String(c.detailedReconciliation)}
            </Text>
          ) : null}
          {c?.overview ? (
            <Text style={styles.p}>
              <Text style={styles.bold}>Overview: </Text>
              {String(c.overview)}
            </Text>
          ) : null}
          {c?.spendingPatterns ? (
            <Text style={styles.p}>
              <Text style={styles.bold}>Spending: </Text>
              {String(c.spendingPatterns)}
            </Text>
          ) : null}
          {c?.riskAssessment ? (
            <Text style={styles.p}>
              <Text style={styles.bold}>Risks: </Text>
              {String(c.riskAssessment)}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.h2}>History</Text>
      {reports.map((r) => (
        <TouchableOpacity key={r._id} style={styles.hist} onPress={() => void openOne(r._id)}>
          <View>
            <Text style={styles.histD}>{new Date(r.createdAt).toLocaleString()}</Text>
            <Text style={styles.histM}>{r.month || "All time"}</Text>
          </View>
          <Text style={styles.link}>View</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  h1: { fontSize: 20, fontWeight: "700", color: THEME.colors.text, marginLeft: 8 },
  h2: { fontSize: 16, fontWeight: "600", color: THEME.colors.text, marginBottom: 6 },
  errorBox: { backgroundColor: "rgba(239,68,68,0.12)", padding: 10, borderRadius: 8, marginBottom: 10 },
  errorText: { color: THEME.colors.accentRed, fontSize: 14 },
  card: { backgroundColor: THEME.colors.surface, borderRadius: 12, borderWidth: 1, borderColor: THEME.colors.border, padding: 14, marginBottom: 14 },
  cardTitle: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  sub: { color: THEME.colors.textSecondary, fontSize: 12, marginBottom: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  label: { color: THEME.colors.textSecondary, fontSize: 12, marginTop: 6 },
  link: { color: THEME.colors.primary, fontSize: 13 },
  check: { flexDirection: "row", alignItems: "center", paddingVertical: 4, gap: 8 },
  checkBox: { color: THEME.colors.text, fontSize: 16 },
  checkL: { color: THEME.colors.text, fontSize: 14 },
  inp: { borderWidth: 1, borderColor: THEME.colors.border, borderRadius: 8, padding: 10, color: THEME.colors.text, marginTop: 4, backgroundColor: THEME.colors.elevated },
  genBtn: { marginTop: 12, backgroundColor: THEME.colors.primary, borderRadius: 10, padding: 12, alignItems: "center" },
  genT: { color: "#fff", fontWeight: "600" },
  auditBox: { backgroundColor: THEME.colors.elevated, borderRadius: 8, padding: 10, marginBottom: 8 },
  auditTitle: { color: THEME.colors.text, fontWeight: "600", marginBottom: 4 },
  flag: { color: THEME.colors.textSecondary, fontSize: 12, marginTop: 2 },
  p: { color: THEME.colors.textSecondary, fontSize: 13, marginTop: 8, lineHeight: 20 },
  bold: { color: THEME.colors.text, fontWeight: "600" },
  hist: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: THEME.colors.border, paddingVertical: 10 },
  histD: { color: THEME.colors.text, fontSize: 13 },
  histM: { color: THEME.colors.textMuted, fontSize: 12 },
});
