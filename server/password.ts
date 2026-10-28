import crypto from 'node:crypto';

const SCRYPT_N = 16384;
const SCRYPT_r = 8;
const SCRYPT_p = 1;
const KEYLEN = 64;

/** Hachage de mot de passe scrypt (sans dépendance externe). Format : scrypt$N$r$p$salt$hash */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, KEYLEN, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p }).toString('hex');
  return `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${salt}$${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, n, r, p, salt, hash] = stored.split('$');
    if (scheme !== 'scrypt') return false;
    const derived = crypto.scryptSync(password, salt, KEYLEN, { N: Number(n), r: Number(r), p: Number(p) });
    const expected = Buffer.from(hash, 'hex');
    if (expected.length !== derived.length) return false;
    return crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

export function passwordIssues(password: string): string | null {
  if (typeof password !== 'string' || password.length < 10) return 'Le mot de passe doit contenir au moins 10 caractères.';
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) return 'Le mot de passe doit contenir des lettres et des chiffres.';
  if (password.length > 200) return 'Mot de passe trop long.';
  return null;
}
