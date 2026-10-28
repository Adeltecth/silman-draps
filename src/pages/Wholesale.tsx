import { useSearchParams } from 'react-router-dom';
import type { ProductListResponse } from '@shared/types';
import { wholesaleWhatsAppMessage } from '@shared/whatsapp';
import { useApi } from '../lib/useApi';
import { useSeo } from '../lib/seo';
import { useSettings } from '../lib/settings';
import { EnquiryForm } from '../components/EnquiryForm';
import { WhatsAppCta, WhatsAppNote } from '../components/whatsapp';
import { Breadcrumbs, Reveal, SectionHeading } from '../components/ui';
import { CheckIcon, MailIcon, PhoneIcon, StoreIcon } from '../components/icons';

export function WholesalePage() {
  const { settings } = useSettings();
  const [params] = useSearchParams();
  const preselected = params.get('produit') ?? undefined;
  const { data } = useApi<ProductListResponse>('/api/public/products?limit=100');

  useSeo(
    `Vente de draps en gros à Abidjan — commerçants et revendeurs | ${settings.businessName}`,
    `Achetez des draps Jimmy et textiles de maison en gros à Abidjan. Contactez ${settings.businessName} pour les prix de gros, les quantités minimums et la disponibilité.`
  );

  return (
    <div className="pb-16">
      <div className="container-page pt-6 sm:pt-10">
        <Breadcrumbs items={[{ label: 'Accueil', to: '/' }, { label: 'Vente en gros' }]} />
      </div>

      {/* Héros */}
      <section className="container-page mt-6 grid items-center gap-10 pb-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14" aria-labelledby="gros-title">
        <div>
          <p className="eyebrow">Achats professionnels</p>
          <h1 id="gros-title" className="mt-4 text-[2.3rem] leading-[1.08] sm:text-[3rem]">
            Vous êtes commerçant ou revendeur ?
          </h1>
          <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-ink-500">
            Silima Shop fournit les boutiques, les marchés et les revendeurs en draps et articles textiles. Dites-nous ce qui vous intéresse et les quantités
            envisagées : nous vérifions la disponibilité et revenons vers vous avec les conditions de gros.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a href="#formulaire-gros" className="btn-primary w-full sm:w-auto">
              Envoyer une demande de gros
            </a>
            <WhatsAppCta
              message={wholesaleWhatsAppMessage(settings.businessName)}
              label="Discuter sur WhatsApp"
              variant="outline"
              className="w-full sm:w-auto [&>a]:w-full"
              testId="wholesale-hero-whatsapp"
            />
          </div>
          <ul className="mt-7 grid gap-2 text-sm text-ink-700 sm:grid-cols-2">
            {['Boutiques et revendeurs bienvenus', 'Prix de gros communiqués sur demande', 'Plusieurs références possibles', 'Confirmation avant engagement'].map(
              (item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckIcon size={16} className="mt-0.5 shrink-0 text-moss-500" />
                  {item}
                </li>
              )
            )}
          </ul>
        </div>

        <div className="overflow-hidden rounded-[1.75rem] border border-line bg-cream-200 shadow-soft">
          <img
            src="/images/wholesale-folded-800.webp"
            srcSet="/images/wholesale-folded-800.webp 800w, /images/wholesale-folded.webp 1600w"
            sizes="(min-width: 1024px) 44vw, 100vw"
            alt="Draps pliés en pile, prêts pour la vente en gros"
            width={1200}
            height={900}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
      </section>

      {/* Processus */}
      <section className="border-y border-line bg-cream-50/70 py-14" aria-labelledby="processus-title">
        <div className="container-page">
          <SectionHeading
            eyebrow="Comment ça marche"
            title={<span id="processus-title">Un échange simple, sans engagement</span>}
            description="Les conditions de gros sont établies au cas par cas, en fonction des références et des quantités demandées."
          />
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Vous nous écrivez', text: 'Formulaire ou WhatsApp, avec les produits et les quantités qui vous intéressent.' },
              { title: 'Nous vérifions', text: 'Nous regardons le stock disponible et les références concernées.' },
              { title: 'Nous vous répondons', text: 'Prix de gros, quantités minimums et disponibilité vous sont communiqués.' },
              { title: 'Vous confirmez', text: 'Si les conditions vous conviennent, nous organisons la suite ensemble.' },
            ].map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-line bg-white p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-clay-50 font-display text-sm text-clay-600">{i + 1}</span>
                <h3 className="mt-3 text-[1.02rem] font-medium">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Formulaire */}
      <section id="formulaire-gros" className="container-page scroll-mt-24 py-14 sm:py-16" aria-labelledby="form-gros-title">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-12">
          <div>
            <SectionHeading
              eyebrow="Demande de gros"
              title={<span id="form-gros-title">Parlez-nous de votre besoin</span>}
              description="Renseignez vos coordonnées et les produits qui vous intéressent. Nous vous répondons avec les informations disponibles."
            />
            <div className="mt-6">
              <EnquiryForm type="wholesale" products={data?.products ?? []} defaultProductSlug={preselected} />
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-2xl border border-line bg-cream-50 p-6">
              <h2 className="text-lg">À savoir</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-700">
                Les prix de gros, les quantités minimums et la disponibilité doivent être confirmés par Silima Shop. Aucun tarif professionnel n’est publié
                sur ce site : chaque demande est étudiée selon les références et les volumes.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-700">
                Les conditions de paiement, de retrait ou de livraison sont convenues directement avec la boutique.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-white p-6">
              <h2 className="text-lg">Contact direct</h2>
              <p className="mt-1.5 text-sm text-ink-500">Pour une réponse rapide, WhatsApp reste le plus pratique.</p>
              <div className="mt-4 space-y-2.5">
                <WhatsAppCta message={wholesaleWhatsAppMessage(settings.businessName)} label="Écrire sur WhatsApp" className="w-full [&>a]:w-full" testId="wholesale-card-whatsapp" />
                {settings.phone && (
                  <a href={`tel:${settings.phone.replace(/\s/g, '')}`} className="flex items-center gap-2.5 rounded-xl border border-line px-4 py-3 text-sm text-ink hover:border-ink/25">
                    <PhoneIcon size={17} className="text-clay-600" />
                    {settings.phone}
                  </a>
                )}
                {settings.email && (
                  <a href={`mailto:${settings.email}`} className="flex items-center gap-2.5 rounded-xl border border-line px-4 py-3 text-sm text-ink hover:border-ink/25">
                    <MailIcon size={17} className="text-clay-600" />
                    <span className="break-all">{settings.email}</span>
                  </a>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-dashed border-line p-6">
              <div className="flex items-center gap-2 text-ink-700">
                <StoreIcon size={18} className="text-clay-600" />
                <h2 className="text-[1rem] font-medium">Vous vendez déjà des draps ?</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                Indiquez dans votre message les modèles que vous vendez le mieux : cela nous aide à vous orienter vers les références adaptées.
              </p>
            </div>
            <WhatsAppNote />
          </aside>
        </div>
      </section>

      <Reveal className="container-page">
        <div className="rounded-2xl bg-ink p-7 text-cream-100 sm:flex sm:items-center sm:justify-between sm:gap-8 sm:p-9">
          <div>
            <h2 className="text-cream-50 text-[1.5rem] leading-snug sm:text-2xl">Vous préférez voir les modèles d’abord ?</h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-cream-200/80">
              Parcourez le catalogue, puis revenez ici pour une demande de gros avec les références qui vous intéressent.
            </p>
          </div>
          <a href="/produits" className="btn mt-5 w-full bg-cream-50 text-ink hover:bg-cream-100 sm:mt-0 sm:w-auto">
            Voir le catalogue
          </a>
        </div>
      </Reveal>
    </div>
  );
}
