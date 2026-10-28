import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { PublicProduct } from '@shared/types';
import { formatPrice, STOCK_STATE_META } from '@shared/format';
import { productEnquiryMessage, wholesaleWhatsAppMessage } from '@shared/whatsapp';
import { imageVariant, orderedImages } from '@shared/images';
import { canEnquire, canOrder } from '@shared/stock';
import { useApi } from '../lib/useApi';
import { useSeo } from '../lib/seo';
import { useSettings } from '../lib/settings';
import { ProductCard } from '../components/ProductCard';
import { StockBadge } from '../components/StockBadge';
import { WhatsAppCta, WhatsAppNote } from '../components/whatsapp';
import { Alert, Breadcrumbs, Spinner } from '../components/ui';
import { ChevronLeftIcon, ChevronRightIcon, MinusIcon, PlusIcon, StoreIcon, TruckIcon, WhatsAppIcon } from '../components/icons';

interface DetailResponse {
  product: PublicProduct;
  related: PublicProduct[];
}

export function ProductDetailPage() {
  const { slug = '' } = useParams();
  const { settings } = useSettings();
  const { data, loading, error } = useApi<DetailResponse>(slug ? `/api/public/products/${encodeURIComponent(slug)}` : null);
  const product = data?.product;
  const images = useMemo(() => orderedImages(product?.images), [product]);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    setActiveImage(0);
    setQuantity(1);
    setSelectedSize(null);
    setSelectedOptions({});
  }, [slug]);

  useSeo(
    product ? `${product.name}${product.reference ? ` (réf. ${product.reference})` : ''} — ${product.category?.name ?? 'Textiles'} | ${settings.businessName}` : `Produit | ${settings.businessName}`,
    product?.shortDescription || product?.description?.slice(0, 155) || `Découvrez ${product?.name ?? 'nos produits'} chez ${settings.businessName} à Abidjan.`
  );

  if (loading) {
    return (
      <div className="container-page flex min-h-[60vh] items-center justify-center py-20">
        <div className="flex items-center gap-3 text-ink-500">
          <Spinner /> Chargement du produit…
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container-page py-16">
        <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Nos produits', to: '/produits' }, { label: 'Produit' }]} />
        <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-line bg-white p-8 text-center">
          <h1 className="text-2xl">Ce produit n’est pas disponible</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            {error ?? 'La fiche demandée n’existe pas ou le produit a été retiré du catalogue.'} Vous pouvez parcourir les autres modèles disponibles.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/produits" className="btn-primary">
              Retour au catalogue
            </Link>
            <WhatsAppCta
              message={productEnquiryMessage({
                businessName: settings.businessName,
                productName: 'un produit vu sur votre site',
                quantity: 1,
                url: typeof window !== 'undefined' ? window.location.href : null,
                priceKnown: false,
              })}
              label="Nous écrire"
              variant="outline"
              testId="product-notfound-whatsapp"
            />
          </div>
        </div>
      </div>
    );
  }

  const price = formatPrice(product.price, settings.currency);
  const orderable = canOrder(product.stockState);
  const enquiryAllowed = canEnquire(product.stockState, product.allowEnquiryWhenOutOfStock);
  const imagesAvailable = images.length > 0;
  const currentImage = imagesAvailable ? images[Math.min(activeImage, images.length - 1)] : null;
  const stockMeta = STOCK_STATE_META[product.stockState];

  const detailParts: string[] = [];
  if (selectedSize) detailParts.push(`Taille souhaitée : ${selectedSize}`);
  for (const [label, value] of Object.entries(selectedOptions)) detailParts.push(`${label} : ${value}`);

  const message = productEnquiryMessage({
    businessName: settings.businessName,
    productName: product.name,
    reference: product.reference,
    quantity,
    url: typeof window !== 'undefined' ? window.location.href.split('?')[0] : null,
    priceKnown: product.price !== null,
    details: detailParts.join('. '),
  });

  const outOfStockMessage = productEnquiryMessage({
    businessName: settings.businessName,
    productName: product.name,
    reference: product.reference,
    quantity,
    url: typeof window !== 'undefined' ? window.location.href.split('?')[0] : null,
    priceKnown: product.price !== null,
    details: `Je souhaite être informé(e) du retour en stock. ${detailParts.join('. ')}`,
  });

  const wholesaleLink = `/gros?produit=${encodeURIComponent(product.slug)}`;
  const maxQty = 50;

  const goPrev = () => setActiveImage((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setActiveImage((i) => (i + 1) % images.length);

  return (
    <div className="container-page pb-28 pt-6 sm:pt-10 lg:pb-16">
      <Breadcrumbs
        items={[
          { label: 'Accueil', to: '/' },
          { label: 'Nos produits', to: '/produits' },
          ...(product.category ? [{ label: product.category.name, to: `/produits?categorie=${product.category.slug}` }] : []),
          { label: product.name },
        ]}
      />

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        {/* Galerie */}
        <div>
          <div className="relative overflow-hidden rounded-2xl border border-line bg-cream-200">
            {currentImage ? (
              <img
                key={currentImage.id}
                src={imageVariant(currentImage.path, 960)}
                srcSet={`${imageVariant(currentImage.path, 480)} 480w, ${imageVariant(currentImage.path, 960)} 960w, ${imageVariant(currentImage.path, 1600)} 1600w`}
                sizes="(min-width: 1024px) 48vw, 100vw"
                alt={currentImage.alt || `${product.name} — photo ${activeImage + 1}`}
                width={currentImage.width ?? 960}
                height={currentImage.height ?? 1200}
                fetchPriority="high"
                className="aspect-[4/5] w-full object-cover"
                onKeyDown={(e) => {
                  if (e.key === 'ArrowLeft') goPrev();
                  if (e.key === 'ArrowRight') goNext();
                }}
                tabIndex={images.length > 1 ? 0 : -1}
                aria-label={images.length > 1 ? 'Photo du produit — utilisez les flèches gauche et droite pour changer de photo' : undefined}
              />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center text-sm text-ink-500">Photo à venir</div>
            )}

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50/95 text-ink shadow-soft transition-colors hover:bg-cream-50"
                  aria-label="Photo précédente"
                >
                  <ChevronLeftIcon size={20} />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-cream-50/95 text-ink shadow-soft transition-colors hover:bg-cream-50"
                  aria-label="Photo suivante"
                >
                  <ChevronRightIcon size={20} />
                </button>
              </>
            )}

            <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
              <StockBadge state={product.stockState} />
            </div>
          </div>

          {images.length > 1 && (
            <ul className="mt-3 flex gap-2.5 overflow-x-auto pb-1" aria-label="Miniatures du produit">
              {images.map((img, index) => (
                <li key={img.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`Afficher la photo ${index + 1}`}
                    aria-current={index === activeImage}
                    className={`block overflow-hidden rounded-xl border-2 transition-colors ${index === activeImage ? 'border-clay-500' : 'border-transparent hover:border-line'}`}
                  >
                    <img
                      src={imageVariant(img.path, 480)}
                      alt=""
                      width={80}
                      height={100}
                      loading="lazy"
                      className="h-[84px] w-[68px] object-cover"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 hidden rounded-2xl border border-line bg-cream-50 p-4 lg:block">
            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-ink-700">
              <TruckIcon size={18} className="mt-0.5 shrink-0 text-clay-600" />
              <span>
                {settings.deliveryInfo ||
                  'Les modalités de retrait et de livraison sont convenues avec la boutique au moment de la confirmation de votre commande.'}
              </span>
            </p>
          </div>
        </div>

        {/* Informations */}
        <div className="lg:pt-1">
          {product.category && (
            <Link to={`/produits?categorie=${product.category.slug}`} className="eyebrow hover:text-clay-700">
              {product.category.name}
            </Link>
          )}
          <h1 className="mt-2.5 text-[2rem] leading-[1.1] sm:text-[2.4rem]">{product.name}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-500">
            {product.reference && <span>Réf. {product.reference}</span>}
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${orderable ? 'bg-moss-500' : 'bg-clay-500'}`} aria-hidden="true" />
              {stockMeta.label}
            </span>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-x-3 gap-y-1">
            {price ? (
              <>
                <span className="font-display text-[1.9rem] leading-none text-ink">{price}</span>
                {product.priceNote && <span className="pb-1 text-sm text-ink-500">{product.priceNote}</span>}
              </>
            ) : (
              <span className="font-display text-[1.6rem] leading-none text-ink">Prix sur demande</span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-ink-500">
            {price
              ? 'Prix indicatif publié par la boutique. La disponibilité et les modalités sont confirmées sur WhatsApp.'
              : 'Le prix n’est pas publié pour ce produit : nous vous le communiquons sur WhatsApp.'}
          </p>

          {product.shortDescription && <p className="mt-5 text-[0.98rem] leading-relaxed text-ink-700">{product.shortDescription}</p>}

          {/* Tailles */}
          {product.sizes.length > 0 && (
            <fieldset className="mt-6">
              <legend className="field-label">Taille {selectedSize ? '' : <span className="text-xs font-normal text-ink-500">(facultatif)</span>}</legend>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => setSelectedSize((s) => (s === size ? null : size))}
                    aria-pressed={selectedSize === size}
                    className={`min-h-[42px] rounded-full border px-4 text-sm transition-colors ${
                      selectedSize === size ? 'border-ink bg-ink text-cream-50' : 'border-line bg-white text-ink-700 hover:border-ink/30'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          {/* Options (couleur, finition…) */}
          {product.options.map((option) => (
            <fieldset key={option.label} className="mt-5">
              <legend className="field-label">{option.label}</legend>
              <div className="flex flex-wrap gap-2">
                {option.values.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setSelectedOptions((prev) => {
                        const next = { ...prev };
                        if (next[option.label] === value) delete next[option.label];
                        else next[option.label] = value;
                        return next;
                      })
                    }
                    aria-pressed={selectedOptions[option.label] === value}
                    className={`min-h-[42px] rounded-full border px-4 text-sm transition-colors ${
                      selectedOptions[option.label] === value ? 'border-ink bg-ink text-cream-50' : 'border-line bg-white text-ink-700 hover:border-ink/30'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </fieldset>
          ))}

          {/* Quantité */}
          <div className="mt-6">
            <span className="field-label" id="quantite-label">
              Quantité
            </span>
            <div className="inline-flex items-center rounded-full border border-line bg-white" role="group" aria-labelledby="quantite-label">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                className="flex h-12 w-12 items-center justify-center rounded-l-full text-ink transition-colors hover:bg-cream-100 disabled:opacity-40"
                aria-label="Diminuer la quantité"
              >
                <MinusIcon size={18} />
              </button>
              <input
                type="number"
                min={1}
                max={maxQty}
                value={quantity}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isFinite(value)) setQuantity(Math.min(maxQty, Math.max(1, Math.round(value))));
                }}
                className="h-12 w-14 border-0 bg-transparent text-center text-base font-medium text-ink focus:outline-none"
                aria-label="Quantité souhaitée"
              />
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
                disabled={quantity >= maxQty}
                className="flex h-12 w-12 items-center justify-center rounded-r-full text-ink transition-colors hover:bg-cream-100 disabled:opacity-40"
                aria-label="Augmenter la quantité"
              >
                <PlusIcon size={18} />
              </button>
            </div>
            <p className="field-help">Indiquez la quantité pour votre foyer ou votre point de vente ; nous confirmons le disponible.</p>
          </div>

          {/* Actions */}
          <div className="mt-7 space-y-3">
            {orderable ? (
              <WhatsAppCta
                message={message}
                label="Commander sur WhatsApp"
                className="w-full [&>a]:w-full"
                testId="product-whatsapp"
                ariaLabel={`Commander ${product.name} sur WhatsApp`}
              />
            ) : enquiryAllowed ? (
              <WhatsAppCta
                message={outOfStockMessage}
                label="Nous informer de mon intérêt"
                className="w-full [&>a]:w-full"
                testId="product-outofstock-whatsapp"
              />
            ) : (
              <div className="rounded-xl border border-line bg-cream-100 px-4 py-3 text-sm text-ink-700">
                Ce produit n’est pas proposé à la commande pour le moment. Vous pouvez consulter les autres modèles du catalogue.
              </div>
            )}

            <Link to={wholesaleLink} className="btn-outline w-full">
              <StoreIcon size={18} />
              Demander un prix de gros
            </Link>

            {product.stockState === 'rupture' && enquiryAllowed && (
              <Alert tone="warning">
                Rupture de stock : la commande directe est désactivée. Vous pouvez nous laisser vos coordonnées pour être prévenu(e) du réassort.
              </Alert>
            )}
            {product.stockState === 'indisponible' && (
              <Alert tone="info">Ce modèle est marqué indisponible par la boutique. Écrivez-nous pour connaître les alternatives disponibles.</Alert>
            )}

            <WhatsAppNote />
          </div>

          {/* Détails */}
          <div className="mt-8 border-t border-line pt-7">
            <h2 className="text-lg">Détails du produit</h2>
            {product.description && <p className="mt-3 whitespace-pre-line text-[0.95rem] leading-relaxed text-ink-700">{product.description}</p>}
            <dl className="mt-5 divide-y divide-line/80 text-sm">
              {product.reference && (
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-ink-500">Référence</dt>
                  <dd className="text-right font-medium text-ink">{product.reference}</dd>
                </div>
              )}
              {product.category && (
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="text-ink-500">Catégorie</dt>
                  <dd className="text-right font-medium text-ink">{product.category.name}</dd>
                </div>
              )}
              {product.sizes.length > 0 && (
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-ink-500">Tailles disponibles</dt>
                  <dd className="text-right font-medium text-ink">{product.sizes.join(' · ')}</dd>
                </div>
              )}
              {product.fabric && (
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-ink-500">Composition</dt>
                  <dd className="text-right font-medium text-ink">{product.fabric}</dd>
                </div>
              )}
              {product.care && (
                <div className="flex justify-between gap-4 py-2.5">
                  <dt className="shrink-0 text-ink-500">Entretien</dt>
                  <dd className="text-right font-medium text-ink">{product.care}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 py-2.5">
                <dt className="text-ink-500">Disponibilité</dt>
                <dd className="text-right font-medium text-ink">{stockMeta.label}</dd>
              </div>
            </dl>
            {product.isDemo && (
              <Alert tone="info" className="mt-5">
                Cette fiche est un exemple de démonstration. Les informations réelles (photos, description, prix, tailles) seront saisies par Silima Shop
                avant la mise en ligne.
              </Alert>
            )}
          </div>
        </div>
      </div>

      {/* Produits associés */}
      {data && data.related.length > 0 && (
        <section className="mt-16 border-t border-line pt-10" aria-labelledby="related-title">
          <div className="flex items-end justify-between gap-4">
            <h2 id="related-title" className="text-2xl">
              Dans la même catégorie
            </h2>
            <Link to={`/produits?categorie=${product.category?.slug ?? ''}`} className="text-sm font-medium text-clay-600 link-underline">
              Voir la catégorie
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-4">
            {data.related.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} compact />
            ))}
          </div>
        </section>
      )}

      {/* Barre d'action mobile */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-cream-50/95 px-4 pt-3 backdrop-blur safe-bottom lg:hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.85rem)' }}>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-2xs uppercase tracking-eyebrow text-ink-500">{stockMeta.label}</p>
            <p className="truncate font-display text-[1.05rem] text-ink">{price ?? 'Prix sur demande'}</p>
          </div>
          {orderable ? (
            <WhatsAppCta
              message={message}
              label="Commander"
              icon
              className="shrink-0 [&>a]:px-5 [&>button]:px-5"
              testId="product-sticky-whatsapp"
            />
          ) : enquiryAllowed ? (
            <WhatsAppCta
              message={outOfStockMessage}
              label="Nous informer"
              variant="outline"
              icon={false}
              className="shrink-0 [&>a]:px-5 [&>button]:px-5"
              testId="product-sticky-enquiry"
            />
          ) : (
            <Link to="/produits" className="btn-outline btn-sm shrink-0">
              Catalogue
            </Link>
          )}
        </div>
      </div>

      <span className="sr-only">
        <WhatsAppIcon />
      </span>
      <span className="sr-only">{wholesaleWhatsAppMessage(settings.businessName, product.name, quantity)}</span>
    </div>
  );
}
