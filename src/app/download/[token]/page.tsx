import { queryOne } from "@/lib/db";
import { Download, Music, CheckCircle, AlertCircle, Package } from "lucide-react";

type FlatOrderRow = {
  id: string; status: string; product_type: string; license_type: string | null;
  beat_title: string; token_expires_at: string;
  b_title: string | null; genre: string | null; b_img: string | null;
  full_file_path: string | null; wav_file_path: string | null; stems_zip_path: string | null;
  k_title: string | null; k_img: string | null;
};

async function getOrder(token: string) {
  const row = await queryOne<FlatOrderRow>(
    `SELECT o.id, o.status, o.product_type, o.license_type, o.beat_title, o.token_expires_at,
            b.title AS b_title, b.genre, b.image_url AS b_img,
            b.full_file_path, b.wav_file_path, b.stems_zip_path,
            k.title AS k_title, k.image_url AS k_img
     FROM orders o
     LEFT JOIN beats b ON b.id = o.beat_id
     LEFT JOIN kits  k ON k.id = o.kit_id
     WHERE o.download_token = ? LIMIT 1`,
    [token],
  );
  if (!row) return null;
  return {
    id: row.id, status: row.status, product_type: row.product_type,
    license_type: row.license_type, beat_title: row.beat_title,
    token_expires_at: row.token_expires_at,
    beats: row.product_type === "beat" ? {
      title: row.b_title ?? row.beat_title,
      genre: row.genre ?? "",
      image_url: row.b_img,
      full_file_path: row.full_file_path,
      wav_file_path: row.wav_file_path,
      stems_zip_path: row.stems_zip_path,
    } : null,
    kits: row.product_type === "kit" ? {
      title: row.k_title ?? row.beat_title,
      image_url: row.k_img,
    } : null,
  };
}

const LICENSE_LABELS: Record<string, string> = {
  mp3: "Licence MP3",
  wav: "Licence WAV",
  exclusive: "Licence Exclusive",
};

