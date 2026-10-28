import type { StockState } from './types';

export interface StockInput {
  isAvailable: boolean;
  trackStock: boolean;
  stockQty: number | null;
  lowStockThreshold: number | null;
  globalThreshold: number;
}

/**
 * Règle unique de calcul de l'état du stock.
 * - Le produit marqué indisponible par l'administrateur n'est JAMAIS affiché disponible.
 * - Si le suivi de stock est activé, une quantité <= 0 donne « rupture » et une quantité
 *   inférieure ou égale au seuil configuré donne « stock limité ».
 * - Aucune décrémentation automatique : la quantité ne change que par action administrative.
 */
export function computeStockState(input: StockInput): StockState {
  if (!input.isAvailable) return 'indisponible';
  if (input.trackStock) {
    const qty = input.stockQty ?? 0;
    if (qty <= 0) return 'rupture';
    const threshold = input.lowStockThreshold ?? input.globalThreshold;
    if (qty <= threshold) return 'limite';
  }
  return 'disponible';
}

export function canOrder(state: StockState): boolean {
  return state === 'disponible' || state === 'limite';
}

export function canEnquire(state: StockState, allowWhenOutOfStock: boolean): boolean {
  if (state === 'disponible' || state === 'limite') return true;
  return allowWhenOutOfStock;
}
