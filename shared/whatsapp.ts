import type { PublicSettings, StockState } from './types';

export const OFFICIAL_WHATSAPP_NUMBER = '2250788880307';
export function shopWhatsAppLink(message: string): string {
  return `https://wa.me/${OFFICIAL_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

/**
 * Construit un lien WhatsApp (wa.me) à partir d'un numéro au format international.
 * La validation est volontairement stricte : aucun lien cassé ne doit être généré.
 */
export function normaliseWhatsAppNumber(raw: unknown): { ok: true; digits: string; e164: string } | { ok: false; reason: 'missing' | 'invalid' } {
  if (typeof raw !== 'string' || raw.trim() === '') return { ok: false, reason: 'missing' };
  const cleaned = raw.replace(/[\s\-.()/]/g, '').replace(/^00/, '+');
  if (!/^\+?\d{6,15}$/.test(cleaned)) return { ok: false, reason: 'invalid' };
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < 6 || digits.length > 15) return { ok: false, reason: 'invalid' };
  if (digits.startsWith('0')) return { ok: false, reason: 'invalid' };
  return { ok: true, digits, e164: `+${digits}` };
}

export function buildWhatsAppLink(rawNumber: unknown, message: string): string | null {
  const n = normaliseWhatsAppNumber(rawNumber);
  if (!n.ok) return null;
  const text = encodeURIComponent(message);
  return `https://wa.me/${n.digits}?text=${text}`;
}

export interface WhatsAppProductContext {
  businessName: string;
  productName: string;
  reference?: string | null;
  quantity?: number | null;
  url?: string | null;
  priceKnown: boolean;
  price?: string | null;
  details?: string | null;
}

export function productEnquiryMessage(ctx: WhatsAppProductContext): string {
  return [
    `Bonjour ${ctx.businessName} ! Je souhaite commander ce produit.`,
    '',
    `Produit : ${ctx.productName}`,
    `Prix : ${ctx.price || 'Prix sur demande'}`,
    ctx.reference ? `Référence : ${ctx.reference}` : '',
    ctx.details ? `Design/Taille : ${ctx.details}` : '',
    ctx.quantity && ctx.quantity > 0 ? `Quantité : ${ctx.quantity}` : '',
    '',
    'Pouvez-vous confirmer sa disponibilité ?',
    ctx.url || '',
  ].filter((line, index) => line || index === 1).join('\n');
}

export function wholesaleWhatsAppMessage(businessName: string, productLabel?: string | null, quantity?: number | null): string {
  const product = productLabel ? ` Produit concerné : ${productLabel}.` : '';
  const qty = quantity && quantity > 0 ? ` Quantité estimée : ${quantity}.` : '';
  return `Bonjour ${businessName}, je suis commerçant / revendeur et je souhaite connaître vos prix de gros, les quantités minimums et la disponibilité de vos produits.${product}${qty} Merci de me recontacter.`;
}

export function generalWhatsAppMessage(businessName: string): string {
  return `Bonjour ${businessName}, je souhaite avoir des informations sur vos produits textiles (draps, housses de couette, rideaux).`;
}

export function enquiryWhatsAppMessage(businessName: string, name: string, message?: string | null): string {
  const intro = `Bonjour ${businessName}, je suis ${name}.`;
  return `${intro} ${message && message.trim() ? message.trim() : 'Je souhaite avoir des informations sur vos produits.'}`;
}

export function whatsappHrefForSettings(settings: Pick<PublicSettings, 'whatsappNumber'> | null | undefined, message: string): string | null {
  return shopWhatsAppLink(message);
}

/** Libellés publics des états de stock. */
export const STOCK_LABELS: Record<StockState, string> = {
  disponible: 'Disponible',
  limite: 'Stock limité',
  rupture: 'Rupture de stock',
  indisponible: 'Indisponible',
};

export function isOrderable(state: StockState): boolean {
  return state === 'disponible' || state === 'limite';
}
