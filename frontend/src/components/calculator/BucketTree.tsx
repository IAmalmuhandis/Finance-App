"use client";

import { useState } from "react";
import { Plus, Trash2, GitBranch, RotateCcw } from "lucide-react";
import {
  type BucketType,
  type FormulaNode,
  collectLeaves,
  computeAllocations,
  formatNaira,
  formatPercent,
  getRecommendedFormula,
  newId,
  siblingsDelta,
} from "@/lib/calculator";
import { ALLOCATION_COLORS } from "@/lib/brand";
import { cn } from "@/lib/utils";

const BUCKET_TYPES: BucketType[] = ["Keep", "Spend", "Give"];

const TYPE_COLORS: Record<BucketType, string> = {
  Keep: "bg-jade/15 text-jade",
  Spend: "bg-gold/30 text-amber-700",
  Give: "bg-accent-red/10 text-accent-red",
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function updateAtPath(nodes: FormulaNode[], path: number[], updater: (n: FormulaNode) => FormulaNode): FormulaNode[] {
  if (path.length === 0) return nodes;
  const [idx, ...rest] = path;
  return nodes.map((n, i) => {
    if (i !== idx) return n;
    if (rest.length === 0) return updater(n);
    return { ...n, children: updateAtPath(n.children ?? [], rest, updater) };
  });
}

function removeAtPath(nodes: FormulaNode[], path: number[]): FormulaNode[] {
  if (path.length === 1) return nodes.filter((_, i) => i !== path[0]);
  const [idx, ...rest] = path;
  return nodes.map((n, i) => {
    if (i !== idx) return n;
    return { ...n, children: removeAtPath(n.children ?? [], rest) };
  });
}

/** Compute effective % of gross income for a node at the given path */
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

  return (
    <div className={cn(
      "rounded-[14px] border p-3 mb-3",
      isBalanced ? "border-jade/30 bg-jade/5" : isOver ? "border-accent-red/40 bg-accent-red/5" : "border-accent-amber/40 bg-gold-soft"
    )}>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className={cn("font-medium", isBalanced ? "text-jade" : isOver ? "text-accent-red" : "text-accent-amber")}>
          {isBalanced ? "Perfectly balanced" : isOver ? `${Math.abs(delta).toFixed(1)}% over 100%` : `${remaining.toFixed(1)}% remaining`}
        </span>
        <span className="tabular-nums text-text-muted">{used.toFixed(1)}% / 100%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-bg-elevated overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", isBalanced ? "bg-jade" : isOver ? "bg-accent-red" : "bg-accent-amber")}
          style={{ width: `${Math.min(used, 100)}%` }}
        />
      </div>
    </div>
  );
}

// ── Single bucket card ────────────────────────────────────────────────────────

