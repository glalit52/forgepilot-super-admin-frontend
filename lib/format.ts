const dateTime = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});
const dateOnly = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Staff work across time zones, so times are always shown in UTC and say so. */
export const formatDateTime = (iso: string) => `${dateTime.format(new Date(iso))} UTC`;
export const formatDate = (iso: string) => dateOnly.format(new Date(iso));
export const formatUsd = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  developer: "Developer",
  pro: "Pro",
  team: "Team",
  business: "Business",
  enterprise: "Enterprise",
};
