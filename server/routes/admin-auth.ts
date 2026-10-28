import { Router } from 'express';
import { z } from 'zod';
import { attemptLogin, createSession, destroySession, rateLimit, requireAdmin, resetRateLimit, currentAdmin } from '../auth';
import { loginSchema, passwordChangeSchema } from '../schemas';
import { db } from '../db';
import { hashPassword, passwordIssues, verifyPassword } from '../password';
import { bodyOf } from '../http';
import { hashIp } from '../config';

export const adminAuthRouter = Router();

adminAuthRouter.post('/login', (req, res) => {
  const ip = req.ip ?? 'unknown';
  const key = `login:${hashIp(ip)}`;
  if (!rateLimit(key, 12, 15 * 60 * 1000)) {
    res.status(429).json({ error: 'Trop de tentatives de connexion. Merci de réessayer dans quelques minutes.' });
    return;
  }
  const parsed = loginSchema.safeParse(bodyOf(req));
  if (!parsed.success) {
    res.status(422).json({ error: 'Adresse e-mail ou mot de passe invalide.', fields: { email: parsed.error.issues[0]?.message ?? '' } });
    return;
  }
  const result = attemptLogin(parsed.data.email, parsed.data.password);
  if (!result.ok) {
    // Message volontairement générique : ne révèle pas si le compte existe.
    const message =
      result.code === 'locked'
        ? 'Compte temporairement verrouillé après plusieurs tentatives. Réessayez dans quelques minutes.'
        : 'E-mail ou mot de passe incorrect.';
    res.status(result.code === 'rate-limited' ? 429 : 401).json({ error: message });
    return;
  }
  resetRateLimit(key);
  createSession(req, res, result.user!.id);
  res.json({ user: result.user });
});

adminAuthRouter.post('/logout', (req, res) => {
  destroySession(req, res);
  res.json({ ok: true });
});

adminAuthRouter.get('/me', (req, res) => {
  const admin = currentAdmin(req);
  if (!admin) {
    res.status(401).json({ error: 'Authentification requise.' });
    return;
  }
  res.json({ user: admin });
});

adminAuthRouter.post('/password', requireAdmin, (req, res) => {
  const parsed = passwordChangeSchema.safeParse(bodyOf(req));
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.issues[0]?.message ?? 'Données invalides.' });
    return;
  }
  const admin = req.admin!;
  const row = db.prepare('SELECT password_hash FROM admin_users WHERE id = ?').get(admin.id) as { password_hash: string } | undefined;
  if (!row || !verifyPassword(parsed.data.currentPassword, row.password_hash)) {
    res.status(401).json({ error: 'Le mot de passe actuel est incorrect.' });
    return;
  }
  const issue = passwordIssues(parsed.data.newPassword);
  if (issue) {
    res.status(422).json({ error: issue });
    return;
  }
  db.prepare('UPDATE admin_users SET password_hash = ?, updated_at = strftime(\'%Y-%m-%dT%H:%M:%fZ\',\'now\') WHERE id = ?').run(
    hashPassword(parsed.data.newPassword),
    admin.id
  );
  // Toutes les sessions existantes sont invalidées, puis une nouvelle est créée.
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(admin.id);
  createSession(req, res, admin.id);
  res.json({ ok: true, message: 'Mot de passe mis à jour.' });
});

adminAuthRouter.get('/session-check', requireAdmin, (req, res) => {
  res.json({ ok: true, user: req.admin });
});

export const adminAuthMisc = z.object({});
