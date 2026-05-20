"use client";

import { useState, useEffect } from "react";
import { X, Trash2, ShoppingCart, CheckCircle, Loader2, Copy, RotateCcw, Tag, Check, UserPlus, Eye, EyeOff } from "lucide-react";
import type { CartItem, LicenseType } from "@/types";

type PaymentMethod = {
  id: string;
  type: string;
  label: string;
  value: string;
  active: boolean;
};

type SavedOrder = {
  total: number;
  beatTitles: string[];
  hasExclusive: boolean;
  paymentMethods: PaymentMethod[];
  timestamp: number;
};

type Props = {
  cart: CartItem[];
  onRemove: (id: string) => void;
  onClose: () => void;
  onClearCart: () => void;
};

const EMOJI: Record<string, string> = {
  paypal: "💙", virement: "🏦", lydia: "💜", sumeria: "🟢", custom: "⚡",
};

const LICENSE_LABELS: Record<LicenseType, string> = {
  mp3: "MP3",
  wav: "MP3 + WAV",
  exclusive: "ZIP Exclusif complet",
};

const LICENSE_COLORS: Record<LicenseType, string> = {
  mp3: "#b400ff",
  wav: "#00f5ff",
  exclusive: "#f59e0b",
};

const LS_KEY = "toxic_last_order";
const ORDER_TTL = 48 * 60 * 60 * 1000;

type PromoResult = {
  valid: boolean;
  code?: string;
  type?: string;
  value?: number;
  description?: string;
  error?: string;
};

function calcDiscount(promo: PromoResult | null, cart: CartItem[], total: number): number {
  if (!promo?.valid || !promo.type) return 0;
  switch (promo.type) {
    case "percentage":
      return Math.round(total * (promo.value ?? 0) / 100 * 100) / 100;
    case "fixed":
      return Math.min(total, promo.value ?? 0);
    case "free_mp3": {
      const item = cart.find(i => i.type === "beat" && i.licenseType === "mp3");
      return item ? item.price : 0;
    }
    case "free_wav": {
      const item = cart.find(i => i.type === "beat" && i.licenseType === "wav");
      return item ? item.price : 0;
    }
    case "free_exclusive": {
      const item = cart.find(i => i.type === "beat" && i.licenseType === "exclusive");
      return item ? item.price : 0;
    }
    case "free_kit": {
      const item = cart.find(i => i.type === "kit");
      return item ? item.price : 0;
    }
    default: return 0;
  }
}

