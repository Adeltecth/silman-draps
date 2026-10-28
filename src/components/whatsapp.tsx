import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { buildWhatsAppLink } from '@shared/whatsapp';
import { useSettings } from '../lib/settings';
import { WhatsAppIcon } from './icons';
import { Alert } from './ui';

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

/**
 * Bouton WhatsApp centralisé :
 * - lien wa.me généré et validé uniquement si le numéro est configuré ;
 * - jamais de lien cassé : un message d'aide est affiché à la place.
 */
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
  const { settings } = useSettings();
  const href = buildWhatsAppLink(settings.whatsappNumber, message);
  const [showNotice, setShowNotice] = useState(false);
  const sizes = size === 'sm' ? 'btn-sm' : '';
  const linkClasses = `${variantClass[variant]} ${sizes} ${className} ${buttonClassName}`;
  const fallbackClasses = `${variantClass[variant]} ${sizes} ${buttonClassName} w-full`;

  if (href) {
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

  return (
    <div className={className}>
      <button
        type="button"
        className={fallbackClasses}
        onClick={() => setShowNotice((v) => !v)}
        aria-expanded={showNotice}
        aria-describedby={showNotice ? 'whatsapp-config-notice' : undefined}
        aria-label={ariaLabel}
        data-testid={testId}
      >
        {icon && <WhatsAppIcon size={19} />}
        <span>{label}</span>
      </button>
      {showNotice && (
        <Alert tone="info" className="mt-3 text-left" >
          <p id="whatsapp-config-notice" className="leading-relaxed">
            {settings.demoMode ? (
              <>
                Le numéro WhatsApp de la boutique n’est pas encore configuré. Ajoutez-le dans{' '}
                <Link to="/admin/parametres" className="link-underline font-medium">
                  Administration → Paramètres
                </Link>{' '}
                pour activer les commandes WhatsApp.
              </>
            ) : (
              <>
                Le contact WhatsApp est momentanément indisponible. Merci de nous appeler
                {settings.phone ? ` au ${settings.phone}` : ''} ou d’utiliser le{' '}
                <Link to="/contact" className="link-underline font-medium">
                  formulaire de contact
                </Link>
                .
              </>
            )}
          </p>
        </Alert>
      )}
    </div>
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
