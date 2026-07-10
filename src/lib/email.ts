import { Resend } from "resend";

type PaymentMethod = {
  id: string;
  type: "paypal" | "virement" | "lydia" | "sumeria" | "custom";
  label: string;
  value: string;
  active: boolean;
};

const METHOD_EMOJI: Record<string, string> = {
  paypal: "💙",
  virement: "🏦",
  lydia: "💜",
  sumeria: "🟢",
  custom: "⚡",
};

type OrderEmailParams = {
  buyerName: string;
  buyerEmail: string;
  beatTitles: string[];   // ex. ["SHADOW ZONE (MP3+WAV)", "NEON RUSH (EXCLUSIF)"]
  total: number;
  hasExclusive: boolean;
  paymentMethods: PaymentMethod[];
  siteUrl: string;
  contactEmail: string;
  stripeUrl?: string;     // URL de la session Stripe si paiement par carte disponible
};

function buildOrderEmailHtml(p: OrderEmailParams): string {
  const firstName = p.buyerName.split(" ")[0];
  const methodsHtml = p.paymentMethods
    .filter(m => m.active)
    .map(m => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #2a2a2a;">
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
            <tr>
              <td width="36" style="font-size:22px;vertical-align:middle;">${METHOD_EMOJI[m.type] ?? "⚡"}</td>
              <td style="vertical-align:middle;padding-left:8px;">
                <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">${m.label}</div>
                <div style="font-size:15px;color:#ffffff;font-family:monospace;">${m.value}</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `).join("");

  const beatsHtml = p.beatTitles
    .map(t => `<li style="padding:4px 0;color:#e0e0e0;">${t}</li>`)
    .join("");

  const exclusiveNote = p.hasExclusive ? `
    <tr>
      <td style="padding:14px 16px;background:#f59e0b0d;border:1px solid #f59e0b30;border-radius:8px;margin-top:16px;">
        <span style="font-size:16px;">📦</span>
        <span style="font-size:13px;color:#f59e0b;margin-left:8px;">
          Ta commande inclut une <strong>licence exclusive</strong> — ton lien de téléchargement donnera accès au MP3, au WAV et au ZIP des pistes.
        </span>
      </td>
    </tr>
  ` : "";

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#111111;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#b400ff,#7000cc);padding:28px 24px;text-align:center;">
              <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:4px;">TOXIC</div>
              <div style="font-size:11px;color:#ffffff99;letter-spacing:6px;margin-top:4px;">BEATMAKER</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 24px;">
              <p style="color:#e0e0e0;font-size:15px;margin:0 0 8px;">Bonjour <strong style="color:#fff;">${firstName}</strong>,</p>
              <p style="color:#999;font-size:14px;margin:0 0 24px;line-height:1.6;">
                Ta commande a bien été enregistrée 🎵<br>
                Il ne te reste plus qu'à effectuer le paiement via l'un des moyens ci-dessous — ton <strong style="color:#fff;">lien de téléchargement</strong> t'arrivera par email dès validation.
              </p>

              <!-- Beats commandés -->
              <div style="margin-bottom:20px;">
                <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Beats commandés</div>
                <ul style="margin:0;padding-left:18px;line-height:1.8;">
                  ${beatsHtml}
                </ul>
                <div style="margin-top:10px;font-size:18px;font-weight:900;color:#b400ff;">
                  Total : ${p.total}€
                </div>
              </div>

              <!-- Bouton Stripe si disponible -->
              ${p.stripeUrl ? `
              <div style="margin-bottom:16px;text-align:center;">
                <a href="${p.stripeUrl}" style="display:inline-block;background:linear-gradient(135deg,#635bff,#4f46e5);color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:14px 28px;border-radius:12px;letter-spacing:0.5px;">
                  💳 Payer par carte maintenant
                </a>
              </div>
              ` : ""}

              <!-- Moyens de paiement manuels -->
              ${p.paymentMethods.filter(m => m.active).length > 0 ? `
              <div style="margin-bottom:20px;">
                <div style="font-size:11px;color:#666;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">${p.stripeUrl ? "Ou payer autrement" : "Comment payer"}</div>
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
                  ${methodsHtml}
                </table>
              </div>
              ` : p.stripeUrl ? "" : `
              <div style="margin-bottom:20px;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;">
                  <tr><td style="padding:16px;color:#666;text-align:center;font-size:13px;">Contacte-nous pour recevoir les informations de paiement.</td></tr>
                </table>
              </div>
              `}

              <!-- Note exclusive -->
              ${exclusiveNote}

              <!-- Instructions -->
              <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:14px 16px;margin-top:16px;">
                <p style="margin:0;font-size:13px;color:#888;line-height:1.6;">
                  📧 Une fois le paiement effectué, <strong style="color:#ccc;">envoie une confirmation</strong> (capture d'écran ou référence) à <a href="mailto:${p.contactEmail}" style="color:#b400ff;">${p.contactEmail}</a><br>
                  Ton lien de téléchargement personnel t'arrivera rapidement.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #1a1a1a;text-align:center;">
              <p style="margin:0;font-size:11px;color:#444;">
                © TOXIC Beatmaker · <a href="${p.siteUrl}" style="color:#b400ff;text-decoration:none;">${p.siteUrl.replace(/^https?:\/\//, "")}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

type DownloadEmailParams = {
  buyerName: string;
  buyerEmail: string;
  beatTitle: string;
  licenseType: string;
  downloadPageUrl: string; // URL de la page /download/TOKEN (unique CTA)
  contactEmail: string;
  siteUrl: string;
  hasAccount?: boolean;
};

function buildDownloadEmailHtml(p: DownloadEmailParams): string {
  const firstName = p.buyerName.split(" ")[0];

  const isKit = p.licenseType === "kit";

  const licenseLabel =
    isKit                          ? "Kit de Samples" :
    p.licenseType === "exclusive"  ? "Licence Exclusive" :
    p.licenseType === "wav"        ? "Licence MP3 + WAV" :
                                     "Licence MP3";

  const accentColor = isKit ? "#f59e0b" : "#b400ff";
  const accentBg    = isKit ? "linear-gradient(135deg,#f59e0b,#b87009)" : "linear-gradient(135deg,#b400ff,#7000cc)";
  const textColor   = isKit ? "#000" : "#fff";

  const ctaButton = `
    <div style="text-align:center;margin:24px 0 0;">
      <a href="${p.downloadPageUrl}"
         style="display:inline-block;background:${accentBg};color:${textColor};font-size:15px;font-weight:900;text-decoration:none;padding:15px 36px;border-radius:14px;letter-spacing:1.5px;text-transform:uppercase;">
        ⬇&nbsp; Accéder à mes fichiers
      </a>
    </div>
  `;

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#111111;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">

          <tr>
            <td style="background:linear-gradient(135deg,#b400ff,#7000cc);padding:28px 24px;text-align:center;">
              <div style="font-size:32px;font-weight:900;color:#fff;letter-spacing:4px;">TOXIC</div>
              <div style="font-size:11px;color:#ffffff99;letter-spacing:6px;margin-top:4px;">BEATMAKER</div>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px;">
              <p style="color:#e0e0e0;font-size:15px;margin:0 0 8px;">
                Bonjour <strong style="color:#fff;">${firstName}</strong>,
              </p>
              <p style="color:#999;font-size:14px;margin:0 0 20px;line-height:1.6;">
                Ton paiement a bien été reçu — merci ! 🎉<br>
                Tes fichiers pour <strong style="color:#fff;">${p.beatTitle}</strong> sont disponibles.
              </p>

              <div style="text-align:center;margin-bottom:20px;">
                <span style="display:inline-block;background:${accentColor}20;border:1px solid ${accentColor}50;color:${accentColor};font-size:11px;font-family:monospace;font-weight:bold;letter-spacing:2px;padding:6px 14px;border-radius:20px;text-transform:uppercase;">
                  ${licenseLabel}
                </span>
              </div>

              ${ctaButton}

              <div style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;padding:12px 16px;margin-top:20px;">
                <p style="margin:0;font-size:12px;color:#666;line-height:1.6;">
                  ⏱ Le lien est valable <strong style="color:#aaa;">48 heures</strong>. Télécharge tes fichiers dès maintenant et conserve-les précieusement.<br>
                  Un problème ? Contacte-nous à <a href="mailto:${p.contactEmail}" style="color:${accentColor};">${p.contactEmail}</a>
                </p>
              </div>

              ${!p.hasAccount ? `
              <div style="margin-top:16px;background:#b400ff0d;border:1px solid #b400ff30;border-radius:10px;padding:14px 16px;">
                <p style="margin:0 0 8px;font-size:13px;color:#e0e0e0;line-height:1.5;">
                  👤 <strong style="color:#fff;">Crée ton compte</strong> pour retrouver toutes tes commandes en un seul endroit et re-télécharger tes fichiers à tout moment.
                </p>
                <a href="${p.siteUrl}/#compte"
                   style="display:inline-block;background:linear-gradient(135deg,#b400ff,#7000cc);color:#fff;font-size:12px;font-weight:bold;text-decoration:none;padding:8px 18px;border-radius:8px;letter-spacing:0.5px;">
                  Créer mon compte →
                </a>
              </div>
              ` : ""}
            </td>
          </tr>

          <tr>
            <td style="padding:16px 24px;border-top:1px solid #1a1a1a;text-align:center;">
              <p style="margin:0;font-size:11px;color:#444;">
                © TOXIC Beatmaker · <a href="${p.siteUrl}" style="color:#b400ff;text-decoration:none;">${p.siteUrl.replace(/^https?:\/\//, "")}</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendDownloadLinkEmail(params: DownloadEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_VOTRE_CLE_ICI") {
    console.warn("[email] RESEND_API_KEY non configurée — email non envoyé.");
    return;
  }

  const resend = new Resend(apiKey);
  const from = `${process.env.RESEND_FROM_NAME ?? "TOXIC Beatmaker"} <${process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"}>`;

  const isKit = params.licenseType === "kit";
  const { error } = await resend.emails.send({
    from,
    to: params.buyerEmail,
    subject: isKit ? `⬇ Ton kit est prêt — ${params.beatTitle}` : `⬇ Ton beat est prêt — ${params.beatTitle}`,
    html: buildDownloadEmailHtml(params),
  });

  if (error) {
    console.error("[email] Erreur Resend download :", error);
  }
}

type AdminNewOrderParams = {
  adminEmail: string;
  buyerName: string;
  buyerEmail: string;
  productTitle: string;
  productType: "beat" | "kit";
  licenseType?: string;
  amount: number;
  adminUrl: string;
};

function buildAdminNotifHtml(p: AdminNewOrderParams): string {
  const licenseLabel =
    p.productType === "kit"         ? "Kit de Samples" :
    p.licenseType === "exclusive"   ? "Licence Exclusive 🔒" :
    p.licenseType === "wav"         ? "Licence MP3 + WAV" :
                                      "Licence MP3";

  const accentColor = p.productType === "kit" ? "#f59e0b" : "#b400ff";

  return `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:#111111;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,${accentColor},${p.productType === "kit" ? "#b87009" : "#7000cc"});padding:22px 24px;text-align:center;">
              <div style="font-size:28px;font-weight:900;color:#fff;letter-spacing:4px;">TOXIC</div>
              <div style="font-size:11px;color:#ffffff99;letter-spacing:6px;margin-top:2px;">NOUVELLE COMMANDE</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 24px;">
              <p style="color:#e0e0e0;font-size:16px;font-weight:bold;margin:0 0 20px;">
                🔔 Nouvelle commande reçue !
              </p>

              <!-- Produit -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;margin-bottom:16px;">
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #222;">
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px;">Produit</div>
                    <div style="font-size:16px;font-weight:bold;color:#fff;">${p.productTitle}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;border-bottom:1px solid #222;">
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:2px;margin-bottom:2px;">Licence</div>
                    <span style="font-size:12px;font-family:monospace;font-weight:bold;color:${accentColor};">${licenseLabel}</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;">
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:2px;margin-bottom:2px;">Montant</div>
                    <div style="font-size:22px;font-weight:900;color:${accentColor};">${p.amount}€</div>
                  </td>
                </tr>
              </table>

              <!-- Acheteur -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;margin-bottom:20px;">
                <tr>
                  <td style="padding:10px 16px;border-bottom:1px solid #222;">
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:2px;margin-bottom:2px;">Acheteur</div>
                    <div style="font-size:14px;color:#fff;font-weight:bold;">${p.buyerName}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 16px;">
                    <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:2px;margin-bottom:2px;">Email</div>
                    <a href="mailto:${p.buyerEmail}" style="font-size:13px;font-family:monospace;color:${accentColor};text-decoration:none;">${p.buyerEmail}</a>
                  </td>
                </tr>
              </table>

              <!-- CTA admin -->
              <div style="text-align:center;">
                <a href="${p.adminUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,${accentColor},${p.productType === "kit" ? "#b87009" : "#7000cc"});color:${p.productType === "kit" ? "#000" : "#fff"};font-size:13px;font-weight:900;text-decoration:none;padding:13px 28px;border-radius:12px;letter-spacing:1px;text-transform:uppercase;">
                  Voir dans l'admin →
                </a>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:14px 24px;border-top:1px solid #1a1a1a;text-align:center;">
              <p style="margin:0;font-size:11px;color:#444;">TOXIC Beatmaker · Notification automatique</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendAdminNewOrderEmail(params: AdminNewOrderParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_VOTRE_CLE_ICI") {
    console.warn("[email] RESEND_API_KEY non configurée — notif admin non envoyée.");
    return;
  }

  const resend = new Resend(apiKey);
  const from = `${process.env.RESEND_FROM_NAME ?? "TOXIC Beatmaker"} <${process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"}>`;

  const subject = params.productType === "kit"
    ? `🔔 Nouvelle commande kit — ${params.productTitle} (${params.amount}€)`
    : `🔔 Nouvelle commande — ${params.productTitle} (${params.amount}€)`;

  const { error } = await resend.emails.send({
    from,
    to: params.adminEmail,
    subject,
    html: buildAdminNotifHtml(params),
  });

  if (error) {
    console.error("[email] Erreur notif admin :", error);
  }
}

export async function sendOrderConfirmationEmail(params: OrderEmailParams): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_VOTRE_CLE_ICI") {
    console.warn("[email] RESEND_API_KEY non configurée — email non envoyé.");
    return;
  }

  // Initialisation lazy : uniquement à l'exécution, jamais au build
  const resend = new Resend(apiKey);
  const from = `${process.env.RESEND_FROM_NAME ?? "TOXIC Beatmaker"} <${process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"}>`;

  const subject = params.beatTitles.length === 1
    ? `🎵 Ta commande — ${params.beatTitles[0]}`
    : `🎵 Ta commande — ${params.beatTitles.length} beats`;

  const { error } = await resend.emails.send({
    from,
    to: params.buyerEmail,
    subject,
    html: buildOrderEmailHtml(params),
  });

  if (error) {
    console.error("[email] Erreur Resend :", error);
  }
}

export async function sendCustomDownloadNotificationEmail(params: {
  adminEmail: string;
  buyerName: string;
  buyerEmail: string;
  projectTitle: string;
  downloadedAt: string;
  adminOrderUrl: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === "re_VOTRE_CLE_ICI") return;

  const resend = new Resend(apiKey);
  const from = `${process.env.RESEND_FROM_NAME ?? "TOXIC Beatmaker"} <${process.env.RESEND_FROM_EMAIL ?? "onboarding@resend.dev"}>`;

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#080808;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;"><tr><td align="center">
<table width="100%" style="max-width:480px;background:#111;border-radius:16px;border:1px solid #2a2a2a;overflow:hidden;">
  <tr><td style="background:linear-gradient(135deg,#39ff14,#22cc00);padding:20px 24px;text-align:center;">
    <div style="font-size:28px;font-weight:900;color:#000;letter-spacing:4px;">TOXIC</div>
    <div style="font-size:10px;color:#00000099;letter-spacing:6px;margin-top:2px;">BEATMAKER · ADMIN</div>
  </td></tr>
  <tr><td style="padding:24px;">
    <p style="color:#39ff14;font-size:13px;font-family:monospace;text-transform:uppercase;letter-spacing:2px;margin:0 0 12px;">📥 Fichiers téléchargés</p>
    <p style="color:#e0e0e0;font-size:15px;margin:0 0 20px;">
      <strong style="color:#fff;">${params.buyerName}</strong> vient de télécharger ses fichiers.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:10px;overflow:hidden;margin-bottom:20px;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #2a2a2a;">
        <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Client</div>
        <div style="color:#fff;font-size:14px;">${params.buyerName} · <a href="mailto:${params.buyerEmail}" style="color:#b400ff;text-decoration:none;">${params.buyerEmail}</a></div>
      </td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #2a2a2a;">
        <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Projet</div>
        <div style="color:#fff;font-size:14px;font-family:monospace;">${params.projectTitle}</div>
      </td></tr>
      <tr><td style="padding:12px 16px;">
        <div style="font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Téléchargé le</div>
        <div style="color:#39ff14;font-size:13px;font-family:monospace;">${params.downloadedAt}</div>
      </td></tr>
    </table>
    <p style="color:#888;font-size:13px;margin:0 0 16px;line-height:1.6;">
      Tu peux maintenant <strong style="color:#fff;">supprimer les fichiers</strong> du serveur depuis l'admin si tu le souhaites.
    </p>
    <div style="text-align:center;">
      <a href="${params.adminOrderUrl}" style="display:inline-block;background:linear-gradient(135deg,#39ff14,#22cc00);color:#000;font-weight:bold;font-size:13px;text-decoration:none;padding:12px 24px;border-radius:10px;letter-spacing:0.5px;">
        Voir la commande dans l'admin →
      </a>
    </div>
  </td></tr>
  <tr><td style="padding:12px 24px;border-top:1px solid #1a1a1a;text-align:center;">
    <p style="margin:0;font-size:11px;color:#444;">© TOXIC Beatmaker · Admin</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  const { error } = await resend.emails.send({
    from,
    to: params.adminEmail,
    subject: `📥 Fichiers téléchargés — ${params.projectTitle} (${params.buyerName})`,
    html,
  });
  if (error) console.error("[email] Erreur notif téléchargement custom :", error);
}
