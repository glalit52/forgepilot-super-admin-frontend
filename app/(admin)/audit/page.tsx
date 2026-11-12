"use client";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingRows, PageHeader } from "@/components/common";
import { useAudit } from "@/lib/api";
import { formatDateTime } from "@/lib/format";

const ACTION_LABEL: Record<string, string> = {
  "workspace.viewed": "Viewed workspace",
  "workspace.suspended": "Suspended workspace",
  "workspace.restored": "Restored workspace",
  "workspace.plan_set": "Set plan",
  "job.retried": "Retried job",
};

export default function AuditPage() {
  const list = useAudit();
  return (
    <>
      <PageHeader
        title="Staff audit log"
        description="Everything the ForgePilot team did in this back-office, newest first. It can't be edited."
      />
      {list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <LoadingRows />
      ) : list.data.length === 0 ? (
        <EmptyState title="Nothing recorded yet" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Who</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>On</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap">{formatDateTime(a.at)}</TableCell>
                  <TableCell>{a.staff}</TableCell>
                  <TableCell>{ACTION_LABEL[a.action] ?? a.action}</TableCell>
                  <TableCell>
                    {a.target.startsWith("ws_") ? (
                      <Link
                        href={`/workspaces/${a.target}`}
                        className="text-primary font-mono text-xs underline-offset-4 hover:underline"
                      >
                        {a.target}
                      </Link>
                    ) : (
                      <code className="font-mono text-xs">{a.target}</code>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-md break-words">
                    {a.detail || "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
