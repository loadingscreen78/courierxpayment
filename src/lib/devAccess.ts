import { createHash } from 'crypto';

const PASSPHRASE = process.env.DEV_ACCESS_PASSPHRASE || '';
const PORTAL_KEY = process.env.DEV_PORTAL_KEY || '';

export function getExpectedDevToken(): string {
  if (!PASSPHRASE || !PORTAL_KEY) return '';
  return createHash('sha256')
    .update(`${PASSPHRASE}::${PORTAL_KEY}::courierx-dev`)
    .digest('hex');
}

export function isValidDevToken(token: string | undefined): boolean {
  if (!token) return false;
  const expected = getExpectedDevToken();
  if (!expected) return false;
  return token === expected;
}
