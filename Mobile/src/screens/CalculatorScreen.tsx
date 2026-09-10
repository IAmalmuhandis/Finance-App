import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useModal } from "../components/AppModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Save, Sparkles, X } from "lucide-react-native";
import { CustomBucketTree } from "../components/CustomBucketTree";
import { ReadonlyBucketList } from "../components/ReadonlyBucketList";
import {
  type CalculatorMode,
  type FormulaNode,
  type Tier,
  STORAGE_CUSTOM_FORMULA,
  STORAGE_INCOME,
  STORAGE_MODE,
  computeAllocations,
  formatNaira,
  formatNairaInput,
  getDefaultCustomFormula,
  getFormulaForTier,
  parseNairaInput,
  validateTree,
} from "../lib/calculator";
import * as api from "../lib/api";
import { THEME } from "../theme";

const TIER_ORDER: Tier[] = ["starter", "intermediate", "advance"];
const TABS: CalculatorMode[] = ["starter", "intermediate", "advance", "custom"];
const TAB_LABELS: Record<CalculatorMode, string> = {
  starter: "Starter",
  intermediate: "Intermediate",
  advance: "Advance",
  custom: "Custom",
};
const TIER_COPY: Record<Tier, string> = {
  starter: "Build the habit first. Every framework starts here.",
  intermediate: "You've held Starter for a while — time to raise the bar.",
  advance: "The full framework, for when it's proven it can stick.",
};

