import { useEffect, useRef, useState } from 'react';
import type { AdminSettings, MediaAsset } from '@shared/types';
import { adminApi, ApiError } from '../lib/api';
import { useSettings } from '../lib/settings';
import { AdminField, AdminPageHeader, Card, ConfirmDialog, InlineMessage, SaveBar, Toggle } from './components';
import { Spinner } from '../components/ui';
import { ImageIcon, UploadIcon } from '../components/icons';

interface SettingsForm {
  business_name: string;
  whatsapp_number: string;
  phone: string;
  email: string;
  location: string;
  service_areas: string;
  opening_hours: string;
  social_facebook: string;
  social_instagram: string;
  social_tiktok: string;
  hero_title: string;
  hero_subtitle: string;
  currency: string;
  delivery_info: string;
  low_stock_threshold: string;
  seo_default_description: string;
  seo_site_url: string;
  seo_og_image: string;
  logo_url: string;
}

const CURRENCIES = [
  { value: 'XOF', label: 'XOF — Franc CFA (UEMOA)' },
  { value: 'XAF', label: 'XAF — Franc CFA (CEMAC)' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'USD', label: 'USD — Dollar américain' },
  { value: 'GHS', label: 'GHS — Cedi ghanéen' },
  { value: 'NGN', label: 'NGN — Naira nigérian' },
];

function toForm(settings: AdminSettings): SettingsForm {
  return {
    business_name: settings.businessName,
    whatsapp_number: settings.whatsappNumber,
    phone: settings.phone,
    email: settings.email,
    location: settings.location,
    service_areas: settings.serviceAreas,
    opening_hours: settings.openingHours,
    social_facebook: settings.social.facebook,
    social_instagram: settings.social.instagram,
    social_tiktok: settings.social.tiktok,
    hero_title: settings.heroTitle,
    hero_subtitle: settings.heroSubtitle,
    currency: settings.currency,
    delivery_info: settings.deliveryInfo,
    low_stock_threshold: String(settings.lowStockThreshold),
    seo_default_description: settings.seoDefaultDescription,
    seo_site_url: settings.siteUrl,
    seo_og_image: settings.seoOgImage ?? '',
    logo_url: settings.logoUrl ?? '',
  };
}

