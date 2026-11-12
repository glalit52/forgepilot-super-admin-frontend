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
import { useUsers } from "@/lib/api";
import { formatDate } from "@/lib/format";

export default function UsersPage() {
  const [search, setSearch] = useState("");
  const list = useUsers(search.trim());
  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone with a ForgePilot account and the workspaces they belong to."
      />
      <div className="flex max-w-sm flex-col gap-1.5">
        <Label htmlFor="user-search">Search by name or email</Label>
        <Input
          id="user-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ada@"
        />
      </div>
      {list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <LoadingRows />
      ) : list.data.length === 0 ? (
        <EmptyState title="No users match" />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email status</TableHead>
                <TableHead>Workspaces</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <span className="font-medium">{u.name}</span>
                    <div className="text-muted-foreground text-xs">{u.email}</div>
                  </TableCell>
                  <TableCell>
                    {u.emailVerified ? (
                      <Badge variant="success">Verified</Badge>
                    ) : (
                      <Badge variant="warning">Not verified</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {u.workspaces.length === 0 ? (
                      <span className="text-muted-foreground">None</span>
                    ) : (
                      <ul className="flex flex-col gap-0.5">
                        {u.workspaces.map((w) => (
                          <li key={w.id}>
                            <Link
                              href={`/workspaces/${w.id}`}
                              className="text-primary underline-offset-4 hover:underline"
                            >
                              {w.name}
                            </Link>{" "}
                            <span className="text-muted-foreground text-xs capitalize">
                              ({w.role})
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(u.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}
