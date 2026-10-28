import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { db } from './db';
import { config } from './config';
import { verifyPassword } from './password';
import type { AdminUser } from '../shared/types';

export const SESSION_COOKIE = 'silima_sid';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: AdminUser;
      adminSessionId?: number;
    }
  }
}

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

function cookieOptions(req: Request) {
  const secure =
    config.cookieSecure === 'true' ||
    (config.cookieSecure === 'auto' && (req.secure || req.headers['x-forwarded-proto'] === 'https'));
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure,
    path: '/',
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
  };
}

export function createSession(req: Request, res: Response, userId: number): void {
  const token = crypto.randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000).toISOString();
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?)').run(
    sha256(token),
    userId,
    expires,
    req.ip ?? '',
    String(req.headers['user-agent'] ?? '').slice(0, 250)
  );
  res.cookie(SESSION_COOKIE, token, cookieOptions(req));
}

export function destroySession(req: Request, res: Response): void {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(token));
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

export function currentAdmin(req: Request): AdminUser | null {
  const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT s.id AS session_id, s.expires_at, u.id, u.email, u.name, u.role, u.is_active, u.last_login_at
       FROM sessions s JOIN admin_users u ON u.id = s.user_id WHERE s.token_hash = ?`
    )
    .get(sha256(token)) as
    | { session_id: number; expires_at: string; id: number; email: string; name: string; role: 'admin' | 'editor'; is_active: number; last_login_at: string | null }
    | undefined;
  if (!row) return null;
  if (new Date(row.expires_at).getTime() < Date.now() || !row.is_active) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(row.session_id);
    return null;
  }
  return { id: row.id, email: row.email, name: row.name, role: row.role, lastLoginAt: row.last_login_at };
}

/** Middleware : exige une session administrateur valide (contrôle serveur, jamais côté client seul). */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const admin = currentAdmin(req);
  if (!admin) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  req.admin = admin;
  next();
}

/**
 * Protection CSRF : cookie SameSite=Lax + en-tête personnalisé obligatoire pour
 * toutes les requêtes mutantes de l'espace d'administration.
 */
export function csrfGuard(req: Request, res: Response, next: NextFunction): void {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-silima-csrf') !== '1') {
    res.status(403).json({ error: 'Requête refusée (protection CSRF).' });
    return;
  }
  const origin = req.get('origin');
  if (origin) {
    let originHost = '';
    try {
      originHost = new URL(origin).host;
    } catch {
      originHost = '';
    }
    if (originHost && originHost !== req.get('host')) {
      res.status(403).json({ error: 'Origine non autorisée.' });
      return;
    }
  }
  next();
}

// ---- Limitation de débit simple en mémoire ---------------------------------

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function resetRateLimit(key: string): void {
  buckets.delete(key);
}

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
}, 10 * 60 * 1000).unref();

export interface LoginResult {
  ok: boolean;
  code?: 'invalid' | 'locked' | 'inactive' | 'rate-limited';
  user?: AdminUser;
  retryAfter?: number;
}

export function attemptLogin(email: string, password: string): LoginResult {
  const row = db.prepare('SELECT * FROM admin_users WHERE email = ? COLLATE NOCASE').get(email.trim()) as
    | { id: number; email: string; name: string; password_hash: string; role: 'admin' | 'editor'; is_active: number; failed_attempts: number; locked_until: string | null }
    | undefined;

  // Message générique volontairement identique pour un email inconnu et un mot de passe erroné.
  if (!row) return { ok: false, code: 'invalid' };
  if (!row.is_active) return { ok: false, code: 'inactive' };
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    return { ok: false, code: 'locked', retryAfter: Math.ceil((new Date(row.locked_until).getTime() - Date.now()) / 1000) };
  }
  if (!verifyPassword(password, row.password_hash)) {
    const attempts = row.failed_attempts + 1;
    const lockUntil = attempts >= 8 ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;
    db.prepare('UPDATE admin_users SET failed_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockUntil, row.id);
    return { ok: false, code: 'invalid' };
  }
  db.prepare("UPDATE admin_users SET failed_attempts = 0, locked_until = NULL, last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?").run(row.id);
  return {
    ok: true,
    user: { id: row.id, email: row.email, name: row.name, role: row.role, lastLoginAt: new Date().toISOString() },
  };
}

export function cleanupSessions(): void {
  db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(new Date().toISOString());
}