export function SettingsPage() {
  const { refresh } = useSettings();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);
  const [demoTotal, setDemoTotal] = useState<number | null>(null);
  const [removeDemoOpen, setRemoveDemoOpen] = useState(false);
  const [removingDemo, setRemovingDemo] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', next: '', confirm: '' });
  const [passwordNotice, setPasswordNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);
  const ogInput = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const data = await adminApi.get<{ settings: AdminSettings }>('/settings');
      setForm(toForm(data.settings));
      const stats = await adminApi.get<{ products: { demo: number } }>('/stats');
      setDemoTotal(stats.products.demo);
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message });
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const set = (key: keyof SettingsForm, value: string) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const save = async () => {
    if (!form) return;
    setSaving(true);
    setNotice(null);
    try {
      const payload = { ...form, low_stock_threshold: Number(form.low_stock_threshold || 0) };
      const data = await adminApi.put<{ settings: AdminSettings }>('/settings', payload);
      setForm(toForm(data.settings));
      setErrors({});
      setNotice({ tone: 'success', text: 'Paramètres enregistrés. Le site est mis à jour.' });
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fields);
        setNotice({ tone: 'error', text: err.message });
      } else {
        setNotice({ tone: 'error', text: (err as Error).message });
      }
    } finally {
      setSaving(false);
    }
  };

  const uploadLogo = async (file: File) => {
    setUploadingLogo(true);
    setNotice(null);
    try {
      const { asset } = await adminApi.upload<{ asset: MediaAsset }>(file);
      set('logo_url', asset.urls.medium);
      setNotice({ tone: 'success', text: 'Logo importé. Cliquez sur « Enregistrer » pour l’appliquer.' });
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message });
    } finally {
      setUploadingLogo(false);
    }
  };

  const uploadOg = async (file: File) => {
    setUploadingOg(true);
    setNotice(null);
    try {
      const { asset } = await adminApi.upload<{ asset: MediaAsset }>(file);
      set('seo_og_image', asset.urls.large);
      setNotice({ tone: 'success', text: 'Image de partage importée. Cliquez sur « Enregistrer » pour l’appliquer.' });
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message });
    } finally {
      setUploadingOg(false);
    }
  };

  const changePassword = async () => {
    setPasswordNotice(null);
    if (passwords.next !== passwords.confirm) {
      setPasswordNotice({ tone: 'error', text: 'Les deux nouveaux mots de passe ne correspondent pas.' });
      return;
    }
    setChangingPassword(true);
    try {
      await adminApi.post('/auth/password', { currentPassword: passwords.current, newPassword: passwords.next });
      setPasswords({ current: '', next: '', confirm: '' });
      setPasswordNotice({ tone: 'success', text: 'Mot de passe modifié. Les autres sessions ont été déconnectées.' });
    } catch (err) {
      setPasswordNotice({ tone: 'error', text: (err as Error).message });
    } finally {
      setChangingPassword(false);
    }
  };

  const removeDemo = async () => {
    setRemovingDemo(true);
    try {
      const result = await adminApi.post<{ removed: number }>('/demo/remove');
      setNotice({ tone: 'success', text: `${result.removed} produit(s) de démonstration supprimé(s).` });
      setDemoTotal(0);
      setRemoveDemoOpen(false);
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message });
    } finally {
      setRemovingDemo(false);
    }
  };

  if (!form) {
    return (
      <div>
        <AdminPageHeader title="Paramètres" />
        <div className="mt-8 flex items-center gap-3 text-ink-500">
          <Spinner /> Chargement des paramètres…
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Paramètres"
        description="Coordonnées, identité et informations publiques du site. Les modifications s’appliquent immédiatement après enregistrement."
      />

      {notice && (
        <div className="mt-5">
          <InlineMessage tone={notice.tone}>{notice.text}</InlineMessage>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        noValidate
        className="mt-6 space-y-5"
      >
        <Card>
          <h2 className="text-lg">Identité de la boutique</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminField label="Nom de la boutique" htmlFor="s-business" required error={errors.business_name}>
              <input id="s-business" className="field-input" value={form.business_name} onChange={(e) => set('business_name', e.target.value)} aria-invalid={!!errors.business_name} />
            </AdminField>
            <div>
              <p className="field-label">Logo</p>
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-line bg-cream-50">
                  {form.logo_url ? <img src={form.logo_url} alt="Logo" className="h-full w-full object-cover" /> : <ImageIcon size={20} className="text-ink-500/60" />}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={logoInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadLogo(file);
                      e.target.value = '';
                    }}
                  />
                  <button type="button" className="btn-outline btn-sm" onClick={() => logoInput.current?.click()} disabled={uploadingLogo}>
                    {uploadingLogo ? <Spinner size={16} /> : <UploadIcon size={16} />}
                    Importer
                  </button>
                  {form.logo_url && (
                    <button type="button" className="btn-ghost btn-sm text-ink-500" onClick={() => set('logo_url', '')}>
                      Retirer
                    </button>
                  )}
                </div>
              </div>
              {errors.logo_url && <p className="field-error">{errors.logo_url}</p>}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg">Contact</h2>
          <p className="mt-1 text-sm text-ink-500">Seules les informations renseignées sont affichées sur le site.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminField
              label="Numéro WhatsApp (format international)"
              htmlFor="s-whatsapp"
              error={errors.whatsapp_number}
              hint="Ex. +225 07 00 00 00 00. Sans ce numéro, les boutons WhatsApp affichent un message d’aide."
            >
              <input
                id="s-whatsapp"
                className="field-input"
                inputMode="tel"
                value={form.whatsapp_number}
                onChange={(e) => set('whatsapp_number', e.target.value)}
                placeholder="+225 07 00 00 00 00"
                aria-invalid={!!errors.whatsapp_number}
              />
            </AdminField>
            <AdminField label="Téléphone" htmlFor="s-phone" error={errors.phone}>
              <input id="s-phone" className="field-input" inputMode="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+225 …" />
            </AdminField>
            <AdminField label="E-mail" htmlFor="s-email" error={errors.email}>
              <input id="s-email" className="field-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </AdminField>
            <AdminField label="Localisation" htmlFor="s-location" error={errors.location} hint="Ville, quartier. N’indiquez pas d’adresse précise si elle n’est pas confirmée.">
              <input id="s-location" className="field-input" value={form.location} onChange={(e) => set('location', e.target.value)} />
            </AdminField>
            <AdminField label="Zones desservies" htmlFor="s-areas" error={errors.service_areas} hint="Facultatif. Affiché sur la page contact.">
              <textarea id="s-areas" rows={2} className="field-input resize-y" value={form.service_areas} onChange={(e) => set('service_areas', e.target.value)} />
            </AdminField>
            <AdminField label="Horaires d’ouverture" htmlFor="s-hours" error={errors.opening_hours} hint="Affichés uniquement s’ils sont renseignés.">
              <textarea id="s-hours" rows={2} className="field-input resize-y" value={form.opening_hours} onChange={(e) => set('opening_hours', e.target.value)} placeholder="Ex. Lundi – samedi : 8h – 18h" />
            </AdminField>
            <AdminField label="Facebook" htmlFor="s-facebook" error={errors.social_facebook}>
              <input id="s-facebook" className="field-input" value={form.social_facebook} onChange={(e) => set('social_facebook', e.target.value)} placeholder="https://facebook.com/…" />
            </AdminField>
            <AdminField label="Instagram" htmlFor="s-instagram" error={errors.social_instagram}>
              <input id="s-instagram" className="field-input" value={form.social_instagram} onChange={(e) => set('social_instagram', e.target.value)} placeholder="https://instagram.com/…" />
            </AdminField>
            <AdminField label="TikTok" htmlFor="s-tiktok" error={errors.social_tiktok}>
              <input id="s-tiktok" className="field-input" value={form.social_tiktok} onChange={(e) => set('social_tiktok', e.target.value)} placeholder="https://tiktok.com/@…" />
            </AdminField>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg">Page d’accueil</h2>
          <div className="mt-4 grid gap-4">
            <AdminField label="Titre principal" htmlFor="s-hero-title" required error={errors.hero_title}>
              <input id="s-hero-title" className="field-input" value={form.hero_title} onChange={(e) => set('hero_title', e.target.value)} />
            </AdminField>
            <AdminField label="Texte d’introduction" htmlFor="s-hero-sub" error={errors.hero_subtitle}>
              <textarea id="s-hero-sub" rows={3} className="field-input resize-y" value={form.hero_subtitle} onChange={(e) => set('hero_subtitle', e.target.value)} />
            </AdminField>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg">Affichage et stock</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <AdminField label="Devise" htmlFor="s-currency" error={errors.currency}>
              <select id="s-currency" className="field-input" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
                {CURRENCIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
                {!CURRENCIES.some((c) => c.value === form.currency) && <option value={form.currency}>{form.currency}</option>}
              </select>
            </AdminField>
            <AdminField
              label="Seuil de stock faible"
              htmlFor="s-threshold"
              error={errors.low_stock_threshold}
              hint="Un produit dont la quantité est ≤ à ce seuil est affiché « Stock limité ». Ce seuil peut être ajusté produit par produit."
            >
              <input
                id="s-threshold"
                type="number"
                min={0}
                className="field-input"
                value={form.low_stock_threshold}
                onChange={(e) => set('low_stock_threshold', e.target.value)}
                aria-invalid={!!errors.low_stock_threshold}
              />
            </AdminField>
            <AdminField label="Informations de livraison" htmlFor="s-delivery" error={errors.delivery_info} hint="Laissé vide, le site affiche un texte neutre sans promesse de délai." className="sm:col-span-2">
              <textarea id="s-delivery" rows={3} className="field-input resize-y" value={form.delivery_info} onChange={(e) => set('delivery_info', e.target.value)} />
            </AdminField>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg">Référencement (SEO)</h2>
          <div className="mt-4 grid gap-4">
            <AdminField label="Adresse du site" htmlFor="s-siteurl" error={errors.seo_site_url} hint="Ex. https://www.silimashop.ci — utilisée pour les liens canoniques et le sitemap.">
              <input id="s-siteurl" className="field-input" value={form.seo_site_url} onChange={(e) => set('seo_site_url', e.target.value)} placeholder="https://…" />
            </AdminField>
            <AdminField label="Description par défaut" htmlFor="s-seodesc" error={errors.seo_default_description} hint="160 caractères environ, utilisée sur la page d’accueil.">
              <textarea id="s-seodesc" rows={3} className="field-input resize-y" value={form.seo_default_description} onChange={(e) => set('seo_default_description', e.target.value)} maxLength={200} />
            </AdminField>
            <div>
              <p className="field-label">Image de partage (Open Graph)</p>
              <div className="flex items-center gap-3">
                <div className="h-16 w-24 overflow-hidden rounded-lg border border-line bg-cream-50">
                  {form.seo_og_image ? <img src={form.seo_og_image} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-[0.65rem] text-ink-500">Par défaut</div>}
                </div>
                <input
                  ref={ogInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void uploadOg(file);
                    e.target.value = '';
                  }}
                />
                <button type="button" className="btn-outline btn-sm" onClick={() => ogInput.current?.click()} disabled={uploadingOg}>
                  {uploadingOg ? <Spinner size={16} /> : <UploadIcon size={16} />}
                  Importer
                </button>
                {form.seo_og_image && (
                  <button type="button" className="btn-ghost btn-sm text-ink-500" onClick={() => set('seo_og_image', '')}>
                    Retirer
                  </button>
                )}
              </div>
              {errors.seo_og_image && <p className="field-error">{errors.seo_og_image}</p>}
            </div>
          </div>
        </Card>

        <SaveBar>
          <p className="text-xs text-ink-500">Les informations publiques sont visibles immédiatement après enregistrement.</p>
          <button type="submit" className="btn-primary btn-sm" disabled={saving}>
            {saving ? <Spinner size={16} /> : null}
            {saving ? 'Enregistrement…' : 'Enregistrer les paramètres'}
          </button>
        </SaveBar>
      </form>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card>
          <h2 className="text-lg">Sécurité du compte</h2>
          <p className="mt-1 text-sm text-ink-500">Modifiez régulièrement votre mot de passe. La modification déconnecte les autres sessions.</p>
          {passwordNotice && (
            <div className="mt-4">
              <InlineMessage tone={passwordNotice.tone}>{passwordNotice.text}</InlineMessage>
            </div>
          )}
          <div className="mt-4 space-y-3">
            <AdminField label="Mot de passe actuel" htmlFor="pw-current">
              <input id="pw-current" type="password" autoComplete="current-password" className="field-input" value={passwords.current} onChange={(e) => setPasswords({ ...passwords, current: e.target.value })} />
            </AdminField>
            <AdminField label="Nouveau mot de passe" htmlFor="pw-new" hint="10 caractères minimum, avec lettres et chiffres.">
              <input id="pw-new" type="password" autoComplete="new-password" className="field-input" value={passwords.next} onChange={(e) => setPasswords({ ...passwords, next: e.target.value })} />
            </AdminField>
            <AdminField label="Confirmer le nouveau mot de passe" htmlFor="pw-confirm">
              <input id="pw-confirm" type="password" autoComplete="new-password" className="field-input" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} />
            </AdminField>
            <button type="button" className="btn-outline" onClick={() => void changePassword()} disabled={changingPassword || !passwords.current || !passwords.next}>
              {changingPassword ? <Spinner size={16} /> : null}
              Mettre à jour le mot de passe
            </button>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg">Données de démonstration</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">
            {demoTotal === null
              ? 'Chargement…'
              : demoTotal > 0
                ? `${demoTotal} produit(s) d’exemple sont présents dans le catalogue. Supprimez-les avant l’ouverture officielle, une fois vos vrais produits ajoutés.`
                : 'Aucun produit de démonstration dans le catalogue.'}
          </p>
          <button type="button" className="btn-outline btn-sm mt-4" onClick={() => setRemoveDemoOpen(true)} disabled={!demoTotal}>
            Supprimer les produits de démonstration
          </button>
          <div className="mt-5 rounded-xl border border-line bg-cream-50 p-4 text-xs leading-relaxed text-ink-500">
            <p className="font-medium text-ink-700">Sauvegarde</p>
            <p className="mt-1">
              Les produits, images et demandes sont stockés dans le dossier <code>data/</code> du serveur. Sauvegardez régulièrement ce dossier : il contient
              la base de données et les photos.
            </p>
          </div>
        </Card>
      </div>

      <ConfirmDialog
        open={removeDemoOpen}
        title="Supprimer les produits de démonstration ?"
        message="Les produits marqués comme démonstration et leurs photos seront supprimés. Vos produits réels ne sont pas concernés."
        confirmLabel="Supprimer les exemples"
        loading={removingDemo}
        onConfirm={removeDemo}
        onCancel={() => setRemoveDemoOpen(false)}
      />
    </div>
  );
}
