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

function SiblingHint({ nodes }: { nodes: FormulaNode[] }) {
  const delta = siblingsDelta(nodes);
  if (Math.abs(delta) < 0.01) return null;
  const off = Math.abs(delta).toFixed(1);
  return (
    <Text style={styles.hint}>
      {delta > 0 ? `${off}% over 100%` : `${off}% under 100%`} — adjust sibling percentages.
    </Text>
  );
}

function Row({
  node,
  path,
  gross,
  parentEffective,
  roots,
  onRootChange,
}: {
  node: FormulaNode;
  path: number[];
  gross: number;
  parentEffective: number;
  roots: FormulaNode[];
  onRootChange: (n: FormulaNode[]) => void;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = Boolean(node.children?.length);
  const effective = (parentEffective * node.relativePercent) / 100;
  const patch = (up: (n: FormulaNode) => FormulaNode) => onRootChange(updateAtPath(roots, path, up));
  const amount = Math.round((gross * effective) / 100);

  return (
    <View style={[styles.row, path.length > 0 && styles.nested]}>
      <View style={styles.rowHead}>
        {hasChildren ? (
          <TouchableOpacity onPress={() => setOpen((v) => !v)} hitSlop={8}>
            <Text style={styles.chevron}>{open ? "▼" : "▶"}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 16 }} />
        )}
        <TextInput
          style={styles.nameInput}
          value={node.name}
          onChangeText={(t) => patch((n) => ({ ...n, name: t }))}
        />
        {!hasChildren ? (
          <TouchableOpacity
            style={styles.typeBtn}
            onPress={() => {
              const i = TYPES.indexOf(node.type ?? "Keep");
              patch((n) => ({ ...n, type: TYPES[(i + 1) % TYPES.length] }));
            }}
          >
            <Text style={styles.typeText}>{node.type ?? "Keep"}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={() => onRootChange(removeAtPath(roots, path))} hitSlop={8}>
          <Trash2 size={16} color={THEME.colors.textMuted} />
        </TouchableOpacity>
      </View>

      {!hasChildren ? (
        <View style={styles.meta}>
          <TextInput
            style={styles.pctInput}
            keyboardType="decimal-pad"
            value={String(Math.round(node.relativePercent * 10) / 10)}
            onChangeText={(t) => patch((n) => ({ ...n, relativePercent: Number(t) || 0 }))}
          />
          <Text style={styles.metaText}>% of parent · {formatPercent(effective)} · {formatNaira(amount)}</Text>
        </View>
      ) : (
        <Text style={styles.metaText}>Children sum · {formatPercent(effective)} of income</Text>
      )}

      {!hasChildren ? (
        <TouchableOpacity style={styles.splitBtn} onPress={() => patch((n) => ({
          ...n,
          type: undefined,
          children: [
            { id: newId(), name: "Part 1", relativePercent: 50, type: "Keep" },
            { id: newId(), name: "Part 2", relativePercent: 50, type: "Keep" },
          ],
        }))}>
          <GitBranch size={14} color={THEME.colors.textSecondary} />
          <Text style={styles.splitText}>Split</Text>
        </TouchableOpacity>
      ) : null}

      {hasChildren && open ? (
        <View style={styles.children}>
          <SiblingHint nodes={node.children!} />
          <CustomBucketTree nodes={node.children!} gross={gross} parentEffective={effective} roots={roots} onRootChange={onRootChange} parentPath={path} />
          <TouchableOpacity
            style={styles.addSub}
            onPress={() => patch((n) => ({
              ...n,
              children: [...(n.children ?? []), { id: newId(), name: "New bucket", relativePercent: 0, type: "Keep" }],
            }))}
          >
            <Plus size={14} color={THEME.colors.textSecondary} />
            <Text style={styles.addText}>Add sub-bucket</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

export function CustomBucketTree({
  nodes,
  gross,
  roots,
  onRootChange,
  parentPath = [],
  parentEffective = 100,
}: {
  nodes: FormulaNode[];
  gross: number;
  roots?: FormulaNode[];
  onRootChange: (n: FormulaNode[]) => void;
  parentPath?: number[];
  parentEffective?: number;
}) {
  const treeRoots = roots ?? nodes;
  return (
    <View>
      {parentPath.length === 0 ? <SiblingHint nodes={nodes} /> : null}
      {nodes.map((node, idx) => (
        <Row
          key={node.id}
          node={node}
          path={[...parentPath, idx]}
          gross={gross}
          parentEffective={parentEffective}
          roots={treeRoots}
          onRootChange={onRootChange}
        />
      ))}
      {parentPath.length === 0 ? (
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
  row: {
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  nested: { marginLeft: 8, borderLeftWidth: 2, borderLeftColor: THEME.colors.border },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  chevron: { color: THEME.colors.textMuted, fontSize: 12, width: 16 },
  nameInput: {
    flex: 1,
    color: THEME.colors.text,
    fontSize: 14,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  typeBtn: {
    backgroundColor: THEME.colors.elevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeText: { color: THEME.colors.textMuted, fontSize: 10, fontWeight: "600" },
  meta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" },
  pctInput: {
    width: 48,
    color: THEME.colors.text,
    backgroundColor: THEME.colors.input,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 13,
  },
  metaText: { color: THEME.colors.textSecondary, fontSize: 12, flex: 1 },
  splitBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  splitText: { color: THEME.colors.textSecondary, fontSize: 12 },
  children: { marginTop: 8 },
  hint: { color: THEME.colors.accentAlert, fontSize: 12, marginBottom: 6, fontFamily: THEME.fonts.ui },
  addSub: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8 },
  addRoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: THEME.colors.border,
    borderRadius: 10,
    padding: 12,
  },
  addText: { color: THEME.colors.textSecondary, fontSize: 13 },
});
