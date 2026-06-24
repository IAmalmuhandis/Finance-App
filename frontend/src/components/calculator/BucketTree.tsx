"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, GitBranch, Plus, Trash2 } from "lucide-react";
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

type Props = {
  nodes: FormulaNode[];
  gross: number;
  editable: boolean;
  onChange: (nodes: FormulaNode[]) => void;
  depth?: number;
  parentPath?: number[];
};

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

function SiblingValidation({ nodes }: { nodes: FormulaNode[] }) {
  const delta = siblingsDelta(nodes);
  if (Math.abs(delta) < 0.01) return null;
  const off = Math.abs(delta).toFixed(1);
  return (
    <p className="rounded-[12px] border border-accent-amber/40 bg-gold-soft px-3 py-2 text-xs text-accent-red">
      {delta > 0
        ? `This group is ${off}% over 100% — adjust sibling percentages to balance.`
        : `This group is ${off}% under 100% — adjust sibling percentages to balance.`}
    </p>
  );
}

function BucketRow({
  node,
  path,
  gross,
  parentEffective,
  editable,
  onRootChange,
  rootNodes,
}: {
  node: FormulaNode;
  path: number[];
  gross: number;
  parentEffective: number;
  editable: boolean;
  onRootChange: (nodes: FormulaNode[]) => void;
  rootNodes: FormulaNode[];
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const effective = (parentEffective * node.relativePercent) / 100;
  const amount = hasChildren
    ? collectLeaves([node], parentEffective).reduce((s, l) => s + Math.round((gross * l.effectivePercent) / 100), 0)
    : Math.round((gross * effective) / 100);

  const patch = (updater: (n: FormulaNode) => FormulaNode) =>
    onRootChange(updateAtPath(rootNodes, path, updater));

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "rounded-[20px] border border-border-subtle bg-bg-surface px-3 py-2.5",
          path.length > 0 && "ml-3 border-l-2 border-l-border-strong"
        )}
      >
        <div className="flex flex-wrap items-start gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-0.5 shrink-0 text-text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade"
              aria-expanded={open}
              aria-label={open ? "Collapse" : "Expand"}
            >
              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <span className="w-4 shrink-0" aria-hidden />
          )}

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {editable ? (
                <input
                  className="min-w-[8rem] flex-1 rounded-md border border-border-subtle bg-bg-input px-2 py-1 text-sm text-text-primary focus:border-border-strong focus:outline-none focus:ring-1 focus:ring-jade/30"
                  value={node.name}
                  onChange={(e) => patch((n) => ({ ...n, name: e.target.value }))}
                  aria-label="Bucket name"
                />
              ) : (
                <span className="text-sm font-medium text-text-primary">{node.name}</span>
              )}

              {!hasChildren && editable ? (
                <select
                  className="rounded-md border border-border-subtle bg-bg-input px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-jade/30"
                  value={node.type ?? "Keep"}
                  onChange={(e) => patch((n) => ({ ...n, type: e.target.value as BucketType }))}
                  aria-label={`Type for ${node.name}`}
                >
                  {BUCKET_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              ) : !hasChildren ? (
                <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] uppercase tracking-wide text-text-muted">
                  {node.type ?? "Keep"}
                </span>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary">
              {hasChildren ? (
                <span>Sum of children · {formatPercent(effective)} of income</span>
              ) : (
                <>
                  {editable ? (
                    <label className="flex items-center gap-1.5">
                      <span className="text-text-muted">Share</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        className="w-16 rounded-md border border-border-subtle bg-bg-input px-2 py-0.5 text-text-primary focus:outline-none focus:ring-1 focus:ring-jade/30"
                        value={Math.round(node.relativePercent * 10) / 10}
                        onChange={(e) =>
                          patch((n) => ({ ...n, relativePercent: Number(e.target.value) || 0 }))
                        }
                        aria-label={`Relative percent for ${node.name}`}
                      />
                      <span>% of parent</span>
                    </label>
                  ) : (
                    <span>{formatPercent(node.relativePercent)} of parent</span>
                  )}
                  <span>·</span>
                  <span>{formatPercent(effective)} of income</span>
                </>
              )}
              <span className="ml-auto font-medium text-text-primary">{formatNaira(hasChildren ? amount : Math.round((gross * effective) / 100))}</span>
            </div>
          </div>

          {editable ? (
            <div className="flex shrink-0 gap-1">
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
                  className="rounded-md p-1.5 text-text-muted hover:bg-bg-elevated hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade"
                  aria-label={`Split ${node.name}`}
                >
                  <GitBranch size={14} />
                </button>
              ) : null}
              <button
                type="button"
                title="Remove bucket"
                onClick={() => onRootChange(removeAtPath(rootNodes, path))}
                className="rounded-md p-1.5 text-text-muted hover:bg-accent-red/10 hover:text-accent-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade"
                aria-label={`Remove ${node.name}`}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {hasChildren && open ? (
        <div className="space-y-2 pl-2">
          <SiblingValidation nodes={node.children!} />
          <BucketTree
            nodes={node.children!}
            gross={gross}
            editable={editable}
            onChange={onRootChange}
            depth={path.length + 1}
            parentPath={path}
            rootNodes={rootNodes}
            parentEffective={effective}
          />
          {editable ? (
            <button
              type="button"
              onClick={() =>
                patch((n) => ({
                  ...n,
                  children: [...(n.children ?? []), { id: newId(), name: "New bucket", relativePercent: 0, type: "Keep" }],
                }))
              }
              className="flex items-center gap-1.5 rounded-lg border border-dashed border-border-subtle px-3 py-2 text-xs text-text-secondary hover:border-border-strong hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade"
            >
              <Plus size={14} aria-hidden />
              Add sub-bucket
            </button>
          ) : null}
        </div>
      ) : null}

      {!hasChildren ? null : null}
    </div>
  );
}

export function BucketTree({
  nodes,
  gross,
  editable,
  onChange,
  depth = 0,
  parentPath = [],
  rootNodes,
  parentEffective = 100,
}: Props & { rootNodes?: FormulaNode[]; parentEffective?: number }) {
  const roots = rootNodes ?? nodes;
  const onRootChange = onChange;

  return (
    <div className="space-y-2">
      {depth === 0 ? <SiblingValidation nodes={nodes} /> : null}
      {nodes.map((node, idx) => {
        const path = [...parentPath, idx];
        return (
          <BucketRow
            key={node.id}
            node={node}
            path={path}
            gross={gross}
            parentEffective={parentEffective}
            editable={editable}
            onRootChange={onRootChange}
            rootNodes={roots}
          />
        );
      })}
      {editable && depth === 0 ? (
        <button
          type="button"
          onClick={() => onRootChange([...roots, { id: newId(), name: "New bucket", relativePercent: 0, type: "Keep" }])}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border-subtle py-2.5 text-sm text-text-secondary hover:border-border-strong hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-jade"
        >
          <Plus size={16} aria-hidden />
          Add bucket
        </button>
      ) : null}
    </div>
  );
}

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
