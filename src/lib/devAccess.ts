import { createHash } from 'crypto';

const PASSPHRASE = process.env.DEV_ACCESS_PASSPHRASE || '';

export function getExpectedDevToken(): string {
  if (!PASSPHRASE) return '';
  return createHash('sha256')
    .update(`${PASSPHRASE}::courierx-dev-2026`)
    .digest('hex');
}

export function isValidDevToken(token: string | undefined): boolean {
  if (!token) return false;
  const expected = getExpectedDevToken();
  if (!expected) return false;
  return token === expected;
}
