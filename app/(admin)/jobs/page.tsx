"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingRows, PageHeader } from "@/components/common";
import { useJobs, useRetryJob } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "failed", label: "Failed" },
  { key: "queued", label: "Queued" },
  { key: "running", label: "Running" },
];

export default function JobsPage() {
  const [status, setStatus] = useState("failed");
  const list = useJobs(status);
  const retry = useRetryJob();
  return (
    <>
      <PageHeader
        title="Background jobs"
        description="Work the backend does outside requests: agent sessions, test runs, scans, webhooks, emails. Failed jobs gave up after their retries."
      />
      <div role="tablist" aria-label="Job status" className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={status === t.key}
            onClick={() => setStatus(t.key)}
            className={cn(
              "hover:bg-accent focus-visible:ring-ring/50 rounded-md px-3 py-1.5 text-sm focus-visible:ring-[3px] focus-visible:outline-none",
              status === t.key && "bg-accent font-medium",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <LoadingRows />
      ) : list.data.length === 0 ? (
        <EmptyState
          title={`No ${status} jobs`}
          hint={status === "failed" ? "Nothing needs attention." : undefined}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead className="text-right">Attempts</TableHead>
                <TableHead>{status === "queued" ? "Runs at" : "Created"}</TableHead>
                <TableHead>Last error</TableHead>
                {status === "failed" && <TableHead className="sr-only">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((j) => (
                <TableRow key={j.id}>
                  <TableCell>
                    <code className="font-mono text-xs">{j.kind}</code>
                    <div className="text-muted-foreground text-xs">#{j.id}</div>
                  </TableCell>
                  <TableCell>
                    {j.workspaceId ? (
                      <Link
                        href={`/workspaces/${j.workspaceId}`}
                        className="text-primary font-mono text-xs underline-offset-4 hover:underline"
                      >
                        {j.workspaceId}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Platform</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{j.attempts}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDateTime(status === "queued" ? j.runAt : j.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-md">
                    <span className="text-muted-foreground line-clamp-2 text-xs break-words">
                      {j.lastError ?? "—"}
                    </span>
                  </TableCell>
                  {status === "failed" && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={retry.isPending}
                        aria-label={`Retry job ${j.id}`}
                        onClick={() =>
                          retry.mutate(j.id, {
                            onSuccess: () => toast.success(`Job #${j.id} queued again`),
                            onError: (e) =>
                              toast.error("Could not retry", { description: e.message }),
                          })
                        }
                      >
                        Retry
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
