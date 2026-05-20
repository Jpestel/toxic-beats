"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { LogIn, LogOut, Download, Clock, CheckCircle, Package, Music, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import type { Session } from "@supabase/supabase-js";

type Order = {
  id: string;
  beat_title: string;
  product_type: "beat" | "kit";
  license_type: string | null;
  amount: number;
  discount_amount: number | null;
  status: "pending" | "paid";
  download_token: string | null;
  token_expires_at: string | null;
  token_used: boolean | null;
  created_at: string;
  beats?: { title: string; image_url: string | null } | null;
  kits?: { title: string; image_url: string | null } | null;
};

const LICENSE_LABELS: Record<string, string> = {
  mp3: "MP3",
  wav: "MP3 + WAV",
  exclusive: "ZIP Exclusif complet",
};

export default function MonComptePage() {
  const [session, setSession]   = useState<Session | null>(null);
  const [loading, setLoading]   = useState(true);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Login form
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Récupère la session au chargement
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Charge les commandes quand la session est disponible
  useEffect(() => {
    if (!session) return;
    setOrdersLoading(true);
    fetch("/api/account/orders", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(data => setOrders(data.orders ?? []))
      .finally(() => setOrdersLoading(false));
  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError("Email ou mot de passe incorrect");
    }
    setLoginLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setOrders([]);
  };

  const isTokenValid = (order: Order) => {
    if (!order.download_token || !order.token_expires_at) return false;
    return new Date(order.token_expires_at) > new Date();
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#b400ff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-black tracking-widest text-white hover:text-[#b400ff] transition-colors">
          ← RETOUR
        </Link>
        {session && (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Déconnexion
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">

        {/* PAS CONNECTÉ → Formulaire de connexion */}
        {!session && (
          <div className="max-w-sm mx-auto">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "linear-gradient(135deg, #b400ff20, #b400ff40)" }}>
                <LogIn size={28} style={{ color: "#b400ff" }} />
              </div>
              <h1 className="text-2xl font-black tracking-widest text-white mb-2">MON COMPTE</h1>
              <p className="text-neutral-400 text-sm">Connecte-toi pour accéder à tes commandes et tes téléchargements.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 uppercase tracking-widest">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="ton@email.com"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 uppercase tracking-widest">Mot de passe</label>
                <div className="relative">
                  <input
                    type={showPwd ? "text" : "password"}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-10 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors"
                  >
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {loginError && <p className="text-red-400 text-xs">{loginError}</p>}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full h-12 rounded-xl font-bold text-sm text-black disabled:opacity-60 transition-all hover:scale-[1.01]"
                style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px rgba(180,0,255,0.3)" }}
              >
                {loginLoading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          </div>
        )}

        {/* CONNECTÉ → Dashboard */}
        {session && (
          <div>
            <div className="mb-8">
              <p className="text-xs text-neutral-500 font-mono uppercase tracking-widest mb-1">Connecté en tant que</p>
              <h1 className="text-xl font-black text-white">{session.user.email}</h1>
            </div>

            <h2 className="text-sm font-mono uppercase tracking-widest text-neutral-400 mb-4">
              Mes commandes ({orders.length})
            </h2>

            {ordersLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-[#b400ff] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-[#2a2a2a] rounded-2xl">
                <Music size={32} className="mx-auto mb-3 text-neutral-700" />
                <p className="text-neutral-500 text-sm">Aucune commande trouvée</p>
                <Link href="/" className="inline-block mt-4 text-xs text-[#b400ff] hover:underline">
                  Découvrir les beats →
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => {
                  const cover = order.product_type === "kit"
                    ? order.kits?.image_url
                    : order.beats?.image_url;
                  const tokenOk = isTokenValid(order);
                  const licenseTypes = order.license_type
                    ? (["mp3", "wav", "exclusive"].includes(order.license_type)
                        ? [order.license_type]
                        : [order.license_type])
                    : [];

                  return (
                    <div
                      key={order.id}
                      className="flex gap-4 p-4 rounded-2xl border border-[#2a2a2a] bg-[#0d0d0d]"
                    >
                      {/* Cover */}
                      <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-[#1a1a1a]">
                        {cover
                          ? <img src={cover} alt={order.beat_title} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center">
                              {order.product_type === "kit"
                                ? <Package size={20} className="text-neutral-600" />
                                : <Music size={20} className="text-neutral-600" />}
                            </div>
                        }
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm truncate">{order.beat_title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {order.product_type === "kit"
                            ? <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "#f59e0b20", color: "#f59e0b" }}>KIT</span>
                            : <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "#b400ff20", color: "#b400ff" }}>
                                {LICENSE_LABELS[order.license_type ?? "mp3"] ?? order.license_type}
                              </span>
                          }
                          <span className="text-xs text-neutral-500">{formatDate(order.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          {order.status === "paid"
                            ? <><CheckCircle size={11} style={{ color: "#39ff14" }} /><span className="text-[10px] text-[#39ff14] font-mono">Payé</span></>
                            : <><Clock size={11} className="text-[#f59e0b]" /><span className="text-[10px] text-[#f59e0b] font-mono">En attente de paiement</span></>
                          }
                        </div>
                      </div>

                      {/* Prix + Téléchargement */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-white font-bold text-sm mb-2">{order.amount}€</p>
                        {order.status === "paid" && order.download_token && (
                          tokenOk ? (
                            <div className="flex flex-col gap-1">
                              <a
                                href={`/api/download/${order.download_token}?file=mp3`}
                                className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg transition-colors"
                                style={{ background: "#b400ff20", color: "#b400ff" }}
                              >
                                <Download size={10} /> MP3
                              </a>
                              {(order.license_type === "wav" || order.license_type === "exclusive") && (
                                <a
                                  href={`/api/download/${order.download_token}?file=wav`}
                                  className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg transition-colors"
                                  style={{ background: "#00f5ff20", color: "#00f5ff" }}
                                >
                                  <Download size={10} /> WAV
                                </a>
                              )}
                              {(order.license_type === "exclusive" || order.product_type === "kit") && (
                                <a
                                  href={`/api/download/${order.download_token}?file=zip`}
                                  className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg transition-colors"
                                  style={{ background: "#f59e0b20", color: "#f59e0b" }}
                                >
                                  <Download size={10} /> ZIP
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-neutral-600 font-mono">Lien expiré</span>
                          )
                        )}
                        {order.status === "pending" && (
                          <span className="text-[10px] text-neutral-600 font-mono">En attente</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
