import { Link } from 'react-router-dom';
import { useSeo } from '../lib/seo';
import { useSettings } from '../lib/settings';

export function NotFoundPage() {
  const { settings } = useSettings();
  useSeo(`Page introuvable | ${settings.businessName}`, 'La page demandée n’existe pas ou a été déplacée.');

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">Erreur 404</p>
      <h1 className="mt-3 text-3xl sm:text-4xl">Cette page n’existe pas</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-500">
        Le lien est peut-être incomplet, ou la page a été déplacée. Vous pouvez revenir à l’accueil ou parcourir le catalogue.
      </p>
      <div className="mt-7 flex flex-col gap-3 sm:flex-row">
        <Link to="/" className="btn-primary">
          Retour à l’accueil
        </Link>
        <Link to="/produits" className="btn-outline">
          Voir le catalogue
        </Link>
      </div>
    </div>
  );
}
