import { cn } from "@/lib/utils";

function Bar({ className }: { className?: string }) {
  return <div className={cn("vault-shimmer rounded-md", className)} />;
}

/** Top bar row matching `TopBar` height and rhythm */
function TopBarSkeleton({ showDateSlot = false }: { showDateSlot?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border-subtle px-8 py-6">
      <Bar className="h-8 w-40" />
      <div className="flex items-center gap-3">
        {showDateSlot ? <Bar className="h-10 w-36 rounded-lg" /> : null}
        <Bar className="h-10 w-10 rounded-lg" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-8">
      <TopBarSkeleton showDateSlot />
      <Bar className="mt-6 h-24 w-full rounded-xl" />
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border-subtle border-l-4 border-l-border-strong bg-bg-surface/40 p-5">
            <Bar className="h-3 w-24" />
            <Bar className="mt-4 h-9 w-36" />
            <Bar className="mt-4 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
        <div className="rounded-xl border border-border-subtle bg-bg-surface/40 p-4 xl:col-span-3">
          <Bar className="mb-4 h-4 w-40" />
          <Bar className="h-[240px] w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-surface/40 p-4 xl:col-span-2">
          <Bar className="mb-4 h-4 w-36" />
          <Bar className="mx-auto h-[200px] w-[200px] rounded-full" />
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border-subtle bg-bg-surface/40 p-4">
        <Bar className="mb-4 h-4 w-32" />
        <Bar className="h-[260px] w-full rounded-lg" />
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-5">
        <div className="rounded-xl border border-border-subtle bg-bg-surface/40 p-4 xl:col-span-3">
          <Bar className="mb-4 h-4 w-44" />
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Bar key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-surface/40 p-4 xl:col-span-2">
          <Bar className="mb-4 h-4 w-36" />
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Bar key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-text-muted">Loading your dashboard…</p>
    </div>
  );
}

export function AccountsSkeleton() {
  return (
    <div className="p-8">
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-border-subtle pb-6">
        <Bar className="h-8 w-44" />
        <Bar className="h-10 w-36 shrink-0 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border-subtle bg-bg-surface/40 p-6">
            <div className="flex justify-between">
              <div className="space-y-2">
                <Bar className="h-6 w-40" />
                <Bar className="h-4 w-28" />
              </div>
              <Bar className="h-8 w-8 rounded-md" />
            </div>
            <Bar className="mt-4 h-3 w-24" />
            <Bar className="my-4 h-px w-full opacity-40" />
            <div className="grid grid-cols-3 gap-2">
              <Bar className="h-12 w-full rounded-md" />
              <Bar className="h-12 w-full rounded-md" />
              <Bar className="h-12 w-full rounded-md" />
            </div>
            <Bar className="mt-4 h-3 w-44" />
          </div>
        ))}
      </div>
      <p className="mt-6 text-center text-xs text-text-muted">Loading accounts…</p>
    </div>
  );
}

export function TransactionsSkeleton() {
  return (
    <div className="p-8">
      <TopBarSkeleton showDateSlot />
      <div className="mt-4 flex gap-2 py-3">
        <Bar className="h-10 flex-1 max-w-xs rounded-lg" />
        <Bar className="ml-auto h-10 w-32 rounded-lg" />
      </div>
      <Bar className="my-3 h-14 w-full rounded-xl" />
      <div className="overflow-hidden rounded-xl border border-border-subtle">
        <div className="grid grid-cols-6 gap-0 bg-bg-elevated p-3">
          {["Date", "Description", "Account", "Category", "Type", "Amount"].map((h) => (
            <Bar key={h} className="h-3 w-16" />
          ))}
        </div>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className={cn("grid grid-cols-6 gap-2 border-t border-border-subtle p-3", i % 2 ? "bg-bg-elevated/30" : "bg-bg-surface/20")}>
            <Bar className="h-4 w-20" />
            <Bar className="col-span-2 h-4 w-full" />
            <Bar className="h-4 w-24" />
            <Bar className="h-8 w-full rounded-md" />
            <Bar className="h-4 w-20 justify-self-end" />
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Bar className="h-9 w-16 rounded-md" />
        <Bar className="h-4 w-16" />
        <Bar className="h-9 w-16 rounded-md" />
      </div>
      <p className="mt-6 text-center text-xs text-text-muted">Loading transactions…</p>
    </div>
  );
}

export function UploadSkeleton() {
  return (
    <div className="p-8">
      <TopBarSkeleton />
      <div className="mt-4 space-y-3 rounded-lg border border-border-subtle bg-bg-elevated/40 p-4">
        <Bar className="h-4 w-48" />
        <Bar className="h-3 w-full max-w-2xl" />
        <Bar className="h-3 w-full max-w-xl" />
        <Bar className="h-3 w-64" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
        <div className="rounded-xl border border-border-subtle bg-bg-surface/40 p-4">
          <Bar className="mb-3 h-3 w-40" />
          <Bar className="mb-4 h-10 w-full rounded-lg" />
          <Bar className="mb-3 h-3 w-44" />
          <Bar className="mb-4 h-10 w-full rounded-lg" />
          <Bar className="mb-3 h-3 w-36" />
          <Bar className="h-[180px] w-full rounded-xl" />
          <Bar className="mt-4 h-10 w-full rounded-lg" />
        </div>
        <div className="rounded-xl border border-border-subtle bg-bg-surface/40 p-4">
          <Bar className="mx-auto mt-12 h-[280px] w-full max-w-md rounded-xl" />
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-text-muted">Preparing upload…</p>
    </div>
  );
}

export function ReportsSkeleton() {
  return (
    <div className="p-8">
      <TopBarSkeleton />
      <div className="mt-6 rounded-xl border border-border-subtle bg-bg-surface/40 p-5">
        <Bar className="mb-6 h-6 w-56" />
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-3 xl:col-span-2">
            <div className="mb-3 flex justify-between">
              <Bar className="h-3 w-24" />
              <Bar className="h-3 w-16" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Bar key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <Bar className="h-10 w-full rounded-lg" />
            <Bar className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-xl border border-border-subtle bg-bg-surface/40 p-5">
        <Bar className="mb-4 h-6 w-48" />
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Bar key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <p className="mt-6 text-center text-xs text-text-muted">Loading reports…</p>
    </div>
  );
}

export function TrackerSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      <TopBarSkeleton />
      <div className="mt-2 flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bar className="h-9 w-9 rounded-lg" />
            <Bar className="h-8 w-48" />
          </div>
          <Bar className="h-9 w-32 rounded-full" />
        </div>
        <Bar className="h-4 w-64" />
      </div>
      <section className="space-y-4 rounded-xl border border-border-subtle bg-bg-surface/40 p-6">
        <Bar className="h-5 w-56" />
        <Bar className="h-4 w-40" />
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Bar className="h-10 w-full rounded-lg md:w-64" />
          <Bar className="h-2 flex-1 rounded-full" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2 rounded-lg border border-border-subtle bg-bg-elevated/40 p-4">
              <Bar className="h-3 w-20" />
              <Bar className="h-7 w-24" />
              <Bar className="h-1 w-full rounded-full" />
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-4 rounded-xl border border-border-subtle bg-bg-surface/40 p-6">
        <div className="flex justify-between">
          <Bar className="h-5 w-52" />
          <Bar className="h-9 w-24 rounded-lg" />
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Bar key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </section>
      <section className="rounded-xl border border-border-subtle bg-bg-surface/40 p-6">
        <Bar className="mb-4 h-5 w-40" />
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Bar key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      </section>
      <p className="text-center text-xs text-text-muted">Syncing tracker…</p>
    </div>
  );
}
