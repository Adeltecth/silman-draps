import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useSettings } from '../lib/settings';
import { SiteFooter } from './SiteFooter';
import { FloatingWhatsApp, SiteHeader } from './SiteHeader';
import { CloseIcon } from './icons';

function DemoBanner() {
  const { settings } = useSettings();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!settings.demoMode) return;
    setVisible(sessionStorage.getItem('silima-demo-dismissed') !== '1');
  }, [settings.demoMode]);

  if (!settings.demoMode || !visible) return null;

  const dismiss = () => {
    sessionStorage.setItem('silima-demo-dismissed', '1');
    setVisible(false);
  };

  return (
    <div className="bg-ink text-cream-100" data-testid="demo-banner">
      <div className="container-page flex items-start justify-between gap-3 py-2 sm:items-center">
        <p className="text-[0.75rem] leading-snug sm:text-[0.78rem]">
          <span className="mr-2 hidden rounded-full border border-cream-100/30 px-2 py-0.5 text-[0.62rem] uppercase tracking-eyebrow sm:inline">Démonstration</span>
          <span className="sm:hidden">Démo : produits et prix d’exemple à remplacer.</span>
          <span className="hidden sm:inline">
            Version de démonstration : les produits, photos et prix affichés sont des exemples à remplacer avant la mise en ligne.
          </span>
        </p>
        <button type="button" onClick={dismiss} className="mt-0.5 shrink-0 rounded p-1 text-cream-100/80 hover:bg-white/10 hover:text-white" aria-label="Masquer le bandeau de démonstration">
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-sm focus:text-cream-50">
        Aller au contenu
      </a>
      <DemoBanner />
      <SiteHeader />
      <main id="contenu" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
      <FloatingWhatsApp />
    </div>
  );
}
