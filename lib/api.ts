/**
 * The only place that knows the backend's back-office API (`/admin/*` in
 * forgepilot-backend). Every response is checked against its schema so a
 * backend change shows up as a clear error instead of a broken screen.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

export const API_BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

async function request<T>(
  schema: z.ZodType<T>,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
    body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
  const json: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = json as { error?: string; code?: string };
    throw new ApiError(res.status, err.error ?? `Request failed (${res.status})`, err.code);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) throw new ApiError(500, `Unexpected response from ${path}`);
  return parsed.data;
}

// ---------------------------------------------------------------- schemas
export const PLAN_IDS = ["free", "developer", "pro", "team", "business", "enterprise"] as const;
export const PlanIdSchema = z.enum(PLAN_IDS);
export type PlanId = z.infer<typeof PlanIdSchema>;
const RoleSchema = z.enum(["owner", "admin", "member", "viewer"]);

export const ConnectorSchema = z.object({
  id: z.string(),
  name: z.string(),
  state: z.enum(["ready", "partial", "off"]),
  missing: z.array(z.string()),
});
export const OverviewSchema = z.object({
  workspaces: z.number(),
  suspended: z.number(),
  users: z.number(),
  byPlan: z.record(z.string(), z.number()),
  jobs: z.object({ queued: z.number(), running: z.number(), failed: z.number() }),
  connectors: z.array(ConnectorSchema),
  executionMode: z.enum(["simulated", "live"]),
});
export type Overview = z.infer<typeof OverviewSchema>;

export const WorkspaceRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  plan: PlanIdSchema,
  kind: z.string(),
  members: z.number(),
  createdAt: z.string(),
  demo: z.boolean(),
  suspendedAt: z.string().nullable(),
  suspendedReason: z.string().nullable(),
  hasBillingAccount: z.boolean(),
});
export type WorkspaceRow = z.infer<typeof WorkspaceRowSchema>;

export const WorkspaceDetailSchema = z.object({
  workspace: WorkspaceRowSchema,
  organization: z.looseObject({
    billingCycle: z.enum(["monthly", "annual"]),
    trialEndsAt: z.string().nullable(),
    budget: z.object({ monthlyLimitUsd: z.number(), hardCap: z.boolean() }),
  }),
  members: z.array(
    z.object({ id: z.string(), name: z.string(), email: z.string(), role: RoleSchema }),
  ),
  counts: z.object({
    projects: z.number(),
    repositories: z.number(),
    tasks: z.number(),
    activeSessions: z.number(),
    runningTestRuns: z.number(),
    openFindings: z.number(),
    connectedIntegrations: z.array(z.string()),
  }),
  spendMonthToDateUsd: z.number(),
});

export const UserRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  emailVerified: z.boolean(),
  createdAt: z.string(),
  workspaces: z.array(z.object({ id: z.string(), name: z.string(), role: RoleSchema })),
});
export const JobRowSchema = z.object({
  id: z.number(),
  kind: z.string(),
  workspaceId: z.string().nullable(),
  status: z.string(),
  attempts: z.number(),
  lastError: z.string().nullable(),
  runAt: z.string(),
  createdAt: z.string(),
});
export const AuditRowSchema = z.object({
  id: z.number(),
  staff: z.string(),
  action: z.string(),
  target: z.string(),
  detail: z.string(),
  at: z.string(),
});
const OkSchema = z.object({ ok: z.literal(true) });
const MeSchema = z.object({
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }),
});

// ---------------------------------------------------------------- queries
const q = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v) as [string, string][],
  ).toString();
  return s ? `?${s}` : "";
};

export const useOverview = () =>
  useQuery({
    queryKey: ["overview"],
    queryFn: () => request(OverviewSchema, "GET", "/admin/overview"),
    refetchInterval: 30_000,
  });
export const useMe = () =>
  useQuery({ queryKey: ["me"], queryFn: () => request(MeSchema, "GET", "/me") });
export const useWorkspaces = (search: string) =>
  useQuery({
    queryKey: ["workspaces", search],
    queryFn: () =>
      request(
        z.array(WorkspaceRowSchema),
        "GET",
        `/admin/workspaces${q({ q: search, limit: "100" })}`,
      ),
  });
export const useWorkspace = (id: string) =>
  useQuery({
    queryKey: ["workspace", id],
    queryFn: () =>
      request(WorkspaceDetailSchema, "GET", `/admin/workspaces/${encodeURIComponent(id)}`),
  });
export const useUsers = (search: string) =>
  useQuery({
    queryKey: ["users", search],
    queryFn: () =>
      request(z.array(UserRowSchema), "GET", `/admin/users${q({ q: search, limit: "100" })}`),
  });
export const useJobs = (status: string) =>
  useQuery({
    queryKey: ["jobs", status],
    queryFn: () =>
      request(z.array(JobRowSchema), "GET", `/admin/jobs${q({ status, limit: "100" })}`),
    refetchInterval: 15_000,
  });
export const useAudit = () =>
  useQuery({
    queryKey: ["audit"],
    queryFn: () => request(z.array(AuditRowSchema), "GET", `/admin/audit${q({ limit: "200" })}`),
  });

// ---------------------------------------------------------------- actions
function useAction<I, O>(fn: (input: I) => Promise<O>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSuccess: () => qc.invalidateQueries() });
}

export const useLogin = () =>
  useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      request(z.object({ user: z.object({ name: z.string() }) }), "POST", "/auth/login", input),
  });
export const useLogout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => request(OkSchema, "POST", "/auth/logout"),
    onSettled: () => qc.clear(),
  });
};
/** True when the signed-in account is on the staff list (and its email is verified). */
export const checkStaff = () =>
  request(OverviewSchema, "GET", "/admin/overview").then(
    () => true,
    (e: unknown) => {
      if (e instanceof ApiError && (e.status === 404 || e.status === 401)) return false;
      throw e;
    },
  );

export const useSuspend = (id: string) =>
  useAction((reason: string) =>
    request(WorkspaceRowSchema, "POST", `/admin/workspaces/${id}/suspend`, { reason }),
  );
export const useRestore = (id: string) =>
  useAction((reason: string) =>
    request(WorkspaceRowSchema, "POST", `/admin/workspaces/${id}/unsuspend`, { reason }),
  );
export const useSetPlan = (id: string) =>
  useAction((input: { plan: PlanId; billingCycle: "monthly" | "annual"; reason: string }) =>
    request(WorkspaceRowSchema, "POST", `/admin/workspaces/${id}/plan`, input),
  );
export const useRetryJob = () =>
  useAction((id: number) => request(OkSchema, "POST", `/admin/jobs/${id}/retry`));
