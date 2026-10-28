import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { AdminCategory, AdminProduct, MediaAsset } from '@shared/types';
import { formatPrice, STOCK_STATE_META } from '@shared/format';
import { productImageFallback, imageVariant } from '@shared/images';
import { computeStockState } from '@shared/stock';
import { adminApi, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useSettings } from '../lib/settings';
import { AdminField, AdminPageHeader, ConfirmDialog, InlineMessage, SaveBar, Toggle } from './components';
import { Alert, Field, Modal, Spinner } from '../components/ui';
import { CloseIcon, ImageIcon, PlusIcon, StarIcon, TrashIcon, UploadIcon } from '../components/icons';

interface FormImage {
  base: string;
  path: string;
  alt: string;
  isPrimary: boolean;
}

interface FormState {
  name: string;
  reference: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  price: string;
  priceNote: string;
  sizes: string[];
  options: { label: string; values: string[] }[];
  fabric: string;
  care: string;
  trackStock: boolean;
  stockQty: string;
  lowStockThreshold: string;
  isAvailable: boolean;
  isFeatured: boolean;
  isActive: boolean;
  allowEnquiryWhenOutOfStock: boolean;
  metaTitle: string;
  metaDescription: string;
  sortOrder: string;
}

const EMPTY: FormState = {
  name: '',
  reference: '',
  categoryId: '',
  shortDescription: '',
  description: '',
  price: '',
  priceNote: '',
  sizes: [],
  options: [],
  fabric: '',
  care: '',
  trackStock: false,
  stockQty: '',
  lowStockThreshold: '',
  isAvailable: true,
  isFeatured: false,
  isActive: true,
  allowEnquiryWhenOutOfStock: true,
  metaTitle: '',
  metaDescription: '',
  sortOrder: '0',
};

