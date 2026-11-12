"use client";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PageHeader, Stat } from "@/components/common";
import { PLAN_IDS, useOverview } from "@/lib/api";
import { PLAN_LABEL } from "@/lib/format";

const STATE_TONE = { ready: "success", partial: "warning", off: "neutral" } as const;
const STATE_LABEL = { ready: "Ready", partial: "Partly set up", off: "Not set up" } as const;

export default function OverviewPage() {
  const { data } = useOverview();
  if (!data) return null;
  return (
    <>
      <PageHeader
        title="Overview"
        description="Customer workspaces, the job queue and connector setup. Demo data is excluded."
      />
      <section aria-label="Totals" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Workspaces" value={data.workspaces} />
        <Stat label="Users" value={data.users} />
        <Stat
          label="Suspended workspaces"
          value={data.suspended}
          tone={data.suspended ? "warning" : undefined}
        />
        <Stat
          label="Failed jobs"
          value={data.jobs.failed}
          tone={data.jobs.failed ? "danger" : undefined}
          hint={`${data.jobs.queued} queued · ${data.jobs.running} running`}
        />
      </section>

      <section aria-labelledby="plans" className="flex flex-col gap-3">
        <h2 id="plans" className="text-sm font-semibold">
          Workspaces by plan
        </h2>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {PLAN_IDS.map((p) => (
            <li key={p} className="bg-card rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">{PLAN_LABEL[p]}</p>
              <p className="text-lg font-semibold tabular-nums">{data.byPlan[p] ?? 0}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="connectors" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h2 id="connectors" className="text-sm font-semibold">
            Platform connectors
          </h2>
          <Badge variant={data.executionMode === "live" ? "success" : "neutral"}>
            Execution: {data.executionMode === "live" ? "live" : "simulated"}
          </Badge>
        </div>
        <ul className="flex flex-col divide-y rounded-lg border">
          {data.connectors.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm"
            >
              <span className="font-medium">{c.name}</span>
              <span className="flex flex-wrap items-center gap-2">
                {c.missing.length > 0 && (
                  <code className="text-muted-foreground font-mono text-xs">
                    missing: {c.missing.join(", ")}
                  </code>
                )}
                <Badge variant={STATE_TONE[c.state]}>{STATE_LABEL[c.state]}</Badge>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">
          Connectors are set with environment variables on the backend (see docs/CONNECTORS.md
          there).{" "}
          {data.jobs.failed > 0 && (
            <Link href="/jobs" className="text-primary underline-offset-4 hover:underline">
              Review failed jobs
            </Link>
          )}
        </p>
      </section>
    </>
  );
}
