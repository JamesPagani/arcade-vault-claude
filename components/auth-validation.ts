// This client-side check is a UX nicety, not the real enforcement. The actual
// minimum password length, leaked-password protection, and a signup rate
// limit per IP must be configured manually in the Supabase Dashboard's Auth
// settings — no migration or MCP tool covers Auth project configuration. See
// specs/12-security-hardening.md, "Manual dashboard steps".
export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
