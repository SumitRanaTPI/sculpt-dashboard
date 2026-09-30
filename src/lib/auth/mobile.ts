/**
 * Mobile-number handling that mirrors the SCULPT mobile app so both clients
 * resolve the same Supabase Auth identifier.
 */

const MOBILE_RE = /^[6-9]\d{9}$/;

/** Strip non-digits, drop a `91` country code or a leading `0`, keep at most 10 digits. */
export function normalizeMobile(input: string): string {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return digits.slice(0, 10);
}

export function isValidMobile(mobile: string): boolean {
  return MOBILE_RE.test(mobile);
}

export function aliasEmailFor(mobile: string, domain: string): string {
  return `91${mobile}@${domain}`;
}

export function e164For(mobile: string): string {
  return `+91${mobile}`;
}
