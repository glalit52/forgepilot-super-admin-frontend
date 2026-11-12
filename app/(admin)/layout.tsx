"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ActivityIcon,
  BuildingIcon,
  HistoryIcon,
  KeyRoundIcon,
  LayoutDashboardIcon,
  LogOutIcon,
  ShieldIcon,
  UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingRows } from "@/components/common";
import { ApiError, useLogout, useMe, useOverview } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboardIcon },
  { href: "/workspaces", label: "Workspaces", icon: BuildingIcon },
  { href: "/users", label: "Users", icon: UsersIcon },
  { href: "/sso", label: "Single sign-on", icon: KeyRoundIcon },
  { href: "/jobs", label: "Background jobs", icon: ActivityIcon },
  { href: "/audit", label: "Staff audit log", icon: HistoryIcon },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const me = useMe();
  // The backend decides who is staff; this query is the gate for every screen.
  const gate = useOverview();
  const logout = useLogout();
  const denied =
    gate.error instanceof ApiError && (gate.error.status === 401 || gate.error.status === 404);

  const signOut = () =>
    logout.mutate(undefined, {
      onSettled: () => {
        router.push("/login");
        router.refresh();
      },
    });

  useEffect(() => {
    if (gate.error instanceof ApiError && gate.error.status === 401) router.replace("/login");
  }, [gate.error, router]);

  if (denied)
    return (
      <main
        id="main"
        className="mx-auto flex min-h-screen max-w-md flex-col items-start justify-center gap-4 p-6"
      >
        <h1 className="text-xl font-semibold">No back-office access</h1>
        <p className="text-muted-foreground text-sm">
          This account isn&apos;t on the ForgePilot staff list, or its email address hasn&apos;t
          been verified yet.
        </p>
        <Button variant="outline" onClick={signOut}>
          <LogOutIcon /> Sign out
        </Button>
      </main>
    );

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="bg-card flex shrink-0 flex-col gap-4 border-b p-4 md:w-60 md:border-r md:border-b-0">
        <div>
          <p className="text-sm font-semibold">ForgePilot</p>
          <p className="text-warning-foreground mt-0.5 flex items-center gap-1.5 text-xs font-medium">
            <ShieldIcon className="size-3.5" aria-hidden /> Staff back-office
          </p>
        </div>
        <nav aria-label="Back-office" className="flex flex-row flex-wrap gap-1 md:flex-col">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "hover:bg-accent focus-visible:ring-ring/50 flex items-center gap-2 rounded-md px-2.5 py-2 text-sm focus-visible:ring-[3px] focus-visible:outline-none",
                  active && "bg-accent font-medium",
                )}
              >
                <item.icon className="size-4" aria-hidden /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-2 text-xs">
          <p className="text-muted-foreground truncate" title={me.data?.user.email}>
            {me.data?.user.email ?? " "}
          </p>
          <Button size="sm" variant="outline" onClick={signOut} disabled={logout.isPending}>
            <LogOutIcon /> Sign out
          </Button>
        </div>
      </aside>
      <main id="main" className="flex min-w-0 flex-1 flex-col gap-6 p-6">
        <p className="bg-warning-soft text-warning-foreground rounded-md px-3 py-2 text-xs">
          You are acting on real customer workspaces. Every action here is recorded, and customers
          see suspensions and plan changes in their own audit log.
        </p>
        {gate.isPending ? (
          <LoadingRows />
        ) : gate.error ? (
          <ErrorState error={gate.error} onRetry={() => gate.refetch()} />
        ) : (
          children
        )}
      </main>
    </div>
  );
}
