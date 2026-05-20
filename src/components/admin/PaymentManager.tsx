"use client";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("toxic_auth_token") : null;
}

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, Loader2, CheckCircle, CreditCard } from "lucide-react";

type PaymentMethod = {
  id: string;
  type: "paypal" | "virement" | "lydia" | "sumeria" | "custom";
  label: string;
  value: string;
  active: boolean;
};

type StripeConfig = {
  enabled: boolean;
  mode: "test" | "live";
};

const PREDEFINED = [
  { type: "paypal"   as const, label: "PayPal",            placeholder: "email@paypal.com",  emoji: "💙" },
  { type: "virement" as const, label: "Virement bancaire", placeholder: "IBAN : FR76...",     emoji: "🏦" },
  { type: "lydia"    as const, label: "Lydia",             placeholder: "06 XX XX XX XX",     emoji: "💜" },
  { type: "sumeria"  as const, label: "Sumeria",           placeholder: "06 XX XX XX XX",     emoji: "🟢" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export default function PaymentManager() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [stripe, setStripe]   = useState<StripeConfig>({ enabled: false, mode: "test" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => {
    fetch("/api/settings/payment")
      .then((r) => r.json())
      .then((data) => {
        setMethods(data.methods ?? []);
        setStripe(data.stripe ?? { enabled: false, mode: "test" });
        setLoading(false);
      });
  }, []);

  const addPredefined = (def: typeof PREDEFINED[number]) => {
    if (methods.some((m) => m.type === def.type)) return;
    setMethods((prev) => [...prev, { id: uid(), type: def.type, label: def.label, value: "", active: true }]);
  };

  const addCustom = () => {
    setMethods((prev) => [...prev, { id: uid(), type: "custom", label: "", value: "", active: true }]);
  };

  const update = (id: string, patch: Partial<PaymentMethod>) => {
    setMethods((prev) => prev.map((m) => m.id === id ? { ...m, ...patch } : m));
  };

  const remove = (id: string) => {
    setMethods((prev) => prev.filter((m) => m.id !== id));
  };

  const save = async () => {
    setSaving(true);
    
    await fetch("/api/settings/payment", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ methods, stripe }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 size={24} className="animate-spin text-[#b400ff]" />
      </div>
    );
  }

  const activeTypes = new Set(methods.map((m) => m.type));

  return (
    <div>
      <h2 className="text-sm font-mono tracking-widest text-neutral-400 uppercase mb-1">Moyens de paiement</h2>
      <p className="text-xs text-neutral-600 mb-6">Ces informations s'afficheront à l'acheteur après sa commande.</p>

      {/* Boutons pour ajouter des moyens prédéfinis */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PREDEFINED.map((def) => (
          <button
            key={def.type}
            onClick={() => addPredefined(def)}
            disabled={activeTypes.has(def.type)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono transition-all border"
            style={activeTypes.has(def.type)
              ? { borderColor: "#2a2a2a", color: "#333", background: "#111", cursor: "not-allowed" }
              : { borderColor: "#b400ff40", color: "#b400ff", background: "#b400ff10", cursor: "pointer" }
            }
          >
            <span>{def.emoji}</span> {def.label}
          </button>
        ))}
        <button
          onClick={addCustom}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono border transition-all"
          style={{ borderColor: "#2a2a2a", color: "#666", background: "#111" }}
        >
          <Plus size={13} /> Personnalisé
        </button>
      </div>

      {/* Liste des moyens configurés */}
      {methods.length === 0 ? (
        <div className="text-center py-12 text-neutral-600 text-sm border border-dashed border-[#2a2a2a] rounded-xl">
          Aucun moyen de paiement configuré.
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {methods.map((method) => {
            const def = PREDEFINED.find((d) => d.type === method.type);
            return (
              <div key={method.id} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  {def && <span className="text-xl">{def.emoji}</span>}
                  {method.type === "custom" ? (
                    <input
                      value={method.label}
                      onChange={(e) => update(method.id, { label: e.target.value })}
                      placeholder="Nom du moyen de paiement"
                      className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#b400ff]"
                    />
                  ) : (
                    <span className="flex-1 text-sm font-bold text-white">{method.label}</span>
                  )}
                  {/* Toggle actif */}
                  <button
                    onClick={() => update(method.id, { active: !method.active })}
                    className="px-3 py-1 rounded-lg text-xs font-mono transition-all"
                    style={method.active
                      ? { background: "#39ff1415", border: "1px solid #39ff1440", color: "#39ff14" }
                      : { background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#555" }
                    }
                  >
                    {method.active ? "Actif" : "Inactif"}
                  </button>
                  <button onClick={() => remove(method.id)} className="text-neutral-600 hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
                <input
                  value={method.value}
                  onChange={(e) => update(method.id, { value: e.target.value })}
                  placeholder={def?.placeholder ?? "Informations de paiement"}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-[#b400ff] transition-colors"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ── Section Stripe ── */}
      <div className="mb-6 p-4 rounded-xl border border-[#2a2a2a] bg-[#0d0d0d]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard size={15} className="text-[#635bff]" />
            <span className="text-sm font-bold text-white">Stripe</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ background: "#635bff20", color: "#635bff" }}>Carte bancaire</span>
          </div>
          <button
            onClick={() => setStripe(s => ({ ...s, enabled: !s.enabled }))}
            className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200"
            style={{ background: stripe.enabled ? "#635bff" : "#2a2a2a", boxShadow: stripe.enabled ? "0 0 10px rgba(99,91,255,0.4)" : "none" }}
          >
            <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200"
              style={{ left: stripe.enabled ? "calc(100% - 1.375rem)" : "2px" }} />
          </button>
        </div>

        {stripe.enabled && (
          <div className="space-y-3">
            <div className="flex gap-2">
              {(["test", "live"] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setStripe(s => ({ ...s, mode: m }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all"
                  style={stripe.mode === m
                    ? { background: m === "test" ? "#f59e0b20" : "#39ff1420", color: m === "test" ? "#f59e0b" : "#39ff14", border: `1px solid ${m === "test" ? "#f59e0b40" : "#39ff1440"}` }
                    : { background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }
                  }
                >
                  {m === "test" ? "🧪 Test" : "🚀 Live"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-neutral-600 leading-relaxed">
              {stripe.mode === "test"
                ? "Mode test — utilise les cartes de test Stripe (4242 4242 4242 4242). Aucun vrai paiement."
                : "Mode live — les vrais paiements sont encaissés. Assure-toi que les clés live sont configurées sur le serveur."
              }
            </p>
          </div>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-black text-sm font-bold transition-all hover:scale-[1.01] disabled:opacity-60"
        style={{ background: saved ? "#39ff14" : "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px rgba(180,0,255,0.3)" }}
      >
        {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : <Save size={15} />}
        {saved ? "Sauvegardé !" : "Sauvegarder"}
      </button>
    </div>
  );
}
