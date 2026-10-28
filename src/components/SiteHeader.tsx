import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { generalWhatsAppMessage, normaliseWhatsAppNumber } from '@shared/whatsapp';
import { useSettings } from '../lib/settings';
import { LogoMark, MenuIcon, CloseIcon, WhatsAppIcon } from './icons';
import { WhatsAppCta } from './whatsapp';

const NAV = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/produits', label: 'Nos produits' },
  { to: '/gros', label: 'Vente en gros' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/contact', label: 'Contact' },
];

export function SiteHeader() {
  const { settings } = useSettings();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors duration-300 ${
        scrolled || open ? 'border-line bg-cream-100/95 backdrop-blur supports-[backdrop-filter]:bg-cream-100/80' : 'border-transparent bg-cream-100'
      }`}
    >
      <div className="container-page flex h-[68px] items-center justify-between gap-4 sm:h-[76px]">
        <Link to="/" className="flex items-center gap-2.5" aria-label={`${settings.businessName} — accueil`}>
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt={`Logo ${settings.businessName}`} className="h-9 w-9 rounded-xl object-cover" width={36} height={36} />
          ) : (
            <LogoMark size={36} />
          )}
          <span className="flex flex-col leading-none">
            <span className="font-display text-[1.15rem] tracking-tight text-ink">{settings.businessName}</span>
            <span className="mt-1 hidden text-[0.65rem] uppercase tracking-eyebrow text-ink-500 sm:block">Draps & textiles de maison</span>
          </span>
        </Link>

        <nav aria-label="Navigation principale" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `rounded-full px-3.5 py-2 text-[0.92rem] transition-colors ${isActive ? 'bg-ink/[0.055] font-medium text-ink' : 'text-ink-700 hover:bg-ink/[0.04] hover:text-ink'}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <WhatsAppCta
            message={generalWhatsAppMessage(settings.businessName)}
            label="Commander sur WhatsApp"
            variant="whatsapp"
            size="sm"
            className="[&>a]:px-4 [&>a]:text-sm"
            testId="header-whatsapp"
          />
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 text-ink lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="menu-mobile"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {open ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
        </button>
      </div>

      {open && (
        <div id="menu-mobile" className="border-t border-line bg-cream-100 lg:hidden">
          <nav aria-label="Navigation mobile" className="container-page py-4">
            <ul className="flex flex-col">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex min-h-[52px] items-center justify-between border-b border-line/70 text-[1rem] ${isActive ? 'font-semibold text-clay-600' : 'text-ink'}`
                    }
                  >
                    {item.label}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="text-ink-500/60">
                      <path d="m9 5 7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-5 space-y-3 pb-2">
              <WhatsAppCta
                message={generalWhatsAppMessage(settings.businessName)}
                label="Commander sur WhatsApp"
                variant="whatsapp"
                className="[&>a]:w-full [&>div]:w-full"
                testId="menu-whatsapp"
              />
              {(settings.phone || settings.email) && (
                <p className="pt-1 text-center text-xs text-ink-500">
                  {settings.phone && (
                    <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="link-underline">
                      {settings.phone}
                    </a>
                  )}
                  {settings.phone && settings.email && ' · '}
                  {settings.email && (
                    <a href={`mailto:${settings.email}`} className="link-underline">
                      {settings.email}
                    </a>
                  )}
                </p>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

export function FloatingWhatsApp() {
  const { settings } = useSettings();
  // Pas de bouton flottant si le numéro n'est pas configuré : le CTA d'en-tête affiche l'aide nécessaire.
  if (!normaliseWhatsAppNumber(settings.whatsappNumber).ok) return null;
  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-30 hidden lg:block">
      <div className="pointer-events-auto">
        <WhatsAppCta
          message={generalWhatsAppMessage(settings.businessName)}
          label="WhatsApp"
          variant="whatsapp"
          icon
          className="shadow-lift [&>a]:gap-2 [&>a]:rounded-full [&>a]:px-5"
          testId="floating-whatsapp"
        />
      </div>
      <span className="sr-only">
        <WhatsAppIcon />
      </span>
    </div>
  );
}