function BucketCard({
  node,
  path,
  gross,
  rootNodes,
  onRootChange,
  depth,
}: {
  node: FormulaNode;
  path: number[];
  gross: number;
  rootNodes: FormulaNode[];
  onRootChange: (n: FormulaNode[]) => void;
  depth: number;
}) {
  const [childOpen, setChildOpen] = useState(true);
  const hasChildren = Boolean(node.children?.length);
  const effective = effectiveOfPath(rootNodes, path);

  const patch = (updater: (n: FormulaNode) => FormulaNode) =>
    onRootChange(updateAtPath(rootNodes, path, updater));

  const amount = gross > 0 ? Math.round((gross * effective) / 100) : 0;

  return (
    <div className={cn("space-y-2", depth > 0 && "ml-4 border-l-2 border-border-subtle pl-3")}>
      <div className="rounded-[16px] border border-border-subtle bg-bg-surface p-3">
        {/* Top row: type pill + name + delete */}
        <div className="flex items-center gap-2">
          {!hasChildren ? (
            <button
              type="button"
              onClick={() => {
                const i = BUCKET_TYPES.indexOf(node.type ?? "Keep");
                patch((n) => ({ ...n, type: BUCKET_TYPES[(i + 1) % BUCKET_TYPES.length] }));
              }}
              className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition", TYPE_COLORS[node.type ?? "Keep"])}
              title="Click to change type"
            >
              {node.type ?? "Keep"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setChildOpen((v) => !v)}
              className="shrink-0 rounded-full bg-bg-elevated px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-text-muted"
            >
              Group {childOpen ? "▾" : "▸"}
            </button>
          )}

          <input
            className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-text-primary focus:border-border-subtle focus:bg-bg-input focus:outline-none"
            value={node.name}
            onChange={(e) => patch((n) => ({ ...n, name: e.target.value }))}
            aria-label="Bucket name"
          />

          {!hasChildren ? (
            <button
              type="button"
              title="Split into sub-buckets"
              onClick={() =>
                patch((n) => ({
                  ...n,
                  type: undefined,
                  children: [
                    { id: newId(), name: "Part 1", relativePercent: 50, type: "Keep" },
                    { id: newId(), name: "Part 2", relativePercent: 50, type: "Keep" },
                  ],
                }))
              }
              className="shrink-0 rounded-md p-1 text-text-muted hover:bg-bg-elevated hover:text-text-primary"
              aria-label="Split"
            >
              <GitBranch size={13} />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onRootChange(removeAtPath(rootNodes, path))}
            className="shrink-0 rounded-md p-1 text-text-muted hover:bg-accent-red/10 hover:text-accent-red"
            aria-label="Remove"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Bottom row: % of income input + naira amount */}
        {!hasChildren ? (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-border-subtle bg-bg-input px-2 py-1">
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                className="w-14 bg-transparent text-right text-sm tabular-nums text-text-primary focus:outline-none"
                value={Math.round(effective * 10) / 10}
                onChange={(e) => {
                  const newEff = Number(e.target.value) || 0;
                  // Convert effective % back to relative % of parent
                  const parentEff = depth === 0 ? 100 : effectiveOfPath(rootNodes, path.slice(0, -1));
                  const newRel = parentEff > 0 ? (newEff * 100) / parentEff : 0;
                  patch((n) => ({ ...n, relativePercent: Math.round(newRel * 10) / 10 }));
                }}
                aria-label={`Percentage of income for ${node.name}`}
              />
              <span className="text-xs text-text-muted">% of income</span>
            </div>
            {gross > 0 ? (
              <span className="ml-auto text-sm font-medium tabular-nums text-text-primary">{formatNaira(amount)}</span>
            ) : null}
          </div>
        ) : (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-xs text-text-muted">{formatPercent(effective)} of income</span>
            {gross > 0 ? (
              <span className="text-sm font-medium tabular-nums text-text-primary">{formatNaira(amount)}</span>
            ) : null}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && childOpen ? (
        <div className="space-y-2">
          <RemainingBar nodes={node.children!} />
          {node.children!.map((child, idx) => (
            <BucketCard
              key={child.id}
              node={child}
              path={[...path, idx]}
              gross={gross}
              rootNodes={rootNodes}
              onRootChange={onRootChange}
              depth={depth + 1}
            />
          ))}
          <button
            type="button"
            onClick={() =>
              patch((n) => ({
                ...n,
                children: [...(n.children ?? []), { id: newId(), name: "New bucket", relativePercent: 0, type: "Keep" }],
              }))
            }
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-border-subtle px-3 py-2 text-xs text-text-secondary hover:border-border-strong hover:text-text-primary"
          >
            <Plus size={13} aria-hidden />
            Add sub-bucket
          </button>
        </div>
      ) : null}
    </div>
  );
}

// ── BucketTree (exported) ─────────────────────────────────────────────────────

type BucketTreeProps = {
  nodes: FormulaNode[];
  gross: number;
  editable?: boolean;
  onChange: (nodes: FormulaNode[]) => void;
};

export function BucketTree({ nodes, gross, editable = true, onChange }: BucketTreeProps) {
  if (!editable) {
    // Readonly flat view — same as RecommendedBuckets but for arbitrary formula
    const leaves = collectLeaves(nodes);
    const allocations = computeAllocations(gross, nodes);
    const amountByName = Object.fromEntries(allocations.map((a) => [a.name, a.amount]));
    return (
      <div className="space-y-2">
        {leaves.map((leaf) => (
          <div
            key={leaf.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-[20px] border border-border-subtle bg-bg-surface px-4 py-3"
          >
            <div className="flex items-start gap-3">
              <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: ALLOCATION_COLORS[leaf.name] ?? "#6B7A6F" }} aria-hidden />
              <div>
                <p className="text-sm font-medium text-text-primary">{leaf.name}</p>
                <p className="text-xs text-text-secondary">{formatPercent(leaf.effectivePercent)} · <span className="text-text-muted">{leaf.type}</span></p>
              </div>
            </div>
            <p className="text-sm font-medium tabular-nums text-text-primary">{formatNaira(amountByName[leaf.name] ?? 0)}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <RemainingBar nodes={nodes} />
      {nodes.map((node, idx) => (
        <BucketCard
          key={node.id}
          node={node}
          path={[idx]}
          gross={gross}
          rootNodes={nodes}
          onRootChange={onChange}
          depth={0}
        />
      ))}
      <button
        type="button"
        onClick={() => onChange([...nodes, { id: newId(), name: "New bucket", relativePercent: 0, type: "Keep" }])}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle py-2.5 text-sm text-text-secondary hover:border-border-strong hover:text-text-primary"
      >
        <Plus size={16} aria-hidden />
        Add bucket
      </button>
    </div>
  );
}

// ── RecommendedBuckets (readonly, exported for backward-compat) ───────────────

export function RecommendedBuckets({ gross }: { gross: number }) {
  const formula = getRecommendedFormula();
  const leaves = collectLeaves(formula);
  const allocations = computeAllocations(gross, formula);
  const amountByName = Object.fromEntries(allocations.map((a) => [a.name, a.amount]));

  return (
    <div className="space-y-2">
      {leaves.map((leaf) => (
        <div
          key={leaf.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-[20px] border border-border-subtle bg-bg-surface px-4 py-3"
        >
          <div className="flex items-start gap-3">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: ALLOCATION_COLORS[leaf.name] ?? "#6B7A6F" }}
              aria-hidden
            />
            <div>
              <p className="text-sm font-medium text-text-primary">{leaf.name}</p>
              <p className="text-xs text-text-secondary">
                {formatPercent(leaf.effectivePercent)} · <span className="text-text-muted">{leaf.type}</span>
              </p>
            </div>
          </div>
          <p className="text-sm font-medium tabular-nums text-text-primary">
            {formatNaira(amountByName[leaf.name] ?? 0)}
          </p>
        </div>
      ))}
    </div>
  );
}
