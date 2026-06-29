import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { GitBranch, Plus, Trash2 } from "lucide-react-native";
import {
  type BucketType,
  type FormulaNode,
  formatNaira,
  formatPercent,
  newId,
  siblingsDelta,
} from "../lib/calculator";
import { THEME } from "../theme";

const TYPES: BucketType[] = ["Keep", "Spend", "Give"];

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function updateAtPath(nodes: FormulaNode[], path: number[], updater: (n: FormulaNode) => FormulaNode): FormulaNode[] {
  if (!path.length) return nodes;
  const [idx, ...rest] = path;
  return nodes.map((n, i) => {
    if (i !== idx) return n;
    if (!rest.length) return updater(n);
    return { ...n, children: updateAtPath(n.children ?? [], rest, updater) };
  });
}

function removeAtPath(nodes: FormulaNode[], path: number[]): FormulaNode[] {
  if (path.length === 1) return nodes.filter((_, i) => i !== path[0]);
  const [idx, ...rest] = path;
  return nodes.map((n, i) => (i !== idx ? n : { ...n, children: removeAtPath(n.children ?? [], rest) }));
}

function effectiveOfPath(roots: FormulaNode[], path: number[]): number {
  let eff = 100;
  let nodes = roots;
  for (let i = 0; i < path.length; i++) {
    const node = nodes[path[i]];
    eff = (eff * node.relativePercent) / 100;
    nodes = node.children ?? [];
  }
  return eff;
}

// ── Remaining bar ─────────────────────────────────────────────────────────────

