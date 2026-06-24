import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Save } from "lucide-react-native";
import { CustomBucketTree } from "../components/CustomBucketTree";
import {
  type CalculatorMode,
  type FormulaNode,
  STORAGE_CUSTOM_FORMULA,
  STORAGE_INCOME,
  collectLeaves,
  computeAllocations,
  formatNaira,
  formatNairaInput,
  formatPercent,
  getDefaultCustomFormula,
  getRecommendedFormula,
  parseNairaInput,
  validateTree,
} from "../lib/calculator";
import * as api from "../lib/api";
import { ALLOCATION_COLORS } from "../lib/brand";
import { THEME } from "../theme";

export default function CalculatorScreen() {
  const [mode, setMode] = useState<CalculatorMode>("recommended");
  const [incomeInput, setIncomeInput] = useState("");
  const [customFormula, setCustomFormula] = useState<FormulaNode[]>(getDefaultCustomFormula);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_INCOME);
      if (saved) {
        const n = Number(saved);
        if (n > 0) setIncomeInput(formatNairaInput(String(n)));
      }
      try {
        const raw = await AsyncStorage.getItem(STORAGE_CUSTOM_FORMULA);
        if (raw) setCustomFormula(JSON.parse(raw) as FormulaNode[]);
      } catch {
        /* */
      }
      setHydrated(true);
    })();
  }, []);

  const gross = parseNairaInput(incomeInput);
  const formula = mode === "recommended" ? getRecommendedFormula() : customFormula;
  const allocations = useMemo(() => computeAllocations(gross, formula), [gross, formula]);
  const canSave = gross > 0 && validateTree(formula);

  useEffect(() => {
    if (!hydrated) return;
    if (gross > 0) void AsyncStorage.setItem(STORAGE_INCOME, String(gross));
    if (mode === "custom") void AsyncStorage.setItem(STORAGE_CUSTOM_FORMULA, JSON.stringify(customFormula));
  }, [gross, customFormula, mode, hydrated]);

  async function saveEntry() {
    if (!canSave) return;
    setSaving(true);
    try {
      const res = await api.createEntry({
        grossAmount: gross,
        mode,
        formulaSnapshot: formula,
        allocations,
      });
      if (res.error) {
        Alert.alert("Could not save", res.error);
        return;
      }
      Alert.alert("Saved", "Entry saved to your progress.");
    } finally {
      setSaving(false);
    }
  }

  const recommendedLeaves = mode === "recommended" ? collectLeaves(formula) : [];
  const amountByName = Object.fromEntries(allocations.map((a) => [a.name, a.amount]));

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
        {(["recommended", "custom"] as const).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            onPress={() => setMode(m)}
          >
            <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
              {m === "recommended" ? "Recommended" : "Custom"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === "recommended" ? (
        <View style={styles.bucketList}>
          {recommendedLeaves.map((leaf) => (
            <View key={leaf.id} style={styles.bucket}>
              <View style={styles.bucketLeft}>
                <View
                  style={[styles.dot, { backgroundColor: ALLOCATION_COLORS[leaf.name] ?? "#6B7A6F" }]}
                />
                <View>
                  <Text style={styles.bucketName}>{leaf.name}</Text>
                  <Text style={styles.bucketMeta}>
                    {formatPercent(leaf.effectivePercent)} · {leaf.type}
                  </Text>
                </View>
              </View>
              <Text style={styles.bucketAmt}>{formatNaira(amountByName[leaf.name] ?? 0)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <CustomBucketTree nodes={customFormula} gross={gross} onRootChange={setCustomFormula} />
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
    backgroundColor: THEME.colors.input,
    borderRadius: THEME.radius.input,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 20,
    marginBottom: 16,
    padding: 4,
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
  modeBtnActive: { backgroundColor: THEME.colors.primary },
  modeText: { color: THEME.colors.textSecondary, fontFamily: THEME.fonts.uiSemibold, fontSize: 14 },
  modeTextActive: { color: THEME.colors.textOnJade },
  bucketList: { gap: 8 },
  bucket: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.radius.card,
    padding: 14,
    marginBottom: 8,
  },
  bucketLeft: { flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  bucketName: { color: THEME.colors.text, fontSize: 15, fontFamily: THEME.fonts.uiSemibold },
  bucketMeta: { color: THEME.colors.textSecondary, fontSize: 12, marginTop: 2, fontFamily: THEME.fonts.ui },
  bucketAmt: { color: THEME.colors.text, fontSize: 15, fontFamily: THEME.fonts.uiMedium },
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
