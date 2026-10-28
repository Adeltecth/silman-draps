import { useState } from 'react';
import type { AdminCategory } from '@shared/types';
import { adminApi } from '../lib/api';
import { useApi } from '../lib/useApi';
import { AdminField, AdminPageHeader, Badge, Card, ConfirmDialog, InlineMessage, Toggle } from './components';
import { Alert, Modal, Spinner } from '../components/ui';
import { EditIcon, PlusIcon, TrashIcon } from '../components/icons';

interface Draft {
  id?: number;
  name: string;
  description: string;
  sortOrder: string;
  isActive: boolean;
}

const EMPTY: Draft = { name: '', description: '', sortOrder: '0', isActive: true };

export function CategoriesPage() {
  const { data, loading, error, reload } = useApi<{ categories: AdminCategory[] }>('/api/admin/categories');
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [toDelete, setToDelete] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const save = async () => {
    if (!draft) return;
    if (draft.name.trim().length < 2) {
      setFormError('Le nom de la catégorie est obligatoire.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const payload = {
        name: draft.name,
        description: draft.description || undefined,
        sortOrder: Number(draft.sortOrder || 0),
        isActive: draft.isActive,
      };
      if (draft.id) await adminApi.put(`/categories/${draft.id}`, payload);
      else await adminApi.post('/categories', payload);
      setNotice({ tone: 'success', text: draft.id ? 'Catégorie mise à jour.' : 'Catégorie créée.' });
      setDraft(null);
      reload();
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (category: AdminCategory) => {
    setNotice(null);
    try {
      await adminApi.put(`/categories/${category.id}`, {
        name: category.name,
        description: category.description || undefined,
        sortOrder: category.sortOrder,
        isActive: !category.isActive,
      });
      reload();
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message });
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await adminApi.del(`/categories/${toDelete.id}`);
      setNotice({ tone: 'success', text: 'Catégorie supprimée.' });
      setToDelete(null);
      reload();
    } catch (err) {
      setNotice({ tone: 'error', text: (err as Error).message });
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="Catégories"
        description="Organisez votre catalogue. Une catégorie masquée retire aussi ses produits du site public."
        actions={
          <button type="button" className="btn-primary btn-sm" onClick={() => setDraft(EMPTY)}>
            <PlusIcon size={17} />
            Ajouter une catégorie
          </button>
        }
      />

      {notice && (
        <div className="mt-5">
          <InlineMessage tone={notice.tone}>{notice.text}</InlineMessage>
        </div>
      )}

      {error ? (
        <Alert tone="error" className="mt-5">
          {error}{' '}
          <button type="button" onClick={reload} className="font-semibold underline">
            Réessayer
          </button>
        </Alert>
      ) : loading ? (
        <div className="mt-8 flex items-center gap-3 text-ink-500">
          <Spinner /> Chargement…
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {(data?.categories ?? []).map((category) => (
            <Card key={category.id} className="!p-4 sm:!p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-medium text-ink">{category.name}</h2>
                    <Badge tone={category.isActive ? 'ok' : 'neutral'}>{category.isActive ? 'Visible' : 'Masquée'}</Badge>
                    <Badge tone="neutral">{category.productCount} produit(s)</Badge>
                  </div>
                  {category.description && <p className="mt-1 text-sm text-ink-500">{category.description}</p>}
                  <p className="mt-1 text-xs text-ink-500">
                    /produits?categorie={category.slug} · ordre {category.sortOrder}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="mr-2">
                    <Toggle checked={category.isActive} onChange={() => void toggleActive(category)} label="Visible" />
                  </div>
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    onClick={() =>
                      setDraft({
                        id: category.id,
                        name: category.name,
                        description: category.description ?? '',
                        sortOrder: String(category.sortOrder),
                        isActive: category.isActive,
                      })
                    }
                  >
                    <EditIcon size={16} /> Modifier
                  </button>
                  <button type="button" className="btn-ghost btn-sm text-red-700" onClick={() => setToDelete(category)} aria-label={`Supprimer ${category.name}`}>
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
          {(data?.categories ?? []).length === 0 && (
            <Card className="text-center">
              <p className="text-sm text-ink-500">Aucune catégorie. Ajoutez-en une pour organiser le catalogue.</p>
            </Card>
          )}
        </div>
      )}

      <Modal
        open={draft !== null}
        onClose={() => {
          setDraft(null);
          setFormError(null);
        }}
        title={draft?.id ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
        footer={
          <>
            <button type="button" className="btn-outline" onClick={() => setDraft(null)}>
              Annuler
            </button>
            <button type="button" className="btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? <Spinner size={16} /> : null}
              Enregistrer
            </button>
          </>
        }
      >
        {formError && (
          <Alert tone="error" className="mb-4">
            {formError}
          </Alert>
        )}
        {draft && (
          <div className="space-y-4">
            <AdminField label="Nom" htmlFor="category-name" required>
              <input id="category-name" className="field-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex. Draps de lit" />
            </AdminField>
            <AdminField label="Description" htmlFor="category-description" hint="Affichée en haut du catalogue quand la catégorie est sélectionnée.">
              <textarea
                id="category-description"
                rows={3}
                className="field-input resize-y"
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </AdminField>
            <AdminField label="Ordre d’affichage" htmlFor="category-order">
              <input
                id="category-order"
                type="number"
                min={0}
                className="field-input"
                value={draft.sortOrder}
                onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })}
              />
            </AdminField>
            <Toggle checked={draft.isActive} onChange={(value) => setDraft({ ...draft, isActive: value })} label="Visible sur le site" description="Décochez pour masquer la catégorie et ses produits." />
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={toDelete !== null}
        title="Supprimer cette catégorie ?"
        message={
          <>
            « <strong>{toDelete?.name}</strong> » sera supprimée. Les catégories contenant des produits ne peuvent pas être supprimées.
          </>
        }
        confirmLabel="Supprimer"
        loading={deleting}
        onConfirm={remove}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