export function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { settings } = useSettings();
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(EMPTY);
  const [images, setImages] = useState<FormImage[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sizeDraft, setSizeDraft] = useState('');
  const [isDemoProduct, setIsDemoProduct] = useState(false);
  const [currentSlug, setCurrentSlug] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const categories = useApi<{ categories: AdminCategory[] }>('/api/admin/categories');

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    adminApi
      .get<{ product: AdminProduct }>(`/products/${id}`)
      .then(({ product }) => {
        if (!active) return;
        setForm({
          name: product.name,
          reference: product.reference ?? '',
          categoryId: product.categoryId ? String(product.categoryId) : '',
          shortDescription: product.shortDescription ?? '',
          description: product.description ?? '',
          price: product.price !== null ? String(product.price) : '',
          priceNote: product.priceNote ?? '',
          sizes: product.sizes,
          options: product.options,
          fabric: product.fabric ?? '',
          care: product.care ?? '',
          trackStock: product.trackStock,
          stockQty: product.stockQty !== null ? String(product.stockQty) : '',
          lowStockThreshold: product.lowStockThreshold !== null ? String(product.lowStockThreshold) : '',
          isAvailable: product.isAvailable,
          isFeatured: product.isFeatured,
          isActive: product.isActive,
          allowEnquiryWhenOutOfStock: product.allowEnquiryWhenOutOfStock,
          metaTitle: product.metaTitle ?? '',
          metaDescription: product.metaDescription ?? '',
          sortOrder: String(product.sortOrder ?? 0),
        });
        setImages(
          product.images.map((img) => ({
            base: img.path.replace('/media/', ''),
            path: img.path,
            alt: img.alt ?? '',
            isPrimary: img.isPrimary,
          }))
        );
        setIsDemoProduct(product.isDemo);
        setCurrentSlug(product.slug);
      })
      .catch((err) => active && setLoadError((err as Error).message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setUploadErrors([]);
    setUploading((n) => n + list.length);
    for (const file of list) {
      if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) {
        setUploadErrors((prev) => [...prev, `${file.name} : format non pris en charge (JPG, PNG ou WebP).`]);
        setUploading((n) => Math.max(0, n - 1));
        continue;
      }
      if (file.size > 12 * 1024 * 1024) {
        setUploadErrors((prev) => [...prev, `${file.name} : fichier trop volumineux (12 Mo maximum).`]);
        setUploading((n) => Math.max(0, n - 1));
        continue;
      }
      try {
        const { asset } = await adminApi.upload<{ asset: MediaAsset }>(file);
        setImages((prev) => {
          const next = [
            ...prev,
            { base: asset.path.replace('/media/', ''), path: asset.path, alt: form.name || '', isPrimary: prev.length === 0 },
          ];
          if (next.length > 10) return next.slice(0, 10);
          return next;
        });
      } catch (err) {
        setUploadErrors((prev) => [...prev, `${file.name} : ${(err as Error).message}`]);
      } finally {
        setUploading((n) => Math.max(0, n - 1));
      }
    }
  };

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files) void uploadFiles(event.dataTransfer.files);
  };

  const setPrimary = (index: number) => setImages((prev) => prev.map((img, i) => ({ ...img, isPrimary: i === index })));
  const removeImage = (index: number) =>
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length > 0 && !next.some((i) => i.isPrimary)) next[0].isPrimary = true;
      return next;
    });
  const moveImage = (index: number, direction: -1 | 1) =>
    setImages((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const addSize = () => {
    const value = sizeDraft.trim();
    if (!value) return;
    if (form.sizes.includes(value)) {
      setSizeDraft('');
      return;
    }
    set('sizes', [...form.sizes, value]);
    setSizeDraft('');
  };

  const stockState = useMemo(
    () =>
      computeStockState({
        isAvailable: form.isAvailable,
        trackStock: form.trackStock,
        stockQty: form.trackStock ? Number(form.stockQty || 0) : null,
        lowStockThreshold: form.lowStockThreshold ? Number(form.lowStockThreshold) : null,
        globalThreshold: settings.lowStockThreshold,
      }),
    [form.isAvailable, form.trackStock, form.stockQty, form.lowStockThreshold, settings.lowStockThreshold]
  );

  const pricePreview = formatPrice(form.price ? Number(form.price) : null, settings.currency);
  const categoryName = categories.data?.categories.find((c) => String(c.id) === form.categoryId)?.name ?? 'Sans catégorie';
  const primary = images.find((i) => i.isPrimary) ?? images[0];

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Le nom du produit est obligatoire.';
    if (form.price !== '' && (!Number.isFinite(Number(form.price)) || Number(form.price) < 0)) next.price = 'Indiquez un prix valide en chiffres, ou laissez vide.';
    if (form.trackStock) {
      if (form.stockQty === '' || !Number.isFinite(Number(form.stockQty)) || Number(form.stockQty) < 0) next.stockQty = 'Indiquez la quantité en stock (0 si rupture).';
      if (form.lowStockThreshold !== '' && (!Number.isFinite(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0))
        next.lowStockThreshold = 'Seuil invalide.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setGlobalError(null);
    if (!validate()) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.focus();
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        reference: form.reference || undefined,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        shortDescription: form.shortDescription || undefined,
        description: form.description || undefined,
        price: form.price === '' ? null : Number(form.price),
        priceNote: form.priceNote || undefined,
        sizes: form.sizes,
        options: form.options,
        fabric: form.fabric || undefined,
        care: form.care || undefined,
        trackStock: form.trackStock,
        stockQty: form.trackStock ? Number(form.stockQty || 0) : null,
        lowStockThreshold: form.trackStock && form.lowStockThreshold !== '' ? Number(form.lowStockThreshold) : null,
        isAvailable: form.isAvailable,
        isFeatured: form.isFeatured,
        isActive: form.isActive,
        allowEnquiryWhenOutOfStock: form.allowEnquiryWhenOutOfStock,
        metaTitle: form.metaTitle || undefined,
        metaDescription: form.metaDescription || undefined,
        sortOrder: Number(form.sortOrder || 0),
        images: images.map((img, index) => ({ path: img.path, alt: img.alt || undefined, isPrimary: img.isPrimary, sortOrder: index })),
      };
      if (isEdit) await adminApi.put(`/products/${id}`, payload);
      else await adminApi.post('/products', payload);
      navigate(`/admin/produits?enregistre=1&nom=${encodeURIComponent(form.name)}`);
    } catch (err) {
      if (err instanceof ApiError) {
        if (Object.keys(err.fields).length > 0) setErrors(err.fields);
        setGlobalError(err.message);
      } else {
        setGlobalError('Le produit n’a pas pu être enregistré. Vérifiez votre connexion puis réessayez.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    setDeleting(true);
    try {
      await adminApi.del(`/products/${id}`);
      navigate('/admin/produits');
    } catch (err) {
      setGlobalError((err as Error).message);
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-16 text-ink-500">
        <Spinner /> Chargement du produit…
      </div>
    );
  }

  if (loadError) {
    return (
      <div>
        <AdminPageHeader title="Produit" />
        <Alert tone="error" className="mt-6">
          {loadError} <Link to="/admin/produits" className="font-semibold underline">Retour à la liste</Link>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title={isEdit ? 'Modifier le produit' : 'Ajouter un produit'}
        description={
          isEdit
            ? 'Les modifications sont appliquées immédiatement sur le site si le produit est publié.'
            : 'Renseignez les informations, ajoutez des photos puis enregistrez. Le produit apparaîtra dans le catalogue dès qu’il sera publié.'
        }
        actions={
          <Link to="/admin/produits" className="btn-ghost btn-sm">
            Retour à la liste
          </Link>
        }
      />

      {isDemoProduct && (
        <div className="mt-5">
          <InlineMessage tone="info">
            Ce produit est un exemple de démonstration. Remplacez son contenu par les informations réelles, ou supprimez-le avant l’ouverture de la boutique.
          </InlineMessage>
        </div>
      )}

      {globalError && (
        <div className="mt-5">
          <InlineMessage tone="error">{globalError}</InlineMessage>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <h2 className="text-lg">Informations principales</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <AdminField label="Nom du produit" htmlFor="product-name" required error={errors.name}>
                <input
                  id="product-name"
                  name="name"
                  className="field-input"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  aria-invalid={!!errors.name}
                  placeholder="Ex. Parure Jimmy 2 places"
                  required
                />
              </AdminField>
              <AdminField label="Référence / SKU" htmlFor="product-reference" hint="Facultatif, mais utile pour vos échanges WhatsApp.">
                <input id="product-reference" name="reference" className="field-input" value={form.reference} onChange={(e) => set('reference', e.target.value)} placeholder="Ex. JM-140" />
              </AdminField>
              <AdminField label="Catégorie" htmlFor="product-category">
                <select id="product-category" name="categoryId" className="field-input" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                  <option value="">Sans catégorie</option>
                  {(categories.data?.categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.isActive ? '' : ' (masquée)'}
                    </option>
                  ))}
                </select>
              </AdminField>
              <AdminField label="Ordre d’affichage" htmlFor="product-sort" hint="Les petits nombres passent en premier.">
                <input id="product-sort" name="sortOrder" type="number" min={0} className="field-input" value={form.sortOrder} onChange={(e) => set('sortOrder', e.target.value)} />
              </AdminField>
              <AdminField label="Description courte" htmlFor="product-short" hint="Affichée dans la liste et les aperçus." >
                <textarea id="product-short" name="shortDescription" rows={2} className="field-input resize-y" value={form.shortDescription} onChange={(e) => set('shortDescription', e.target.value)} />
              </AdminField>
              <AdminField label="Description complète" htmlFor="product-description" hint="Dimensions, contenu de la parure, conseils d’entretien…">
                <textarea id="product-description" name="description" rows={6} className="field-input resize-y" value={form.description} onChange={(e) => set('description', e.target.value)} />
              </AdminField>
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg">Photos</h2>
                <p className="mt-1 text-sm text-ink-500">Ajoutez jusqu’à 10 photos. La première ou celle marquée « principale » s’affiche en premier.</p>
              </div>
              <span className="shrink-0 text-xs text-ink-500">{images.length}/10</span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`mt-4 rounded-xl border-2 border-dashed p-5 text-center transition-colors ${dragging ? 'border-clay-400 bg-clay-50/50' : 'border-line bg-cream-50'}`}
            >
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                multiple
                className="sr-only"
                id="product-images"
                onChange={(e) => {
                  if (e.target.files) void uploadFiles(e.target.files);
                  e.target.value = '';
                }}
              />
              <UploadIcon size={22} className="mx-auto text-clay-600" />
              <p className="mt-2 text-sm font-medium text-ink">Glissez vos photos ici</p>
              <p className="mt-1 text-xs text-ink-500">JPG, PNG ou WebP · 12 Mo maximum par photo</p>
              <button
                type="button"
                className="btn-outline btn-sm mt-3"
                onClick={() => fileInput.current?.click()}
                disabled={images.length >= 10 || uploading > 0}
              >
                {uploading > 0 ? <Spinner size={16} /> : <ImageIcon size={17} />}
                {uploading > 0 ? 'Envoi en cours…' : 'Choisir des photos'}
              </button>
            </div>

            {uploadErrors.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {uploadErrors.map((message, i) => (
                  <p key={i} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    {message}
                  </p>
                ))}
              </div>
            )}

            {images.length > 0 && (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, index) => (
                  <li key={`${img.base}-${index}`} className="group relative overflow-hidden rounded-xl border border-line bg-cream-100">
                    <img onError={productImageFallback} src={imageVariant(img.path, 480)} alt="" className="aspect-[4/5] w-full object-cover" width={160} height={200} />
                    {img.isPrimary && (
                      <span className="absolute left-2 top-2 rounded-full bg-ink px-2 py-0.5 text-[0.625rem] font-medium text-cream-50">Principale</span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-ink/75 p-1.5">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => moveImage(index, -1)} disabled={index === 0} className="rounded p-1 text-cream-100 hover:bg-white/20 disabled:opacity-30" aria-label="Déplacer à gauche">
                          ←
                        </button>
                        <button type="button" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} className="rounded p-1 text-cream-100 hover:bg-white/20 disabled:opacity-30" aria-label="Déplacer à droite">
                          →
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => setPrimary(index)}
                          disabled={img.isPrimary}
                          className="rounded p-1 text-cream-100 hover:bg-white/20 disabled:opacity-40"
                          aria-label="Définir comme photo principale"
                        >
                          <StarIcon size={15} />
                        </button>
                        <button type="button" onClick={() => removeImage(index)} className="rounded p-1 text-cream-100 hover:bg-red-500/70" aria-label="Retirer cette photo">
                          <CloseIcon size={15} />
                        </button>
                      </div>
                    </div>
                    <label className="sr-only" htmlFor={`alt-${index}`}>
                      Texte alternatif de la photo {index + 1}
                    </label>
                    <input
                      id={`alt-${index}`}
                      value={img.alt}
                      onChange={(e) => setImages((prev) => prev.map((item, i) => (i === index ? { ...item, alt: e.target.value } : item)))}
                      placeholder="Description de la photo"
                      className="w-full border-t border-line px-2.5 py-2 text-xs focus:bg-white focus:outline-none"
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <h2 className="text-lg">Prix et options</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <AdminField label={`Prix (${settings.currency})`} htmlFor="product-price" error={errors.price} hint="Laissez vide pour afficher « Prix sur demande ».">
                <input
                  id="product-price"
                  name="price"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  className="field-input"
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                  aria-invalid={!!errors.price}
                  placeholder="Ex. 18500"
                />
              </AdminField>
              <AdminField label="Mention de prix" htmlFor="product-pricenote" hint="Ex. « à partir de », « le jeu de 2 ».">
                <input id="product-pricenote" name="priceNote" className="field-input" value={form.priceNote} onChange={(e) => set('priceNote', e.target.value)} />
              </AdminField>
              <AdminField label="Composition du tissu" htmlFor="product-fabric" hint="À ne renseigner que si la composition est confirmée." className="sm:col-span-2">
                <input id="product-fabric" name="fabric" className="field-input" value={form.fabric} onChange={(e) => set('fabric', e.target.value)} placeholder="Ex. 100 % coton" />
              </AdminField>
              <AdminField label="Entretien" htmlFor="product-care" className="sm:col-span-2">
                <input id="product-care" name="care" className="field-input" value={form.care} onChange={(e) => set('care', e.target.value)} placeholder="Ex. lavage à 40 °C" />
              </AdminField>
            </div>

            <div className="mt-5">
              <p className="field-label">Tailles disponibles</p>
              <div className="flex flex-wrap gap-2">
                {form.sizes.map((size) => (
                  <span key={size} className="chip border-line bg-cream-50 text-ink-700">
                    {size}
                    <button type="button" onClick={() => set('sizes', form.sizes.filter((s) => s !== size))} aria-label={`Retirer la taille ${size}`} className="text-ink-500 hover:text-red-700">
                      <CloseIcon size={13} />
                    </button>
                  </span>
                ))}
                {form.sizes.length === 0 && <span className="text-sm text-ink-500">Aucune taille renseignée.</span>}
              </div>
              <div className="mt-2.5 flex gap-2">
                <input
                  value={sizeDraft}
                  onChange={(e) => setSizeDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSize();
                    }
                  }}
                  placeholder="Ex. 2 places (140×190)"
                  className="field-input py-2.5"
                  aria-label="Nouvelle taille"
                />
                <button type="button" onClick={addSize} className="btn-outline btn-sm shrink-0">
                  <PlusIcon size={16} /> Ajouter
                </button>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <p className="field-label mb-0">Autres options</p>
                <button type="button" className="text-sm font-medium text-clay-600 link-underline" onClick={() => set('options', [...form.options, { label: '', values: [] }])}>
                  + Ajouter une option
                </button>
              </div>
              <p className="field-help">Ex. « Couleur » avec les valeurs « blanc, sable, bleu ».</p>
              <div className="mt-2 space-y-3">
                {form.options.map((option, index) => (
                  <div key={index} className="grid grid-cols-[1fr_1.4fr_auto] items-end gap-2">
                    <div>
                      <label className="sr-only" htmlFor={`opt-label-${index}`}>
                        Nom de l’option {index + 1}
                      </label>
                      <input
                        id={`opt-label-${index}`}
                        value={option.label}
                        onChange={(e) => set('options', form.options.map((o, i) => (i === index ? { ...o, label: e.target.value } : o)))}
                        placeholder="Nom (ex. Couleur)"
                        className="field-input py-2.5"
                      />
                    </div>
                    <div>
                      <label className="sr-only" htmlFor={`opt-values-${index}`}>
                        Valeurs de l’option {index + 1}
                      </label>
                      <input
                        id={`opt-values-${index}`}
                        value={option.values.join(', ')}
                        onChange={(e) =>
                          set(
                            'options',
                            form.options.map((o, i) =>
                              i === index ? { ...o, values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) } : o
                            )
                          )
                        }
                        placeholder="Valeurs séparées par des virgules"
                        className="field-input py-2.5"
                      />
                    </div>
                    <button type="button" onClick={() => set('options', form.options.filter((_, i) => i !== index))} className="btn-ghost btn-sm text-red-700" aria-label="Supprimer cette option">
                      <TrashIcon size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <h2 className="text-lg">Stock et disponibilité</h2>
            <div className="mt-4 space-y-4">
              <Toggle
                checked={form.trackStock}
                onChange={(value) => set('trackStock', value)}
                label="Suivre le stock de ce produit"
                description="Si désactivé, la disponibilité dépend uniquement du statut ci-dessous."
              />
              {form.trackStock && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <AdminField label="Quantité en stock" htmlFor="product-stock" error={errors.stockQty} required>
                    <input
                      id="product-stock"
                      name="stockQty"
                      type="number"
                      min={0}
                      className="field-input"
                      value={form.stockQty}
                      onChange={(e) => set('stockQty', e.target.value)}
                      aria-invalid={!!errors.stockQty}
                    />
                  </AdminField>
                  <AdminField label="Seuil de stock faible" htmlFor="product-threshold" error={errors.lowStockThreshold} hint={`Par défaut : ${settings.lowStockThreshold}.`}>
                    <input
                      id="product-threshold"
                      name="lowStockThreshold"
                      type="number"
                      min={0}
                      className="field-input"
                      value={form.lowStockThreshold}
                      onChange={(e) => set('lowStockThreshold', e.target.value)}
                      aria-invalid={!!errors.lowStockThreshold}
                    />
                  </AdminField>
                </div>
              )}
              <div className="rounded-xl border border-line bg-cream-50 px-4 py-3">
                <p className="text-xs uppercase tracking-eyebrow text-ink-500">Affichage public</p>
                <p className="mt-1 text-sm font-medium text-ink">{STOCK_STATE_META[stockState].label}</p>
              </div>
              <Toggle
                checked={form.isAvailable}
                onChange={(value) => set('isAvailable', value)}
                label="Produit disponible à la commande"
                description="Décochez pour afficher « Indisponible » et désactiver la commande directe."
              />
              <Toggle
                checked={form.allowEnquiryWhenOutOfStock}
                onChange={(value) => set('allowEnquiryWhenOutOfStock', value)}
                label="Autoriser une demande quand le produit est indisponible"
                description="Le client peut alors manifester son intérêt sur WhatsApp, sans commander."
              />
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <h2 className="text-lg">Publication</h2>
            <div className="mt-4 space-y-4">
              <Toggle checked={form.isActive} onChange={(value) => set('isActive', value)} label="Publier sur le site" description="Décochez pour masquer le produit du catalogue public." />
              <Toggle checked={form.isFeatured} onChange={(value) => set('isFeatured', value)} label="Mettre en avant" description="Apparaît dans la sélection de la page d’accueil." />
            </div>
            <p className="mt-4 text-xs leading-relaxed text-ink-500">
              Un produit masqué n’est pas accessible au public, même avec un lien direct.
            </p>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <h2 className="text-lg">Référencement (SEO)</h2>
            <p className="mt-1 text-sm text-ink-500">Facultatif. Par défaut, le nom et la description du produit sont utilisés.</p>
            <div className="mt-4 space-y-4">
              <AdminField label="Titre pour les moteurs de recherche" htmlFor="product-meta-title">
                <input id="product-meta-title" name="metaTitle" className="field-input" value={form.metaTitle} onChange={(e) => set('metaTitle', e.target.value)} maxLength={120} />
              </AdminField>
              <AdminField label="Description pour les moteurs de recherche" htmlFor="product-meta-desc" hint="160 caractères environ.">
                <textarea id="product-meta-desc" name="metaDescription" rows={3} className="field-input resize-y" value={form.metaDescription} onChange={(e) => set('metaDescription', e.target.value)} maxLength={200} />
              </AdminField>
            </div>
            {currentSlug && <p className="mt-3 text-xs text-ink-500">Adresse publique : /produits/{currentSlug}</p>}
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
            <h2 className="text-lg">Aperçu rapide</h2>
            <div className="mt-3 flex gap-3">
              <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-cream-200">
                {primary ? <img onError={productImageFallback} src={imageVariant(primary.path, 480)} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[0.65rem] text-ink-500">Aucune photo</div>}
              </div>
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-ink">{form.name || 'Nom du produit'}</p>
                <p className="text-xs text-ink-500">{categoryName}</p>
                <p className="mt-1 font-display text-base text-ink">{pricePreview ?? 'Prix sur demande'}</p>
                <p className="text-xs text-ink-500">{STOCK_STATE_META[stockState].label}</p>
              </div>
            </div>
            <button type="button" className="btn-outline btn-sm mt-3 w-full" onClick={() => setPreviewOpen(true)}>
              Voir l’aperçu complet
            </button>
            {isEdit && (
              <button type="button" className="btn-ghost btn-sm mt-2 w-full text-red-700 hover:bg-red-50" onClick={() => setDeleteOpen(true)}>
                <TrashIcon size={16} /> Supprimer ce produit
              </button>
            )}
          </section>
        </div>

        <div className="lg:col-span-2">
          <SaveBar>
            <Link to="/admin/produits" className="btn-ghost btn-sm order-2 sm:order-1">
              Annuler
            </Link>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" className="btn-outline btn-sm" onClick={() => setPreviewOpen(true)} disabled={saving}>
                Aperçu
              </button>
              <button type="submit" className="btn-primary btn-sm" disabled={saving || uploading > 0}>
                {saving ? <Spinner size={16} /> : null}
                {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Publier le produit'}
              </button>
            </div>
          </SaveBar>
        </div>
      </form>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="Aperçu du produit"
        wide
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setPreviewOpen(false)}>
              Fermer
            </button>
            <button type="button" className="btn-primary" onClick={() => void onSubmit()}>
              Enregistrer
            </button>
          </>
        }
      >
        <p className="mb-4 rounded-lg bg-cream-100 px-3 py-2 text-xs text-ink-500">
          Aperçu interne : les boutons de commande ne sont pas actifs ici. Le rendu final dépend du thème du site.
        </p>
        <div className="grid gap-4 sm:grid-cols-[0.9fr_1.1fr]">
          <div className="overflow-hidden rounded-xl bg-cream-200">
            {primary ? <img onError={productImageFallback} src={imageVariant(primary.path, 960)} alt="" className="aspect-[4/5] w-full object-cover" /> : <div className="flex aspect-[4/5] items-center justify-center text-xs text-ink-500">Aucune photo</div>}
          </div>
          <div>
            <p className="text-2xs uppercase tracking-eyebrow text-ink-500">{categoryName}</p>
            <h3 className="mt-1 font-display text-xl">{form.name || 'Nom du produit'}</h3>
            {form.reference && <p className="mt-1 text-xs text-ink-500">Réf. {form.reference}</p>}
            <p className="mt-2 font-display text-lg">{pricePreview ?? 'Prix sur demande'}</p>
            <p className="mt-1 text-xs text-ink-500">{STOCK_STATE_META[stockState].label}</p>
            {form.shortDescription && <p className="mt-3 text-sm leading-relaxed text-ink-700">{form.shortDescription}</p>}
            {form.sizes.length > 0 && <p className="mt-3 text-xs text-ink-500">Tailles : {form.sizes.join(' · ')}</p>}
            {!form.isActive && <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">Ce produit est actuellement masqué : il n’apparaîtra pas sur le site.</p>}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Supprimer ce produit ?"
        message={
          <>
            « <strong>{form.name}</strong> » sera définitivement supprimé, ainsi que ses photos. Cette action est irréversible.
          </>
        }
        confirmLabel="Supprimer définitivement"
        loading={deleting}
        onConfirm={onDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}
