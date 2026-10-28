import type { ProductImage } from './types';

export const IMAGE_SIZES = [480, 960, 1600] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

/** Les fichiers sont stockés sous la forme /media/<base>-<taille>.webp */
export function imageVariant(path: string, size: ImageSize = 960): string {
  return `${path}-${size}.webp`;
}

export function imageSrcSet(path: string): string {
  return IMAGE_SIZES.map((s) => `${imageVariant(path, s)} ${s}w`).join(', ');
}

export function imageBaseFromUrl(url: string): string | null {
  const match = url.match(/^\/media\/([a-z0-9_-]+)-(480|960|1600)\.webp$/);
  return match ? match[1] : null;
}

export function primaryImage(images: ProductImage[] | undefined): ProductImage | null {
  if (!images || images.length === 0) return null;
  return images.find((i) => i.isPrimary) ?? images[0];
}

export function orderedImages(images: ProductImage[] | undefined): ProductImage[] {
  if (!images) return [];
  const primary = images.find((i) => i.isPrimary);
  const rest = images.filter((i) => i !== primary);
  return primary ? [primary, ...rest] : rest;
}

/** Stop retrying a broken srcset before displaying the local neutral placeholder. */
export function productImageFallback(event: { currentTarget: { dataset: { fallback?: string }; removeAttribute: (name: string) => void; src: string } }): void {
  const image = event.currentTarget;
  if (image.dataset.fallback === 'true') return;
  image.dataset.fallback = 'true';
  image.removeAttribute('srcset');
  image.src = '/images/product-unavailable.svg';
}
