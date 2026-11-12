"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { checkStaff, useLogin, useLogout } from "@/lib/api";

export default function LoginPage() {
  const login = useLogin();
  const logout = useLogout();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login.mutateAsync({ email: email.trim(), password });
      if (await checkStaff()) {
        router.push("/");
        router.refresh();
        return;
      }
      // A valid ForgePilot account that is not staff must not stay signed in here.
      await logout.mutateAsync();
      setError(
        "This account doesn't have back-office access. It must be on the staff list and have a verified email address.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    }
  };

  return (
    <main id="main" className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="bg-card flex w-full max-w-sm flex-col gap-5 rounded-xl border p-6"
        aria-label="Staff sign in"
      >
        <div>
          <p className="text-warning-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
            <ShieldIcon className="size-4" aria-hidden /> ForgePilot team only
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Back-office sign in</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Use your ForgePilot account. Everything you do here is recorded.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-danger-foreground text-sm">
            {error}
          </p>
        )}
        <Button type="submit" disabled={login.isPending || !email || !password}>
          {login.isPending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}
