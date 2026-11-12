"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkStaff,
  twoFactorEnable,
  twoFactorSetup,
  twoFactorStatus,
  twoFactorVerify,
  useLogin,
  useLogout,
} from "@/lib/api";

/** password → (code, for accounts with two-factor) or (set up two-factor, for new staff) → in. */
type Step =
  { name: "password" } | { name: "code" } | { name: "setup"; secret: string; otpauthUrl: string };

const NO_ACCESS =
  "This account doesn't have back-office access. It must be on the staff list and have a verified email address.";

export default function LoginPage() {
  const login = useLogin();
  const logout = useLogout();
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "password" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enter = async () => {
    if (await checkStaff()) {
      router.push("/");
      router.refresh();
      return;
    }
    // A valid ForgePilot account that is not staff must not stay signed in here.
    await logout.mutateAsync();
    setStep({ name: "password" });
    setError(NO_ACCESS);
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const submitPassword = () =>
    run(async () => {
      const res = await login.mutateAsync({ email: email.trim(), password });
      setCode("");
      if (res.twoFactorRequired) return setStep({ name: "code" });
      const status = await twoFactorStatus();
      // Staff without an authenticator yet: set one up now. Everyone else has no business here.
      if (status.staffEligible) return setStep({ name: "setup", ...(await twoFactorSetup()) });
      await enter();
    });

  const submitCode = () =>
    run(async () => {
      if (step.name === "setup") await twoFactorEnable(code);
      else await twoFactorVerify(code);
      await enter();
    });

  const codeField = (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="code">6-digit code</Label>
      <Input
        id="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={7}
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
    </div>
  );
  const codeReady = code.replace(/\D/g, "").length === 6;

  return (
    <main id="main" className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void (step.name === "password" ? submitPassword() : submitCode());
        }}
        className="bg-card flex w-full max-w-sm flex-col gap-5 rounded-xl border p-6"
        aria-label="Staff sign in"
      >
        <div>
          <p className="text-warning-foreground flex items-center gap-2 text-xs font-medium tracking-wide uppercase">
            <ShieldIcon className="size-4" aria-hidden /> ForgePilot team only
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            {step.name === "password"
              ? "Back-office sign in"
              : step.name === "code"
                ? "Enter your code"
                : "Set up two-factor sign-in"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {step.name === "password"
              ? "Use your ForgePilot account. Everything you do here is recorded."
              : step.name === "code"
                ? "Open your authenticator app and type the 6-digit code for ForgePilot."
                : "Staff accounts need an authenticator app (Google Authenticator, 1Password, Authy…). Add ForgePilot to it with the key below, then type the code it shows."}
          </p>
        </div>

        {step.name === "password" && (
          <>
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
          </>
        )}
        {step.name === "setup" && (
          <>
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium">Setup key</p>
              <code
                className="bg-muted rounded-md p-2 font-mono text-sm break-all select-all"
                data-testid="totp-secret"
              >
                {step.secret}
              </code>
              <p className="text-muted-foreground text-xs">
                In the app choose “enter a setup key”, or{" "}
                <a
                  href={step.otpauthUrl}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  open it in an authenticator on this device
                </a>
                . Keep the key private: anyone who has it can produce your codes.
              </p>
            </div>
            {codeField}
          </>
        )}
        {step.name === "code" && codeField}

        {error && (
          <p role="alert" className="text-danger-foreground text-sm">
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={busy || (step.name === "password" ? !email || !password : !codeReady)}
        >
          {busy
            ? "Working…"
            : step.name === "password"
              ? "Sign in"
              : step.name === "setup"
                ? "Turn on and continue"
                : "Continue"}
        </Button>
      </form>
    </main>
  );
}
