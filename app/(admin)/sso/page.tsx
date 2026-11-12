"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorState, LoadingRows, PageHeader } from "@/components/common";
import { useDecideSsoDomain, useSsoDomains } from "@/lib/api";
import { formatDate } from "@/lib/format";

const TONE = { pending: "warning", approved: "success", rejected: "danger" } as const;
const LABEL = {
  pending: "Waiting for a decision",
  approved: "Approved",
  rejected: "Rejected",
} as const;

export default function SsoDomainsPage() {
  const list = useSsoDomains();
  const decide = useDecideSsoDomain();
  const [target, setTarget] = useState<{
    domain: string;
    workspaceName: string;
    decision: "approved" | "rejected";
  } | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = (domain: string, workspaceName: string, decision: "approved" | "rejected") => {
    setReason("");
    setError(null);
    setTarget({ domain, workspaceName, decision });
  };
  const submit = () => {
    if (!target) return;
    if (reason.trim().length < 5) return setError("Say how you checked, in at least 5 characters.");
    decide.mutate(
      { domain: target.domain, decision: target.decision, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(`${target.domain} ${target.decision}`);
          setTarget(null);
        },
        onError: (e) => setError(e.message),
      },
    );
  };

  return (
    <>
      <PageHeader
        title="Single sign-on domains"
        description="Enterprise workspaces that want their company login. A domain does nothing until it is approved here."
      />
      <p className="bg-warning-soft text-warning-foreground rounded-md px-3 py-2 text-sm">
        Approving lets that workspace&apos;s identity provider sign people in for{" "}
        <b>every address in the domain</b>. Approve only after confirming the customer really
        controls it, for example by email to an address at that domain or a DNS record they add.
      </p>
      {list.error ? (
        <ErrorState error={list.error} onRetry={() => list.refetch()} />
      ) : list.isPending ? (
        <LoadingRows />
      ) : list.data.length === 0 ? (
        <EmptyState
          title="No domains yet"
          hint="Requests appear here when an Enterprise workspace connects Okta or Entra ID."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Workspace</TableHead>
                <TableHead>Requested by</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="sr-only">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.data.map((d) => (
                <TableRow key={d.domain}>
                  <TableCell>
                    <span className="font-medium">{d.domain}</span>
                    <div className="text-muted-foreground text-xs capitalize">{d.provider}</div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/workspaces/${d.workspaceId}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {d.workspaceName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {d.requestedBy}
                    <div className="text-muted-foreground text-xs">{formatDate(d.requestedAt)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={TONE[d.status]}>{LABEL[d.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="flex justify-end gap-2">
                      {d.status !== "approved" && (
                        <Button
                          size="sm"
                          onClick={() => open(d.domain, d.workspaceName, "approved")}
                          aria-label={`Approve ${d.domain}`}
                        >
                          Approve
                        </Button>
                      )}
                      {d.status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => open(d.domain, d.workspaceName, "rejected")}
                          aria-label={`${d.status === "approved" ? "Revoke" : "Reject"} ${d.domain}`}
                        >
                          {d.status === "approved" ? "Revoke" : "Reject"}
                        </Button>
                      )}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={target !== null} onOpenChange={(o) => !o && setTarget(null)}>
        {target && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {target.decision === "approved" ? "Approve" : "Turn off"} {target.domain}?
              </DialogTitle>
              <DialogDescription>
                {target.decision === "approved"
                  ? `${target.workspaceName}'s identity provider will be able to sign in anyone with an @${target.domain} address. The customer sees this in their audit log.`
                  : `Single sign-on for @${target.domain} stops working at once. The customer sees this in their audit log.`}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">
                {target.decision === "approved"
                  ? "How did you confirm they control the domain?"
                  : "Reason"}
              </Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-invalid={!!error || undefined}
                aria-describedby={error ? "reason-error" : undefined}
              />
              {error && (
                <p id="reason-error" role="alert" className="text-danger-foreground text-xs">
                  {error}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTarget(null)}>
                Cancel
              </Button>
              <Button
                onClick={submit}
                disabled={decide.isPending}
                variant={target.decision === "approved" ? "default" : "destructive"}
              >
                {decide.isPending
                  ? "Working…"
                  : target.decision === "approved"
                    ? "Approve domain"
                    : "Turn off"}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
