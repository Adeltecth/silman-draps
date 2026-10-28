import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { imageSrcSet, imageVariant } from '@shared/images';
import { AlertIcon, CheckCircleIcon, InfoIcon } from './icons';

// --------------------------------------------------------------- Images

interface SmartImageProps {
  path: string;
  alt: string;
  sizes?: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  ratio?: string;
  style?: CSSProperties;
}

/** Image responsive : variantes WebP générées à l'upload, lazy-loading et ratio fixe anti-CLS. */
export function SmartImage({ path, alt, sizes = '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw', className = '', imgClassName = '', priority = false, ratio, style }: SmartImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div
      className={`relative overflow-hidden bg-cream-200 ${className}`}
      style={{ aspectRatio: ratio, ...style }}
    >
      <img
        src={imageVariant(path, 960)}
        srcSet={imageSrcSet(path)}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-[opacity,transform] duration-500 ease-out ${loaded ? 'opacity-100' : 'opacity-0'} ${imgClassName}`}
      />
    </div>
  );
}

// --------------------------------------------------------------- Reveal

export function Reveal({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      node.classList.add('is-visible');
      return;
    }
    // Sécurité : si l'élément est déjà dans le viewport (ou si l'observateur ne se déclenche pas),
    // le contenu reste visible. Une animation ne doit jamais masquer du contenu.
    const rect = node.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.98 && rect.bottom > 0) {
      node.classList.add('is-visible');
      return;
    }
    const fallback = window.setTimeout(() => node.classList.add('is-visible'), 2500);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            node.classList.add('is-visible');
            observer.unobserve(node);
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    observer.observe(node);
    return () => {
      window.clearTimeout(fallback);
      observer.disconnect();
    };
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

// --------------------------------------------------------------- Alerts

export function Alert({ tone = 'error', children, className = '' }: { tone?: 'error' | 'success' | 'info' | 'warning'; children: ReactNode; className?: string }) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-800',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    info: 'border-line bg-cream-50 text-ink-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  }[tone];
  const Icon = tone === 'success' ? CheckCircleIcon : tone === 'error' || tone === 'warning' ? AlertIcon : InfoIcon;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${styles} ${className}`}>
      <Icon size={18} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// --------------------------------------------------------------- Champs de formulaire

interface FieldProps {
  label: string;
  name: string;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode;
  required?: boolean;
  hint?: string;
  error?: string;
  className?: string;
}

export function Field({ label, name, required, hint, error, children, className = '' }: FieldProps) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label} {required ? <span className="text-clay-600">*</span> : <span className="text-ink-500/70 text-xs font-normal">(facultatif)</span>}
      </label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': !!error })}
      {hint && !error && (
        <p id={hintId} className="field-help">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, description, align = 'left', as: Tag = 'h2', className = '' }: { eyebrow?: string; title: ReactNode; description?: ReactNode; align?: 'left' | 'center'; as?: 'h1' | 'h2' | 'h3'; className?: string }) {
  return (
    <div className={`${align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'} ${className}`}>
      {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
      <Tag className="text-[1.75rem] leading-[1.15] sm:text-4xl">{title}</Tag>
      {description && <div className="mt-4 text-[0.98rem] leading-relaxed text-ink-500 sm:text-base">{description}</div>}
    </div>
  );
}

export function Spinner({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`animate-spin ${className}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" fill="none" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line bg-white/60 px-6 py-14 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cream-200 text-clay-600">
        <InfoIcon size={22} />
      </div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-500">{description}</p>
      {action && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{action}</div>}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Fil d’Ariane" className="text-sm text-ink-500">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true" className="text-ink-500/40">/</span>}
            {item.to ? (
              <a href={item.to} className="link-underline hover:text-ink">
                {item.label}
              </a>
            ) : (
              <span aria-current="page" className="text-ink-800">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function Modal({ open, onClose, title, children, footer, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && ref.current) {
        const focusables = ref.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])');
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    setTimeout(() => ref.current?.querySelector<HTMLElement>('button, a, input, textarea, select')?.focus(), 30);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-y-auto bg-ink/50 p-0 sm:items-center sm:p-6" onClick={onClose} role="presentation">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`w-full ${wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'} max-h-[92vh] overflow-y-auto rounded-t-2xl bg-cream-50 p-5 shadow-lift sm:rounded-2xl sm:p-6`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="modal-title" className="text-xl">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-ink-500 hover:bg-ink/5 hover:text-ink" aria-label="Fermer">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-3">{footer}</div>}
      </div>
    </div>
  );
}
