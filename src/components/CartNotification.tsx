"use client";

import { useEffect } from "react";
import { ShoppingCart, X, ArrowRight } from "lucide-react";
import type { Beat, LicenseType } from "@/types";

const LICENSE_LABELS: Record<LicenseType, string> = {
  mp3: "MP3",
  wav: "WAV",
  exclusive: "EXCLUSIF",
};

type Props = {
  beat: Beat;
  price: number;
  licenseType: LicenseType;
  cartCount: number;
  onViewCart: () => void;
  onContinue: () => void;
};

export default function CartNotification({ beat, price, licenseType, cartCount, onViewCart, onContinue }: Props) {
  useEffect(() => {
    const t = setTimeout(onContinue, 5000);
    return () => clearTimeout(t);
  }, [onContinue]);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-full max-w-sm px-4 animate-in">
      <style>{`
        @keyframes slide-down {
          from { opacity: 0; transform: translateX(-50%) translateY(-16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-in { animation: slide-down 0.25s ease-out; }
      `}</style>

      <div
        className="rounded-2xl border border-[#b400ff]/40 bg-[#111] p-4"
        style={{ boxShadow: "0 0 40px rgba(180,0,255,0.25), 0 8px 32px rgba(0,0,0,0.6)" }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border border-[#2a2a2a]">
            {beat.image_url ? (
              <img src={beat.image_url} alt={beat.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #1a0a2e, #0a0a1a)" }}>
                <span className="text-xl font-black text-[#b400ff] opacity-30">T</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs text-[#39ff14] font-mono tracking-widest uppercase mb-0.5">✓ Ajouté au panier</p>
            <p className="text-white font-bold truncate">{beat.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(180,0,255,0.15)", color: "#b400ff" }}>
                {LICENSE_LABELS[licenseType]}
              </span>
              <span className="text-neutral-500 text-xs">{price}€</span>
            </div>
          </div>

          <div className="flex-shrink-0 relative">
            <ShoppingCart size={22} className="text-[#b400ff]" />
            <span
              className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
              style={{ background: "#b400ff", color: "#fff" }}
            >
              {cartCount}
            </span>
          </div>

          <button onClick={onContinue} className="flex-shrink-0 text-neutral-600 hover:text-white transition-colors ml-1">
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            onClick={onContinue}
            className="flex-1 h-9 rounded-xl text-xs font-mono tracking-widest uppercase text-neutral-400 border border-[#2a2a2a] hover:text-white hover:border-[#3a3a3a] transition-all"
          >
            Continuer
          </button>
          <button
            onClick={onViewCart}
            className="flex-1 h-9 rounded-xl text-xs font-bold tracking-wider uppercase text-black flex items-center justify-center gap-1.5 transition-all hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 15px rgba(180,0,255,0.4)" }}
          >
            Voir le panier <ArrowRight size={13} />
          </button>
        </div>

        {licenseType === "exclusive" && (
          <p className="text-[10px] text-neutral-600 text-center leading-relaxed">
            Ce beat sera <span className="text-neutral-400">réservé pendant 2h</span> après ta commande.<br />
            Sans paiement dans ce délai, il pourra être remis en vente.
          </p>
        )}
      </div>
    </div>
  );
}
