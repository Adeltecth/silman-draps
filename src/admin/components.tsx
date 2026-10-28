import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Modal, Spinner } from '../components/ui';
import { AlertIcon, CheckCircleIcon, InfoIcon } from '../components/icons';

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 border-b border-line pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl sm:text-3xl">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-white p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function StatCard({ label, value, hint, tone = 'default', to }: { label: string; value: ReactNode; hint?: string; tone?: 'default' | 'alert' | 'good'; to?: string }) {
  const toneClass = tone === 'alert' ? 'text-clay-600' : tone === 'good' ? 'text-moss-600' : 'text-ink';
  const inner = (
    <div className="rounded-2xl border border-line bg-white p-4 transition-colors hover:border-ink/20 sm:p-5">
      <p className="text-2xs font-semibold uppercase tracking-eyebrow text-ink-500">{label}</p>
      <p className={`mt-2 font-display text-2xl ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-ink-500">{hint}</p>}
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export function Badge({ tone = 'neutral', children }: { tone?: 'neutral' | 'ok' | 'warn' | 'danger' | 'info' | 'dark'; children: ReactNode }) {
  const classes = {
    neutral: 'bg-stone-100 text-ink-700 border-stone-200',
    ok: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warn: 'bg-amber-50 text-amber-900 border-amber-200',
    danger: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-sky-50 text-sky-900 border-sky-200',
    dark: 'bg-ink text-cream-50 border-ink',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes}`}>{children}</span>;
}

export function Toggle({ checked, onChange, label, description, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string; disabled?: boolean }) {
  return (
    <label className={`flex cursor-pointer items-start gap-3 ${disabled ? 'opacity-60' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${checked ? 'bg-moss-600' : 'bg-ink/20'}`}
      >
        <span className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-[1.4rem]' : 'translate-x-[0.25rem]'}`} style={{ height: 18, width: 18 }} />
      </button>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        {description && <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">{description}</span>}
      </span>
    </label>
  );
}

export function InlineMessage({ tone, children }: { tone: 'error' | 'success' | 'info'; children: ReactNode }) {
  const cls = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    info: 'border-line bg-cream-50 text-ink-700',
  }[tone];
  const Icon = tone === 'error' ? AlertIcon : tone === 'success' ? CheckCircleIcon : InfoIcon;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${cls}`}>
      <Icon size={17} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmer',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="text-sm leading-relaxed text-ink-700">{message}</div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button type="button" className="btn-outline" onClick={onCancel} disabled={loading}>
          Annuler
        </button>
        <button type="button" className={danger ? 'btn-accent' : 'btn-primary'} onClick={onConfirm} disabled={loading}>
          {loading ? <Spinner /> : null}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

export function SaveBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 z-20 -mx-4 mt-6 border-t border-line bg-cream-50/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">{children}</div>
    </div>
  );
}

export function AdminField({ label, hint, error, htmlFor, children, required, className = '' }: { label: string; hint?: string; error?: string; htmlFor: string; children: ReactNode; required?: boolean; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="field-label">
        {label} {required && <span className="text-clay-600">*</span>}
      </label>
      {children}
      {hint && !error && <p className="field-help">{hint}</p>}
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function useConfirm() {
  const [pending, setPending] = useState<null | (() => void)>(null);
  return {
    confirm: (action: () => void) => setPending(() => action),
    dialog: (
      <ConfirmDialog
        open={pending !== null}
        title="Confirmer la suppression"
        message="Cette action est définitive. Voulez-vous vraiment continuer ?"
        confirmLabel="Supprimer"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          action?.();
        }}
      />
    ),
  };
}
