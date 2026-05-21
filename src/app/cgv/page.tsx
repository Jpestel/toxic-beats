import Link from "next/link";

export const metadata = {
  title: "Conditions Générales de Vente — TOXIC Beatmaker",
  description: "Conditions Générales de Vente du site toxic-files.com",
};

export default function CGVPage() {
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
          <h1 className="text-3xl font-black tracking-widest text-white mb-2">CONDITIONS GÉNÉRALES DE VENTE</h1>
          <p className="text-neutral-500 text-sm font-mono">En vigueur au 1er mai 2026 — toxic-files.com</p>
        </div>

        {/* Article 1 */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">Article 1 — Vendeur</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 space-y-2 text-sm text-neutral-300 leading-relaxed">
            <p><span className="text-neutral-500">Nom :</span> PESTEL Lucas</p>
            <p><span className="text-neutral-500">Statut :</span> Particulier (immatriculation en cours)</p>
            <p>
              <span className="text-neutral-500">Adresse :</span> 7 rue Pierre d'Incarville, 76620 Le Havre, France<br />
              <span className="text-neutral-600 text-xs italic">Adresse administrative uniquement — aucun accueil du public.</span>
            </p>
            <p>
              <span className="text-neutral-500">Email :</span>{" "}
              <a href="mailto:toxicdata10@gmail.com" className="text-[#b400ff] hover:underline">
                toxicdata10@gmail.com
              </a>
            </p>
            <p>
              <span className="text-neutral-500">Site :</span>{" "}
              <a href="https://toxic-files.com" className="text-[#b400ff] hover:underline">
                toxic-files.com
              </a>
            </p>
          </div>
        </section>

        {/* Article 2 */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">Article 2 — Objet</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-3">
            <p>
              Les présentes Conditions Générales de Vente (CGV) régissent l'ensemble des ventes de contenus numériques
              (beats, instrumentales, kits de samples) réalisées sur le site <strong className="text-white">toxic-files.com</strong>.
            </p>
            <p>
              Toute commande passée sur ce site implique l'acceptation pleine et entière des présentes CGV.
              Le vendeur se réserve le droit de les modifier à tout moment ; les CGV applicables sont celles en vigueur
              au jour de la commande.
            </p>
          </div>
        </section>

        {/* Article 3 */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">Article 3 — Produits</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-4">
            <p>Le site propose trois types de licences pour les beats / instrumentales :</p>
            <div className="space-y-3">
              <div className="border-l-2 border-[#b400ff] pl-4">
                <p className="text-white font-semibold">Licence MP3</p>
                <p>Fichier audio MP3 (320 kbps). Usage personnel, amateur et semi-professionnel autorisé. Distribution limitée à 10 000 exemplaires. Le vendeur conserve le droit de vendre la même instrumentale à d'autres acheteurs.</p>
              </div>
              <div className="border-l-2 border-[#b400ff] pl-4">
                <p className="text-white font-semibold">Licence MP3 + WAV</p>
                <p>Fichiers MP3 (320 kbps) et WAV (qualité studio). Usage professionnel autorisé. Distribution limitée à 50 000 exemplaires. Le vendeur conserve le droit de vendre la même instrumentale à d'autres acheteurs.</p>
              </div>
              <div className="border-l-2 border-[#b400ff] pl-4">
                <p className="text-white font-semibold">Licence Exclusive (ZIP)</p>
                <p>Archive ZIP contenant les fichiers MP3, WAV et les stems (pistes séparées). Usage commercial illimité, distribution illimitée. Une fois vendue, l'instrumentale est retirée de la vente et n'est plus proposée à d'autres acheteurs. Un contrat de cession exclusive est fourni sur demande.</p>
              </div>
            </div>
            <p>
              Le site propose également des <strong className="text-white">kits de samples</strong> (boucles, one-shots, etc.)
              livrés sous forme d'archive ZIP, utilisables librement dans vos productions musicales personnelles ou commerciales,
              sans royalties.
            </p>
            <p>
              Des extraits audio (previews) sont mis à disposition à des fins d'écoute et d'évaluation avant achat.
              Ces extraits sont protégés et ne peuvent être téléchargés, reproduits ou utilisés sans autorisation.
            </p>
          </div>
        </section>

        {/* Article 4 */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">Article 4 — Prix</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-3">
            <p>
              Les prix sont indiqués en euros (€), toutes taxes comprises. En sa qualité de particulier non assujetti à la TVA,
              le vendeur ne facture pas de TVA. Aucune taxe supplémentaire n'est appliquée.
            </p>
            <p>
              Le vendeur se réserve le droit de modifier ses prix à tout moment. Le prix applicable est celui affiché
              sur le site au moment de la validation de la commande.
            </p>
            <p>
              Des codes promotionnels peuvent être proposés ponctuellement. Ils sont valables pour une durée limitée
              et dans les conditions précisées lors de leur diffusion.
            </p>
          </div>
        </section>

        {/* Article 5 */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">Article 5 — Commande</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-3">
            <p>
              Pour passer commande, l'acheteur doit fournir son prénom, son nom et une adresse email valide.
              La création d'un compte client n'est pas obligatoire.
            </p>
            <p>
              La commande est enregistrée à la validation du formulaire. Un email de confirmation récapitulant
              les articles commandés et les instructions de paiement est envoyé à l'adresse fournie.
            </p>
            <p>
              La commande devient définitive à réception du paiement intégral. En cas de non-paiement
              dans un délai raisonnable, le vendeur se réserve le droit d'annuler la commande et,
              pour les licences exclusives, de remettre l'instrumentale en vente.
            </p>
          </div>
        </section>

        {/* Article 6 */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">Article 6 — Paiement</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-3">
            <p>Les modes de paiement acceptés sont :</p>
            <ul className="list-disc list-inside space-y-1 pl-2">
              <li><span className="text-white font-semibold">Wero</span> — virement instantané via application bancaire</li>
              <li><span className="text-white font-semibold">PayPal</span> — paiement sécurisé en ligne</li>
              <li><span className="text-white font-semibold">Carte bancaire via Stripe</span> — lorsque cette option est disponible</li>
            </ul>
            <p>
              Pour les paiements manuels (Wero, PayPal), le lien de téléchargement est envoyé par email
              dès confirmation du paiement par le vendeur, généralement dans un délai de 24 heures ouvrées.
            </p>
            <p>
              Pour les paiements par carte via Stripe, le lien de téléchargement est envoyé automatiquement
              par email dès validation du paiement.
            </p>
            <p>
              Toutes les transactions sont sécurisées. Le vendeur ne stocke aucune donnée bancaire.
            </p>
          </div>
        </section>

        {/* Article 7 */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">Article 7 — Livraison</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-3">
            <p>
              Les produits étant des fichiers numériques, la livraison s'effectue exclusivement par voie électronique,
              par envoi d'un lien de téléchargement sécurisé à l'adresse email fournie lors de la commande.
            </p>
            <p>
              <span className="text-white font-semibold">Durée de validité du lien :</span> 48 heures à compter de l'envoi.
              Passé ce délai, le lien expire. En cas de problème de téléchargement dans ce délai,
              l'acheteur peut contacter le vendeur pour obtenir un nouveau lien.
            </p>
            <p>
              Il appartient à l'acheteur de vérifier que son adresse email est correcte au moment de la commande.
              Le vendeur ne peut être tenu responsable d'un lien non reçu en raison d'une adresse erronée
              ou d'un filtrage par le serveur de messagerie de l'acheteur.
            </p>
          </div>
        </section>

        {/* Article 8 */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">Article 8 — Droit de rétractation</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-3">
            <p>
              Conformément à l'article L221-28 du Code de la consommation, <strong className="text-white">le droit de rétractation
              ne s'applique pas</strong> aux contenus numériques dont l'exécution a commencé avant la fin du délai de
              rétractation et pour lesquels le consommateur a renoncé expressément à son droit de rétractation.
            </p>
            <p>
              En validant sa commande et en procédant au téléchargement du contenu numérique,
              l'acheteur reconnaît expressément renoncer à son droit de rétractation.
            </p>
            <p>
              En cas d'erreur de commande ou de fichier défectueux (fichier illisible, corrompu ou ne correspondant
              pas au produit commandé), l'acheteur peut contacter le vendeur à l'adresse{" "}
              <a href="mailto:toxicdata10@gmail.com" className="text-[#b400ff] hover:underline">toxicdata10@gmail.com</a>{" "}
              pour trouver une solution amiable.
            </p>
          </div>
        </section>

        {/* Article 9 */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">Article 9 — Propriété intellectuelle</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-3">
            <p>
              Toutes les compositions musicales proposées sur toxic-files.com sont la propriété exclusive de
              Lucas Pestel et sont protégées par le droit d'auteur (Code de la propriété intellectuelle).
            </p>
            <p>
              L'achat d'une licence n'entraîne <strong className="text-white">aucun transfert de propriété</strong> des droits d'auteur.
              L'acheteur acquiert uniquement le droit d'utilisation défini par la licence choisie
              (MP3, MP3+WAV ou Exclusive), dans les limites précisées à l'article 3.
            </p>
            <p>
              L'acheteur s'engage à créditer le créateur (Lucas Pestel / TOXIC Beatmaker) dans ses productions,
              sauf accord contraire stipulé dans le cadre d'une licence exclusive.
            </p>
            <p>
              Toute revente, redistribution ou mise à disposition gratuite ou payante des fichiers achetés à des tiers
              est strictement interdite, quelle que soit la licence acquise.
            </p>
          </div>
        </section>

        {/* Article 10 */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">Article 10 — Données personnelles</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-3">
            <p>
              Les données personnelles collectées lors d'une commande (prénom, nom, adresse email) sont utilisées
              exclusivement dans le but de traiter la commande et d'envoyer les fichiers achetés.
            </p>
            <p>
              Ces données ne sont ni revendues, ni transmises à des tiers à des fins commerciales.
              Elles sont conservées pendant la durée légale applicable aux documents commerciaux (5 ans).
            </p>
            <p>
              Conformément au RGPD (Règlement UE 2016/679) et à la loi Informatique et Libertés,
              l'acheteur dispose d'un droit d'accès, de rectification, de suppression et de portabilité
              de ses données. Pour exercer ces droits :{" "}
              <a href="mailto:toxicdata10@gmail.com" className="text-[#b400ff] hover:underline">toxicdata10@gmail.com</a>.
            </p>
          </div>
        </section>

        {/* Article 11 */}
        <section>
          <h2 className="text-lg font-black tracking-widest text-[#b400ff] mb-4 uppercase">Article 11 — Litiges et droit applicable</h2>
          <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-5 text-sm text-neutral-300 leading-relaxed space-y-3">
            <p>
              Les présentes CGV sont soumises au droit français.
            </p>
            <p>
              En cas de litige, l'acheteur est invité à contacter le vendeur en priorité par email
              afin de trouver une solution amiable. À défaut d'accord amiable dans un délai de 30 jours,
              le litige pourra être soumis à un médiateur de la consommation.
            </p>
            <p>
              Conformément aux articles L611-1 et suivants du Code de la consommation, tout consommateur
              a le droit de recourir gratuitement à un médiateur de la consommation. La liste des médiateurs
              agréés est disponible sur le site de la Commission d'Évaluation et de Contrôle de la Médiation
              de la Consommation (CECMC) :{" "}
              <a href="https://www.economie.gouv.fr/mediation-conso" target="_blank" rel="noopener noreferrer" className="text-[#b400ff] hover:underline">
                www.economie.gouv.fr/mediation-conso
              </a>.
            </p>
            <p>
              À défaut de résolution amiable ou par médiation, les tribunaux du ressort du Havre (76) seront
              seuls compétents pour connaître du litige.
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
