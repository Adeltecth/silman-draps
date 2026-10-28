import { type ReactNode } from 'react';
import { shopWhatsAppLink } from '@shared/whatsapp';
import { WhatsAppIcon } from './icons';

type Variant = 'whatsapp' | 'primary' | 'outline' | 'ghost';
type Size = 'md' | 'sm';

const variantClass: Record<Variant, string> = {
  whatsapp: 'btn-whatsapp',
  primary: 'btn-primary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
};

interface WhatsAppCtaProps {
  message: string;
  label: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
  /** Classes visuelles du bouton lui-même (le conteneur ne garde que la mise en page). */
  buttonClassName?: string;
  icon?: boolean;
  ariaLabel?: string;
  testId?: string;
}

/** Lien natif vers le numéro officiel, indépendant du chargement de l’API. */
export function WhatsAppCta({
  message,
  label,
  variant = 'whatsapp',
  size = 'md',
  className = '',
  buttonClassName = '',
  icon = true,
  ariaLabel,
  testId = 'whatsapp-cta',
}: WhatsAppCtaProps) {
  const href = shopWhatsAppLink(message);
  const sizes = size === 'sm' ? 'btn-sm' : '';
  const linkClasses = `${variantClass[variant]} ${sizes} ${className} ${buttonClassName}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={linkClasses}
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {icon && <WhatsAppIcon size={19} />}
      <span>{label}</span>
    </a>
  );
}

/** Note discrète de transparence sur le canal WhatsApp. */
export function WhatsAppNote({ className = '' }: { className?: string }) {
  return (
    <p className={`text-xs leading-relaxed text-ink-500 ${className}`}>
      Votre message ouvre WhatsApp avec un texte pré-rempli. Une demande n’est pas une commande confirmée : Silima Shop vous répond pour valider le prix, la
      disponibilité et les modalités.
    </p>
  );
}
