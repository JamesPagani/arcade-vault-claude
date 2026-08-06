export const MIN_PASSWORD_LENGTH = 8;

export function validatePassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
