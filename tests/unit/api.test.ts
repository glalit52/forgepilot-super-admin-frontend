import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, checkStaff, OverviewSchema } from "@/lib/api";
import { formatDateTime, formatUsd } from "@/lib/format";

const overview = {
  workspaces: 3,
  suspended: 1,
  users: 9,
  byPlan: { free: 2, team: 1 },
  jobs: { queued: 0, running: 1, failed: 2 },
  connectors: [
    { id: "stripe", name: "Stripe billing", state: "off", missing: ["STRIPE_SECRET_KEY"] },
  ],
  executionMode: "simulated",
};
const respond = (status: number, body: unknown) =>
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );

afterEach(() => vi.unstubAllGlobals());

describe("staff gate", () => {
  it("accepts an account the backend treats as staff", async () => {
    respond(200, overview);
    expect(await checkStaff()).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      "/api/v1/admin/overview",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });
  it("treats 404 and 401 as 'not staff' rather than an error", async () => {
    respond(404, { error: "No route", code: "not_found" });
    expect(await checkStaff()).toBe(false);
    respond(401, { error: "Not signed in" });
    expect(await checkStaff()).toBe(false);
  });
  it("surfaces real failures, and a response that doesn't match the contract", async () => {
    respond(503, { error: "Database unavailable" });
    await expect(checkStaff()).rejects.toMatchObject({
      status: 503,
      message: "Database unavailable",
    });
    respond(200, { workspaces: "three" });
    await expect(checkStaff()).rejects.toBeInstanceOf(ApiError);
  });
});

describe("formatting", () => {
  it("parses the overview contract", () =>
    expect(OverviewSchema.parse(overview).jobs.failed).toBe(2));
  it("shows times in UTC and money with cents", () => {
    expect(formatDateTime("2026-11-12T05:07:00.000Z")).toBe("12 Nov 2026, 05:07 UTC");
    expect(formatUsd(1234.5)).toBe("$1,234.50");
  });
});