function RemainingBar({ nodes }: { nodes: FormulaNode[] }) {
  const delta = siblingsDelta(nodes);
  const used = nodes.reduce((s, n) => s + n.relativePercent, 0);
  const remaining = 100 - used;
  const isBalanced = Math.abs(delta) < 0.01;
  const isOver = delta > 0.01;

  const color = isBalanced ? THEME.colors.primary : isOver ? THEME.colors.accentAlert : "#D4A017";
  const bgColor = isBalanced ? "#E8F5F0" : isOver ? "#FFE8E8" : "#FFF8E0";

  return (
    <View style={[styles.remainBar, { backgroundColor: bgColor, borderColor: color + "44" }]}>
      <View style={styles.remainTop}>
        <Text style={[styles.remainLabel, { color }]}>
          {isBalanced ? "Balanced" : isOver ? `${Math.abs(delta).toFixed(1)}% over 100%` : `${remaining.toFixed(1)}% remaining`}
        </Text>
        <Text style={styles.remainPercent}>{used.toFixed(1)}% / 100%</Text>
      </View>
      <View style={styles.remainTrack}>
        <View style={[styles.remainFill, { width: `${Math.min(used, 100)}%` as `${number}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

// ── Single bucket card ────────────────────────────────────────────────────────

function BucketCard({
  node,
  path,
  gross,
  roots,
  onRootChange,
  depth,
}: {
  node: FormulaNode;
  path: number[];
  gross: number;
  roots: FormulaNode[];
  onRootChange: (n: FormulaNode[]) => void;
  depth: number;
}) {
  const [childOpen, setChildOpen] = useState(true);
  const hasChildren = Boolean(node.children?.length);
  const effective = effectiveOfPath(roots, path);
  const amount = gross > 0 ? Math.round((gross * effective) / 100) : 0;

  const patch = (up: (n: FormulaNode) => FormulaNode) => onRootChange(updateAtPath(roots, path, up));

  const bucketType = node.type ?? "Keep";

  return (
    <View style={[styles.card, depth > 0 && styles.nested]}>
      {/* Top row */}
      <View style={styles.cardTop}>
        {!hasChildren ? (
          <TouchableOpacity
            onPress={() => {
              const i = TYPES.indexOf(bucketType);
              patch((n) => ({ ...n, type: TYPES[(i + 1) % TYPES.length] }));
            }}
            style={[styles.typePill, { backgroundColor: TYPE_BG[bucketType] }]}
          >
            <Text style={[styles.typeText, { color: TYPE_TEXT[bucketType] }]}>{bucketType}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setChildOpen((v) => !v)}
            style={[styles.typePill, { backgroundColor: THEME.colors.elevated }]}
          >
            <Text style={[styles.typeText, { color: THEME.colors.textMuted }]}>Group {childOpen ? "▾" : "▸"}</Text>
          </TouchableOpacity>
        )}

        <TextInput
          style={styles.nameInput}
          value={node.name}
          onChangeText={(t) => patch((n) => ({ ...n, name: t }))}
          placeholderTextColor={THEME.colors.textMuted}
        />

        {!hasChildren ? (
          <TouchableOpacity
            onPress={() =>
              patch((n) => ({
                ...n,
                type: undefined,
                children: [
                  { id: newId(), name: "Part 1", relativePercent: 50, type: "Keep" },
                  { id: newId(), name: "Part 2", relativePercent: 50, type: "Keep" },
                ],
              }))
            }
            hitSlop={8}
            style={styles.iconBtn}
          >
            <GitBranch size={14} color={THEME.colors.textMuted} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity onPress={() => onRootChange(removeAtPath(roots, path))} hitSlop={8} style={styles.iconBtn}>
          <Trash2 size={14} color={THEME.colors.accentAlert} />
        </TouchableOpacity>
      </View>

      {/* Bottom row: % input + amount */}
      {!hasChildren ? (
        <View style={styles.cardBottom}>
          <View style={styles.pctRow}>
            <TextInput
              style={styles.pctInput}
              keyboardType="decimal-pad"
              value={String(Math.round(effective * 10) / 10)}
              onChangeText={(t) => {
                const newEff = Number(t) || 0;
                const parentEff = depth === 0 ? 100 : effectiveOfPath(roots, path.slice(0, -1));
                const newRel = parentEff > 0 ? (newEff * 100) / parentEff : 0;
                patch((n) => ({ ...n, relativePercent: Math.round(newRel * 10) / 10 }));
              }}
            />
            <Text style={styles.pctLabel}>% of income</Text>
          </View>
          {gross > 0 ? <Text style={styles.amount}>{formatNaira(amount)}</Text> : null}
        </View>
      ) : (
        <View style={styles.cardBottom}>
          <Text style={styles.pctLabel}>{formatPercent(effective)} of income</Text>
          {gross > 0 ? <Text style={styles.amount}>{formatNaira(amount)}</Text> : null}
        </View>
      )}

      {/* Children */}
      {hasChildren && childOpen ? (
        <View style={styles.childrenWrap}>
          <RemainingBar nodes={node.children!} />
          {node.children!.map((child, idx) => (
            <BucketCard
              key={child.id}
              node={child}
              path={[...path, idx]}
              gross={gross}
              roots={roots}
              onRootChange={onRootChange}
              depth={depth + 1}
            />
          ))}
          <TouchableOpacity
            style={styles.addSub}
            onPress={() =>
              patch((n) => ({
                ...n,
                children: [...(n.children ?? []), { id: newId(), name: "New bucket", relativePercent: 0, type: "Keep" }],
              }))
            }
          >
            <Plus size={13} color={THEME.colors.textSecondary} />
            <Text style={styles.addText}>Add sub-bucket</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

// ── CustomBucketTree (exported) ───────────────────────────────────────────────

export function CustomBucketTree({
  nodes,
  gross,
  roots,
  onRootChange,
  parentPath = [],
}: {
  nodes: FormulaNode[];
  gross: number;
  roots?: FormulaNode[];
  onRootChange: (n: FormulaNode[]) => void;
  parentPath?: number[];
}) {
  const treeRoots = roots ?? nodes;
  const isRoot = parentPath.length === 0;

  return (
    <View>
      {isRoot ? <RemainingBar nodes={nodes} /> : null}
      {nodes.map((node, idx) => (
        <BucketCard
          key={node.id}
          node={node}
          path={[...parentPath, idx]}
          gross={gross}
          roots={treeRoots}
          onRootChange={onRootChange}
          depth={parentPath.length}
        />
      ))}
      {isRoot ? (
        <TouchableOpacity
          style={styles.addRoot}
          onPress={() => onRootChange([...treeRoots, { id: newId(), name: "New bucket", relativePercent: 0, type: "Keep" }])}
        >
          <Plus size={16} color={THEME.colors.textSecondary} />
          <Text style={styles.addText}>Add bucket</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  nested: { marginLeft: 12, borderLeftWidth: 2, borderLeftColor: THEME.colors.border },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  typePill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  typeText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  nameInput: {
    flex: 1,
    color: THEME.colors.text,
    fontSize: 14,
    fontFamily: THEME.fonts.uiMedium,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  iconBtn: { padding: 4 },
  cardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, flexWrap: "wrap", gap: 8 },
  pctRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: THEME.colors.input, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  pctInput: { width: 44, color: THEME.colors.text, fontSize: 13, fontFamily: THEME.fonts.uiMedium, textAlign: "right" },
  pctLabel: { color: THEME.colors.textMuted, fontSize: 12, fontFamily: THEME.fonts.ui },
  amount: { color: THEME.colors.text, fontSize: 14, fontFamily: THEME.fonts.uiMedium },
  childrenWrap: { marginTop: 10 },
  addSub: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 },
  addRoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: THEME.colors.border,
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  addText: { color: THEME.colors.textSecondary, fontSize: 13, fontFamily: THEME.fonts.ui },
  // remaining bar
  remainBar: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  remainTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  remainLabel: { fontSize: 12, fontFamily: THEME.fonts.uiSemibold },
  remainPercent: { fontSize: 12, color: THEME.colors.textMuted, fontFamily: THEME.fonts.ui },
  remainTrack: { height: 4, backgroundColor: THEME.colors.elevated, borderRadius: 4, overflow: "hidden" },
  remainFill: { height: 4, borderRadius: 4 },
});