export default function CalculatorScreen() {
  const modal = useModal();
  const [mode, setMode] = useState<CalculatorMode>("starter");
  const [incomeInput, setIncomeInput] = useState("");
  const [customFormula, setCustomFormula] = useState<FormulaNode[]>(getDefaultCustomFormula);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [nudge, setNudge] = useState<api.TierStatus | null>(null);
  const [nudgeDismissedLocally, setNudgeDismissedLocally] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_INCOME);
      if (saved) {
        const n = Number(saved);
        if (n > 0) setIncomeInput(formatNairaInput(String(n)));
      }
      try {
        const rawCustom = await AsyncStorage.getItem(STORAGE_CUSTOM_FORMULA);
        if (rawCustom) setCustomFormula(JSON.parse(rawCustom) as FormulaNode[]);
      } catch { /* */ }
      try {
        const rawMode = await AsyncStorage.getItem(STORAGE_MODE);
        if (rawMode && (TABS as string[]).includes(rawMode)) setMode(rawMode as CalculatorMode);
      } catch { /* */ }
      setHydrated(true);
    })();
  }, []);

  const gross = parseNairaInput(incomeInput);
  const formula = mode === "custom" ? customFormula : getFormulaForTier(mode);
  const allocations = useMemo(() => computeAllocations(gross, formula), [gross, formula]);
  const canSave = gross > 0 && validateTree(formula);

  useEffect(() => {
    if (!hydrated) return;
    if (gross > 0) void AsyncStorage.setItem(STORAGE_INCOME, String(gross));
    if (mode === "custom") void AsyncStorage.setItem(STORAGE_CUSTOM_FORMULA, JSON.stringify(customFormula));
  }, [gross, customFormula, mode, hydrated]);

  // Persist selected tab + keep the server's tier record (used for the Graduate nudge) in sync.
  useEffect(() => {
    if (!hydrated) return;
    void AsyncStorage.setItem(STORAGE_MODE, mode);
    setNudgeDismissedLocally(false);
    void api.updateTier(mode).then((res) => {
      if (res.data) setNudge(res.data);
    });
  }, [mode, hydrated]);

  async function dismissNudge() {
    setNudgeDismissedLocally(true);
    await api.dismissTierNudge();
  }

  async function saveEntry() {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await api.createEntry({
        grossAmount: gross,
        mode: mode as "starter" | "intermediate" | "advance" | "custom",
        formulaSnapshot: formula,
        allocations,
      });
      if (res.error) {
        modal.show({ type: "error", title: "Could Not Save", message: res.error });
        return;
      }
      modal.show({ type: "success", title: "Entry Saved!", message: "This split has been added to your progress history." });
    } finally {
      setSaving(false);
    }
  }

  const tierIdx = TIER_ORDER.indexOf(mode as Tier);
  const nextTier = tierIdx >= 0 ? TIER_ORDER[tierIdx + 1] : undefined;
  const showNudge = !nudgeDismissedLocally && nudge?.nudge.eligible && nudge.currentTier === mode && !!nextTier;

  return (
    <>
    {modal.node}
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {showNudge && nextTier ? (
        <View style={styles.nudge}>
          <Sparkles size={18} color={THEME.colors.gold} />
          <View style={{ flex: 1 }}>
            <Text style={styles.nudgeText}>
              You&apos;ve been on {TAB_LABELS[mode]} for 90+ days. Ready to try {TAB_LABELS[nextTier]}?
            </Text>
            <TouchableOpacity onPress={() => setMode(nextTier)}>
              <Text style={styles.nudgeCta}>Try {TAB_LABELS[nextTier]}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={() => void dismissNudge()} hitSlop={8}>
            <X size={16} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}

      <Text style={styles.label}>Total gross income (₦)</Text>
      <TextInput
        style={styles.incomeInput}
        value={incomeInput}
        onChangeText={(t) => setIncomeInput(formatNairaInput(t))}
        placeholder="e.g. 900,000"
        placeholderTextColor={THEME.colors.textMuted}
        keyboardType="number-pad"
      />
      {gross > 0 ? <Text style={styles.parseHint}>Parsing as {formatNaira(gross)}</Text> : null}

      <View style={styles.modeRow}>
        {TABS.map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>{TAB_LABELS[m]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode !== "custom" ? (
        <Text style={[styles.modeHint, { marginBottom: 12 }]}>{TIER_COPY[mode]}</Text>
      ) : (
        <Text style={[styles.modeHint, { marginBottom: 12 }]}>
          Percentages shown as % of total income. Sibling groups must sum to 100%.
        </Text>
      )}

      {mode === "custom" ? (
        <CustomBucketTree nodes={customFormula} gross={gross} onRootChange={setCustomFormula} />
      ) : (
        <ReadonlyBucketList nodes={formula} gross={gross} />
      )}

      {gross > 0 && canSave ? (
        <TouchableOpacity style={styles.saveBtn} onPress={() => void saveEntry()} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Save size={18} color="#fff" />
              <Text style={styles.saveText}>Save entry</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: THEME.colors.background },
  content: { padding: 16, paddingBottom: 40 },
  label: { color: THEME.colors.text, fontSize: 14, fontFamily: THEME.fonts.uiSemibold, marginBottom: 8 },
  incomeInput: {
    backgroundColor: THEME.colors.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.input,
    padding: 14,
    fontSize: 20,
    fontFamily: THEME.fonts.uiMedium,
    color: THEME.colors.text,
  },
  parseHint: { color: THEME.colors.textMuted, fontSize: 12, marginTop: 6, fontFamily: THEME.fonts.ui },
  modeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: THEME.colors.input,
    borderRadius: THEME.radius.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 20,
    marginBottom: 12,
    padding: 4,
  },
  modeBtn: { flexGrow: 1, flexBasis: "25%", paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  modeBtnActive: { backgroundColor: THEME.colors.primary },
  modeText: { color: THEME.colors.textSecondary, fontFamily: THEME.fonts.uiSemibold, fontSize: 12 },
  modeTextActive: { color: THEME.colors.textOnJade },
  modeHint: { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.ui, flex: 1 },
  nudge: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: THEME.colors.goldSoft,
    borderWidth: 1,
    borderColor: THEME.colors.gold + "66",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  nudgeText: { color: THEME.colors.text, fontSize: 13, fontFamily: THEME.fonts.uiMedium },
  nudgeCta: { color: THEME.colors.primary, fontSize: 12, fontFamily: THEME.fonts.uiSemibold, marginTop: 6 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: THEME.colors.gold,
    borderRadius: THEME.radius.button,
    padding: 16,
    marginTop: 20,
  },
  saveText: { color: THEME.colors.jadeDeep, fontFamily: THEME.fonts.uiSemibold, fontSize: 16 },
});
