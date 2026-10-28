import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PublicProduct } from '@shared/types';
import { enquiryWhatsAppMessage } from '@shared/whatsapp';
import { api, ApiError } from '../lib/api';
import { useSettings } from '../lib/settings';
import { WhatsAppCta } from './whatsapp';
import { Alert, Field, Spinner } from './ui';
import { CheckCircleIcon } from './icons';

interface EnquiryFormProps {
  type: 'retail' | 'wholesale';
  products?: PublicProduct[];
  defaultProductSlug?: string;
  defaultMessage?: string;
  compact?: boolean;
  onSubmitted?: () => void;
}

interface SuccessState {
  reference: string;
  message: string;
  name: string;
}

const OTHER = '__other__';
const SEVERAL = '__several__';

export function EnquiryForm({ type, products = [], defaultProductSlug, defaultMessage = '', compact = false, onSubmitted }: EnquiryFormProps) {
  const { settings } = useSettings();
  const initialProduct = useMemo(() => {
    if (!defaultProductSlug) return '';
    const match = products.find((p) => p.slug === defaultProductSlug);
    return match ? String(match.id) : '';
  }, [defaultProductSlug, products]);

  const [form, setForm] = useState({
    name: '',
    businessName: '',
    phone: '',
    email: '',
    productId: initialProduct,
    otherProduct: '',
    quantity: type === 'wholesale' ? '' : '',
    message: defaultMessage,
    website: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<SuccessState | null>(null);

  const update = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Merci d’indiquer votre nom.';
    const digits = form.phone.replace(/\D/g, '');
    if (digits.length < 6) next.phone = 'Indiquez un numéro joignable (au moins 6 chiffres).';
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = 'Cette adresse e-mail semble incorrecte.';
    if (form.productId === OTHER && form.otherProduct.trim().length < 2) next.otherProduct = 'Précisez le produit qui vous intéresse.';
    if (type === 'wholesale') {
      const qty = Number(form.quantity);
      if (!form.quantity || !Number.isFinite(qty) || qty < 1) next.quantity = 'Indiquez une quantité estimée (au moins 1).';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setGlobalError(null);
    if (!validate()) {
      const first = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      first?.focus();
      return;
    }
    setSubmitting(true);
    try {
      const productId = form.productId && form.productId !== OTHER && form.productId !== SEVERAL ? Number(form.productId) : null;
      const selectedProduct = products.find((p) => String(p.id) === form.productId);
      const productLabel =
        form.productId === OTHER
          ? form.otherProduct.trim()
          : form.productId === SEVERAL
            ? 'Plusieurs produits'
            : selectedProduct
              ? selectedProduct.reference
                ? `${selectedProduct.name} (réf. ${selectedProduct.reference})`
                : selectedProduct.name
              : null;

      const response = await api<{ reference: string; message: string }>('/api/public/enquiries', {
        method: 'POST',
        body: {
          type,
          name: form.name,
          phone: form.phone,
          email: form.email,
          businessName: form.businessName,
          productId,
          productLabel,
          quantity: form.quantity ? Number(form.quantity) : null,
          message: form.message,
          website: form.website,
        },
      });
      setSuccess({ reference: response.reference, message: response.message, name: form.name });
      onSubmitted?.();
    } catch (err) {
      if (err instanceof ApiError) {
        if (Object.keys(err.fields).length > 0) setErrors(err.fields);
        setGlobalError(err.message);
      } else {
        setGlobalError('Votre demande n’a pas pu être envoyée. Merci de réessayer ou de nous écrire sur WhatsApp.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8" role="status" aria-live="polite">
        <div className="flex items-start gap-3">
          <CheckCircleIcon size={24} className="mt-0.5 shrink-0 text-emerald-700" />
          <div>
            <h3 className="text-xl text-ink">Demande enregistrée</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-700">
              Merci {success.name.split(' ')[0]}. Votre demande porte la référence <strong>{success.reference}</strong>. {success.message}
            </p>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-emerald-200 bg-white/70 p-4">
          <p className="text-sm leading-relaxed text-ink-700">
            Pour accélérer le traitement, vous pouvez aussi nous écrire sur WhatsApp en rappelant votre référence <strong>{success.reference}</strong>.
          </p>
          <div className="mt-3">
            <WhatsAppCta
              message={enquiryWhatsAppMessage(
                settings.businessName,
                success.name,
                `Je viens d’envoyer une demande sur votre site (référence ${success.reference}). Pouvez-vous me confirmer la disponibilité et les modalités ?`
              )}
              label="Continuer sur WhatsApp"
              size="sm"
              testId="enquiry-success-whatsapp"
            />
          </div>
        </div>
        <button
          type="button"
          className="mt-5 text-sm font-medium text-clay-600 link-underline"
          onClick={() => {
            setSuccess(null);
            setForm({
              name: '',
              businessName: '',
              phone: '',
              email: '',
              productId: '',
              otherProduct: '',
              quantity: '',
              message: '',
              website: '',
            });
          }}
        >
          Envoyer une autre demande
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className={compact ? '' : 'rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7'}>
      {globalError && (
        <Alert tone="error" className="mb-5">
          {globalError}{' '}
          <Link to="/contact" className="font-semibold underline">
            Voir les autres moyens de contact
          </Link>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Votre nom" name="name" required error={errors.name}>
          {(props) => (
            <input
              {...props}
              name="name"
              type="text"
              autoComplete="name"
              className="field-input"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Ex. Aminata K."
              required
            />
          )}
        </Field>

        <Field label="Téléphone / WhatsApp" name="phone" required error={errors.phone} hint="Numéro joignable, avec l’indicatif si possible.">
          {(props) => (
            <input
              {...props}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              className="field-input"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              placeholder="+225 07 00 00 00 00"
              required
            />
          )}
        </Field>

        {type === 'wholesale' && (
          <Field label="Nom de l’entreprise" name="businessName" error={errors.businessName} hint="Boutique, marché, société…">
            {(props) => (
              <input
                {...props}
                name="businessName"
                type="text"
                autoComplete="organization"
                className="field-input"
                value={form.businessName}
                onChange={(e) => update('businessName', e.target.value)}
                placeholder="Ex. Boutique Awa"
              />
            )}
          </Field>
        )}

        <Field label="E-mail" name="email" error={errors.email} hint="Facultatif, pour vous répondre par écrit.">
          {(props) => (
            <input
              {...props}
              name="email"
              type="email"
              autoComplete="email"
              className="field-input"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              placeholder="vous@exemple.com"
            />
          )}
        </Field>

        <Field label={type === 'wholesale' ? 'Produit concerné' : 'Produit concerné'} name="productId" error={errors.productId} className="sm:col-span-2">
          {(props) => (
            <select {...props} name="productId" className="field-input" value={form.productId} onChange={(e) => update('productId', e.target.value)}>
              <option value="">Je souhaite des informations générales</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.reference ? ` — réf. ${p.reference}` : ''}
                </option>
              ))}
              <option value={SEVERAL}>Plusieurs produits</option>
              <option value={OTHER}>Autre produit / je ne sais pas encore</option>
            </select>
          )}
        </Field>

        {form.productId === OTHER && (
          <div className="sm:col-span-2">
            <Field label="Précisez le produit" name="otherProduct" required error={errors.otherProduct}>
              {(props) => (
                <input
                  {...props}
                  name="otherProduct"
                  type="text"
                  className="field-input"
                  value={form.otherProduct}
                  onChange={(e) => update('otherProduct', e.target.value)}
                  placeholder="Ex. draps 2 places, housse de couette 200×200…"
                />
              )}
            </Field>
          </div>
        )}

        <Field
          label={type === 'wholesale' ? 'Quantité estimée' : 'Quantité souhaitée'}
          name="quantity"
          required={type === 'wholesale'}
          error={errors.quantity}
          hint={type === 'wholesale' ? 'Nombre de pièces envisagé pour votre commerce.' : 'Facultatif.'}
        >
          {(props) => (
            <input
              {...props}
              name="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={100000}
              className="field-input"
              value={form.quantity}
              onChange={(e) => update('quantity', e.target.value)}
              placeholder="Ex. 24"
            />
          )}
        </Field>

        <div className="hidden" aria-hidden="true">
          <label htmlFor="field-website">Ne pas remplir</label>
          <input id="field-website" name="website" type="text" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => update('website', e.target.value)} />
        </div>

        <Field label="Message" name="message" error={errors.message} className="sm:col-span-2" hint="Tailles, coloris, délais souhaités…">
          {(props) => (
            <textarea
              {...props}
              name="message"
              rows={4}
              className="field-input resize-y"
              value={form.message}
              onChange={(e) => update('message', e.target.value)}
              placeholder={type === 'wholesale' ? 'Décrivez votre besoin : références, quantités par modèle, zone de vente…' : 'Dites-nous ce que vous recherchez.'}
            />
          )}
        </Field>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" className="btn-primary w-full sm:w-auto" disabled={submitting}>
          {submitting ? (
            <>
              <Spinner /> Envoi en cours…
            </>
          ) : (
            'Envoyer ma demande'
          )}
        </button>
        <p className="text-xs leading-relaxed text-ink-500 sm:max-w-xs">
          Votre demande est enregistrée sur le site et transmise à la boutique. Elle ne devient une commande qu’après confirmation.
        </p>
      </div>
    </form>
  );
}
