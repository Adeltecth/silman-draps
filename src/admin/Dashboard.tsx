import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Enquiry } from '@shared/types';
import { ENQUIRY_STATUS_META, ENQUIRY_TYPE_LABELS, formatDateFr } from '@shared/format';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { AdminPageHeader, Badge, Card, ConfirmDialog, InlineMessage, StatCard } from './components';
import { Spinner } from '../components/ui';
import { AlertIcon, ArrowRightIcon, CheckCircleIcon, PlusIcon } from '../components/icons';

interface StatsResponse {
  products: {
    total: number;
    active: number;
    hidden: number;
    featured: number;
    outOfStock: number;
    demo: number;
    lowStock: { id: number; name: string; stock_qty: number; threshold: number }[];
  };
  enquiries: {
    total: number;
    new: number;
    contacted: number;
    converted: number;
    closed: number;
    retail: number;
    wholesale: number;
    last7days: number;
    recent: Enquiry[];
  };
  config: {
    whatsappMissing: boolean;
    phoneMissing: boolean;
    emailMissing: boolean;
    locationMissing: boolean;
    openingHoursMissing: boolean;
    deliveryInfoMissing: boolean;
    demoProducts: boolean;
    demoMode: boolean;
  };
}

export function Dashboard() {
  const { data, loading, error, reload } = useApi<StatsResponse>('/api/admin/stats');
  const [removing, setRemoving] = useState(false);
  const [removeDemo, setRemoveDemo] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const deleteDemo = async () => {
    setRemoving(true);
    try {
      const result = await adminApi.post<{ removed: number }>('/demo/remove');
      setNotice({ tone: 'success', text: `${result.removed} produit(s) de démonstration supprimé(s).` });
      setRemoveDemo(false);
      reload();
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message });
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 py-16 text-ink-500">
        <Spinner /> Chargement du tableau de bord…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <AdminPageHeader title="Tableau de bord" />
        <div className="mt-6">
          <InlineMessage tone="error">
            Impossible de charger les statistiques : {error}{' '}
            <button type="button" onClick={reload} className="font-semibold underline">
              Réessayer
            </button>
          </InlineMessage>
        </div>
      </div>
    );
  }

  const warnings = [
    data.config.whatsappMissing && { label: 'Numéro WhatsApp non configuré', detail: 'Les boutons de commande affichent un message au lieu d’un lien.', to: '/admin/parametres' },
    data.config.phoneMissing && { label: 'Téléphone non renseigné', detail: 'À afficher sur la page contact.', to: '/admin/parametres' },
    data.config.emailMissing && { label: 'E-mail non renseigné', detail: 'Facultatif, mais utile pour le contact écrit.', to: '/admin/parametres' },
    data.config.openingHoursMissing && { label: 'Horaires non renseignés', detail: 'Ils sont affichés sur la page contact s’ils sont saisis.', to: '/admin/parametres' },
    data.config.deliveryInfoMissing && { label: 'Informations de livraison non renseignées', detail: 'Le site affiche alors un texte neutre.', to: '/admin/parametres' },
  ].filter(Boolean) as { label: string; detail: string; to: string }[];

  return (
    <div>
      <AdminPageHeader
        title="Tableau de bord"
        description="Vue d’ensemble de la boutique : produits, stock et demandes reçues par le site."
        actions={
          <>
            <Link to="/admin/produits/nouveau" className="btn-primary btn-sm">
              <PlusIcon size={17} />
              Ajouter un produit
            </Link>
            <Link to="/admin/demandes" className="btn-outline btn-sm">
              Voir les demandes
            </Link>
          </>
        }
      />

      {notice && (
        <div className="mt-5">
          <InlineMessage tone={notice.tone}>{notice.text}</InlineMessage>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Produits actifs" value={data.products.active} hint={`${data.products.total} au total, ${data.products.hidden} masqué(s)`} to="/admin/produits" />
        <StatCard label="Nouvelles demandes" value={data.enquiries.new} tone={data.enquiries.new > 0 ? 'alert' : 'default'} hint={`${data.enquiries.last7days} sur 7 jours`} to="/admin/demandes" />
        <StatCard label="En rupture / indisponibles" value={data.products.outOfStock} tone={data.products.outOfStock > 0 ? 'alert' : 'good'} hint="Produits à réapprovisionner" to="/admin/produits?statut=out" />
        <StatCard label="Demandes de gros" value={data.enquiries.wholesale} hint={`${data.enquiries.retail} demande(s) au détail`} to="/admin/demandes?type=wholesale" />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg">Dernières demandes</h2>
              <p className="mt-1 text-sm text-ink-500">Demandes envoyées via les formulaires du site.</p>
            </div>
            <Link to="/admin/demandes" className="shrink-0 text-sm font-medium text-clay-600 link-underline">
              Tout voir
            </Link>
          </div>

          {data.enquiries.recent.length === 0 ? (
            <div className="mt-5 rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-500">
              Aucune demande pour le moment. Les messages envoyés depuis le site apparaîtront ici.
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {data.enquiries.recent.map((enquiry) => {
                const status = ENQUIRY_STATUS_META[enquiry.status];
                return (
                  <li key={enquiry.id} className="flex flex-col gap-1.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink">
                        {enquiry.name}
                        <Badge tone={enquiry.type === 'wholesale' ? 'info' : 'neutral'}>{ENQUIRY_TYPE_LABELS[enquiry.type]}</Badge>
                        <span className={`rounded-full border px-2 py-0.5 text-2xs ${status.tone}`}>{status.label}</span>
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-500">
                        {enquiry.productLabel ?? 'Demande générale'} · {formatDateFr(enquiry.createdAt)}
                      </p>
                    </div>
                    <Link to={`/admin/demandes?focus=${enquiry.id}`} className="shrink-0 text-xs font-medium text-clay-600 link-underline">
                      Ouvrir
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="text-lg">Stock à surveiller</h2>
          <p className="mt-1 text-sm text-ink-500">Produits dont la quantité est inférieure ou égale au seuil configuré.</p>
          {data.products.lowStock.length === 0 ? (
            <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <CheckCircleIcon size={17} className="mt-0.5 shrink-0" />
              Aucun produit sous le seuil pour l’instant.
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {data.products.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-line px-3.5 py-2.5">
                  <span className="min-w-0 truncate text-sm text-ink">{p.name}</span>
                  <span className="shrink-0 text-xs font-medium text-clay-600">
                    {p.stock_qty} restant — seuil {p.threshold}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 rounded-xl bg-cream-50 p-4 text-xs leading-relaxed text-ink-500">
            Seuil actuel défini dans les paramètres. Le stock n’est jamais déduit automatiquement par un clic WhatsApp.
          </div>
        </Card>
      </div>

      {warnings.length > 0 && (
        <Card className="mt-5">
          <div className="flex items-center gap-2">
            <AlertIcon size={18} className="text-clay-600" />
            <h2 className="text-lg">À compléter avant la mise en ligne</h2>
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {warnings.map((w) => (
              <li key={w.label} className="rounded-xl border border-line bg-cream-50 p-3.5">
                <p className="text-sm font-medium text-ink">{w.label}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{w.detail}</p>
                <Link to={w.to} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-clay-600 link-underline">
                  Configurer
                  <ArrowRightIcon size={13} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.products.demo > 0 && (
        <Card className="mt-5 border-dashed">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[1rem] font-medium">Produits de démonstration</h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">
                {data.products.demo} produit(s) d’exemple figurent dans le catalogue. Supprimez-les avant l’ouverture officielle, après avoir ajouté vos
                vrais produits.
              </p>
            </div>
            <button type="button" className="btn-outline btn-sm shrink-0" onClick={() => setRemoveDemo(true)}>
              Supprimer les produits de démonstration
            </button>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={removeDemo}
        title="Supprimer les produits de démonstration ?"
        message="Tous les produits marqués comme démonstration seront définitivement supprimés, ainsi que leurs photos. Vos produits réels ne sont pas concernés."
        confirmLabel="Supprimer les exemples"
        loading={removing}
        onConfirm={deleteDemo}
        onCancel={() => setRemoveDemo(false)}
      />
    </div>
  );
}
