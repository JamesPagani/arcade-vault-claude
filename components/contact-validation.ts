// Shared between the client form and the API route so both sides agree on what counts as valid.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ContactFields {
  name: string;
  email: string;
  message: string;
}

export function validateContactFields(fields: ContactFields): boolean {
  const name = fields.name.trim();
  const email = fields.email.trim();
  const message = fields.message.trim();
  return name.length > 0 && message.length > 0 && EMAIL_REGEX.test(email);
}
