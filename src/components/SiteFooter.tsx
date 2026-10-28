import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PublicCategory } from '@shared/types';
import { generalWhatsAppMessage } from '@shared/whatsapp';
import { api } from '../lib/api';
import { useSettings } from '../lib/settings';
import { FacebookIcon, InstagramIcon, LogoMark, MailIcon, MapPinIcon, PhoneIcon, TikTokIcon, ClockIcon } from './icons';
import { WhatsAppCta } from './whatsapp';

export function SiteFooter() {
  const { settings } = useSettings();
  const [categories, setCategories] = useState<PublicCategory[]>([]);

  useEffect(() => {
    api<{ categories: PublicCategory[] }>('/api/public/categories')
      .then((data) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, []);

  const socials = [
    { href: settings.social.facebook, label: 'Facebook', Icon: FacebookIcon },
    { href: settings.social.instagram, label: 'Instagram', Icon: InstagramIcon },
    { href: settings.social.tiktok, label: 'TikTok', Icon: TikTokIcon },
  ].filter((s) => s.href);

  const hasContact = settings.phone || settings.email || settings.location || settings.openingHours;

  return (
    <footer className="mt-20 border-t border-line bg-cream-200/60">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr] lg:gap-8">
        <div>
          <Link to="/" className="flex items-center gap-2.5" aria-label={`${settings.businessName} — accueil`}>
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt={`Logo ${settings.businessName}`} className="h-9 w-9 rounded-xl object-cover" width={36} height={36} />
            ) : (
              <LogoMark size={36} />
            )}
            <span className="font-display text-lg text-ink">{settings.businessName}</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-500">
            Draps de lit Jimmy, housses de couette et rideaux pour les particuliers, les commerçants et les revendeurs.
          </p>
          <div className="mt-5">
            <WhatsAppCta
              message={generalWhatsAppMessage(settings.businessName)}
              label="Écrire sur WhatsApp"
              variant="whatsapp"
              size="sm"
              testId="footer-whatsapp"
            />
          </div>
          {socials.length > 0 && (
            <ul className="mt-5 flex items-center gap-2">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${settings.businessName} sur ${label}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-cream-50 text-ink-700 transition-colors hover:border-ink/30 hover:text-ink"
                  >
                    <Icon size={18} />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        <nav aria-label="Liens du pied de page">
          <h2 className="text-2xs font-semibold uppercase tracking-eyebrow text-ink-500">Navigation</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {[
              { to: '/', label: 'Accueil' },
              { to: '/produits', label: 'Nos produits' },
              { to: '/gros', label: 'Vente en gros' },
              { to: '/a-propos', label: 'À propos' },
              { to: '/contact', label: 'Contact' },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="text-ink-700 transition-colors hover:text-clay-600">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Catégories de produits">
          <h2 className="text-2xs font-semibold uppercase tracking-eyebrow text-ink-500">Catégories</h2>
          <ul className="mt-4 space-y-2.5 text-sm">
            {categories.length === 0 && <li className="text-ink-500">Catalogue en préparation</li>}
            {categories.map((c) => (
              <li key={c.id}>
                <Link to={`/produits?categorie=${c.slug}`} className="text-ink-700 transition-colors hover:text-clay-600">
                  {c.name}
                  {c.productCount > 0 && <span className="ml-1.5 text-xs text-ink-500">({c.productCount})</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="text-2xs font-semibold uppercase tracking-eyebrow text-ink-500">Contact</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-700">
            {settings.phone && (
              <li className="flex items-start gap-2.5">
                <PhoneIcon size={17} className="mt-0.5 shrink-0 text-clay-600" />
                <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="link-underline">
                  {settings.phone}
                </a>
              </li>
            )}
            {settings.email && (
              <li className="flex items-start gap-2.5">
                <MailIcon size={17} className="mt-0.5 shrink-0 text-clay-600" />
                <a href={`mailto:${settings.email}`} className="link-underline break-all">
                  {settings.email}
                </a>
              </li>
            )}
            {settings.location && (
              <li className="flex items-start gap-2.5">
                <MapPinIcon size={17} className="mt-0.5 shrink-0 text-clay-600" />
                <span>{settings.location}</span>
              </li>
            )}
            {settings.openingHours && (
              <li className="flex items-start gap-2.5">
                <ClockIcon size={17} className="mt-0.5 shrink-0 text-clay-600" />
                <span className="whitespace-pre-line">{settings.openingHours}</span>
              </li>
            )}
            {!hasContact && <li className="text-ink-500">Coordonnées en cours de mise à jour.</li>}
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-ink-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {settings.businessName}
            {settings.location ? ` · ${settings.location}` : ''}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span>Catalogue et commande par WhatsApp — aucun paiement en ligne.</span>
            <Link to="/admin" className="link-underline">
              Espace administrateur
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
