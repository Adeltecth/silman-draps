import type { Request } from 'express';

/** Récupère un corps JSON de façon sûre (le parseur Express peut renvoyer undefined). */
export function bodyOf(req: Request): Record<string, unknown> {
  const body = req.body;
  if (body && typeof body === 'object' && !Array.isArray(body)) return body as Record<string, unknown>;
  return {};
}

export function str(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}