export default async function DownloadPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await getOrder(token);

  if (!order) {
    return (
      <ErrorScreen
        icon="invalid"
        title="Lien invalide"
        message="Ce lien de téléchargement n'existe pas ou a été supprimé."
      />
    );
  }

  if (order.status !== "paid") {
    return (
      <ErrorScreen
        icon="invalid"
        title="Commande non confirmée"
        message="Ce lien n'est pas encore actif. La commande n'a pas encore été validée."
      />
    );
  }

  if (new Date(order.token_expires_at) < new Date()) {
    return (
      <ErrorScreen
        icon="expired"
        title="Lien expiré"
        message="Ce lien de téléchargement a expiré (valide 48h). Contacte-nous pour en obtenir un nouveau."
      />
    );
  }

  const isKit = order.product_type === "kit";
  const licenseType = order.license_type ?? "mp3";
  const productTitle = isKit
    ? (order.kits?.title ?? order.beat_title)
    : (order.beats?.title ?? order.beat_title);
  const genre = isKit ? "" : (order.beats?.genre ?? "");
  const imageUrl = isKit ? (order.kits?.image_url ?? null) : (order.beats?.image_url ?? null);
  const hasWav = !isKit && (licenseType === "wav" || licenseType === "exclusive");
  const wavAvailable = hasWav && !!order.beats?.wav_file_path;
  const hasZip = !isKit && licenseType === "exclusive";
  const zipAvailable = hasZip && !!order.beats?.stems_zip_path;

  // Affichage Kit
  if (isKit) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div
            className="rounded-2xl border border-[#2a2a2a] bg-[#111] overflow-hidden"
            style={{ boxShadow: "0 0 60px rgba(245,158,11,0.15)" }}
          >
            <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #f59e0b, #fbbf24)" }} />

            <div className="px-6 py-5 border-b border-[#1a1a1a]">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-[#39ff14] flex-shrink-0" style={{ filter: "drop-shadow(0 0 6px #39ff1480)" }} />
                <div>
                  <p className="text-xs font-mono tracking-widest text-[#39ff14] uppercase">Paiement confirmé</p>
                  <p className="text-white font-black text-lg">Ton Kit est prêt !</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-[#2a2a2a]"
                  style={{ background: "linear-gradient(135deg, #1a0a0a, #1a0f00)" }}>
                  {imageUrl ? (
                    <img src={imageUrl} alt={productTitle} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={24} className="text-[#f59e0b] opacity-40" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold text-base truncate">{productTitle}</p>
                  <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                    style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                    KIT DE SAMPLES
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <a
                  href={`/api/download/${token}?file=zip`}
                  download
                  className="flex items-center justify-between w-full px-5 py-4 rounded-xl font-bold text-sm text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ background: "linear-gradient(135deg, #f59e0b, #b87009)", boxShadow: "0 0 20px rgba(245,158,11,0.3)" }}
                >
                  <div className="flex items-center gap-3">
                    <Download size={18} />
                    <div className="text-left">
                      <p className="font-black tracking-wide">Télécharger le Kit (ZIP)</p>
                      <p className="text-[11px] font-normal opacity-80">Tous les samples inclus</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono opacity-70">ZIP</span>
                </a>
              </div>

              <p className="text-xs text-neutral-600 text-center mt-5 leading-relaxed">
                Ce lien est valable <span className="text-neutral-400">48h</span> à partir de la confirmation du paiement.
              </p>
            </div>

            <div className="px-6 py-3 border-t border-[#1a1a1a] text-center">
              <a href="/" className="text-xs text-neutral-600 hover:text-[#f59e0b] transition-colors font-mono tracking-widest uppercase">
                ← Retour au site
              </a>
            </div>
          </div>

          <p className="text-center text-xs text-neutral-700 mt-4 font-mono">TOXIC · Beatmaker</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-2xl border border-[#2a2a2a] bg-[#111] overflow-hidden"
          style={{ boxShadow: "0 0 60px rgba(180,0,255,0.15)" }}
        >
          {/* Top bar */}
          <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, #b400ff, #00f5ff)" }} />

          {/* Header */}
          <div className="px-6 py-5 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-3">
              <CheckCircle size={20} className="text-[#39ff14] flex-shrink-0" style={{ filter: "drop-shadow(0 0 6px #39ff1480)" }} />
              <div>
                <p className="text-xs font-mono tracking-widest text-[#39ff14] uppercase">Paiement confirmé</p>
                <p className="text-white font-black text-lg">Ton beat est prêt !</p>
              </div>
            </div>
          </div>

          {/* Beat info */}
          <div className="px-6 py-5">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-[#2a2a2a]"
                style={{ background: "linear-gradient(135deg, #1a0a2e, #0a0a1a)" }}>
                {imageUrl ? (
                  <img src={imageUrl} alt={productTitle} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music size={24} className="text-[#b400ff] opacity-40" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-white font-bold text-base truncate">{productTitle}</p>
                {genre && <p className="text-neutral-500 text-xs font-mono uppercase tracking-widest">{genre}</p>}
                <span className="inline-block mt-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded"
                  style={
                    licenseType === "exclusive"
                      ? { background: "#f59e0b20", color: "#f59e0b" }
                      : licenseType === "wav"
                      ? { background: "#00f5ff15", color: "#00f5ff" }
                      : { background: "#b400ff15", color: "#b400ff" }
                  }>
                  {LICENSE_LABELS[licenseType] ?? licenseType}
                </span>
              </div>
            </div>

            {/* Download buttons */}
            <div className="space-y-3">
              {/* MP3 */}
              <a
                href={`/api/download/${token}?file=mp3`}
                download
                className="flex items-center justify-between w-full px-5 py-4 rounded-xl font-bold text-sm text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px rgba(180,0,255,0.3)" }}
              >
                <div className="flex items-center gap-3">
                  <Download size={18} />
                  <div className="text-left">
                    <p className="font-black tracking-wide">Télécharger MP3</p>
                    <p className="text-[11px] font-normal opacity-80">Qualité 320kbps</p>
                  </div>
                </div>
                <span className="text-xs font-mono opacity-70">MP3</span>
              </a>

              {/* WAV — si licence WAV ou exclusive */}
              {hasWav && (
                wavAvailable ? (
                  <a
                    href={`/api/download/${token}?file=wav`}
                    download
                    className="flex items-center justify-between w-full px-5 py-4 rounded-xl font-bold text-sm text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #00f5ff, #00c4cc)", boxShadow: "0 0 20px rgba(0,245,255,0.25)" }}
                  >
                    <div className="flex items-center gap-3">
                      <Download size={18} />
                      <div className="text-left">
                        <p className="font-black tracking-wide">Télécharger WAV</p>
                        <p className="text-[11px] font-normal opacity-80">Qualité studio 44.1kHz</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono opacity-70">WAV</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-[#2a2a2a] text-neutral-500 text-sm">
                    <Download size={18} className="opacity-30" />
                    <div>
                      <p className="font-bold">Fichier WAV</p>
                      <p className="text-xs opacity-70">En cours de préparation — contacte-nous si besoin</p>
                    </div>
                  </div>
                )
              )}

              {/* ZIP — licence exclusive uniquement */}
              {hasZip && (
                zipAvailable ? (
                  <a
                    href={`/api/download/${token}?file=zip`}
                    download
                    className="flex items-center justify-between w-full px-5 py-4 rounded-xl font-bold text-sm text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg, #f59e0b, #b87009)", boxShadow: "0 0 20px rgba(245,158,11,0.25)" }}
                  >
                    <div className="flex items-center gap-3">
                      <Download size={18} />
                      <div className="text-left">
                        <p className="font-black tracking-wide">Télécharger les pistes (ZIP)</p>
                        <p className="text-[11px] font-normal opacity-80">Toutes les pistes séparées</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono opacity-70">ZIP</span>
                  </a>
                ) : (
                  <div className="flex items-center gap-3 px-5 py-4 rounded-xl border border-[#2a2a2a] text-neutral-500 text-sm">
                    <Download size={18} className="opacity-30" />
                    <div>
                      <p className="font-bold">Pistes séparées (ZIP)</p>
                      <p className="text-xs opacity-70">En cours de préparation — contacte-nous si besoin</p>
                    </div>
                  </div>
                )
              )}
            </div>

            <p className="text-xs text-neutral-600 text-center mt-5 leading-relaxed">
              Ces liens sont valables <span className="text-neutral-400">48h</span> à partir de la confirmation du paiement.
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-[#1a1a1a] text-center">
            <a href="/" className="text-xs text-neutral-600 hover:text-[#b400ff] transition-colors font-mono tracking-widest uppercase">
              ← Retour au site
            </a>
          </div>
        </div>

        <p className="text-center text-xs text-neutral-700 mt-4 font-mono">TOXIC · Beatmaker</p>
      </div>
    </div>
  );
}

function ErrorScreen({ icon, title, message }: { icon: "invalid" | "expired"; title: string; message: string }) {
  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-neutral-600" />
        <h1 className="text-white font-black text-xl mb-2">{title}</h1>
        <p className="text-neutral-500 text-sm leading-relaxed mb-6">{message}</p>
        <a href="/"
          className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-black"
          style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)" }}>
          Retour au site
        </a>
      </div>
    </div>
  );
}