export default function CartModal({ cart, onRemove, onClose, onClearCart }: Props) {
  const [form, setForm] = useState({ firstname: "", lastname: "", email: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [confirmedTotal, setConfirmedTotal] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedOrder, setSavedOrder] = useState<SavedOrder | null>(null);
  const [initialCartEmpty] = useState(cart.length === 0);

  // Code promo
  const [promoInput, setPromoInput]   = useState("");
  const [promoResult, setPromoResult] = useState<PromoResult | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);

  // Création de compte après commande
  const [signupPassword, setSignupPassword] = useState("");
  const [showSignupPwd, setShowSignupPwd]   = useState(false);
  const [signupStatus, setSignupStatus]     = useState<"idle" | "loading" | "success" | "error">("idle");
  const [signupError, setSignupError]       = useState("");

  const handleSignup = async () => {
    if (!signupPassword || signupPassword.length < 6) {
      setSignupError("Au moins 6 caractères");
      return;
    }
    setSignupStatus("loading");
    setSignupError("");
    try {
      const res = await fetch("/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, password: signupPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSignupError(data.error ?? "Erreur");
        setSignupStatus("error");
      } else {
        setSignupStatus("success");
      }
    } catch {
      setSignupError("Erreur réseau");
      setSignupStatus("error");
    }
  };

  const rawTotal    = cart.reduce((s, item) => s + item.price, 0);
  const discount    = calcDiscount(promoResult, cart, rawTotal);
  const total       = Math.max(0, rawTotal - discount);
  const hasExclusive = cart.some((i) => i.type === "beat" && i.licenseType === "exclusive");

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    try {
      const res = await fetch("/api/promo/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoInput.trim() }),
      });
      const data: PromoResult = await res.json();
      setPromoResult(data);
    } catch {
      setPromoResult({ valid: false, error: "Erreur réseau" });
    }
    setPromoLoading(false);
  };

  useEffect(() => {
    fetch("/api/settings/payment")
      .then((r) => r.json())
      .then((data) => setPaymentMethods((data.methods ?? []).filter((m: PaymentMethod) => m.active && m.value)));

    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const order: SavedOrder = JSON.parse(raw);
        if (Date.now() - order.timestamp < ORDER_TTL) {
          setSavedOrder(order);
        } else {
          localStorage.removeItem(LS_KEY);
        }
      }
    } catch {
      // localStorage indisponible
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError("");

    const unavailable: string[] = [];
    const ordered: CartItem[] = [];

    // Répartit la remise proportionnellement sur les articles
    const promoCode    = promoResult?.valid ? promoResult.code : undefined;
    const totalDiscount = discount;

    await Promise.all(cart.map(async (item) => {
      const buyerName = `${form.firstname} ${form.lastname}`.trim();
      const itemRatio = rawTotal > 0 ? item.price / rawTotal : 0;
      const itemDiscount = Math.round(totalDiscount * itemRatio * 100) / 100;
      const finalAmount = Math.max(0, item.price - itemDiscount);

      let body: Record<string, unknown>;
      if (item.type === "kit") {
        body = {
          product_type: "kit",
          kit_id: item.kit.id,
          beat_title: item.kit.title,
          buyer_name: buyerName,
          buyer_email: form.email,
          amount: finalAmount,
          promo_code: promoCode,
          discount_amount: itemDiscount,
        };
      } else {
        body = {
          product_type: "beat",
          beat_id: item.beat.id,
          beat_title: item.beat.title,
          buyer_name: buyerName,
          buyer_email: form.email,
          amount: finalAmount,
          license_type: item.licenseType,
          promo_code: promoCode,
          discount_amount: itemDiscount,
        };
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const itemTitle = item.type === "kit" ? item.kit.title : item.beat.title;

      if (res.status === 409) {
        unavailable.push(itemTitle);
      } else if (res.ok) {
        ordered.push(item);
      } else {
        throw new Error("server");
      }
    }));

    if (unavailable.length > 0 && ordered.length === 0) {
      setStatus("error");
      setError(`${unavailable.map(t => `"${t}"`).join(", ")} ${unavailable.length > 1 ? "ont été réservés" : "a été réservé"} par quelqu'un d'autre entre-temps. Retire ${unavailable.length > 1 ? "ces articles" : "cet article"} de ton panier.`);
      return;
    }

    if (unavailable.length > 0) {
      setError(`Note : ${unavailable.map(t => `"${t}"`).join(", ")} ${unavailable.length > 1 ? "n'étaient plus disponibles" : "n'était plus disponible"} et ${unavailable.length > 1 ? "ont été retirés" : "a été retiré"} de ta commande.`);
    }

    const successTotal = ordered.reduce((s, i) => s + i.price, 0);
    const beatTitles = ordered.map((i) => {
      if (i.type === "kit") return `${i.kit.title} (KIT)`;
      return `${i.beat.title} (${LICENSE_LABELS[i.licenseType]})`;
    });
    const hasExclusive = ordered.some((i) => i.type === "beat" && i.licenseType === "exclusive");

    // Envoi de l'email de confirmation au client (non bloquant)
    fetch("/api/orders/send-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        buyerName: `${form.firstname} ${form.lastname}`.trim(),
        buyerEmail: form.email,
        beatTitles,
        total: successTotal,
        hasExclusive,
      }),
    }).catch((err) => console.error("[send-confirmation] échec fetch :", err));

    const orderData: SavedOrder = {
      total: successTotal,
      beatTitles,
      hasExclusive,
      paymentMethods,
      timestamp: Date.now(),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(orderData));
    setSavedOrder(orderData);
    setConfirmedTotal(successTotal);
    setStatus("success");
    onClearCart();
  };

  const copyValue = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearSavedOrder = () => {
    localStorage.removeItem(LS_KEY);
    setSavedOrder(null);
  };

  const isSuccess = status === "success";
  // La vue de récupération s'affiche uniquement si le panier était déjà vide
  // à l'ouverture (session de récupération), pas quand l'utilisateur vient de
  // retirer tous ses articles (il faut lui montrer "panier vide" à la place).
  const showRecovery = !isSuccess && cart.length === 0 && savedOrder !== null && initialCartEmpty;
  const blockOutsideClose = isSuccess || showRecovery;
  const activeMethods = isSuccess ? paymentMethods : (savedOrder?.paymentMethods ?? []);

  const SuccessContent = ({ orderTotal, titles, hasExcl }: { orderTotal: number; titles: string[]; hasExcl?: boolean }) => (
    <div className="py-6 px-6">
      <div className="text-center mb-6">
        <CheckCircle size={48} className="mx-auto mb-4 text-[#39ff14]"
          style={{ filter: "drop-shadow(0 0 10px #39ff1480)" }} />
        <h3 className="text-xl font-bold text-white mb-2">Commande enregistrée !</h3>
        <p className="text-neutral-400 text-sm leading-relaxed">
          {(() => {
            const kitCount  = titles.filter(t => t.endsWith("(KIT)")).length;
            const beatCount = titles.length - kitCount;
            if (titles.length === 1) {
              return <><span className="text-[#b400ff] font-semibold">{titles[0]}</span> commandé.</>;
            }
            const parts: string[] = [];
            if (beatCount > 0) parts.push(`${beatCount} beat${beatCount > 1 ? "s" : ""}`);
            if (kitCount  > 0) parts.push(`${kitCount} kit${kitCount  > 1 ? "s" : ""}`);
            return <><span className="text-white font-bold">{parts.join(" et ")}</span> commandés.</>;
          })()}{" "}
          Effectue ton paiement de <span className="text-white font-bold">{orderTotal}€</span> via l&apos;un des moyens ci-dessous.
        </p>
      </div>

      {/* Alerte email */}
      <div className="flex items-start gap-3 bg-[#b400ff0d] border border-[#b400ff40] rounded-xl px-4 py-3 mb-5">
        <span className="text-xl flex-shrink-0">📬</span>
        <div>
          <p className="text-white text-sm font-bold mb-0.5">Vérifie ta boîte mail (et tes spams)</p>
          <p className="text-neutral-400 text-xs leading-relaxed">
            Tu as reçu un récap de ta commande avec les moyens de paiement. Si tu ne le vois pas, regarde dans les spams.
          </p>
        </div>
      </div>

      {activeMethods.length > 0 ? (
        <div className="space-y-2 mb-6">
          <p className="text-xs font-mono tracking-widest text-neutral-500 uppercase mb-3">Ou paie directement ici</p>
          {activeMethods.map((method) => (
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

      {hasExcl && (
        <div className="flex items-start gap-2 text-xs bg-[#f59e0b0d] border border-[#f59e0b30] rounded-lg p-3 mb-4 text-[#f59e0b] leading-relaxed">
          <span className="text-base flex-shrink-0">📦</span>
          <span>
            Ta commande inclut une <strong>licence exclusive</strong>. Ton lien de téléchargement donnera accès au <strong>MP3, au WAV et au ZIP des pistes</strong> du beat.
          </span>
        </div>
      )}
      <p className="text-xs text-neutral-600 text-center mb-4">
        {signupStatus === "success"
          ? <>Dès validation du paiement, tes fichiers seront disponibles dans <a href="/mon-compte" className="text-[#b400ff] hover:underline">ton espace</a>.</>
          : <>Envoie ta confirmation de paiement — ton lien de téléchargement t&apos;arrivera par email dès validation.</>
        }
      </p>

      {/* Bloc création de compte */}
      {signupStatus === "success" ? (
        <div className="flex items-center gap-3 bg-[#39ff1410] border border-[#39ff1430] rounded-xl px-4 py-3 mb-4">
          <CheckCircle size={16} style={{ color: "#39ff14" }} />
          <div>
            <p className="text-sm font-bold text-white">Compte créé !</p>
            <a href="/mon-compte" className="text-xs text-[#b400ff] hover:underline">
              Accéder à mon espace →
            </a>
          </div>
        </div>
      ) : (
        <div className="border border-[#2a2a2a] rounded-xl p-4 mb-4 bg-[#0d0d0d]">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus size={14} style={{ color: "#b400ff" }} />
            <p className="text-xs font-bold text-white">Retrouve tes téléchargements à tout moment</p>
          </div>
          <p className="text-[11px] text-neutral-500 mb-3">
            Crée un compte avec <span className="text-neutral-300">{form.email}</span> pour accéder à ton historique de commandes.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showSignupPwd ? "text" : "password"}
                value={signupPassword}
                onChange={e => { setSignupPassword(e.target.value); setSignupError(""); }}
                placeholder="Choisis un mot de passe"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 pr-8 text-white text-xs focus:outline-none focus:border-[#b400ff] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowSignupPwd(v => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
              >
                {showSignupPwd ? <EyeOff size={12} /> : <Eye size={12} />}
              </button>
            </div>
            <button
              onClick={handleSignup}
              disabled={signupStatus === "loading"}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-black disabled:opacity-50 whitespace-nowrap"
              style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)" }}
            >
              {signupStatus === "loading" ? <Loader2 size={12} className="animate-spin" /> : "Créer"}
            </button>
          </div>
          {signupError && <p className="text-red-400 text-[10px] mt-1.5">{signupError}</p>}
          <p className="text-[10px] text-neutral-600 mt-2">Minimum 6 caractères</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={() => { clearSavedOrder(); onClose(); }}
          className="flex-1 h-11 rounded-xl border border-[#2a2a2a] text-neutral-400 text-sm font-mono hover:text-white hover:border-[#3a3a3a] transition-all"
        >
          Fermer
        </button>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={blockOutsideClose ? undefined : onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl border border-[#2a2a2a] bg-[#111111] overflow-hidden"
        style={{ boxShadow: "0 0 60px rgba(180,0,255,0.2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
          <div className="flex items-center gap-2">
            <ShoppingCart size={18} className="text-[#b400ff]" />
            <span className="font-black text-white tracking-widest uppercase text-sm">Mon panier</span>
            {!isSuccess && !showRecovery && (
              <span className="text-xs font-mono text-neutral-500">({cart.length} article{cart.length > 1 ? "s" : ""})</span>
            )}
          </div>
          {!blockOutsideClose && (
            <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="max-h-[75vh] overflow-y-auto">
          {isSuccess && <SuccessContent orderTotal={confirmedTotal} titles={savedOrder?.beatTitles ?? []} hasExcl={savedOrder?.hasExclusive} />}

          {showRecovery && (
            <div>
              <div className="px-6 pt-4 pb-2">
                <div className="flex items-center gap-2 text-[#f59e0b] text-xs font-mono tracking-widest uppercase mb-1">
                  <RotateCcw size={12} /> Commande récente retrouvée
                </div>
                <p className="text-neutral-500 text-xs">Tu as une commande non finalisée. Voici les infos de paiement.</p>
              </div>
              <SuccessContent orderTotal={savedOrder!.total} titles={savedOrder!.beatTitles} hasExcl={savedOrder!.hasExclusive} />
            </div>
          )}

          {!isSuccess && !showRecovery && (
            <div className="p-5">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-neutral-600 text-sm">
                  Ton panier est vide.
                </div>
              ) : (
                <>
                  {/* Liste des articles */}
                  <div className="space-y-3 mb-5">
                    {cart.map((item) => {
                      if (item.type === "kit") {
                        return (
                          <div key={`kit-${item.kit.id}`}
                            className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                              {item.kit.image_url ? (
                                <img src={item.kit.image_url} alt={item.kit.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center"
                                  style={{ background: "linear-gradient(135deg, #1a0f00, #0a0800)" }}>
                                  <span className="text-lg font-black text-[#f59e0b] opacity-30">K</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-bold text-sm truncate">{item.kit.title}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                                  style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                                  KIT
                                </span>
                              </div>
                            </div>
                            <span className="text-[#f59e0b] font-bold text-sm flex-shrink-0">{item.price}€</span>
                            <button
                              onClick={() => onRemove(item.kit.id)}
                              className="flex-shrink-0 text-neutral-600 hover:text-red-400 transition-colors ml-1"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        );
                      }

                      // Beat item — clé composite beatId|licenseType pour permettre
                      // le même beat avec plusieurs licences dans le panier
                      const beatKey = `${item.beat.id}|${item.licenseType}`;
                      return (
                        <div key={`beat-${beatKey}`}
                          className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a]">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden">
                            {item.beat.image_url ? (
                              <img src={item.beat.image_url} alt={item.beat.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"
                                style={{ background: "linear-gradient(135deg, #1a0a2e, #0a0a1a)" }}>
                                <span className="text-lg font-black text-[#b400ff] opacity-30">T</span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm truncate">{item.beat.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                                style={{ background: `${LICENSE_COLORS[item.licenseType]}20`, color: LICENSE_COLORS[item.licenseType] }}>
                                {LICENSE_LABELS[item.licenseType]}
                              </span>
                              <span className="text-neutral-500 text-xs">{item.beat.genre} · {item.beat.bpm} BPM</span>
                            </div>
                          </div>
                          <span className="text-[#b400ff] font-bold text-sm flex-shrink-0">{item.price}€</span>
                          <button
                            onClick={() => onRemove(beatKey)}
                            className="flex-shrink-0 text-neutral-600 hover:text-red-400 transition-colors ml-1"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Code promo */}
                  <div className="mb-4">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                        <input
                          value={promoInput}
                          onChange={e => {
                            setPromoInput(e.target.value.toUpperCase());
                            if (promoResult) setPromoResult(null);
                          }}
                          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), applyPromo())}
                          placeholder="CODE PROMO"
                          className="w-full bg-[#1a1a1a] border rounded-xl pl-8 pr-3 py-2.5 text-white text-sm font-mono uppercase focus:outline-none transition-colors"
                          style={{
                            borderColor: promoResult?.valid ? "#39ff14" : promoResult?.valid === false ? "#ef4444" : "#2a2a2a",
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={applyPromo}
                        disabled={promoLoading || !promoInput.trim()}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-black disabled:opacity-40 transition-all hover:scale-105"
                        style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)" }}
                      >
                        {promoLoading ? <Loader2 size={13} className="animate-spin" /> : "Appliquer"}
                      </button>
                    </div>
                    {promoResult && (
                      <p className={`text-xs mt-1.5 flex items-center gap-1 ${promoResult.valid ? "text-[#39ff14]" : "text-red-400"}`}>
                        {promoResult.valid
                          ? <><Check size={11} /> Code appliqué — {discount > 0 ? `-${discount}€` : "article offert"}</>
                          : promoResult.error
                        }
                      </p>
                    )}
                  </div>

                  {/* Total */}
                  <div className="mb-5 px-1">
                    {discount > 0 && (
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-neutral-500 text-xs font-mono uppercase tracking-widest">Sous-total</span>
                        <span className="text-sm text-neutral-400 line-through">{rawTotal}€</span>
                      </div>
                    )}
                    {discount > 0 && (
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono uppercase tracking-widest" style={{ color: "#39ff14" }}>
                          Code {promoResult?.code}
                        </span>
                        <span className="text-sm font-bold" style={{ color: "#39ff14" }}>-{discount}€</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-neutral-400 text-sm font-mono uppercase tracking-widest">Total</span>
                      <span className="text-2xl font-black text-white">{total}€</span>
                    </div>
                  </div>

                  <div className="h-px bg-[#1a1a1a] mb-5" />

                  {/* Avertissement réservation (uniquement si licence exclusive dans le panier) */}
                  {hasExclusive && (
                    <div className="text-xs text-[#f59e0b] bg-[#f59e0b0d] border border-[#f59e0b30] rounded-lg p-3 mb-3 leading-relaxed flex gap-2">
                      <span className="flex-shrink-0 mt-0.5">⏱</span>
                      <span>
                        Les licences <strong>EXCLUSIVES</strong> seront <strong>réservées pendant 2h</strong> après validation. Sans paiement dans ce délai, elles pourront être remises en vente.
                      </span>
                    </div>
                  )}
                  <div className="text-xs text-neutral-500 bg-[#1a1a1a] rounded-lg p-3 mb-4 leading-relaxed">
                    Remplis ce formulaire et effectue le paiement. Dès validation, tes fichiers seront disponibles dans ton espace personnel (si tu crées un compte) ou envoyés par email.
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3">
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
                      {status === "loading"
                        ? <Loader2 size={18} className="animate-spin" />
                        : `Commander ${cart.length} article${cart.length > 1 ? "s" : ""} · ${total}€${discount > 0 ? ` (-${discount}€)` : ""}`
                      }
                    </button>
                  </form>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
