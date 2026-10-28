import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { AdminCategory, AdminProduct } from '@shared/types';
import { formatPrice, STOCK_STATE_META } from '@shared/format';
import { productImageFallback, imageVariant, primaryImage } from '@shared/images';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useSettings } from '../lib/settings';
import { AdminPageHeader, Badge, ConfirmDialog, InlineMessage, Toggle } from './components';
import { Alert, Spinner } from '../components/ui';
import { EditIcon, EyeIcon, PlusIcon, SearchIcon, TrashIcon } from '../components/icons';

interface ProductsResponse {
  products: AdminProduct[];
  total: number;
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous les produits' },
  { value: 'active', label: 'Publiés' },
  { value: 'hidden', label: 'Masqués' },
  { value: 'featured', label: 'Mis en avant' },
  { value: 'out', label: 'En rupture / indisponibles' },
  { value: 'demo', label: 'Démonstration' },
];

export function ProductsList() {
  const { settings } = useSettings();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [status, setStatus] = useState(params.get('statut') ?? 'all');
  const [categoryId, setCategoryId] = useState('');
  const [toDelete, setToDelete] = useState<AdminProduct | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const timer = useRef<number | null>(null);

  const saved = params.get('enregistre') === '1';
  const savedName = params.get('nom');

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [search]);

  const query = new URLSearchParams();
  if (debounced) query.set('q', debounced);
  if (status !== 'all') query.set('status', status);
  if (categoryId) query.set('categorie', categoryId);
  const { data, loading, error, reload } = useApi<ProductsResponse>(`/api/admin/products?${query.toString()}`);
  const categories = useApi<{ categories: AdminCategory[] }>('/api/admin/categories');

  const quickToggle = async (product: AdminProduct, patch: { isActive?: boolean; isFeatured?: boolean; isAvailable?: boolean }) => {
    setNotice(null);
    try {
      await adminApi.patch(`/products/${product.id}/status`, patch);
      reload();
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message });
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminApi.del(`/products/${toDelete.id}`);
      setNotice({ tone: 'success', text: `« ${toDelete.name} » a été supprimé.` });
      setToDelete(null);
      reload();
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message });
    } finally {
      setDeleting(false);
    }
  };

  const products = data?.products ?? [];

  return (
    <div>
      <AdminPageHeader
        title="Produits"
        description="Ajoutez vos modèles, gérez les photos, les prix et le stock. Les produits publiés apparaissent immédiatement dans le catalogue."
        actions={
          <Link to="/admin/produits/nouveau" className="btn-primary btn-sm">
            <PlusIcon size={17} />
            Ajouter un produit
          </Link>
        }
      />

      {saved && (
        <div className="mt-5">
          <InlineMessage tone="success">
            {savedName ? `« ${savedName} » a été enregistré.` : 'Produit enregistré.'} Les modifications sont visibles sur le site.
          </InlineMessage>
        </div>
      )}
      {notice && (
        <div className="mt-5">
          <InlineMessage tone={notice.tone}>{notice.text}</InlineMessage>
        </div>
      )}

      <div className="mt-5 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr]">
        <div className="relative">
          <label htmlFor="admin-recherche" className="sr-only">
            Rechercher un produit
          </label>
          <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500/70" />
          <input
            id="admin-recherche"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom ou référence"
            className="field-input py-2.5 pl-11"
          />
        </div>
        <div>
          <label htmlFor="admin-statut" className="sr-only">
            Filtrer par statut
          </label>
          <select id="admin-statut" value={status} onChange={(e) => setStatus(e.target.value)} className="field-input py-2.5">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-categorie" className="sr-only">
            Filtrer par catégorie
          </label>
          <select id="admin-categorie" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="field-input py-2.5">
            <option value="">Toutes les catégories</option>
            {(categories.data?.categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-500" role="status" aria-live="polite">
        {loading ? 'Chargement…' : `${data?.total ?? 0} produit(s)`}
      </p>

      {error ? (
        <Alert tone="error" className="mt-4">
          {error}{' '}
          <button type="button" onClick={reload} className="font-semibold underline">
            Réessayer
          </button>
        </Alert>
      ) : loading ? (
        <div className="mt-8 flex items-center gap-3 text-ink-500">
          <Spinner /> Chargement des produits…
        </div>
      ) : products.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line bg-white/60 p-10 text-center">
          <h2 className="text-lg">Aucun produit</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-500">
            {debounced || status !== 'all' || categoryId
              ? 'Aucun produit ne correspond à ces filtres.'
              : 'Commencez par ajouter votre premier produit : il apparaîtra dans le catalogue public dès qu’il sera publié.'}
          </p>
          <Link to="/admin/produits/nouveau" className="btn-primary mt-5">
            <PlusIcon size={17} />
            Ajouter un produit
          </Link>
        </div>
      ) : (
        <>
          {/* Version mobile */}
          <ul className="mt-4 space-y-3 lg:hidden">
            {products.map((product) => {
              const image = primaryImage(product.images);
              const price = formatPrice(product.price, settings.currency);
              return (
                <li key={product.id} className="rounded-2xl border border-line bg-white p-4">
                  <div className="flex gap-3">
                    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-cream-200">
                      {image ? (
                        <img onError={productImageFallback} src={imageVariant(image.path, 480)} alt="" className="h-full w-full object-cover" width={64} height={80} />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[0.6rem] text-ink-500">Sans photo</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={product.isActive ? 'ok' : 'neutral'}>{product.isActive ? 'Publié' : 'Masqué'}</Badge>
                        {product.isFeatured && <Badge tone="dark">En avant</Badge>}
                        {product.isDemo && <Badge tone="warn">Démo</Badge>}
                      </div>
                      <h2 className="mt-1.5 truncate font-medium text-ink">{product.name}</h2>
                      <p className="text-xs text-ink-500">
                        {product.category?.name ?? 'Sans catégorie'} {product.reference ? `· ${product.reference}` : ''}
                      </p>
                      <p className="mt-1 text-sm font-medium text-ink">{price ?? 'Prix sur demande'}</p>
                      <p className="text-xs text-ink-500">
                        {product.trackStock ? `${product.stockQty ?? 0} en stock` : 'Stock non suivi'} · {STOCK_STATE_META[product.stockState].label}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link to={`/admin/produits/${product.id}`} className="btn-outline btn-sm flex-1">
                      Modifier
                    </Link>
                    <a href={`/produits/${product.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm" aria-label={`Voir ${product.name} sur le site`}>
                      <EyeIcon size={17} />
                    </a>
                    <button type="button" onClick={() => setToDelete(product)} className="btn-ghost btn-sm text-red-700" aria-label={`Supprimer ${product.name}`}>
                      <TrashIcon size={17} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Version tableau */}
          <div className="mt-4 hidden overflow-hidden rounded-2xl border border-line bg-white lg:block">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Liste des produits</caption>
              <thead className="border-b border-line bg-cream-50 text-2xs uppercase tracking-eyebrow text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Produit</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Catégorie</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Prix</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Stock</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Visibilité</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {products.map((product) => {
                  const image = primaryImage(product.images);
                  const price = formatPrice(product.price, settings.currency);
                  return (
                    <tr key={product.id} className="align-middle">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-14 w-11 shrink-0 overflow-hidden rounded-md bg-cream-200">
                            {image ? <img onError={productImageFallback} src={imageVariant(image.path, 480)} alt="" className="h-full w-full object-cover" width={44} height={56} /> : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{product.name}</p>
                            <p className="text-xs text-ink-500">{product.reference ?? 'Sans référence'}</p>
                            <div className="mt-1 flex gap-1.5">
                              {product.isFeatured && <Badge tone="dark">En avant</Badge>}
                              {product.isDemo && <Badge tone="warn">Démo</Badge>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-700">{product.category?.name ?? '—'}</td>
                      <td className="px-4 py-3 text-ink-700">{price ?? 'Sur demande'}</td>
                      <td className="px-4 py-3">
                        <p className="text-ink-700">{product.trackStock ? `${product.stockQty ?? 0} unités` : 'Non suivi'}</p>
                        <p className="mt-0.5 text-xs text-ink-500">{STOCK_STATE_META[product.stockState].label}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <Toggle
                            checked={product.isActive}
                            onChange={(value) => void quickToggle(product, { isActive: value })}
                            label={product.isActive ? 'Publié' : 'Masqué'}
                          />
                          <Toggle
                            checked={product.isAvailable}
                            onChange={(value) => void quickToggle(product, { isAvailable: value })}
                            label={product.isAvailable ? 'Commandable' : 'Indisponible'}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/admin/produits/${product.id}`} className="btn-ghost btn-sm" aria-label={`Modifier ${product.name}`}>
                            <EditIcon size={17} />
                          </Link>
                          <a
                            href={`/produits/${product.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-ghost btn-sm"
                            aria-label={`Voir ${product.name} sur le site`}
                          >
                            <EyeIcon size={17} />
                          </a>
                          <button
                            type="button"
                            onClick={() => setToDelete(product)}
                            className="btn-ghost btn-sm text-red-700 hover:bg-red-50"
                            aria-label={`Supprimer ${product.name}`}
                          >
                            <TrashIcon size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer ce produit ?"
        message={
          <>
            « <strong>{toDelete?.name}</strong> » sera définitivement supprimé, ainsi que ses photos. Cette action est irréversible.
          </>
        }
        confirmLabel="Supprimer définitivement"
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
