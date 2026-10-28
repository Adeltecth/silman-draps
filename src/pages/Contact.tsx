import type { ProductListResponse } from '@shared/types';
import { generalWhatsAppMessage } from '@shared/whatsapp';
import { useApi } from '../lib/useApi';
import { useSeo } from '../lib/seo';
import { useSettings } from '../lib/settings';
import { EnquiryForm } from '../components/EnquiryForm';
import { WhatsAppCta, WhatsAppNote } from '../components/whatsapp';
import { Breadcrumbs, SectionHeading } from '../components/ui';
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon, StoreIcon } from '../components/icons';
import { Link } from 'react-router-dom';

export function ContactPage() {
  const { settings } = useSettings();
  const { data } = useApi<ProductListResponse>('/api/public/products?limit=100');

  useSeo(
    `Contact — ${settings.businessName}, ${settings.location || 'Abidjan'}`,
    `Contactez ${settings.businessName} par téléphone ou WhatsApp pour vos draps, housses de couette et rideaux.${settings.phone ? ` Téléphone : ${settings.phone}.` : ''}`
  );

  const contactItems = [
    settings.phone && {
      Icon: PhoneIcon,
      label: 'Téléphone',
      value: settings.phone,
      href: `tel:${settings.phone.replace(/\s/g, '')}`,
    },
    settings.email && {
      Icon: MailIcon,
      label: 'E-mail',
      value: settings.email,
      href: `mailto:${settings.email}`,
    },
    settings.location && {
      Icon: MapPinIcon,
      label: 'Localisation',
      value: settings.location,
    },
    settings.serviceAreas && {
      Icon: StoreIcon,
      label: 'Zones desservies',
      value: settings.serviceAreas,
    },
    settings.openingHours && {
      Icon: ClockIcon,
      label: 'Horaires',
      value: settings.openingHours,
    },
  ].filter(Boolean) as { Icon: typeof PhoneIcon; label: string; value: string; href?: string }[];

  return (
    <div className="container-page pb-16 pt-6 sm:pt-10">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Contact' }]} />

      <div className="mt-6 max-w-2xl">
        <SectionHeading
          eyebrow="Contact"
          title="Parlons de votre projet"
          description="Une question sur un modèle, un prix ou une commande en gros ? Écrivez-nous : nous répondons avec les informations réellement disponibles."
          as="h1"
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
        <div className="space-y-4">
          <div className="rounded-2xl bg-ink p-6 text-cream-100 sm:p-7">
            <p className="text-2xs font-semibold uppercase tracking-eyebrow text-gold-400">Le plus rapide</p>
            <h2 className="mt-2 text-cream-50 text-[1.6rem] leading-snug">WhatsApp</h2>
            <p className="mt-2 text-sm leading-relaxed text-cream-200/80">
              Envoyez-nous un message avec le produit qui vous intéresse : nous vous répondons directement.
            </p>
            <div className="mt-5">
              <WhatsAppCta
                message={generalWhatsAppMessage(settings.businessName)}
                label="Ouvrir WhatsApp"
                className="w-full [&>a]:w-full"
                buttonClassName="!bg-cream-50 !text-ink hover:!bg-cream-100"
                testId="contact-whatsapp"
              />
            </div>
            <p className="mt-3 text-xs leading-relaxed text-cream-200/70">
              Une conversation WhatsApp n’est pas enregistrée dans l’espace d’administration : seules les demandes envoyées via le formulaire du site y
              apparaissent.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-white p-6">
            <h2 className="text-lg">Coordonnées</h2>
            {contactItems.length > 0 ? (
              <ul className="mt-4 space-y-4">
                {contactItems.map(({ Icon, label, value, href }) => (
                  <li key={label} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-100 text-clay-600">
                      <Icon size={17} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-2xs font-semibold uppercase tracking-eyebrow text-ink-500">{label}</p>
                      {href ? (
                        <a href={href} className="mt-0.5 block break-words text-sm font-medium text-ink link-underline">
                          {value}
                        </a>
                      ) : (
                        <p className="mt-0.5 whitespace-pre-line break-words text-sm text-ink">{value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-line p-4 text-sm leading-relaxed text-ink-500">
                Les coordonnées de la boutique ne sont pas encore renseignées. En attendant, utilisez le formulaire de contact : votre demande sera bien
                enregistrée et visible par la boutique.
              </p>
            )}
            {settings.deliveryInfo && (
              <div className="mt-5 border-t border-line pt-4">
                <p className="text-2xs font-semibold uppercase tracking-eyebrow text-ink-500">Livraison</p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-700">{settings.deliveryInfo}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-line bg-cream-50 p-6">
            <h2 className="text-[1rem] font-medium">Vous achetez pour un commerce ?</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
              Utilisez la page dédiée pour indiquer vos quantités et obtenir les conditions de gros.
            </p>
            <Link to="/gros" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-clay-600 link-underline">
              Vente en gros
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <div>
          <div className="rounded-2xl border border-line bg-white p-5 shadow-soft sm:p-7">
            <h2 className="text-xl">Écrire à la boutique</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
              Votre message est enregistré sur le site, puis traité par la boutique. Vous recevrez une réponse par téléphone ou WhatsApp.
            </p>
            <div className="mt-5">
              <EnquiryForm type="retail" products={data?.products ?? []} compact />
            </div>
            <WhatsAppNote className="mt-4" />
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-cream-50 p-5">
            <h2 className="text-sm font-semibold text-ink">Information sur la localisation</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
              L’adresse exacte du point de vente n’est pas publiée sur le site. Contactez la boutique pour connaître le lieu de retrait et organiser votre
              passage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
