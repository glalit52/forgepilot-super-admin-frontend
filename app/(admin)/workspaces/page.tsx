"use client";
import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingRows, PageHeader } from "@/components/common";
import { useWorkspaces } from "@/lib/api";
import { formatDate, PLAN_LABEL } from "@/lib/format";

export default function WorkspacesPage() {
  const [search, setSearch] = useState("");
  const list = useWorkspaces(search.trim());
  return (
    <>
      <PageHeader
        title="Workspaces"
        description="Each workspace is one customer. Open one to suspend it, restore it or set its plan."
      />
      <div className="flex max-w-sm flex-col gap-1.5">
        <Label htmlFor="ws-search">Search by name, slug or id</Label>
        <Input
          id="ws-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="acme"
        />
      </div>
      {list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <LoadingRows />
      ) : list.data.length === 0 ? (
        <EmptyState
          title="No workspaces match"
          hint={search ? "Try a different search." : "Nobody has created a workspace yet."}
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="text-right">Members</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>
                    <Link
                      href={`/workspaces/${w.id}`}
                      className="text-primary font-medium underline-offset-4 hover:underline"
                    >
                      {w.name}
                    </Link>
                    <div className="text-muted-foreground font-mono text-xs">{w.slug}</div>
                  </TableCell>
                  <TableCell>{PLAN_LABEL[w.plan]}</TableCell>
                  <TableCell className="text-right tabular-nums">{w.members}</TableCell>
                  <TableCell>{formatDate(w.createdAt)}</TableCell>
                  <TableCell>
                    <span className="flex flex-wrap gap-1">
                      {w.suspendedAt ? (
                        <Badge variant="danger">Suspended</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                      {w.demo && <Badge variant="neutral">Demo</Badge>}
                    </span>
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
