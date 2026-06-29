import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { Trash2 } from "lucide-react-native";
import {
  type ProjectionInput,
  type ProjectionSummary,
  type TransactionRow,
  computeProjection,
} from "../lib/wealth-guide";
import { formatNaira, formatNairaInput, parseNairaInput } from "../lib/calculator";
import * as api from "../lib/api";
import type { SavedProjection } from "../lib/api";
import { THEME } from "../theme";

const INITIAL_ROWS = 20;

function pct(n: number) {
  return `${n.toFixed(1)}%`;
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {sub ? <Text style={styles.statSub}>{sub}</Text> : null}
    </View>
  );
}

// ── Labeled input ─────────────────────────────────────────────────────────────

function LabeledInput({
  label,
  value,
  onChangeText,
  keyboardType = "decimal-pad",
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: "decimal-pad" | "number-pad";
  placeholder?: string;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder={placeholder ?? ""}
        placeholderTextColor={THEME.colors.textMuted}
      />
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function WealthGuideScreen() {
  const [initialCapitalInput, setInitialCapitalInput] = useState("");
  const [incomeRate, setIncomeRate] = useState("10");
  const [consumptionRate, setConsumptionRate] = useState("8");
  const [additionalCapitalRate, setAdditionalCapitalRate] = useState("2");
  const [numTransactions, setNumTransactions] = useState("12");
  const [targetWealthInput, setTargetWealthInput] = useState("");

  const [rows, setRows] = useState<TransactionRow[]>([]);
  const [summary, setSummary] = useState<ProjectionSummary | null>(null);
  const [lastInput, setLastInput] = useState<ProjectionInput | null>(null);
  const [displayCount, setDisplayCount] = useState(INITIAL_ROWS);

  const [projectionName, setProjectionName] = useState("");
  const [saving, setSaving] = useState(false);

  const [history, setHistory] = useState<SavedProjection[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    void loadHistory();
  }, []);

  async function loadHistory() {
    setLoadingHistory(true);
    const res = await api.fetchProjections();
    if (res.data) setHistory(res.data.projections);
    setLoadingHistory(false);
  }

  function generate() {
    const initialCapital = parseNairaInput(initialCapitalInput);
    if (initialCapital <= 0) {
      Alert.alert("Error", "Enter a valid initial capital");
      return;
    }
    const n = Math.min(Math.max(1, Number(numTransactions) || 1), 500);
    const input: ProjectionInput = {
      initialCapital,
      incomeRate: Number(incomeRate) || 0,
      consumptionRate: Number(consumptionRate) || 0,
      additionalCapitalRate: Number(additionalCapitalRate) || 0,
      numTransactions: n,
      targetWealth: parseNairaInput(targetWealthInput) || undefined,
    };
    const { rows: r, summary: s } = computeProjection(input);
    setRows(r);
    setSummary(s);
    setLastInput(input);
    setDisplayCount(INITIAL_ROWS);
  }

  async function handleSave() {
    if (!summary || !lastInput || rows.length === 0) return;
    setSaving(true);
    const res = await api.saveProjection({
      name: projectionName.trim() || undefined,
      input: lastInput,
      summary,
      rows: rows.slice(0, 200),
    });
    setSaving(false);
    if (res.error) {
      Alert.alert("Error", res.error);
      return;
    }
    Alert.alert("Saved", "Projection saved.");
    setProjectionName("");
    void loadHistory();
  }

  async function handleDelete(id: string) {
    const res = await api.deleteProjection(id);
    if (res.error) { Alert.alert("Error", res.error); return; }
    setHistory((h) => h.filter((p) => p.id !== id));
  }

  async function handleLoad(id: string) {
    const res = await api.fetchProjection(id);
    if (res.error || !res.data) { Alert.alert("Error", res.error ?? "Could not load"); return; }
    const p = res.data.projection;
    setInitialCapitalInput(formatNairaInput(String(p.input.initialCapital)));
    setIncomeRate(String(p.input.incomeRate));
    setConsumptionRate(String(p.input.consumptionRate));
    setAdditionalCapitalRate(String(p.input.additionalCapitalRate));
    setNumTransactions(String(p.input.numTransactions));
    setTargetWealthInput(p.input.targetWealth ? formatNairaInput(String(p.input.targetWealth)) : "");
    setRows(p.rows);
    setSummary(p.summary);
    setLastInput(p.input);
    setDisplayCount(INITIAL_ROWS);
    Alert.alert("Loaded", `Projection "${p.name || "Untitled"}" loaded.`);
  }

  const displayRows = rows.slice(0, displayCount);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.heading}>Wealth Guide</Text>
      <Text style={styles.subHeading}>Project your wealth growth over time.</Text>

      {/* Inputs */}
      <View style={styles.card}>
        <LabeledInput
          label="Initial Capital (₦)"
          value={initialCapitalInput}
          onChangeText={(t) => setInitialCapitalInput(formatNairaInput(t))}
          keyboardType="number-pad"
          placeholder="e.g. 1,000,000"
        />
        <LabeledInput
          label="Income Rate % (per transaction)"
          value={incomeRate}
          onChangeText={setIncomeRate}
        />
        <LabeledInput
          label="Consumption Rate % (per transaction)"
          value={consumptionRate}
          onChangeText={setConsumptionRate}
        />
        <LabeledInput
          label="Additional Capital Rate % (per transaction)"
          value={additionalCapitalRate}
          onChangeText={setAdditionalCapitalRate}
        />
        <LabeledInput
          label="Number of Transactions (max 500)"
          value={numTransactions}
          onChangeText={setNumTransactions}
          keyboardType="number-pad"
        />
        <LabeledInput
          label="Target Wealth ₦ (optional)"
          value={targetWealthInput}
          onChangeText={(t) => setTargetWealthInput(formatNairaInput(t))}
          keyboardType="number-pad"
          placeholder="optional"
        />
        <TouchableOpacity style={styles.generateBtn} onPress={generate}>
          <Text style={styles.generateText}>Generate Projection</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      {summary && lastInput ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsContainer}>
            <StatCard label="Final Capital" value={formatNaira(Math.round(summary.finalCapital))} sub={`${pct(summary.netGrowthPct)} net growth`} />
            <StatCard label="Total Income" value={formatNaira(Math.round(summary.totalIncome))} />
            <StatCard label="Total Consumed" value={formatNaira(Math.round(summary.totalConsumption))} />
            <StatCard label="Total Added" value={formatNaira(Math.round(summary.totalAdditional))} />
          </ScrollView>

          {/* Health */}
          <View style={[styles.healthCard, { borderColor: summary.isGrowing ? THEME.colors.primary + "44" : THEME.colors.accentAlert + "44", backgroundColor: summary.isGrowing ? "#E8F5F0" : "#FFE8E8" }]}>
            <View style={styles.healthRow}>
              <Text style={styles.healthTitle}>Wealth Health</Text>
              <Text style={[styles.healthStatus, { color: summary.isGrowing ? THEME.colors.primary : THEME.colors.accentAlert }]}>
                {summary.isGrowing ? "Growing" : "Shrinking"}
              </Text>
            </View>
            <View style={styles.healthTrack}>
              <View style={[styles.healthFill, {
                width: `${Math.min(Math.abs(summary.netGrowthPct), 100)}%` as `${number}%`,
                backgroundColor: summary.isGrowing ? THEME.colors.primary : THEME.colors.accentAlert,
              }]} />
            </View>
            <Text style={styles.healthInsight}>
              {summary.isGrowing
                ? `Income (${pct(lastInput.incomeRate)}) + external (${pct(lastInput.additionalCapitalRate)}) > consumption (${pct(lastInput.consumptionRate)}) — building wealth.`
                : `Consumption (${pct(lastInput.consumptionRate)}) > income (${pct(lastInput.incomeRate)}) + external (${pct(lastInput.additionalCapitalRate)}) — reduce consumption to grow.`}
            </Text>
          </View>

          {lastInput.targetWealth ? (
            <View style={[styles.targetCard, { borderColor: summary.targetReachedAt !== null ? THEME.colors.primary + "44" : THEME.colors.border }]}>
              <Text style={[styles.targetText, { color: summary.targetReachedAt !== null ? THEME.colors.primary : THEME.colors.textSecondary }]}>
                {summary.targetReachedAt !== null
                  ? `Goal of ${formatNaira(lastInput.targetWealth)} reached at transaction #${summary.targetReachedAt}.`
                  : `Goal of ${formatNaira(lastInput.targetWealth)} not reached in ${lastInput.numTransactions} transactions.`}
              </Text>
            </View>
          ) : null}

          {/* Table */}
          <Text style={styles.sectionTitle}>Transaction Table</Text>
          <View style={styles.tableWrap}>
            {/* Header */}
            <View style={[styles.tableRow, styles.tableHeader]}>
              {["#", "Initial", "+Added", "+Income", "−Spent", "New Cap"].map((h) => (
                <Text key={h} style={[styles.tableCell, styles.tableHeaderText]}>{h}</Text>
              ))}
            </View>
            {displayRows.map((row) => {
              const growing = row.newCapital >= row.initialCapital;
              return (
                <View key={row.no} style={[styles.tableRow, row.no % 2 === 0 && styles.tableRowAlt]}>
                  <Text style={[styles.tableCell, styles.tableMuted]}>{row.no}</Text>
                  <Text style={[styles.tableCell, styles.tableNum]}>{formatNaira(Math.round(row.initialCapital))}</Text>
                  <Text style={[styles.tableCell, { color: THEME.colors.primary }]}>{formatNaira(Math.round(row.additionalCapital))}</Text>
                  <Text style={[styles.tableCell, { color: THEME.colors.primary }]}>{formatNaira(Math.round(row.income))}</Text>
                  <Text style={[styles.tableCell, { color: THEME.colors.accentAlert }]}>{formatNaira(Math.round(row.consumption))}</Text>
                  <Text style={[styles.tableCell, { color: growing ? THEME.colors.primary : THEME.colors.accentAlert, fontFamily: THEME.fonts.uiSemibold }]}>
                    {formatNaira(Math.round(row.newCapital))}
                  </Text>
                </View>
              );
            })}
          </View>

          {rows.length > displayCount ? (
            <TouchableOpacity style={styles.showMoreBtn} onPress={() => setDisplayCount((c) => c + 20)}>
              <Text style={styles.showMoreText}>Show more ({rows.length - displayCount} remaining)</Text>
            </TouchableOpacity>
          ) : null}

          {/* Save */}
          <View style={styles.saveRow}>
            <TextInput
              style={[styles.fieldInput, { flex: 1 }]}
              value={projectionName}
              onChangeText={setProjectionName}
              placeholder="Name this projection (optional)"
              placeholderTextColor={THEME.colors.textMuted}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={() => void handleSave()} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      {/* History */}
      <Text style={styles.sectionTitle}>Saved Projections</Text>
      {loadingHistory ? (
        <ActivityIndicator color={THEME.colors.primary} style={{ marginVertical: 16 }} />
      ) : history.length === 0 ? (
        <Text style={styles.emptyText}>No saved projections yet.</Text>
      ) : (
        history.map((p) => (
          <View key={p.id} style={styles.historyItem}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.historyName} numberOfLines={1}>{p.name || "Untitled projection"}</Text>
              <Text style={styles.historyMeta}>
                {new Date(p.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                {" · "}Final: {formatNaira(Math.round(p.summary.finalCapital))}
                {" · "}{pct(p.summary.netGrowthPct)} growth
              </Text>
            </View>
            <TouchableOpacity onPress={() => void handleLoad(p.id)} style={styles.loadBtn}>
              <Text style={styles.loadText}>Load</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void handleDelete(p.id)} hitSlop={8} style={styles.deleteBtn}>
              <Trash2 size={14} color={THEME.colors.accentAlert} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontFamily: THEME.fonts.display, color: THEME.colors.primary, marginBottom: 4 },
  subHeading: { fontSize: 13, color: THEME.colors.textSecondary, fontFamily: THEME.fonts.ui, marginBottom: 16 },
  card: {
    backgroundColor: THEME.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  fieldWrap: { gap: 4 },
  fieldLabel: { fontSize: 12, color: THEME.colors.textSecondary, fontFamily: THEME.fonts.uiMedium },
  fieldInput: {
    backgroundColor: THEME.colors.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: THEME.fonts.ui,
    color: THEME.colors.text,
  },
  generateBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  generateText: { color: THEME.colors.textOnJade, fontSize: 15, fontFamily: THEME.fonts.uiSemibold },
  statsScroll: { marginBottom: 12 },
  statsContainer: { gap: 10, paddingRight: 16 },
  statCard: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 14,
    padding: 14,
    minWidth: 140,
  },
  statLabel: { fontSize: 11, color: THEME.colors.textMuted, fontFamily: THEME.fonts.ui, marginBottom: 4 },
  statValue: { fontSize: 16, fontFamily: THEME.fonts.uiSemibold, color: THEME.colors.text },
  statSub: { fontSize: 11, color: THEME.colors.textSecondary, fontFamily: THEME.fonts.ui, marginTop: 2 },
  healthCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  healthRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  healthTitle: { fontSize: 13, fontFamily: THEME.fonts.uiMedium, color: THEME.colors.text },
  healthStatus: { fontSize: 13, fontFamily: THEME.fonts.uiSemibold },
  healthTrack: { height: 4, backgroundColor: THEME.colors.elevated, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  healthFill: { height: 4, borderRadius: 4 },
  healthInsight: { fontSize: 12, color: THEME.colors.textSecondary, fontFamily: THEME.fonts.ui },
  targetCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  targetText: { fontSize: 13, fontFamily: THEME.fonts.uiMedium },
  sectionTitle: { fontSize: 14, fontFamily: THEME.fonts.uiSemibold, color: THEME.colors.text, marginBottom: 10, marginTop: 8 },
  tableWrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    overflow: "hidden",
    marginBottom: 10,
  },
  tableRow: { flexDirection: "row", paddingVertical: 7, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: THEME.colors.border },
  tableRowAlt: { backgroundColor: THEME.colors.elevated + "66" },
  tableHeader: { backgroundColor: THEME.colors.elevated },
  tableHeaderText: { fontSize: 10, fontFamily: THEME.fonts.uiSemibold, color: THEME.colors.textSecondary },
  tableCell: { flex: 1, fontSize: 10, fontFamily: THEME.fonts.ui, color: THEME.colors.text, textAlign: "right" },
  tableMuted: { color: THEME.colors.textMuted },
  tableNum: { color: THEME.colors.text, fontFamily: THEME.fonts.uiMedium },
  showMoreBtn: {
    alignItems: "center",
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  showMoreText: { color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.ui },
  saveRow: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 4, marginBottom: 16 },
  saveBtn: {
    backgroundColor: THEME.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveText: { color: THEME.colors.textOnJade, fontSize: 14, fontFamily: THEME.fonts.uiSemibold },
  emptyText: { color: THEME.colors.textMuted, fontSize: 13, fontFamily: THEME.fonts.ui, textAlign: "center", paddingVertical: 16 },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  historyName: { fontSize: 14, fontFamily: THEME.fonts.uiMedium, color: THEME.colors.text },
  historyMeta: { fontSize: 11, color: THEME.colors.textMuted, fontFamily: THEME.fonts.ui, marginTop: 2 },
  loadBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: THEME.colors.elevated },
  loadText: { color: THEME.colors.primary, fontSize: 12, fontFamily: THEME.fonts.uiSemibold },
  deleteBtn: { padding: 4 },
});
