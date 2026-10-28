import { Link } from 'react-router-dom';
import { generalWhatsAppMessage } from '@shared/whatsapp';
import { useSeo } from '../lib/seo';
import { useSettings } from '../lib/settings';
import { WhatsAppCta } from '../components/whatsapp';
import { Breadcrumbs, SectionHeading } from '../components/ui';
import { CheckIcon } from '../components/icons';

export function AboutPage() {
  const { settings } = useSettings();

  useSeo(
    `À propos de ${settings.businessName} — textiles de maison à Abidjan`,
    `${settings.businessName} propose des draps, housses de couette et rideaux aux particuliers et aux commerçants, à ${settings.location || 'Abidjan'}.`
  );

  return (
    <div className="container-page pb-16 pt-6 sm:pt-10">
      <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'À propos' }]} />

      <div className="mt-6 grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        <div>
          <SectionHeading
            eyebrow="La boutique"
            title={`${settings.businessName}, à ${settings.location || 'Adjamé, Abidjan'}`}
            as="h1"
          />
          <div className="mt-6 space-y-4 text-[0.98rem] leading-relaxed text-ink-700">
            <p>
              Silima Shop est une boutique de textiles de maison implantée à Adjamé, à Abidjan. Nous y proposons des parures de lit de la marque Jimmy,
              ainsi que d’autres articles textiles pour la maison, comme les housses de couette et les rideaux, lorsqu’ils sont disponibles.
            </p>
            <p>
              Nos clients sont aussi bien des particuliers qui équipent leur chambre ou préparent un cadeau, que des commerçants et revendeurs qui
              s’approvisionnent pour leur boutique ou leur marché.
            </p>
            <p>
              Le site présente les modèles publiés par la boutique. Chaque fiche indique, quand ces informations sont renseignées, le prix et l’état du
              stock. Le reste se règle simplement, par WhatsApp : nous confirmons la disponibilité et les modalités avant toute commande.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { title: 'Du détail', text: 'Pour votre maison, une chambre ou un cadeau.' },
              { title: 'Du gros', text: 'Pour les boutiques, marchés et revendeurs.' },
              { title: 'Un contact direct', text: 'WhatsApp, téléphone ou formulaire.' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-center gap-2 text-ink">
                  <CheckIcon size={16} className="text-moss-500" />
                  <h2 className="text-sm font-medium">{item.title}</h2>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/produits" className="btn-primary w-full sm:w-auto">
              Découvrir nos produits
            </Link>
            <WhatsAppCta message={generalWhatsAppMessage(settings.businessName)} label="Nous écrire" variant="outline" className="w-full sm:w-auto [&>a]:w-full" testId="about-whatsapp" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-[1.75rem] border border-line bg-cream-200 shadow-soft">
            <img
              src="/images/about-bedroom.webp"
              srcSet="/images/about-bedroom-800.webp 800w, /images/about-bedroom.webp 1600w"
              sizes="(min-width: 1024px) 42vw, 100vw"
              alt="Chambre préparée avec une parure de lit aux tons naturels"
              width={1000}
              height={1250}
              loading="lazy"
              className="aspect-[4/5] w-full object-cover"
            />
          </div>
          <div className="rounded-2xl border border-line bg-cream-50 p-5">
            <p className="text-sm leading-relaxed text-ink-700">
              <strong className="font-medium text-ink">Une précision utile :</strong> les photos, prix et descriptions publiés sur ce site proviennent des
              informations saisies par la boutique. Si une information manque, nous préférons vous la confirmer directement plutôt que de l’inventer.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
