"use client";

import { useState, useEffect } from "react";
import { X, CheckCircle, Loader2, Copy, CreditCard, Wallet } from "lucide-react";
import type { Beat } from "@/types";

type PaymentMethod = {
  id: string; type: string; label: string; value: string; active: boolean;
};

const EMOJI: Record<string, string> = {
  paypal: "💙", virement: "🏦", lydia: "💜", sumeria: "🟢", custom: "⚡",
};

type Props = { beat: Beat; onClose: () => void; licenseType?: string; amount?: number; };

export default function BuyModal({ beat, onClose, licenseType = "mp3", amount }: Props) {
  const [form, setForm] = useState({ firstname: "", lastname: "", email: "" });
  const [paymentChoice, setPaymentChoice] = useState<"stripe" | "manual" | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const finalAmount = amount ?? beat.price;

  useEffect(() => {
    fetch("/api/settings/payment")
      .then(r => r.json())
      .then(data => {
        setPaymentMethods((data.methods ?? []).filter((m: PaymentMethod) => m.active && m.value));
        setStripeEnabled(data.stripe?.enabled === true);
      });
  }, []);

  const formValid = form.firstname.trim() && form.lastname.trim() && form.email.trim();

  // ── Paiement Stripe ──────────────────────────────────────────────────────
  const handleStripe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;
    setStatus("loading"); setError("");
    try {
      const res = await fetch("/api/checkout/stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beat_id: beat.id, beat_title: beat.title,
          buyer_name: `${form.firstname} ${form.lastname}`.trim(),
          buyer_email: form.email,
          amount: finalAmount, license_type: licenseType, product_type: "beat",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? "Erreur");
      window.location.href = data.url; // Redirection vers Stripe
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erreur lors de la création du paiement.");
    }
  };

  // ── Paiement manuel ──────────────────────────────────────────────────────
  const handleManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid) return;
    setStatus("loading"); setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beat_id: beat.id, beat_title: beat.title,
          buyer_name: `${form.firstname} ${form.lastname}`.trim(),
          buyer_email: form.email,
          amount: finalAmount, license_type: licenseType, product_type: "beat",
        }),
      });
      if (!res.ok) throw new Error();
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
  const hasManualMethods = paymentMethods.length > 0;
  const showChoice = stripeEnabled && hasManualMethods;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={isSuccess ? undefined : onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#111111] p-6 max-h-[90vh] overflow-y-auto"
        style={{ boxShadow: "0 0 60px rgba(180,0,255,0.2)" }}
        onClick={e => e.stopPropagation()}
      >
        {!isSuccess && (
          <button onClick={onClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        )}

        {/* ── SUCCÈS (paiement manuel enregistré) ── */}
        {isSuccess ? (
          <div className="py-4">
            <div className="text-center mb-6">
              <CheckCircle size={48} className="mx-auto mb-4 text-[#39ff14]" style={{ filter: "drop-shadow(0 0 10px #39ff1480)" }} />
              <h3 className="text-xl font-bold text-white mb-2">Commande enregistrée !</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Ta commande pour <span className="text-[#b400ff] font-semibold">{beat.title}</span> a bien été reçue.
                Effectue ton paiement de <span className="text-white font-bold">{finalAmount}€</span> via l&apos;un des moyens ci-dessous.
              </p>
            </div>
            {hasManualMethods && (
              <div className="space-y-2 mb-6">
                <p className="text-xs font-mono tracking-widest text-neutral-500 uppercase mb-3">Comment payer</p>
                {paymentMethods.map(method => (
                  <div key={method.id} className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3">
                    <span className="text-xl flex-shrink-0">{EMOJI[method.type] ?? "⚡"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-neutral-500 mb-0.5">{method.label}</p>
                      <p className="text-white text-sm font-mono truncate">{method.value}</p>
                    </div>
                    <button onClick={() => copyValue(method.id, method.value)}
                      className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                      style={copiedId === method.id
                        ? { background: "#39ff1415", border: "1px solid #39ff1440", color: "#39ff14" }
                        : { background: "#111", border: "1px solid #2a2a2a", color: "#666" }
                      }>
                      <Copy size={11} />
                      {copiedId === method.id ? "Copié !" : "Copier"}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-neutral-600 text-center mb-4">
              Ton lien de téléchargement t&apos;arrivera par email dès validation du paiement.
            </p>
            <button onClick={onClose} className="w-full h-11 rounded-xl bg-[#b400ff] text-white font-bold text-sm hover:bg-[#cc00ff] transition-colors">
              Fermer
            </button>
          </div>

        ) : (
          <>
            {/* ── EN-TÊTE ── */}
            <div className="mb-5">
              <div className="text-xs text-[#b400ff] font-mono tracking-widest uppercase mb-1">Commander</div>
              <h2 className="text-2xl font-black text-white">{beat.title}</h2>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-neutral-500 text-sm">{beat.genre} · {beat.bpm} BPM</span>
                <span className="text-[#b400ff] font-bold text-lg">{finalAmount}€</span>
              </div>
            </div>

            {/* ── FORMULAIRE ── */}
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 tracking-widest uppercase">Prénom</label>
                  <input required value={form.firstname}
                    onChange={e => setForm(f => ({ ...f, firstname: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                    placeholder="Prénom" />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5 tracking-widest uppercase">Nom</label>
                  <input required value={form.lastname}
                    onChange={e => setForm(f => ({ ...f, lastname: e.target.value }))}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                    placeholder="NOM" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 tracking-widest uppercase">Email</label>
                <input type="email" required value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                  placeholder="ton@email.com" />
              </div>
            </div>

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            {/* ── BOUTONS DE PAIEMENT ── */}
            <div className="space-y-3">

              {/* Stripe */}
              {stripeEnabled && (
                <form onSubmit={handleStripe}>
                  <button type="submit" disabled={status === "loading" || !formValid}
                    className="w-full h-13 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-3 disabled:opacity-50 transition-all hover:scale-[1.01] py-3"
                    style={{ background: "linear-gradient(135deg, #635bff, #4f46e5)", boxShadow: "0 0 20px rgba(99,91,255,0.35)" }}
                  >
                    {status === "loading" && paymentChoice === "stripe"
                      ? <Loader2 size={17} className="animate-spin" />
                      : <CreditCard size={17} />
                    }
                    <span>Payer par carte · {finalAmount}€</span>
                  </button>
                </form>
              )}

              {/* Séparateur si les deux modes sont dispos */}
              {showChoice && (
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#2a2a2a]" />
                  <span className="text-xs text-neutral-600 font-mono">ou</span>
                  <div className="flex-1 h-px bg-[#2a2a2a]" />
                </div>
              )}

              {/* Manuel */}
              {hasManualMethods && (
                <form onSubmit={handleManual}>
                  <button type="submit" disabled={status === "loading" || !formValid}
                    className="w-full h-13 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-3 disabled:opacity-50 transition-all hover:scale-[1.01] py-3"
                    style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px rgba(180,0,255,0.35)" }}
                  >
                    {status === "loading" && paymentChoice === "manual"
                      ? <Loader2 size={17} className="animate-spin" />
                      : <Wallet size={17} />
                    }
                    <span>
                      {stripeEnabled ? "Autre moyen de paiement" : "Valider ma commande"} · {finalAmount}€
                    </span>
                  </button>
                  {stripeEnabled && (
                    <p className="text-[10px] text-neutral-600 text-center mt-1.5">
                      {paymentMethods.map(m => m.label).join(" · ")}
                    </p>
                  )}
                </form>
              )}

              {/* Aucun moyen de paiement */}
              {!stripeEnabled && !hasManualMethods && (
                <p className="text-xs text-neutral-500 text-center py-3">
                  Aucun moyen de paiement configuré. Contacte-nous directement.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
