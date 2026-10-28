import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useSettings } from '../lib/settings';
import { useAuth } from './AdminApp';
import { LogoMark, LogoutIcon } from '../components/icons';
import { useSeo } from '../lib/seo';

const TABS = [
  { to: '/admin', label: 'Tableau de bord', end: true },
  { to: '/admin/produits', label: 'Produits' },
  { to: '/admin/categories', label: 'Catégories' },
  { to: '/admin/demandes', label: 'Demandes' },
  { to: '/admin/parametres', label: 'Paramètres' },
];

export function AdminLayout() {
  const { settings } = useSettings();
  const { user, logout } = useAuth();
  const location = useLocation();

  useSeo(`Administration | ${settings.businessName}`, 'Espace de gestion privé.');

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="sticky top-0 z-30 border-b border-line bg-cream-100/95 backdrop-blur">
        <div className="container-page flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-2.5">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <LogoMark size={32} />
            )}
            <div className="min-w-0">
              <p className="truncate font-display text-[1.05rem] leading-tight text-ink">{settings.businessName}</p>
              <p className="text-2xs uppercase tracking-eyebrow text-ink-500">Espace de gestion</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" target="_blank" rel="noopener noreferrer" className="btn-ghost btn-sm hidden sm:inline-flex">
              Voir le site
            </a>
            <button
              type="button"
              onClick={() => void logout()}
              className="btn-ghost btn-sm"
              aria-label={`Se déconnecter${user ? ` (${user.email})` : ''}`}
            >
              <LogoutIcon size={18} />
              <span className="hidden sm:inline">Déconnexion</span>
            </button>
          </div>
        </div>
        <nav aria-label="Navigation de l’administration" className="border-t border-line/70">
          <div className="container-page flex flex-wrap gap-1 py-2 sm:flex-nowrap sm:overflow-x-auto">
            {TABS.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-full px-3.5 py-2 text-sm transition-colors ${isActive ? 'bg-ink text-cream-50' : 'text-ink-700 hover:bg-ink/[0.05]'}`
                }
              >
                {tab.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      <main className="container-page max-w-6xl py-6 sm:py-8">
        <Outlet />
      </main>

      <footer className="container-page py-8 text-xs text-ink-500">
        <p>
          Administration {settings.businessName} · {user?.email}
        </p>
        <p className="mt-1">
          Les conversations WhatsApp ne sont pas enregistrées ici : seules les demandes envoyées via les formulaires du site apparaissent dans « Demandes ».
        </p>
      </footer>
    </div>
  );
}
