"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";
import { AuthError } from "@/lib/auth/api";
import { isValidMobile, normalizeMobile } from "@/lib/auth/mobile";
import { envProblems } from "@/lib/env";

export default function SignInPage() {
  const router = useRouter();
  const { session, signIn } = useAuth();
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problems = envProblems();

  // A valid stored session skips sign-in.
  useEffect(() => {
    if (session) router.replace("/");
  }, [session, router]);

  const mobileValid = isValidMobile(mobile);
  const canSubmit = mobileValid && password.length > 0 && !busy && problems.length === 0;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(mobile, password);
      router.replace("/");
    } catch (err) {
      setError(err instanceof AuthError ? err.message : "Sign-in failed. Try again.");
      setBusy(false);
    }
  }

  if (session === undefined || session) {
    return <div className="signin" />;
  }

  return (
    <div className="signin">
      <div className="card signin__card">
        <div className="signin__logo">
          <Logo size={72} />
        </div>
        <div className="brand" style={{ marginBottom: 24, justifyContent: "center", width: "100%" }}>
          <span className="brand__word">
            Sculpt<span>.</span>
          </span>
        </div>
        <h1 style={{ marginBottom: 6 }}>Studio sign-in</h1>
        <p className="muted small" style={{ marginBottom: 24 }}>
          Use the mobile number and password from the SCULPT app.
        </p>

        {problems.length > 0 ? (
          <div className="notice notice--error" role="alert" style={{ marginBottom: 16 }}>
            The site is not configured. {problems.join(" ")}
          </div>
        ) : null}

        <form className="form" onSubmit={onSubmit} noValidate>
          <div className="field">
            <label htmlFor="mobile">Mobile</label>
            <input
              id="mobile"
              className="input mono"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={mobile}
              onChange={(e) => setMobile(normalizeMobile(e.target.value))}
              onBlur={() => setTouched(true)}
              aria-invalid={touched && !mobileValid ? "true" : undefined}
              disabled={busy}
            />
            {touched && !mobileValid ? (
              <span className="field__error">Enter a 10-digit Indian mobile number.</span>
            ) : (
              <span className="hint">10 digits. Country code and leading zero are removed.</span>
            )}
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
            />
          </div>

          {error ? (
            <div className="notice notice--error" role="alert">
              {error}
            </div>
          ) : null}

          <button type="submit" className="btn" disabled={!canSubmit}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
