import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Enquiry, EnquiryStatus } from '@shared/types';
import { ENQUIRY_STATUS_META, ENQUIRY_TYPE_LABELS, formatDateFr } from '@shared/format';
import { buildWhatsAppLink, normaliseWhatsAppNumber } from '@shared/whatsapp';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { useSettings } from '../lib/settings';
import { AdminPageHeader, Badge, Card, ConfirmDialog, InlineMessage } from './components';
import { Alert, Spinner } from '../components/ui';
import { MailIcon, PhoneIcon, SearchIcon, TrashIcon, WhatsAppIcon } from '../components/icons';

interface EnquiriesResponse {
  enquiries: Enquiry[];
  total: number;
  counts: Record<string, number>;
}

const STATUS_TABS: { value: string; label: string }[] = [
  { value: '', label: 'Toutes' },
  { value: 'new', label: 'Nouvelles' },
  { value: 'contacted', label: 'Contactées' },
  { value: 'converted', label: 'Converties' },
  { value: 'closed', label: 'Clôturées' },
];

const STATUS_OPTIONS: EnquiryStatus[] = ['new', 'contacted', 'converted', 'closed'];

function whatsappReplyLink(phone: string, message: string): string {
  const normalised = normaliseWhatsAppNumber(phone);
  const text = encodeURIComponent(message);
  // Numéro non international : on ouvre WhatsApp sans destinataire plutôt que de fabriquer un lien invalide.
  return normalised.ok ? `https://wa.me/${normalised.digits}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function EnquiriesPage() {
  const { settings } = useSettings();
  const [params, setParams] = useSearchParams();
  const [status, setStatus] = useState(params.get('statut') ?? '');
  const [type, setType] = useState(params.get('type') ?? '');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [openId, setOpenId] = useState<number | null>(params.get('focus') ? Number(params.get('focus')) : null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [toDelete, setToDelete] = useState<Enquiry | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = new URLSearchParams();
  if (status) query.set('statut', status);
  if (type) query.set('type', type);
  if (debounced) query.set('q', debounced);

  const { data, loading, error, reload } = useApi<EnquiriesResponse>(`/api/admin/enquiries?${query.toString()}`);
  const counts = data?.counts ?? {};
  const totalAll = Object.values(counts).reduce((n, v) => n + v, 0);

  const update = async (id: number, patch: { status?: EnquiryStatus; adminNote?: string }) => {
    setNotice(null);
    try {
      await adminApi.patch(`/enquiries/${id}`, patch);
      setNotice({ tone: 'success', text: 'Demande mise à jour.' });
      reload();
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message });
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await adminApi.del(`/enquiries/${toDelete.id}`);
      setNotice({ tone: 'success', text: 'Demande supprimée.' });
      setToDelete(null);
      reload();
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message });
      setToDelete(null);
    }
  };

  const setStatusFilter = (value: string) => {
    setStatus(value);
    const next = new URLSearchParams(params);
    if (value) next.set('statut', value);
    else next.delete('statut');
    setParams(next, { replace: true });
  };

  return (
    <div>
      <AdminPageHeader
        title="Demandes"
        description="Demandes envoyées via les formulaires du site. Les conversations WhatsApp ne sont pas enregistrées ici."
      />

      {notice && (
        <div className="mt-5">
          <InlineMessage tone={notice.tone}>{notice.text}</InlineMessage>
        </div>
      )}

      <div className="mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {STATUS_TABS.map((tab) => {
          const count = tab.value ? counts[tab.value] ?? 0 : totalAll;
          return (
            <button
              key={tab.value || 'all'}
              type="button"
              onClick={() => setStatusFilter(tab.value)}
              aria-pressed={status === tab.value}
              className={`whitespace-nowrap rounded-full border px-3.5 py-2 text-sm transition-colors ${
                status === tab.value ? 'border-ink bg-ink text-cream-50' : 'border-line bg-white text-ink-700 hover:border-ink/25'
              }`}
            >
              {tab.label}
              <span className={`ml-1.5 text-xs ${status === tab.value ? 'text-cream-200/80' : 'text-ink-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-[1.6fr_1fr]">
        <div className="relative">
          <label htmlFor="enquiry-search" className="sr-only">
            Rechercher une demande
          </label>
          <SearchIcon size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500/70" />
          <input
            id="enquiry-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="field-input py-2.5 pl-11"
            placeholder="Nom, téléphone, produit…"
          />
        </div>
        <div>
          <label htmlFor="enquiry-type" className="sr-only">
            Filtrer par type
          </label>
          <select
            id="enquiry-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              const next = new URLSearchParams(params);
              if (e.target.value) next.set('type', e.target.value);
              else next.delete('type');
              setParams(next, { replace: true });
            }}
            className="field-input py-2.5"
          >
            <option value="">Tous les types</option>
            <option value="retail">Détail</option>
            <option value="wholesale">Gros</option>
          </select>
        </div>
      </div>

      <p className="mt-4 text-sm text-ink-500" role="status" aria-live="polite">
        {loading ? 'Chargement…' : `${data?.total ?? 0} demande(s)`}
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
          <Spinner /> Chargement des demandes…
        </div>
      ) : (data?.enquiries ?? []).length === 0 ? (
        <Card className="mt-4 text-center">
          <h2 className="text-lg">Aucune demande</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">
            Les demandes envoyées depuis les pages « Contact » et « Vente en gros » apparaîtront ici, avec leur statut.
          </p>
        </Card>
      ) : (
        <ul className="mt-4 space-y-3">
          {(data?.enquiries ?? []).map((enquiry) => {
            const statusMeta = ENQUIRY_STATUS_META[enquiry.status];
            const open = openId === enquiry.id;
            return (
              <li key={enquiry.id}>
                <Card className="!p-0">
                  <button
                    type="button"
                    className="flex w-full flex-col gap-2 p-4 text-left sm:flex-row sm:items-center sm:justify-between sm:p-5"
                    onClick={() => setOpenId(open ? null : enquiry.id)}
                    aria-expanded={open}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-ink">{enquiry.name}</span>
                        <Badge tone={enquiry.type === 'wholesale' ? 'info' : 'neutral'}>{ENQUIRY_TYPE_LABELS[enquiry.type]}</Badge>
                        <span className={`rounded-full border px-2 py-0.5 text-2xs ${statusMeta.tone}`}>{statusMeta.label}</span>
                      </div>
                      <p className="mt-1 truncate text-sm text-ink-500">
                        {enquiry.productLabel ?? 'Demande générale'}
                        {enquiry.quantity ? ` · ${enquiry.quantity} pièce(s)` : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        {enquiry.phone} · {formatDateFr(enquiry.createdAt)}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs font-medium text-clay-600">{open ? 'Réduire' : 'Détails'}</span>
                  </button>

                  {open && (
                    <div className="border-t border-line p-4 sm:p-5">
                      <dl className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <dt className="text-2xs uppercase tracking-eyebrow text-ink-500">Téléphone</dt>
                          <dd className="mt-0.5 flex items-center gap-2 text-sm">
                            <PhoneIcon size={15} className="text-ink-500" />
                            <a href={`tel:${enquiry.phone.replace(/\s/g, '')}`} className="link-underline text-ink">
                              {enquiry.phone}
                            </a>
                          </dd>
                        </div>
                        {enquiry.email && (
                          <div>
                            <dt className="text-2xs uppercase tracking-eyebrow text-ink-500">E-mail</dt>
                            <dd className="mt-0.5 flex items-center gap-2 text-sm">
                              <MailIcon size={15} className="text-ink-500" />
                              <a href={`mailto:${enquiry.email}`} className="link-underline break-all text-ink">
                                {enquiry.email}
                              </a>
                            </dd>
                          </div>
                        )}
                        {enquiry.businessName && (
                          <div>
                            <dt className="text-2xs uppercase tracking-eyebrow text-ink-500">Entreprise</dt>
                            <dd className="mt-0.5 text-sm text-ink">{enquiry.businessName}</dd>
                          </div>
                        )}
                        <div>
                          <dt className="text-2xs uppercase tracking-eyebrow text-ink-500">Type de demande</dt>
                          <dd className="mt-0.5 text-sm text-ink">{ENQUIRY_TYPE_LABELS[enquiry.type]}</dd>
                        </div>
                        <div>
                          <dt className="text-2xs uppercase tracking-eyebrow text-ink-500">Produit</dt>
                          <dd className="mt-0.5 text-sm text-ink">{enquiry.productLabel ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-2xs uppercase tracking-eyebrow text-ink-500">Quantité</dt>
                          <dd className="mt-0.5 text-sm text-ink">{enquiry.quantity ?? '—'}</dd>
                        </div>
                        <div>
                          <dt className="text-2xs uppercase tracking-eyebrow text-ink-500">Reçue le</dt>
                          <dd className="mt-0.5 text-sm text-ink">{formatDateFr(enquiry.createdAt)}</dd>
                        </div>
                        <div>
                          <dt className="text-2xs uppercase tracking-eyebrow text-ink-500">Canal</dt>
                          <dd className="mt-0.5 text-sm text-ink">Formulaire du site</dd>
                        </div>
                      </dl>

                      {enquiry.message && (
                        <div className="mt-4 rounded-xl border border-line bg-cream-50 p-4">
                          <p className="text-2xs uppercase tracking-eyebrow text-ink-500">Message</p>
                          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-ink-700">{enquiry.message}</p>
                        </div>
                      )}

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <label htmlFor={`status-${enquiry.id}`} className="field-label">
                            Statut
                          </label>
                          <select
                            id={`status-${enquiry.id}`}
                            className="field-input py-2.5"
                            value={enquiry.status}
                            onChange={(e) => void update(enquiry.id, { status: e.target.value as EnquiryStatus })}
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {ENQUIRY_STATUS_META[s].label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`note-${enquiry.id}`} className="field-label">
                            Note interne
                          </label>
                          <textarea
                            id={`note-${enquiry.id}`}
                            rows={2}
                            className="field-input resize-y"
                            defaultValue={enquiry.adminNote ?? ''}
                            onBlur={(e) => {
                              if (e.target.value !== (enquiry.adminNote ?? '')) void update(enquiry.id, { adminNote: e.target.value });
                            }}
                            placeholder="Suivi, prix proposé, disponibilité…"
                          />
                          <p className="field-help">Enregistrée automatiquement en quittant le champ.</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <a
                          href={whatsappReplyLink(
                            enquiry.phone,
                            `Bonjour ${enquiry.name}, nous répondons à votre demande envoyée sur le site de ${settings.businessName}${
                              enquiry.productLabel ? ` concernant ${enquiry.productLabel}` : ''
                            }.`
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline btn-sm"
                        >
                          <WhatsAppIcon size={16} /> Répondre sur WhatsApp
                        </a>
                        <button type="button" className="btn-ghost btn-sm text-red-700 hover:bg-red-50" onClick={() => setToDelete(enquiry)}>
                          <TrashIcon size={16} /> Supprimer
                        </button>
                      </div>
                      {!normaliseWhatsAppNumber(enquiry.phone).ok && (
                        <p className="mt-2 text-xs text-ink-500">
                          Numéro local : WhatsApp s’ouvrira sans destinataire, choisissez le contact dans l’application ou appelez le numéro.
                        </p>
                      )}
                    </div>
                  )}
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette demande ?"
        message="La demande et sa note interne seront définitivement supprimées."
        confirmLabel="Supprimer"
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
