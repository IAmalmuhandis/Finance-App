import React from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  type BucketType,
  type FormulaNode,
  collectLeaves,
  computeAllocations,
  formatNaira,
  formatPercent,
} from "../lib/calculator";
import { THEME } from "../theme";

const TYPE_BG: Record<BucketType, string> = {
  Keep: "#D6F0E8",
  Spend: "#FFF3CC",
  Give: "#FFE4E1",
};
const TYPE_TEXT: Record<BucketType, string> = {
  Keep: "#1B6B4A",
  Spend: "#7A5A00",
  Give: "#B03030",
};

/** Flat, non-editable bucket list — used for the preset tiers (Starter/Intermediate/Advance). */
export function ReadonlyBucketList({ nodes, gross }: { nodes: FormulaNode[]; gross: number }) {
  const leaves = collectLeaves(nodes);
  const allocations = computeAllocations(gross, nodes);
  const amountByName = Object.fromEntries(allocations.map((a) => [a.name, a.amount]));

  return (
    <View>
      {leaves.map((leaf) => (
        <View key={leaf.id} style={styles.row}>
          <View style={styles.rowLeft}>
            <View style={[styles.typePill, { backgroundColor: TYPE_BG[leaf.type] }]}>
              <Text style={[styles.typeText, { color: TYPE_TEXT[leaf.type] }]}>{leaf.type}</Text>
            </View>
            <View style={styles.rowNameWrap}>
              <Text style={styles.rowName}>{leaf.name}</Text>
              <Text style={styles.rowPct}>{formatPercent(leaf.effectivePercent)} of income</Text>
            </View>
          </View>
          {gross > 0 ? <Text style={styles.rowAmount}>{formatNaira(amountByName[leaf.name] ?? 0)}</Text> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    gap: 8,
  },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, minWidth: 0 },
  typePill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  rowNameWrap: { flex: 1, minWidth: 0 },
  rowName: { color: THEME.colors.text, fontSize: 14, fontFamily: THEME.fonts.uiMedium },
  rowPct: { color: THEME.colors.textMuted, fontSize: 11, fontFamily: THEME.fonts.ui, marginTop: 2 },
  rowAmount: { color: THEME.colors.text, fontSize: 14, fontFamily: THEME.fonts.uiMedium },
});
