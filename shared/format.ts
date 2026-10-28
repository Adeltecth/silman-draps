import type { StockState } from './types';

const CURRENCY_LABELS: Record<string, string> = {
  XOF: 'F CFA',
  XAF: 'F CFA',
  EUR: '€',
  USD: '$',
  GHS: 'GH₵',
  NGN: '₦',
};

/** Affiche un prix entier dans la devise configurée. Aucun prix n'est inventé : null => null. */
export function formatPrice(amount: number | null | undefined, currency = 'XOF'): string | null {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return null;
  const code = (currency || 'XOF').toUpperCase();
  try {
    const formatted = new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      maximumFractionDigits: code === 'XOF' || code === 'XAF' ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(amount);
    const label = CURRENCY_LABELS[code] ?? code;
    return code === 'EUR' || code === 'USD' ? `${formatted} ${label}` : `${formatted} ${label}`;
  } catch {
    return `${amount} ${code}`;
  }
}

export function formatDateFr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
}

export function formatDateShort(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T') + 'Z');
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

export const STOCK_STATE_META: Record<StockState, { label: string; tone: 'ok' | 'warn' | 'danger' | 'neutral' }> = {
  disponible: { label: 'Disponible', tone: 'ok' },
  limite: { label: 'Stock limité', tone: 'warn' },
  rupture: { label: 'Rupture de stock', tone: 'danger' },
  indisponible: { label: 'Indisponible', tone: 'neutral' },
};

export const ENQUIRY_STATUS_META: Record<string, { label: string; tone: string }> = {
  new: { label: 'Nouvelle', tone: 'bg-clay-50 text-clay-600 border-clay-100' },
  contacted: { label: 'Contactée', tone: 'bg-amber-50 text-amber-800 border-amber-200' },
  converted: { label: 'Convertie', tone: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  closed: { label: 'Clôturée', tone: 'bg-stone-100 text-ink-500 border-stone-200' },
};

export const ENQUIRY_TYPE_LABELS: Record<string, string> = {
  retail: 'Détail',
  wholesale: 'Gros',
};

export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n > 1 ? (plural ?? singular + 's') : singular}`;
}
