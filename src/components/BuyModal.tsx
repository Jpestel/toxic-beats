"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, Loader2, Copy } from "lucide-react";
import type { Beat } from "@/types";

type PaymentMethod = {
  id: string;
  type: string;
  label: string;
  value: string;
  active: boolean;
};

const EMOJI: Record<string, string> = {
  paypal: "💙", virement: "🏦", lydia: "💜", sumeria: "🟢", custom: "⚡",
};

type Props = {
  beat: Beat;
  onClose: () => void;
};

export default function BuyModal({ beat, onClose }: Props) {
  const [form, setForm] = useState({ firstname: "", lastname: "", email: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/payment")
      .then((r) => r.json())
      .then((data) => setPaymentMethods((data.methods ?? []).filter((m: PaymentMethod) => m.active && m.value)));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beat_id: beat.id,
          beat_title: beat.title,
          buyer_name: `${form.firstname} ${form.lastname}`.trim(),
          buyer_email: form.email,
          amount: beat.price,
        }),
      });
      if (!res.ok) throw new Error();
      localStorage.setItem("toxic_last_order", JSON.stringify({
        total: beat.price,
        beatTitles: [beat.title],
        paymentMethods,
        timestamp: Date.now(),
      }));
      setStatus("success");
    } catch {
      setStatus("error");
      setError("Une erreur est survenue. Réessaye ou contacte-nous directement.");
    }
  };

  const copyValue = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isSuccess = status === "success";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={isSuccess ? undefined : onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#111111] p-6"
        style={{ boxShadow: "0 0 60px rgba(180,0,255,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {!isSuccess && (
          <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        )}

        {isSuccess ? (
          <div className="py-4">
            <div className="text-center mb-6">
              <CheckCircle size={48} className="mx-auto mb-4 text-[#39ff14]" style={{ filter: "drop-shadow(0 0 10px #39ff1480)" }} />
              <h3 className="text-xl font-bold text-white mb-2">Commande enregistrée !</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Ta commande pour <span className="text-[#b400ff] font-semibold">{beat.title}</span> a bien été reçue.
                Effectue ton paiement de <span className="text-white font-bold">{beat.price}€</span> via l&apos;un des moyens ci-dessous.
              </p>
            </div>

            {paymentMethods.length > 0 ? (
              <div className="space-y-2 mb-6">
                <p className="text-xs font-mono tracking-widest text-neutral-500 uppercase mb-3">Comment payer</p>
                {paymentMethods.map((method) => (
                  <div key={method.id} className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3">
                    <span className="text-xl flex-shrink-0">{EMOJI[method.type] ?? "⚡"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-500 mb-0.5">{method.label}</p>
                      <p className="text-white text-sm font-mono truncate">{method.value}</p>
                    </div>
                    <button
                      onClick={() => copyValue(method.id, method.value)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                      style={copiedId === method.id
                        ? { background: "#39ff1415", border: "1px solid #39ff1440", color: "#39ff14" }
                        : { background: "#111", border: "1px solid #2a2a2a", color: "#666" }
                      }
                    >
                      <Copy size={11} />
                      {copiedId === method.id ? "Copié !" : "Copier"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-neutral-500 bg-[#1a1a1a] rounded-lg p-3 mb-6 text-center">
                Contacte-nous pour recevoir les informations de paiement.
              </div>
            )}

            <p className="text-xs text-neutral-600 text-center mb-4">
              Envoie ta confirmation de paiement — ton lien de téléchargement t&apos;arrivera dès validation.
            </p>

            <button onClick={onClose} className="w-full h-11 rounded-xl bg-[#b400ff] text-white font-bold text-sm hover:bg-[#cc00ff] transition-colors">
              Fermer
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <div className="text-xs text-[#b400ff] font-mono tracking-widest uppercase mb-1">Commander</div>
              <h2 className="text-2xl font-black text-white">{beat.title}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-neutral-500 text-sm">{beat.genre} · {beat.bpm} BPM</span>
                <span className="text-[#b400ff] font-bold text-lg">{beat.price}€</span>
              </div>
            </div>

            <div className="text-xs text-neutral-500 bg-[#1a1a1a] rounded-lg p-3 mb-5 leading-relaxed">
              Remplis ce formulaire, effectue le paiement et envoie la confirmation. Le lien de téléchargement te sera envoyé par email dès validation.
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 tracking-widest uppercase">Prénom</label>
                  <input
                    required
                    value={form.firstname}
                    onChange={(e) => setForm((f) => ({ ...f, firstname: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                    placeholder="Prénom"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 tracking-widest uppercase">Nom</label>
                  <input
                    required
                    value={form.lastname}
                    onChange={(e) => setForm((f) => ({ ...f, lastname: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                    placeholder="NOM"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 tracking-widest uppercase">Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                  placeholder="ton@email.com"
                />
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full h-12 rounded-xl font-bold text-sm tracking-wider text-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:scale-[1.01]"
                style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px rgba(180,0,255,0.4)" }}
              >
                {status === "loading" ? <Loader2 size={18} className="animate-spin" /> : "Valider ma commande"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
