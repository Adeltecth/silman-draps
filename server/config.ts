import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const rootDir = process.cwd();
const dataDir = process.env.DATA_DIR ? path.resolve(rootDir, process.env.DATA_DIR) : path.join(rootDir, 'data');
const uploadsDir = path.join(dataDir, 'uploads');

fs.mkdirSync(uploadsDir, { recursive: true });

export const config = {
  rootDir,
  dataDir,
  uploadsDir,
  distDir: path.join(rootDir, 'dist'),
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  siteUrl: (process.env.SITE_URL || '').replace(/\/$/, ''),
  demoMode: (process.env.DEMO_MODE ?? 'true').toLowerCase() !== 'false',
  sessionDays: Number(process.env.SESSION_DAYS || 7),
  cookieSecure: (process.env.COOKIE_SECURE || 'auto') as 'auto' | 'true' | 'false',
  adminEmail: (process.env.ADMIN_EMAIL || '').trim(),
  adminPassword: process.env.ADMIN_PASSWORD || '',
  adminName: (process.env.ADMIN_NAME || 'Administrateur').trim(),
  maxUploadBytes: 12 * 1024 * 1024,
  enquiryRateLimit: Number(process.env.ENQUIRY_RATE_LIMIT || 6),
  trustProxy: (process.env.TRUST_PROXY ?? 'true') !== 'false',
};

export const isProduction = process.env.NODE_ENV === 'production';

/** Identifiant de police/admin anonyme pour le rate limiting en mémoire. */
export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(`${ip}:silima`).digest('hex').slice(0, 16);
}
