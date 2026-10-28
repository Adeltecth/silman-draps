import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ProductListResponse } from '@shared/types';
import { generalWhatsAppMessage } from '@shared/whatsapp';
import { useApi } from '../lib/useApi';
import { useSeo } from '../lib/seo';
import { useSettings } from '../lib/settings';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { WhatsAppCta } from '../components/whatsapp';
import { Alert, Breadcrumbs, EmptyState, SectionHeading } from '../components/ui';
import { CloseIcon, SearchIcon } from '../components/icons';

const SORTS = [
  { value: 'recent', label: 'Plus récents' },
  { value: 'name', label: 'Nom (A–Z)' },
  { value: 'price-asc', label: 'Prix croissant' },
  { value: 'price-desc', label: 'Prix décroissant' },
];

export function CataloguePage() {
  const { settings } = useSettings();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const categorie = params.get('categorie') ?? '';
  const tri = params.get('tri') ?? 'recent';

  const [searchValue, setSearchValue] = useState(q);
  const debounceRef = useRef<number | null>(null);

  useSeo(
    `Nos produits — draps, housses de couette et rideaux | ${settings.businessName}`,
    `Catalogue ${settings.businessName} : draps de lit Jimmy, housses de couette et rideaux à Abidjan. Prix et disponibilité confirmés sur WhatsApp.`
  );

  // Synchronise le champ de recherche avec l'URL (retour arrière, lien partagé).
  useEffect(() => setSearchValue(q), [q]);

  const queryPath = useMemo(() => {
    const search = new URLSearchParams();
    if (q) search.set('q', q);
    if (categorie) search.set('categorie', categorie);
    if (tri) search.set('tri', tri);
    const suffix = search.toString();
    return `/api/public/products${suffix ? `?${suffix}` : ''}`;
  }, [q, categorie, tri]);

  const { data, loading, error, reload } = useApi<ProductListResponse>(queryPath);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const onSearchChange = (value: string) => {
    setSearchValue(value);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => updateParam('q', value.trim()), 320);
  };

  const clearFilters = () => setParams(new URLSearchParams(), { replace: true });

  const activeCategory = data?.categories.find((c) => c.slug === categorie);
  const filtersActive = Boolean(q || categorie || (tri && tri !== 'recent'));
  const total = data?.total ?? 0;

  return (
    <div className="container-page pb-16 pt-6 sm:pt-10">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Nos produits' }]} />

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <SectionHeading
          eyebrow="Catalogue"
          title={activeCategory ? activeCategory.name : 'Nos produits'}
          description={
            activeCategory?.description ||
            'Draps de lit, housses de couette et rideaux disponibles chez Silima Shop. Les prix affichés et la disponibilité proviennent directement des informations de la boutique.'
          }
          as="h1"
        />
        <div className="shrink-0">
          <WhatsAppCta
            message={generalWhatsAppMessage(settings.businessName)}
            label="Poser une question"
            variant="outline"
            size="sm"
            testId="catalogue-whatsapp"
          />
        </div>
      </div>

      {/* Recherche et filtres */}
      <div className="mt-8 rounded-2xl border border-line bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <label htmlFor="recherche-produits" className="sr-only">
              Rechercher un produit
            </label>
            <SearchIcon size={19} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500/70" />
            <input
              id="recherche-produits"
              type="search"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Rechercher un modèle, une référence…"
              className="field-input py-3 pl-11 pr-10"
              autoComplete="off"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  updateParam('q', '');
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-ink-500 hover:bg-ink/5 hover:text-ink"
                aria-label="Effacer la recherche"
              >
                <CloseIcon size={16} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="tri-produits" className="shrink-0 text-sm text-ink-500">
              Trier par
            </label>
            <select
              id="tri-produits"
              value={SORTS.some((s) => s.value === tri) ? tri : 'recent'}
              onChange={(e) => updateParam('tri', e.target.value === 'recent' ? '' : e.target.value)}
              className="field-input w-full min-w-[10rem] py-2.5 text-sm lg:w-auto"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/70 pt-4">
          <button
            type="button"
            onClick={() => updateParam('categorie', '')}
            aria-pressed={!categorie}
            className={`chip transition-colors ${!categorie ? 'border-ink bg-ink text-cream-50' : 'border-line bg-cream-50 text-ink-700 hover:border-ink/30'}`}
          >
            Toutes
            {data && <span className={!categorie ? 'text-cream-200/80' : 'text-ink-500'}>{data.total}</span>}
          </button>
          {(data?.categories ?? []).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateParam('categorie', cat.slug)}
              aria-pressed={categorie === cat.slug}
              className={`chip transition-colors ${
                categorie === cat.slug ? 'border-ink bg-ink text-cream-50' : 'border-line bg-cream-50 text-ink-700 hover:border-ink/30'
              }`}
            >
              {cat.name}
              <span className={categorie === cat.slug ? 'text-cream-200/80' : 'text-ink-500'}>{cat.productCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Résultats */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-500" role="status" aria-live="polite">
          {loading ? 'Chargement des produits…' : `${total} produit${total > 1 ? 's' : ''}${q ? ` pour « ${q} »` : ''}`}
        </p>
        {filtersActive && (
          <button type="button" onClick={clearFilters} className="text-sm font-medium text-clay-600 link-underline">
            Réinitialiser les filtres
          </button>
        )}
      </div>

      {error ? (
        <Alert tone="error" className="mt-5">
          {error}{' '}
          <button type="button" onClick={reload} className="font-semibold underline">
            Réessayer
          </button>
        </Alert>
      ) : loading ? (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="mt-6">
          <EmptyState
            title={filtersActive ? 'Aucun produit ne correspond à votre recherche' : 'Le catalogue est vide pour le moment'}
            description={
              filtersActive
                ? 'Essayez un autre mot-clé ou parcourez toutes les catégories. Vous pouvez aussi nous écrire : il est possible que d’autres modèles soient disponibles en boutique.'
                : 'Les produits seront publiés ici dès qu’ils seront ajoutés. En attendant, contactez Silima Shop pour connaître les modèles disponibles.'
            }
            action={
              <>
                {filtersActive && (
                  <button type="button" onClick={clearFilters} className="btn-outline">
                    Voir tout le catalogue
                  </button>
                )}
                <WhatsAppCta
                  message={generalWhatsAppMessage(settings.businessName)}
                  label="Demander les modèles disponibles"
                  testId="catalogue-empty-whatsapp"
                />
              </>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
          {data!.products.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 2} compact />
          ))}
        </div>
      )}

      <div className="mt-12 rounded-2xl border border-line bg-cream-50 p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <h2 className="text-lg">Vous cherchez un modèle précis ?</h2>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-500">
            Le catalogue en ligne ne montre que les articles publiés par la boutique. Écrivez-nous pour connaître les arrivages et les modèles disponibles en
            magasin.
          </p>
        </div>
        <div className="mt-4 shrink-0 sm:mt-0">
          <WhatsAppCta message={generalWhatsAppMessage(settings.businessName)} label="Écrire sur WhatsApp" testId="catalogue-footer-whatsapp" />
        </div>
      </div>

      <p className="mt-6 text-sm text-ink-500">
        Vous êtes commerçant ?{' '}
        <Link to="/gros" className="font-medium text-clay-600 link-underline">
          Voir les achats en gros
        </Link>
        .
      </p>
    </div>
  );
}
