import Link from "next/link";

export const metadata = {
  title: "Mentions légales — TOXIC Beatmaker",
  description: "Mentions légales du site toxic-files.com",
};

export default function MentionsLegalesPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-4">
        <Link href="/" className="text-xl font-black tracking-widest text-white hover:text-[#b400ff] transition-colors">
          ← RETOUR
        </Link>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-12 space-y-10">
        <div>
          <h1 className="text-3xl font-black tracking-widest text-white mb-2">MENTIONS LÉGALES</h1>
          <p className="text-neutral-500 text-sm font-mono">Conformément aux articles 6-III et 19 de la Loi n° 2004-575 du 21 juin 2004 pour la Confiance dans l'Économie Numérique (LCEN).</p>
        </div>

        {/* 1. Éditeur */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">1. Éditeur du site</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 space-y-2 text-sm text-neutral-300 leading-relaxed">
            <p><span className="text-neutral-500">Nom :</span> Lucas Pestel</p>
            <p><span className="text-neutral-500">Statut :</span> Particulier</p>
            <p><span className="text-neutral-500">Adresse :</span> 7 rue Pierre d'Incarville, 76620 Le Havre, France<br />
              <span className="text-neutral-600 text-xs italic">Adresse administrative uniquement — aucun accueil du public.</span>
            </p>
            <p><span className="text-neutral-500">Email :</span>{" "}
              <a href="mailto:toxicdata10@gmail.com" className="text-[#b400ff] hover:underline">
                toxicdata10@gmail.com
              </a>
            </p>
            <p><span className="text-neutral-500">Site web :</span>{" "}
              <a href="https://toxic-files.com" className="text-[#b400ff] hover:underline">
                toxic-files.com
              </a>
            </p>
          </div>
        </section>

        {/* 2. Hébergement */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">2. Hébergement</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 space-y-2 text-sm text-neutral-300 leading-relaxed">
            <p><span className="text-neutral-500">Hébergeur :</span> IONOS SE</p>
            <p><span className="text-neutral-500">Adresse :</span> Elgendorfer Str. 57, 56410 Montabaur, Allemagne</p>
            <p><span className="text-neutral-500">Site :</span>{" "}
              <a href="https://www.ionos.fr" target="_blank" rel="noopener noreferrer" className="text-[#b400ff] hover:underline">
                www.ionos.fr
              </a>
            </p>
          </div>
        </section>

        {/* 3. Propriété intellectuelle */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">3. Propriété intellectuelle</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-3">
            <p>
              L'ensemble du contenu de ce site (compositions musicales, extraits audio, visuels, textes, logo) est la propriété exclusive de Lucas Pestel et est protégé par les lois françaises et internationales relatives à la propriété intellectuelle.
            </p>
            <p>
              Toute reproduction, représentation, modification, publication ou adaptation, totale ou partielle, de l'un quelconque des éléments du site, quel que soit le moyen ou le procédé utilisé, est interdite sans l'autorisation écrite préalable de Lucas Pestel.
            </p>
            <p>
              L'achat d'une licence (MP3, WAV ou Exclusive) confère à l'acheteur un droit d'utilisation défini par les conditions de la licence choisie, et non un transfert de propriété des droits d'auteur. Les licences exclusives font l'objet d'un contrat séparé.
            </p>
          </div>
        </section>

        {/* 4. Données personnelles */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">4. Données personnelles & RGPD</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-3">
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679) et à la loi Informatique et Libertés du 6 janvier 1978 modifiée, vous disposez de droits sur vos données personnelles.
            </p>
            <p><span className="text-white font-semibold">Données collectées :</span> lors d'un achat, le site collecte votre nom, prénom et adresse email dans le seul but de traiter votre commande et de vous envoyer vos fichiers. Si vous créez un compte, votre mot de passe est stocké de manière chiffrée.</p>
            <p><span className="text-white font-semibold">Finalité :</span> traitement des commandes, envoi des fichiers achetés, accès à l'espace client. Aucune donnée n'est revendue ou partagée avec des tiers à des fins commerciales.</p>
            <p><span className="text-white font-semibold">Durée de conservation :</span> vos données de commande sont conservées pendant la durée légale applicable (5 ans pour les documents commerciaux).</p>
            <p><span className="text-white font-semibold">Vos droits :</span> accès, rectification, suppression, portabilité et opposition. Pour exercer ces droits, contactez :{" "}
              <a href="mailto:toxicdata10@gmail.com" className="text-[#b400ff] hover:underline">toxicdata10@gmail.com</a>.
            </p>
            <p><span className="text-white font-semibold">Responsable du traitement :</span> Lucas Pestel — 7 rue Pierre d'Incarville, 76620 Le Havre.</p>
            <p>
              En cas de réclamation non résolue, vous pouvez saisir la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-[#b400ff] hover:underline">CNIL</a>.
            </p>
          </div>
        </section>

        {/* 5. Cookies */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">5. Cookies</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-3">
            <p>
              Ce site utilise des cookies techniques strictement nécessaires à son fonctionnement (authentification de votre session, maintien du panier). Aucun cookie publicitaire ou de traçage tiers n'est utilisé.
            </p>
            <p>
              Vous pouvez configurer votre navigateur pour refuser les cookies, mais certaines fonctionnalités (connexion à votre compte, panier) pourraient ne plus fonctionner correctement.
            </p>
          </div>
        </section>

        {/* 6. Limitation de responsabilité */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">6. Limitation de responsabilité</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed">
            <p>
              Lucas Pestel s'efforce d'assurer l'exactitude des informations diffusées sur ce site. Toutefois, des erreurs ou omissions peuvent survenir. La responsabilité de l'éditeur ne peut être engagée en cas d'erreur ou d'indisponibilité du site. Les extraits audio proposés à l'écoute sont destinés uniquement à des fins de démonstration.
            </p>
          </div>
        </section>

        {/* 7. Droit applicable */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">7. Droit applicable</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed">
            <p>
              Le présent site et les présentes mentions légales sont soumis au droit français. En cas de litige, et après tentative de résolution amiable, les tribunaux français seront seuls compétents.
            </p>
          </div>
        </section>

        <p className="text-neutral-600 text-xs font-mono text-center pt-4">
          Dernière mise à jour : mai 2026
        </p>
      </div>
    </div>
  );
}
