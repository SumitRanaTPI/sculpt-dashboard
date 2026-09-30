// NEXT_PUBLIC_* values are inlined at build time, so each one must be read
// through a literal `process.env.NAME` expression.

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const rawMode = process.env.NEXT_PUBLIC_AUTH_LOGIN_MODE;

export type LoginMode = "email_alias" | "phone";

export const env = {
  supabaseUrl: rawUrl.replace(/\/+$/, ""),
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  loginMode: (rawMode?.trim() === "phone" ? "phone" : "email_alias") as LoginMode,
  aliasEmailDomain:
    process.env.NEXT_PUBLIC_AUTH_ALIAS_EMAIL_DOMAIN?.trim().toLowerCase() || "phone.sculpt.studio",
} as const;

export function envProblems(): string[] {
  const problems: string[] = [];
  if (!env.supabaseUrl) problems.push("NEXT_PUBLIC_SUPABASE_URL is not set.");
  if (!env.anonKey) problems.push("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set.");
  return problems;
}

export const authUrl = `${env.supabaseUrl}/auth/v1`;
export const restUrl = `${env.supabaseUrl}/rest/v1`;
