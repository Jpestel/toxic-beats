"use client";

import { useState, useEffect } from "react";
import { LogIn, LogOut, Download, Clock, CheckCircle, Package, Music, Eye, EyeOff, ShieldCheck } from "lucide-react";
import Link from "next/link";

type Session = { token: string; email: string } | null;

type Order = {
  id: string;
  beat_title: string;
  product_type: "beat" | "kit";
  license_type: string | null;
  amount: number;
  discount_amount: number | null;
  status: "pending" | "paid";
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
  const [isAdmin, setIsAdmin]   = useState(false);

  // Login form
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd]   = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Récupère la session au chargement
  useEffect(() => {
    const token = localStorage.getItem("toxic_auth_token");
    if (!token) { setLoading(false); return; }

    fetch("/api/auth/me", { headers: { authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (data.email) setSession({ token, email: data.email }); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Charge les commandes + vérifie si admin quand la session est disponible
  useEffect(() => {
    if (!session) return;

    setOrdersLoading(true);

    // Commandes
    fetch("/api/account/orders", {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then(r => r.json())
      .then(data => setOrders(data.orders ?? []))
      .finally(() => setOrdersLoading(false));

    // Rôle admin
    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then(r => r.json())
      .then(data => setIsAdmin(data.isAdmin === true));

  }, [session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const res  = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error ?? "Email ou mot de passe incorrect");
      } else {
        localStorage.setItem("toxic_auth_token", data.token);
        setSession({ token: data.token, email: data.email });
      }
    } catch {
      setLoginError("Erreur réseau.");
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("toxic_auth_token");
    setSession(null);
    setOrders([]);
    setIsAdmin(false);
  };

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  // Construit l'URL de téléchargement authentifiée (permanente)
  const dlUrl = (orderId: string, file: "mp3" | "wav" | "zip") =>
    `/api/account/download/${orderId}?file=${file}`;

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
        <div className="flex items-center gap-4">
          {session && isAdmin && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-lg transition-colors"
              style={{ background: "#b400ff20", color: "#b400ff" }}
            >
              <ShieldCheck size={14} />
              Admin
            </Link>
          )}
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
              <h1 className="text-xl font-black text-white">{session.email}</h1>
              {isAdmin && (
                <p className="text-xs text-[#b400ff] font-mono mt-1 flex items-center gap-1">
                  <ShieldCheck size={11} /> Compte administrateur
                </p>
              )}
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

                        {order.status === "paid" && (
                          <DownloadButtons
                            orderId={order.id}
                            licenseType={order.license_type}
                            productType={order.product_type}
                            accessToken={session.token}
                            dlUrl={dlUrl}
                          />
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

// Composant boutons de téléchargement — fait la requête avec le Bearer token
function DownloadButtons({
  orderId,
  licenseType,
  productType,
  accessToken,
  dlUrl,
}: {
  orderId: string;
  licenseType: string | null;
  productType: "beat" | "kit";
  accessToken: string;
  dlUrl: (id: string, file: "mp3" | "wav" | "zip") => string;
}) {
  const [downloading, setDownloading] = useState<string | null>(null);

  const handleDownload = async (file: "mp3" | "wav" | "zip") => {
    setDownloading(file);
    try {
      const res = await fetch(dlUrl(orderId, file), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error ?? "Erreur lors du téléchargement");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const match = cd.match(/filename="?([^"]+)"?/);
      const filename = match ? decodeURIComponent(match[1]) : `download.${file}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(null);
    }
  };

  const hasWav = licenseType === "wav" || licenseType === "exclusive";
  const hasZip = licenseType === "exclusive" || productType === "kit";

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => handleDownload("mp3")}
        disabled={!!downloading}
        className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
        style={{ background: "#b400ff20", color: "#b400ff" }}
      >
        <Download size={10} />
        {downloading === "mp3" ? "..." : "MP3"}
      </button>

      {hasWav && (
        <button
          onClick={() => handleDownload("wav")}
          disabled={!!downloading}
          className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
          style={{ background: "#00f5ff20", color: "#00f5ff" }}
        >
          <Download size={10} />
          {downloading === "wav" ? "..." : "WAV"}
        </button>
      )}

      {hasZip && (
        <button
          onClick={() => handleDownload("zip")}
          disabled={!!downloading}
          className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
          style={{ background: "#f59e0b20", color: "#f59e0b" }}
        >
          <Download size={10} />
          {downloading === "zip" ? "..." : "ZIP"}
        </button>
      )}
    </div>
  );
}
