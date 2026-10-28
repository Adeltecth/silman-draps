import { Link } from 'react-router-dom';
import type { PublicCategory, PublicProduct } from '@shared/types';
import { generalWhatsAppMessage, wholesaleWhatsAppMessage } from '@shared/whatsapp';
import { primaryImage, imageVariant } from '@shared/images';
import { useApi } from '../lib/useApi';
import { useSeo } from '../lib/seo';
import { useSettings } from '../lib/settings';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { WhatsAppCta, WhatsAppNote } from '../components/whatsapp';
import { Alert, EmptyState, Reveal, SectionHeading } from '../components/ui';
import { ArrowRightIcon, CheckIcon, MailIcon, MapPinIcon, PackageIcon, PhoneIcon, SparkleIcon, StoreIcon } from '../components/icons';

interface HomeData {
  featured: PublicProduct[];
  latest: PublicProduct[];
  categories: PublicCategory[];
  totalProducts: number;
}

export function HomePage() {
  const { settings } = useSettings();
  const { data, loading, error, reload } = useApi<HomeData>('/api/public/home');

  useSeo(
    `Draps Jimmy à Abidjan | ${settings.businessName} — vente au détail et en gros`,
    settings.seoDefaultDescription ||
      `${settings.businessName} : draps de lit Jimmy, housses de couette et rideaux à Adjamé, Abidjan. Vente au détail et en gros, renseignements sur WhatsApp.`
  );

  const featured = data?.featured?.length ? data.featured : (data?.latest ?? []);
  const heroProduct = featured[0] ?? null;
  const heroImage = heroProduct ? primaryImage(heroProduct.images) : null;

  return (
    <>
      {/* ---------------------------------------------------------------- Héros */}
      <section className="container-page pb-10 pt-6 sm:pb-16 sm:pt-10" aria-labelledby="hero-title">
        <div className="grid items-center gap-10 lg:grid-cols-[1.02fr_1fr] lg:gap-14">
          <div className="max-w-xl">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-2 text-2xs font-semibold uppercase tracking-eyebrow text-clay-600">
              <span>{settings.location || 'Adjamé · Abidjan'}</span>
              <span aria-hidden="true" className="h-1 w-1 rounded-full bg-clay-400" />
              <span>Vente au détail & en gros</span>
            </p>
            <h1 id="hero-title" className="mt-5 text-[2.35rem] leading-[1.06] sm:text-[3.1rem] lg:text-[3.5rem]">
              {settings.heroTitle}
            </h1>
            <p className="mt-5 max-w-lg text-[1.02rem] leading-relaxed text-ink-500 sm:text-lg">{settings.heroSubtitle}</p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/produits" className="btn-primary w-full sm:w-auto">
                Découvrir nos produits
                <ArrowRightIcon size={18} />
              </Link>
              <Link to="/gros" className="btn-outline w-full sm:w-auto">
                <StoreIcon size={18} />
                Acheter en gros
              </Link>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
              <li className="flex items-center gap-2">
                <CheckIcon size={16} className="text-moss-500" /> Parures Jimmy
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon size={16} className="text-moss-500" /> Prix et stock confirmés sur WhatsApp
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon size={16} className="text-moss-500" /> Particuliers et revendeurs
              </li>
            </ul>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[1.75rem] border border-line bg-cream-200 shadow-soft">
              {heroImage ? (
                <img
                  src={imageVariant(heroImage.path, 960)}
                  srcSet={`${imageVariant(heroImage.path, 960)} 960w, ${imageVariant(heroImage.path, 1600)} 1600w`}
                  sizes="(min-width: 1024px) 44vw, 100vw"
                  alt={heroImage.alt || `${heroProduct?.name} — parure de lit Jimmy`}
                  width={1200}
                  height={1400}
                  fetchPriority="high"
                  className="aspect-[4/5] w-full object-cover sm:aspect-[5/5] lg:aspect-[4/5]"
                />
              ) : (
                <img
                  src="/images/hero-bed.webp"
                  srcSet="/images/hero-bed-800.webp 800w, /images/hero-bed.webp 1600w"
                  sizes="(min-width: 1024px) 44vw, 100vw"
                  alt="Lit préparé avec une parure de draps claire dans une chambre lumineuse"
                  width={1200}
                  height={1500}
                  fetchPriority="high"
                  className="aspect-[4/5] w-full object-cover"
                />
              )}
            </div>

            {heroProduct ? (
              <Link
                to={`/produits/${heroProduct.slug}`}
                className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl border border-line/80 bg-cream-50/95 px-4 py-3 shadow-soft backdrop-blur transition-colors hover:bg-cream-50 sm:left-5 sm:right-auto sm:bottom-5 sm:min-w-[16rem]"
              >
                <span className="min-w-0">
                  <span className="block text-2xs font-semibold uppercase tracking-eyebrow text-ink-500">À la une</span>
                  <span className="mt-0.5 block truncate font-display text-[0.98rem] text-ink">{heroProduct.name}</span>
                </span>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-cream-50">
                  <ArrowRightIcon size={16} />
                </span>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- Catégories */}
      {data && data.categories.length > 0 && (
        <section className="border-y border-line bg-cream-50/70" aria-labelledby="categories-title">
          <div className="container-page py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 id="categories-title" className="text-sm font-semibold uppercase tracking-eyebrow text-ink-500">
                Nos catégories
              </h2>
              <Link to="/produits" className="text-sm font-medium text-clay-600 link-underline">
                Voir tout le catalogue
              </Link>
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {data.categories.map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/produits?categorie=${cat.slug}`}
                    className="flex h-full items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3.5 transition-colors hover:border-clay-400/60 hover:bg-cream-50"
                  >
                    <span className="text-sm font-medium text-ink">{cat.name}</span>
                    <span className="text-xs text-ink-500">{cat.productCount}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ---------------------------------------------------- Produits en avant */}
      <section className="container-page py-14 sm:py-20" aria-labelledby="featured-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            eyebrow="Sélection"
            title={<span id="featured-title">Quelques parures à découvrir</span>}
            description="Les modèles mis en avant par la boutique. Chaque fiche indique le prix lorsqu’il est renseigné et la disponibilité réelle."
          />
          <Link to="/produits" className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-clay-600 link-underline sm:flex">
            Tout le catalogue
            <ArrowRightIcon size={16} />
          </Link>
        </div>

        {error ? (
          <Alert tone="error" className="mt-8">
            Le catalogue n’a pas pu être chargé. {error}{' '}
            <button type="button" className="font-semibold underline" onClick={reload}>
              Réessayer
            </button>
          </Alert>
        ) : loading ? (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : featured.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Le catalogue arrive bientôt"
              description="Les produits seront publiés ici dès qu’ils seront ajoutés par la boutique. Vous pouvez déjà nous écrire pour connaître les modèles disponibles."
              action={
                <WhatsAppCta
                  message={generalWhatsAppMessage(settings.businessName)}
                  label="Demander les modèles disponibles"
                  testId="home-empty-whatsapp"
                />
              }
            />
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-4">
            {featured.slice(0, 4).map((product, index) => (
              <ProductCard key={product.id} product={product} priority={index === 0} compact />
            ))}
          </div>
        )}

        <div className="mt-8 sm:hidden">
          <Link to="/produits" className="btn-outline w-full">
            Voir tout le catalogue
            <ArrowRightIcon size={18} />
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------------- Commander */}
      <section className="border-y border-line bg-cream-50/70 py-14 sm:py-20" aria-labelledby="order-title">
        <div className="container-page grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
          <SectionHeading
            eyebrow="Simple et direct"
            title={<span id="order-title">Comment commander</span>}
            description="Pas de panier compliqué : vous choisissez un modèle, vous nous écrivez, nous confirmons ensemble."
          />
          <ol className="grid gap-4 sm:grid-cols-3 sm:gap-5">
            {[
              {
                title: 'Choisissez un modèle',
                text: 'Parcourez le catalogue et ouvrez la fiche du produit qui vous intéresse.',
              },
              {
                title: 'Écrivez-nous',
                text: 'Le bouton WhatsApp ouvre un message déjà rédigé avec le produit, la référence et la quantité.',
              },
              {
                title: 'Nous confirmons',
                text: 'Nous vérifions le prix, la disponibilité et les modalités, puis vous validons ensemble.',
              },
            ].map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-line bg-white p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-50 font-display text-sm text-clay-600">{i + 1}</span>
                <h3 className="mt-3 text-[1.02rem] font-medium">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
        <div className="container-page mt-8">
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <SparkleIcon size={20} className="mt-0.5 shrink-0 text-gold-500" />
              <p className="text-sm leading-relaxed text-ink-700">
                Une question sur un modèle précis ? Écrivez-nous directement, nous vous répondons avec les informations disponibles.
              </p>
            </div>
            <WhatsAppCta message={generalWhatsAppMessage(settings.businessName)} label="Commander sur WhatsApp" variant="whatsapp" className="w-full shrink-0 sm:w-auto [&>a]:w-full" testId="home-order-whatsapp" />
          </div>
          <WhatsAppNote className="mt-3 max-w-3xl" />
        </div>
      </section>

      {/* ------------------------------------------------------------- En gros */}
      <section className="container-page py-14 sm:py-20" aria-labelledby="wholesale-title">
        <div className="overflow-hidden rounded-[1.75rem] bg-ink text-cream-100">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
            <div className="p-7 sm:p-10 lg:p-12">
              <p className="text-2xs font-semibold uppercase tracking-eyebrow text-gold-400">Commerçants & revendeurs</p>
              <h2 id="wholesale-title" className="mt-4 text-cream-50 text-[1.9rem] leading-[1.12] sm:text-4xl">
                Vous êtes commerçant ou revendeur ?
              </h2>
              <p className="mt-4 max-w-md text-[0.98rem] leading-relaxed text-cream-200/80">
                Silima Shop accompagne aussi les boutiques, marchés et revendeurs. Indiquez-nous les références qui vous intéressent et les quantités
                envisagées : nous revenons vers vous avec les conditions de gros.
              </p>
              <ul className="mt-6 space-y-2.5 text-sm text-cream-200/85">
                {['Prix de gros communiqués sur demande', 'Quantités minimums précisées au cas par cas', 'Disponibilité confirmée avant tout engagement'].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <CheckIcon size={16} className="mt-0.5 shrink-0 text-gold-400" />
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/gros" className="btn bg-cream-50 text-ink hover:bg-cream-100 w-full sm:w-auto">
                  Acheter en gros
                  <ArrowRightIcon size={18} />
                </Link>
                <WhatsAppCta
                  message={wholesaleWhatsAppMessage(settings.businessName)}
                  label="Écrire pour le gros"
                  variant="ghost"
                  className="w-full text-cream-100 hover:bg-white/10 sm:w-auto [&>a]:border [&>a]:border-cream-100/25 [&>a]:text-cream-100"
                  testId="home-wholesale-whatsapp"
                />
              </div>
            </div>
            <div className="relative min-h-[280px] lg:min-h-full">
              <img
                src="/images/wholesale-folded-800.webp"
                srcSet="/images/wholesale-folded-800.webp 800w, /images/wholesale-folded.webp 1600w"
                sizes="(min-width: 1024px) 45vw, 100vw"
                alt="Pile de draps pliés préparés pour la vente"
                loading="lazy"
                width={1200}
                height={900}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- Contact */}
      <section className="container-page pb-4 sm:pb-8" aria-labelledby="contact-title">
        <div className="grid gap-8 rounded-[1.75rem] border border-line bg-white p-7 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <SectionHeading
              eyebrow="Restons en contact"
              title={<span id="contact-title">Une question avant de commander ?</span>}
              description="WhatsApp reste le moyen le plus rapide de nous joindre. Vous pouvez aussi nous appeler ou passer par le formulaire de contact."
            />
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <WhatsAppCta message={generalWhatsAppMessage(settings.businessName)} label="Commander sur WhatsApp" testId="home-contact-whatsapp" className="w-full sm:w-auto [&>a]:w-full" />
              <Link to="/contact" className="btn-outline w-full sm:w-auto">
                Voir la page contact
              </Link>
            </div>
          </div>
          <ul className="space-y-3 text-sm">
            {settings.phone ? (
              <li>
                <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="flex items-center gap-3 rounded-xl border border-line bg-cream-50 px-4 py-3 transition-colors hover:border-clay-400/60">
                  <PhoneIcon size={18} className="text-clay-600" />
                  <span className="font-medium text-ink">{settings.phone}</span>
                </a>
              </li>
            ) : null}
            {settings.email ? (
              <li>
                <a href={`mailto:${settings.email}`} className="flex items-center gap-3 rounded-xl border border-line bg-cream-50 px-4 py-3 transition-colors hover:border-clay-400/60">
                  <MailIcon size={18} className="text-clay-600" />
                  <span className="break-all font-medium text-ink">{settings.email}</span>
                </a>
              </li>
            ) : null}
            {settings.location ? (
              <li className="flex items-center gap-3 rounded-xl border border-line bg-cream-50 px-4 py-3">
                <MapPinIcon size={18} className="text-clay-600" />
                <span className="text-ink-700">{settings.location}</span>
              </li>
            ) : null}
            {!settings.phone && !settings.email && !settings.location && (
              <li className="flex items-center gap-3 rounded-xl border border-dashed border-line px-4 py-3 text-ink-500">
                <PackageIcon size={18} className="text-ink-500/60" />
                Les coordonnées seront affichées dès qu’elles seront confirmées.
              </li>
            )}
          </ul>
        </div>
      </section>
    </>
  );
}
