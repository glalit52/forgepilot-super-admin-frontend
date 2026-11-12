"use client";
import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, LoadingRows, PageHeader, Stat } from "@/components/common";
import { PLAN_IDS, useRestore, useSetPlan, useSuspend, useWorkspace, type PlanId } from "@/lib/api";
import { formatDate, formatDateTime, formatUsd, PLAN_LABEL } from "@/lib/format";

type Action = "suspend" | "restore" | "plan" | null;

const COPY = {
  suspend: {
    title: "Suspend this workspace?",
    description:
      "The workspace becomes read-only: members can still sign in and see their data, but nothing can be changed and no agents or test runs start. The customer sees this in their audit log.",
    confirm: "Suspend workspace",
  },
  restore: {
    title: "Restore this workspace?",
    description: "Members can work normally again. The customer sees this in their audit log.",
    confirm: "Restore workspace",
  },
  plan: {
    title: "Set the plan by hand",
    description:
      "For enterprise contracts and goodwill changes. This does not create or change a Stripe subscription, and the customer sees it in their audit log.",
    confirm: "Set plan",
  },
} as const;

export default function WorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const detail = useWorkspace(id);
  const suspend = useSuspend(id);
  const restore = useRestore(id);
  const setPlan = useSetPlan(id);
  const [action, setAction] = useState<Action>(null);
  const [reason, setReason] = useState("");
  const [plan, setPlanChoice] = useState<PlanId>("enterprise");
  const [cycle, setCycle] = useState<"monthly" | "annual">("annual");
  const [formError, setFormError] = useState<string | null>(null);
  const pending = suspend.isPending || restore.isPending || setPlan.isPending;

  const open = (a: Exclude<Action, null>) => {
    setReason("");
    setFormError(null);
    setAction(a);
  };
  const submit = () => {
    if (!action) return;
    // The reason is what the audit log keeps; make it something a colleague can understand later.
    if (reason.trim().length < 5) return setFormError("Say why, in at least 5 characters.");
    const done = {
      onSuccess: () => {
        toast.success(
          action === "suspend"
            ? "Workspace suspended"
            : action === "restore"
              ? "Workspace restored"
              : "Plan updated",
        );
        setAction(null);
      },
      onError: (e: Error) => setFormError(e.message),
    };
    if (action === "suspend") suspend.mutate(reason.trim(), done);
    else if (action === "restore") restore.mutate(reason.trim(), done);
    else setPlan.mutate({ plan, billingCycle: cycle, reason: reason.trim() }, done);
  };

  if (detail.error) return <ErrorState error={detail.error} onRetry={() => detail.refetch()} />;
  if (detail.isPending) return <LoadingRows />;
  const { workspace: w, organization, members, counts, spendMonthToDateUsd } = detail.data;

  return (
    <>
      <Link
        href="/workspaces"
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
      >
        <ArrowLeftIcon className="size-4" aria-hidden /> All workspaces
      </Link>
      <PageHeader
        title={w.name}
        description={`${w.slug} · ${w.id} · created ${formatDate(w.createdAt)}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => open("plan")}>
              Set plan
            </Button>
            {w.suspendedAt ? (
              <Button onClick={() => open("restore")}>Restore</Button>
            ) : (
              <Button variant="destructive" onClick={() => open("suspend")}>
                Suspend
              </Button>
            )}
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        {w.suspendedAt ? (
          <Badge variant="danger">Suspended</Badge>
        ) : (
          <Badge variant="success">Active</Badge>
        )}
        <Badge variant="accent">
          {PLAN_LABEL[w.plan]} · {organization.billingCycle}
        </Badge>
        {organization.trialEndsAt && (
          <Badge variant="info">Trial until {formatDate(organization.trialEndsAt)}</Badge>
        )}
        <Badge variant="neutral">
          {w.hasBillingAccount ? "Has a Stripe customer" : "No Stripe customer"}
        </Badge>
        {w.demo && <Badge variant="neutral">Demo data</Badge>}
      </div>
      {w.suspendedAt && (
        <p
          role="status"
          className="bg-danger-soft text-danger-foreground rounded-md px-3 py-2 text-sm"
        >
          Suspended {formatDateTime(w.suspendedAt)}: {w.suspendedReason}
        </p>
      )}

      <section aria-label="Size and spend" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Spend this month"
          value={formatUsd(spendMonthToDateUsd)}
          hint={`Budget ${formatUsd(organization.budget.monthlyLimitUsd)}${organization.budget.hardCap ? " · hard cap" : ""}`}
        />
        <Stat
          label="Repositories"
          value={counts.repositories}
          hint={`${counts.projects} project${counts.projects === 1 ? "" : "s"}`}
        />
        <Stat
          label="Tasks"
          value={counts.tasks}
          hint={`${counts.activeSessions} agent sessions active`}
        />
        <Stat
          label="Open findings"
          value={counts.openFindings}
          hint={`${counts.runningTestRuns} test runs running`}
        />
      </section>
      <p className="text-muted-foreground text-sm">
        Connected integrations:{" "}
        {counts.connectedIntegrations.length ? counts.connectedIntegrations.join(", ") : "none"}.
        Code, logs and credentials are not available in the back-office.
      </p>

      <section aria-labelledby="members" className="flex flex-col gap-3">
        <h2 id="members" className="text-sm font-semibold">
          Members ({members.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell className="capitalize">{m.role}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <Dialog open={action !== null} onOpenChange={(o) => !o && setAction(null)}>
        {action && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{COPY[action].title}</DialogTitle>
              <DialogDescription>{COPY[action].description}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              {action === "plan" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="plan">Plan</Label>
                    <Select value={plan} onValueChange={(v) => setPlanChoice(v as PlanId)}>
                      <SelectTrigger id="plan">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PLAN_IDS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {PLAN_LABEL[p]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="cycle">Billing cycle</Label>
                    <Select
                      value={cycle}
                      onValueChange={(v) => setCycle(v as "monthly" | "annual")}
                    >
                      <SelectTrigger id="cycle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="annual">Annual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reason">Reason (kept in the audit log)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  aria-invalid={!!formError || undefined}
                  aria-describedby={formError ? "reason-error" : undefined}
                  placeholder={
                    action === "plan" ? "Signed order form 2026-114" : "Chargeback under review"
                  }
                />
                {formError && (
                  <p id="reason-error" role="alert" className="text-danger-foreground text-xs">
                    {formError}
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAction(null)}>
                Cancel
              </Button>
              <Button
                variant={action === "suspend" ? "destructive" : "default"}
                onClick={submit}
                disabled={pending}
              >
                {pending ? "Working…" : COPY[action].confirm}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
