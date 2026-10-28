import { Link } from 'react-router-dom';
import type { PublicProduct } from '@shared/types';
import { formatPrice } from '@shared/format';
import { productEnquiryMessage } from '@shared/whatsapp';
import { productImageFallback, primaryImage, imageVariant } from '@shared/images';
import { canEnquire, canOrder } from '@shared/stock';
import { useSettings } from '../lib/settings';
import { StockBadge } from './StockBadge';
import { WhatsAppCta } from './whatsapp';
import { ArrowRightIcon, WhatsAppIcon } from './icons';

export function productUrl(slug: string): string {
  return `/produits/${slug}`;
}

export function productAbsoluteUrl(slug: string): string {
  if (typeof window === 'undefined') return productUrl(slug);
  return `${window.location.origin}${productUrl(slug)}`;
}

export function buildProductMessage(product: PublicProduct, businessName: string, quantity = 1, currency = 'XOF') {
  return productEnquiryMessage({
    businessName,
    productName: product.name,
    reference: product.reference,
    quantity,
    url: productAbsoluteUrl(product.slug),
    price: formatPrice(product.price, currency),
    details: [...(product.sizes.length === 1 ? product.sizes : []), ...product.options.filter(o => o.values.length === 1).map(o => `${o.label} : ${o.values[0]}`)].join(' · '),
    priceKnown: product.price !== null,
  });
}

interface ProductCardProps {
  product: PublicProduct;
  priority?: boolean;
  compact?: boolean;
}

export function ProductCard({ product, priority = false, compact = false }: ProductCardProps) {
  const { settings } = useSettings();
  const image = primaryImage(product.images);
  const price = formatPrice(product.price, settings.currency);
  const orderable = canOrder(product.stockState);
  const link = productUrl(product.slug);

  return (
    <article className="group flex h-full flex-col">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-cream-200">
        <Link to={link} aria-label={`Voir ${product.name}`} className="block focus-visible:outline-offset-4">
          {image ? (
            <img onError={productImageFallback}
              src={imageVariant(image.path, 480)}
              srcSet={`${imageVariant(image.path, 480)} 480w, ${imageVariant(image.path, 960)} 960w`}
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 45vw, 92vw"
              alt={image.alt || `${product.name} — ${product.category?.name ?? 'textile de maison'}`}
              loading={priority ? 'eager' : 'lazy'}
              fetchPriority={priority ? 'high' : 'auto'}
              decoding="async"
              width={image.width ?? 480}
              height={image.height ?? 600}
              className="aspect-[4/5] w-full object-cover transition-transform duration-700 ease-out motion-safe:group-hover:scale-[1.035]"
            />
          ) : (
            <div className="flex aspect-[4/5] w-full items-center justify-center bg-cream-200 text-ink-500/70">
              <span className="px-4 text-center text-xs">Photo à venir</span>
            </div>
          )}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          <StockBadge state={product.stockState} />
        </div>
      </div>

      <div className="flex flex-1 flex-col pt-4">
        <p className="text-2xs font-semibold uppercase tracking-eyebrow text-ink-500">{product.category?.name ?? 'Textiles de maison'}</p>
        <h3 className="mt-1.5 font-display text-[1.05rem] leading-snug">
          <Link to={link} className="hover:text-clay-600">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 text-xs text-ink-500">
          {product.reference ? `Réf. ${product.reference}` : null}
          {product.reference && product.isDemo ? ' · ' : null}
          {product.isDemo ? <span className="text-clay-600">Exemple de démonstration</span> : null}
        </p>

        <div className="mt-2.5 flex items-baseline gap-2">
          {price ? (
            <span className="font-display text-lg text-ink">{price}</span>
          ) : (
            <span className="text-sm font-medium text-ink-700">Prix sur demande</span>
          )}
          {price && product.priceNote && <span className="text-xs text-ink-500">{product.priceNote}</span>}
        </div>

        <div className={`mt-4 flex gap-2 ${compact ? 'flex-col' : 'flex-col sm:flex-row'} pt-1`}>
          <Link
            to={link}
            className="btn btn-outline btn-sm flex-1 justify-between gap-1 px-4"
          >
            Voir le produit
            <ArrowRightIcon size={16} className="opacity-60 transition-transform motion-safe:group-hover:translate-x-0.5" />
          </Link>
          {orderable || canEnquire(product.stockState, product.allowEnquiryWhenOutOfStock) ? (
            <WhatsAppCta
              message={buildProductMessage(product, settings.businessName, 1, settings.currency)}
              label={orderable ? 'Commander' : 'Nous informer'}
              variant={orderable ? 'whatsapp' : 'outline'}
              size="sm"
              icon={false}
              className="flex-1 [&>a]:w-full [&>div]:w-full"
              testId={`whatsapp-${product.slug}`}
            />
          ) : (
            <span className="btn btn-outline btn-sm flex-1 cursor-not-allowed opacity-60">Indisponible</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skeleton aspect-[4/5] w-full rounded-2xl" />
      <div className="skeleton mt-4 h-3 w-24 rounded" />
      <div className="skeleton mt-2 h-4 w-3/4 rounded" />
      <div className="skeleton mt-3 h-3 w-20 rounded" />
      <div className="mt-4 flex gap-2">
        <div className="skeleton h-10 flex-1 rounded-full" />
        <div className="skeleton h-10 flex-1 rounded-full" />
      </div>
    </div>
  );
}

export function WhatsAppMiniLink({ product }: { product: PublicProduct }) {
  const { settings } = useSettings();
  return (
    <WhatsAppCta
      message={buildProductMessage(product, settings.businessName, 1, settings.currency)}
      label="Commander sur WhatsApp"
      variant="whatsapp"
      className="w-full"
      testId={`whatsapp-mini-${product.slug}`}
    />
  );
}

export { WhatsAppIcon };
