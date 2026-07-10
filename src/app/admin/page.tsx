"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { CheckCircle, Clock, XCircle, Copy, RefreshCw, LogOut, Eye, EyeOff, Loader2, ShoppingBag, Music, Globe, UserCircle, Share2, CreditCard, Play, Square, Package, Archive, ChevronRight, HardDrive, Tag, Music2, BarChart2, Mail, BookOpen, Mic2, KeyRound, Menu, X, Users } from "lucide-react";
import type { Order } from "@/types";
import BeatsManager from "@/components/admin/BeatsManager";
import KitsManager from "@/components/admin/KitsManager";
import SiteManager from "@/components/admin/SiteManager";
import BioManager from "@/components/admin/BioManager";
import SocialManager from "@/components/admin/SocialManager";
import GenresManager from "@/components/admin/GenresManager";
import PaymentManager from "@/components/admin/PaymentManager";
import CarouselManager from "@/components/admin/CarouselManager";
import CoverLibraryManager from "@/components/admin/CoverLibraryManager";
import ThemeManager from "@/components/admin/ThemeManager";
import Pagination from "@/components/admin/Pagination";
import PromoManager from "@/components/admin/PromoManager";
import CreditsManager from "@/components/admin/CreditsManager";
import NewsletterManager from "@/components/admin/NewsletterManager";
import BlogManager from "@/components/admin/BlogManager";
import BeatRequestsManager from "@/components/admin/BeatRequestsManager";
import ChangePasswordManager from "@/components/admin/ChangePasswordManager";
import UsersManager from "@/components/admin/UsersManager";

const ORDER_PAGE_SIZE = 10;
const TOXIC_ANALYTICS_URL =
  "https://stats.toxic-files.com/websites/f1ac4e7f-9689-46d9-9c28-92dc98f9a353";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("toxic_auth_token");
}

export default function AdminPage() {
  const [tab, setTab] = useState<"orders" | "catalogue" | "profil" | "contenu" | "payment" | "site" | "promos" | "analytics" | "requests" | "password" | "users">("orders");
  const [catalogueSub, setCatalogueSub] = useState<"beats" | "kits">("beats");
  const [profilSub, setProfilSub]       = useState<"bio" | "socials" | "credits">("bio");
  const [contenuSub, setContenuSub]     = useState<"newsletter" | "blog">("newsletter");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [orderSub, setOrderSub] = useState<"pending" | "paid" | "cancelled" | "deleted" | "archived">("pending");
  const [pendingPage, setPendingPage] = useState(1);
  const [paidPage, setPaidPage] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);
  const [deletedPage, setDeletedPage] = useState(1);
  const [user, setUser] = useState<{ email: string; isAdmin: boolean } | null>(null);
  const [checking, setChecking] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [revertingId, setRevertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingFilesId, setSendingFilesId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [newRequestsBadge, setNewRequestsBadge] = useState(0);

  const [storageInfo, setStorageInfo] = useState<{
    totalBytes: number;
    beatBytes: number;
    previewBytes: number;
    coverBytes: number;
    quotaBytes: number;
  } | null>(null);

  // Check session on mount
  useEffect(() => {
    const token = getToken();
    if (token) {
      fetch("/api/auth/me", { headers: { authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(data => { if (data.email) setUser({ email: data.email, isAdmin: data.isAdmin }); })
        .catch(() => {})
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  // Polling badge "Sur demande" toutes les 30s
  useEffect(() => {
    if (!user) return;
    const fetchBadge = async () => {
      const token = getToken();
      if (!token) return;
      const res = await fetch("/api/admin/beat-requests", { headers: { authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) {
        setNewRequestsBadge(data.filter((r: { status: string }) => r.status === "new").length);
      }
    };
    fetchBadge();
    const iv = setInterval(fetchBadge, 30000);
    return () => clearInterval(iv);
  }, [user]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await fetch("/api/orders", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const sorted = [...data].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setOrders(sorted);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) fetchOrders();
  }, [user, fetchOrders]);

  const fetchStorageInfo = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch("/api/storage-usage", {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();
        setStorageInfo({
          totalBytes: d.totalBytes,
          beatBytes: d.beatBytes,
          previewBytes: d.previewBytes,
          coverBytes: d.coverBytes,
          quotaBytes: d.quotaBytes,
        });
      }
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => {
    if (user) fetchStorageInfo();
  }, [user, fetchStorageInfo]);

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
        setLoginError(data.error ?? "Email ou mot de passe incorrect.");
      } else {
        localStorage.setItem("toxic_auth_token", data.token);
        setUser({ email: data.email, isAdmin: data.isAdmin });
      }
    } catch {
      setLoginError("Erreur réseau.");
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem("toxic_auth_token");
    setUser(null);
  };

  const confirmPayment = async (orderId: string) => {
    const token = getToken();
    const res = await fetch(`/api/orders/${orderId}/confirm`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      await fetchOrders();
      navigator.clipboard.writeText(data.downloadUrl); // copie le lien en silence
    } else {
      alert(data.error);
    }
  };

  const sendFiles = async (orderId: string) => {
    setSendingFilesId(orderId);
    try {
      const token = getToken();
      const res = await fetch(`/api/orders/${orderId}/send-files`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        await fetchOrders(); // rafraîchit pour afficher le badge "Email envoyé"
      } else {
        alert(data.error ?? "Erreur lors de l'envoi.");
      }
    } finally {
      setSendingFilesId(null);
    }
  };

  const copyLink = (url: string, orderId: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(orderId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm("Annuler cette commande ? Le beat redeviendra disponible à la vente.")) return;
    setCancellingId(orderId);
    const token = getToken();
    await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ status: "cancelled" }),
    });
    setCancellingId(null);
    await fetchOrders();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const selectAll = (ids: string[]) => setSelectedIds(new Set(ids));

  const bulkPatch = async (ids: string[], body: object) => {
    const token = getToken();
    await Promise.all(ids.map((id) =>
      fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(body),
      })
    ));
  };

  const bulkCancel = async (ids: string[]) => {
    if (!confirm(`Annuler ${ids.length} commande(s) ?`)) return;
    setBulkLoading(true);
    await bulkPatch(ids, { status: "cancelled" });
    clearSelection();
    await fetchOrders();
    setBulkLoading(false);
  };

  const bulkRevert = async (ids: string[]) => {
    if (!confirm(`Remettre en attente ${ids.length} commande(s) ?`)) return;
    setBulkLoading(true);
    await bulkPatch(ids, { status: "pending" });
    clearSelection();
    await fetchOrders();
    setBulkLoading(false);
  };

  const bulkDelete = async (ids: string[]) => {
    if (!confirm(`Supprimer ${ids.length} commande(s) ?`)) return;
    setBulkLoading(true);
    await bulkPatch(ids, { status: "deleted" });
    clearSelection();
    await fetchOrders();
    setBulkLoading(false);
  };

  const permanentDelete = async (orderId: string) => {
    if (!confirm("Supprimer définitivement cette commande ? Elle sera effacée de la base de données et irrécupérable.")) return;
    const token = getToken();
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error ?? "Erreur lors de la suppression."); return; }
    await fetchOrders();
  };

  const bulkPermanentDelete = async (ids: string[]) => {
    if (!confirm(`Supprimer définitivement ${ids.length} commande(s) ? Cette action est irréversible.`)) return;
    setBulkLoading(true);
    const token = getToken();
    await Promise.all(ids.map((id) =>
      fetch(`/api/orders/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      })
    ));
    clearSelection();
    await fetchOrders();
    setBulkLoading(false);
  };

  const bulkRestoreToCancel = async (ids: string[]) => {
    if (!confirm(`Restaurer ${ids.length} commande(s) dans les annulées ?`)) return;
    setBulkLoading(true);
    await bulkPatch(ids, { status: "cancelled" });
    clearSelection();
    await fetchOrders();
    setBulkLoading(false);
  };

  const bulkRestoreToPending = async (ids: string[]) => {
    if (!confirm(`Restaurer ${ids.length} commande(s) en attente de paiement ?`)) return;
    setBulkLoading(true);
    await bulkPatch(ids, { status: "pending" });
    clearSelection();
    await fetchOrders();
    setBulkLoading(false);
  };

  // Groupe les commandes par mois (clé: "YYYY-MM")
  const groupByMonth = (list: Order[]) => {
    const map = new Map<string, Order[]>();
    for (const o of list) {
      const d = new Date(o.created_at);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(o);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  };

  const formatMonthLabel = (key: string) => {
    const [y, m] = key.split("-");
    return new Date(parseInt(y), parseInt(m) - 1, 1)
      .toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
      .replace(/^./, (c) => c.toUpperCase());
  };

  const archiveMonth = async (orderIds: string[]) => {
    if (!confirm(`Archiver ces ${orderIds.length} commande(s) ?`)) return;
    const token = getToken();
    const now = new Date().toISOString();
    await Promise.all(orderIds.map((id) =>
      fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ archived_at: now }),
      })
    ));
    await fetchOrders();
  };

  const unarchiveMonth = async (orderIds: string[]) => {
    if (!confirm(`Désarchiver ces ${orderIds.length} commande(s) ?`)) return;
    const token = getToken();
    await Promise.all(orderIds.map((id) =>
      fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ archived_at: null }),
      })
    ));
    await fetchOrders();
  };

  const revertToPending = async (orderId: string) => {
    if (!confirm("Remettre cette commande en attente de paiement ? Le lien de téléchargement sera invalidé et le beat repassera en réservé.")) return;
    setRevertingId(orderId);
    const token = getToken();
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ status: "pending" }),
    });
    const data = await res.json();
    setRevertingId(null);
    if (!res.ok) {
      alert(data.error ?? "Impossible de remettre en attente.");
      return;
    }
    await fetchOrders();
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Supprimer cette commande ? Elle sera archivée et pourra être restaurée depuis l'onglet Supprimées.")) return;
    setDeletingId(orderId);
    const token = getToken();
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ status: "deleted" }),
    });
    const data = await res.json();
    setDeletingId(null);
    if (!res.ok) {
      alert(data.error ?? "Impossible de supprimer cette commande.");
      return;
    }
    await fetchOrders();
  };

  const restoreDeleted = async (orderId: string) => {
    if (!confirm("Restaurer cette commande dans les annulées ?")) return;
    const token = getToken();
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ status: "cancelled" }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Impossible de restaurer cette commande.");
      return;
    }
    await fetchOrders();
  };

  const restoreOrder = async (orderId: string) => {
    if (!confirm("Restaurer cette commande ? Le beat sera de nouveau marqué comme réservé.")) return;
    const token = getToken();
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ status: "pending" }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error ?? "Impossible de restaurer cette commande.");
      return;
    }
    await fetchOrders();
  };

  const statusBadge = (status: Order["status"]) => {
    const map = {
      pending:   { label: "En attente", color: "#f59e0b", icon: <Clock size={12} /> },
      paid:      { label: "Payé ✓",     color: "#39ff14", icon: <CheckCircle size={12} /> },
      cancelled: { label: "Annulé",     color: "#ef4444", icon: <XCircle size={12} /> },
      deleted:   { label: "Supprimé",   color: "#6b7280", icon: <XCircle size={12} /> },
    };
    const s = map[status];
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-mono font-bold"
        style={{ color: s.color, background: `${s.color}15`, border: `1px solid ${s.color}30` }}>
        {s.icon}{s.label}
      </span>
    );
  };

  // Loading session check
  if (checking) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 size={28} className="text-[#b400ff] animate-spin" />
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-[#080808] grid-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-white" style={{ textShadow: "0 0 20px rgba(180,0,255,0.5)" }}>
              TOXIC
            </h1>
            <p className="text-[#b400ff] font-mono text-xs tracking-widest mt-1">ADMIN</p>
          </div>
          <a
            href="/"
            className="flex items-center justify-center gap-2 text-xs text-neutral-500 hover:text-white transition-colors mb-6 font-mono tracking-widest"
          >
            ← Retour au site
          </a>
          <form
            onSubmit={handleLogin}
            className="bg-[#111] border border-[#2a2a2a] rounded-2xl p-6"
            style={{ boxShadow: "0 0 40px rgba(180,0,255,0.1)" }}
          >
            <div className="mb-4">
              <label className="block text-xs text-neutral-500 mb-2 tracking-widest uppercase">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                placeholder="ton@email.com"
              />
            </div>
            <div className="mb-5">
              <label className="block text-xs text-neutral-500 mb-2 tracking-widest uppercase">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-10 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-red-400 text-xs mb-4">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full h-11 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px rgba(180,0,255,0.3)" }}
            >
              {loginLoading ? <Loader2 size={16} className="animate-spin" /> : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard
  const pending   = orders.filter((o) => o.status === "pending");
  const paid      = orders.filter((o) => o.status === "paid" && !o.archived_at);
  const archived  = orders.filter((o) => o.status === "paid" && !!o.archived_at);
  const cancelled = orders.filter((o) => o.status === "cancelled");
  const deleted   = orders.filter((o) => o.status === "deleted");

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] bg-[#0d0d0d] px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors px-2.5 py-2 rounded-lg bg-[#1a1a1a]">
            <Globe size={13} />
            <span className="hidden sm:inline">← Site</span>
          </a>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black text-white">TOXIC</span>
            <span className="text-[#b400ff] font-mono text-xs tracking-widest">/ ADMIN</span>
            <span className="text-xs text-neutral-600 hidden md:block">· {user.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {tab === "orders" && (
            <button onClick={fetchOrders} disabled={loading}
              className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500 hover:text-white transition-colors px-2.5 py-2 rounded-lg bg-[#1a1a1a]">
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
          )}

          {/* Badge stockage */}
          {storageInfo && <StorageBadge {...storageInfo} onRefresh={fetchStorageInfo} />}

          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500 hover:text-red-400 transition-colors px-2.5 py-2 rounded-lg bg-[#1a1a1a]"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Déconnexion</span>
          </button>

          {/* Burger mobile */}
          <button
            onClick={() => setMobileMenuOpen(o => !o)}
            className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-400"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* ===== MENU MOBILE ===== */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-[60] flex flex-col" style={{ background: "#080808f5", backdropFilter: "blur(12px)" }}>
          <div className="h-14 flex items-center justify-between px-5 border-b border-[#1a1a1a]">
            <span className="text-sm font-black tracking-widest text-white font-mono">MENU ADMIN</span>
            <button onClick={() => setMobileMenuOpen(false)} className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-neutral-400">
              <X size={18} />
            </button>
          </div>
          <nav className="flex flex-col gap-2 p-5 flex-1 overflow-y-auto">
            {([
              { id: "orders",    label: "Commandes",   icon: <ShoppingBag size={20} />, badge: pending.length },
              { id: "catalogue", label: "Catalogue",   icon: <Music       size={20} />, badge: 0 },
              { id: "requests",  label: "Sur demande", icon: <Mic2        size={20} />, badge: newRequestsBadge },
              { id: "profil",    label: "Profil",      icon: <UserCircle  size={20} />, badge: 0 },
              { id: "contenu",   label: "Contenu",     icon: <BookOpen    size={20} />, badge: 0 },
              { id: "payment",   label: "Paiement",    icon: <CreditCard  size={20} />, badge: 0 },
              { id: "promos",    label: "Promos",      icon: <Tag         size={20} />, badge: 0 },
              { id: "analytics", label: "Analytics",   icon: <BarChart2   size={20} />, badge: 0 },
              { id: "site",      label: "Site",        icon: <Globe       size={20} />, badge: 0 },
              { id: "users",     label: "Comptes",     icon: <Users       size={20} />, badge: 0 },
              { id: "password",  label: "Compte",      icon: <KeyRound    size={20} />, badge: 0 },
            ] as { id: typeof tab; label: string; icon: React.ReactNode; badge: number }[]).map(t => (
              <button
                key={t.id}
                onClick={() => { setTab(t.id); if (t.id === "requests") setNewRequestsBadge(0); setMobileMenuOpen(false); }}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl border transition-all text-left"
                style={tab === t.id
                  ? { background: "#b400ff15", borderColor: "#b400ff50", color: "#b400ff" }
                  : { background: "#111", borderColor: "#1a1a1a", color: "#aaa" }
                }
              >
                {t.icon}
                <span className="font-bold tracking-widest uppercase text-sm">{t.label}</span>
                {t.badge > 0 && (
                  <span className="ml-auto px-2 py-0.5 rounded-full text-[10px] font-black text-black" style={{ background: "#f59e0b" }}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
            <div className="border-t border-[#1a1a1a] mt-2 pt-4 space-y-2">
              <a href="/"
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl bg-[#111] border border-[#1a1a1a] text-neutral-500"
              >
                <Globe size={20} />
                <span className="font-bold tracking-widest uppercase text-sm">← Retour au site</span>
              </a>
              <button
                onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl bg-[#111] border border-[#1a1a1a] text-red-400"
              >
                <LogOut size={20} />
                <span className="font-bold tracking-widest uppercase text-sm">Déconnexion</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Tabs desktop */}
      <div className="hidden sm:block border-b border-[#1a1a1a] bg-[#0d0d0d] overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-0 min-w-max px-2">
          {[
            { id: "orders"    as const, label: "Commandes",  icon: <ShoppingBag size={14} />, badge: pending.length },
            { id: "catalogue" as const, label: "Catalogue",  icon: <Music       size={14} />, badge: 0 },
            { id: "requests"  as const, label: "Sur demande",icon: <Mic2        size={14} />, badge: newRequestsBadge },
            { id: "profil"    as const, label: "Profil",     icon: <UserCircle  size={14} />, badge: 0 },
            { id: "contenu"   as const, label: "Contenu",    icon: <BookOpen    size={14} />, badge: 0 },
            { id: "payment"   as const, label: "Paiement",   icon: <CreditCard  size={14} />, badge: 0 },
            { id: "promos"    as const, label: "Promos",     icon: <Tag         size={14} />, badge: 0 },
            { id: "analytics" as const, label: "Analytics",  icon: <BarChart2   size={14} />, badge: 0 },
            { id: "site"      as const, label: "Site",       icon: <Globe       size={14} />, badge: 0 },
            { id: "users"     as const, label: "Comptes",    icon: <Users       size={14} />, badge: 0 },
            { id: "password"  as const, label: "Compte",     icon: <KeyRound    size={14} />, badge: 0 },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id as typeof tab); if (t.id === "requests") setNewRequestsBadge(0); }}
              className="flex items-center gap-1.5 px-3 py-3 text-xs font-mono tracking-widest uppercase transition-all border-b-2 -mb-px whitespace-nowrap"
              style={tab === t.id
                ? { color: "#b400ff", borderColor: "#b400ff" }
                : { color: "#555", borderColor: "transparent" }
              }
            >
              {t.icon}
              <span className="hidden xs:inline sm:inline">{t.label}</span>
              {t.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black text-black"
                  style={{ background: "#f59e0b" }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {tab === "analytics" && (
        <div className="flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a1a1a]">
            <div>
              <h2 className="text-sm font-mono tracking-widest uppercase text-white">Analytics</h2>
              <p className="text-xs text-[#555] mt-0.5 font-mono">Statistiques de trafic — Umami self-hosted</p>
            </div>
            <a
              href={TOXIC_ANALYTICS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono tracking-widest uppercase transition-all"
              style={{ background: "#b400ff18", border: "1px solid #b400ff44", color: "#b400ff" }}
            >
              <BarChart2 size={12} />
              Ouvrir les stats
            </a>
          </div>
          <iframe
            src={TOXIC_ANALYTICS_URL}
            className="w-full flex-1"
            style={{ background: "#0d0d0d", border: "none" }}
            title="Umami Analytics"
          />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* ── Catalogue : Beats + Kits ── */}
        {tab === "catalogue" && (
          <>
            <SubTabs
              tabs={[{ id: "beats", label: "Beats", icon: <Music size={13} /> }, { id: "kits", label: "Kits", icon: <Package size={13} /> }]}
              active={catalogueSub}
              onChange={v => setCatalogueSub(v as "beats" | "kits")}
            />
            {catalogueSub === "beats" && <BeatsManager />}
            {catalogueSub === "kits"  && <KitsManager />}
          </>
        )}

        {/* ── Profil : Bio + Réseaux + Productions ── */}
        {tab === "profil" && (
          <>
            <SubTabs
              tabs={[
                { id: "bio",     label: "Bio",         icon: <UserCircle size={13} /> },
                { id: "socials", label: "Réseaux",     icon: <Share2     size={13} /> },
                { id: "credits", label: "Productions", icon: <Music2     size={13} /> },
              ]}
              active={profilSub}
              onChange={v => setProfilSub(v as "bio" | "socials" | "credits")}
            />
            {profilSub === "bio"     && <BioManager />}
            {profilSub === "socials" && <SocialManager />}
            {profilSub === "credits" && <CreditsManager />}
          </>
        )}

        {/* ── Contenu : Newsletter + Blog ── */}
        {tab === "contenu" && (
          <>
            <SubTabs
              tabs={[
                { id: "newsletter", label: "Newsletter", icon: <Mail     size={13} /> },
                { id: "blog",       label: "Blog",       icon: <BookOpen size={13} /> },
              ]}
              active={contenuSub}
              onChange={v => setContenuSub(v as "newsletter" | "blog")}
            />
            {contenuSub === "newsletter" && <NewsletterManager />}
            {contenuSub === "blog"       && <BlogManager />}
          </>
        )}

        {tab === "payment"  && <PaymentManager />}
        {tab === "promos"   && <PromoManager />}
        {tab === "requests" && <BeatRequestsManager />}
        {tab === "users"    && <UsersManager />}
        {tab === "password" && <ChangePasswordManager />}
        {tab === "site" && (
          <>
            <SiteManager />
            <CarouselManager />
            <div className="mt-10 pt-8 border-t border-[#1a1a1a]">
              <CoverLibraryManager />
            </div>
            <div className="mt-10 pt-8 border-t border-[#1a1a1a]">
              <GenresManager />
            </div>
            <ThemeManager />
          </>
        )}

        {tab === "orders" && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total commandes", value: orders.length,                                  color: "#b400ff" },
                { label: "En attente",       value: pending.length,                                color: "#f59e0b" },
                { label: "Payées",           value: paid.length + archived.length,                                   color: "#39ff14" },
                { label: "CA total",         value: `${[...paid, ...archived].reduce((s, o) => s + Number(o.amount), 0).toFixed(2)}€`, color: "#00f5ff" },
              ].map((s) => (
                <div key={s.label} className="bg-[#111] border border-[#2a2a2a] rounded-xl p-4">
                  <p className="text-xs text-neutral-500 uppercase tracking-widest mb-1">{s.label}</p>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>

            {/* Sous-onglets */}
            <div className="overflow-x-auto -mx-4 mb-6" style={{ scrollbarWidth: "none" }}>
              <div className="flex gap-0 min-w-max px-4 border-b border-[#1a1a1a]">
                {([
                  { id: "pending"   as const, label: "En attente", color: "#f59e0b", count: pending.length },
                  { id: "paid"      as const, label: "Payées",      color: "#39ff14", count: paid.length },
                  { id: "cancelled" as const, label: "Annulées",    color: "#ef4444", count: cancelled.length },
                  { id: "deleted"   as const, label: "Supprimées",  color: "#6b7280", count: deleted.length },
                  { id: "archived"  as const, label: "Archives",    color: "#6b7280", count: archived.length },
                ]).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => { setOrderSub(s.id); setPendingPage(1); setPaidPage(1); setCancelledPage(1); setDeletedPage(1); clearSelection(); }}
                    className="flex items-center gap-2 px-4 py-2.5 text-xs font-mono tracking-widest uppercase transition-all border-b-2 -mb-px whitespace-nowrap"
                    style={orderSub === s.id
                      ? { color: s.color, borderColor: s.color }
                      : { color: "#444", borderColor: "transparent" }
                    }
                  >
                    {s.label}
                    {s.count > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                        style={orderSub === s.id
                          ? { background: `${s.color}25`, color: s.color }
                          : { background: "#1a1a1a", color: "#555" }
                        }>
                        {s.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* En attente */}
            {orderSub === "pending" && (() => {
              const pageItems = pending.slice((pendingPage - 1) * ORDER_PAGE_SIZE, pendingPage * ORDER_PAGE_SIZE);
              const sel = [...selectedIds].filter((id) => pending.some((o) => o.id === id));
              return pending.length === 0 ? (
                <div className="text-center py-20 text-neutral-600">Aucune commande en attente.</div>
              ) : (
                <>
                  <SelectionBar
                    sel={sel} pageIds={pageItems.map((o) => o.id)} allIds={pending.map((o) => o.id)}
                    onClear={clearSelection} onSelectPage={() => selectAll(pageItems.map((o) => o.id))} onSelectAll={() => selectAll(pending.map((o) => o.id))}
                    loading={bulkLoading}
                  >
                    <button onClick={() => bulkCancel(sel)} disabled={bulkLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono"
                      style={{ background: "#ef444415", border: "1px solid #ef444430", color: "#ef4444" }}>
                      <XCircle size={12} /> Annuler
                    </button>
                  </SelectionBar>
                  <div className="space-y-3">
                    {pageItems.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        selected={selectedIds.has(order.id)}
                        onToggleSelect={() => toggleSelect(order.id)}
                        onConfirm={() => confirmPayment(order.id)}
                        onCancel={() => cancelOrder(order.id)}
                        onRestore={() => {}}
                        cancelling={cancellingId === order.id}
                        copied={copiedId === order.id}
                        onCopy={() => {}}
                        statusBadge={statusBadge}
                      />
                    ))}
                  </div>
                  <Pagination page={pendingPage} total={pending.length} pageSize={ORDER_PAGE_SIZE} onChange={setPendingPage} />
                </>
              );
            })()}

            {/* Payées — groupées par mois */}
            {orderSub === "paid" && (() => {
              if (paid.length === 0) return (
                <div className="text-center py-20 text-neutral-600">
                  <Archive size={32} className="mx-auto mb-3 opacity-20" />
                  <p>Aucune commande payée active.</p>
                  {archived.length > 0 && (
                    <button onClick={() => setOrderSub("archived")}
                      className="mt-3 text-xs text-neutral-500 hover:text-white transition-colors underline underline-offset-2">
                      Voir les {archived.length} commande(s) archivée(s) →
                    </button>
                  )}
                </div>
              );
              const groups = groupByMonth(paid);
              return (
                <div className="space-y-6">
                  {groups.map(([key, monthOrders]) => {
                    const label = formatMonthLabel(key);
                    const monthTotal = monthOrders.reduce((s, o) => s + Number(o.amount), 0);
                    return (
                      <div key={key} className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1e1e1e" }}>
                        {/* En-tête du mois */}
                        <div className="flex items-center justify-between px-4 py-3 bg-[#0d0d0d] border-b border-[#1a1a1a]">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono tracking-widest uppercase" style={{ color: "#39ff14" }}>{label}</span>
                            <span className="text-xs text-neutral-600">{monthOrders.length} commande{monthOrders.length > 1 ? "s" : ""}</span>
                            <span className="text-sm font-black" style={{ color: "#39ff14" }}>{monthTotal}€</span>
                          </div>
                          <button
                            onClick={() => archiveMonth(monthOrders.map((o) => o.id))}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all hover:bg-[#ffffff10]"
                            style={{ background: "#ffffff06", border: "1px solid #2a2a2a", color: "#666" }}
                          >
                            <Archive size={12} /> Archiver ce mois
                          </button>
                        </div>
                        {/* Commandes */}
                        <div className="divide-y divide-[#111]">
                          {monthOrders.map((order) => (
                            <OrderRow
                              key={order.id}
                              order={order}
                              selected={selectedIds.has(order.id)}
                              onToggleSelect={() => toggleSelect(order.id)}
                              onConfirm={() => {}}
                              onCancel={() => cancelOrder(order.id)}
                              onRestore={() => {}}
                              onRevert={() => revertToPending(order.id)}
                              onSendFiles={() => sendFiles(order.id)}
                              cancelling={false}
                              reverting={revertingId === order.id}
                              sendingFiles={sendingFilesId === order.id}
                              copied={copiedId === order.id}
                              onCopy={() => copyLink(`${window.location.origin}/download/${order.download_token}`, order.id)}
                              statusBadge={statusBadge}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            {/* Annulées */}
            {orderSub === "cancelled" && (() => {
              const pageItems = cancelled.slice((cancelledPage - 1) * ORDER_PAGE_SIZE, cancelledPage * ORDER_PAGE_SIZE);
              const sel = [...selectedIds].filter((id) => cancelled.some((o) => o.id === id));
              return cancelled.length === 0 ? (
                <div className="text-center py-20 text-neutral-600">Aucune commande annulée.</div>
              ) : (
                <>
                  <SelectionBar
                    sel={sel} pageIds={pageItems.map((o) => o.id)} allIds={cancelled.map((o) => o.id)}
                    onClear={clearSelection} onSelectPage={() => selectAll(pageItems.map((o) => o.id))} onSelectAll={() => selectAll(cancelled.map((o) => o.id))}
                    loading={bulkLoading}
                  >
                    <button onClick={() => bulkRestoreToPending(sel)} disabled={bulkLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono"
                      style={{ background: "#f59e0b15", border: "1px solid #f59e0b30", color: "#f59e0b" }}>
                      <RefreshCw size={12} /> Restaurer
                    </button>
                    <button onClick={() => bulkDelete(sel)} disabled={bulkLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono"
                      style={{ background: "#ef444415", border: "1px solid #ef444430", color: "#ef4444" }}>
                      <XCircle size={12} /> Supprimer
                    </button>
                  </SelectionBar>
                  <div className="space-y-3">
                    {pageItems.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        selected={selectedIds.has(order.id)}
                        onToggleSelect={() => toggleSelect(order.id)}
                        onConfirm={() => {}}
                        onCancel={() => {}}
                        onRestore={() => restoreOrder(order.id)}
                        onDelete={() => deleteOrder(order.id)}
                        cancelling={false}
                        deleting={deletingId === order.id}
                        copied={false}
                        onCopy={() => {}}
                        statusBadge={statusBadge}
                      />
                    ))}
                  </div>
                  <Pagination page={cancelledPage} total={cancelled.length} pageSize={ORDER_PAGE_SIZE} onChange={setCancelledPage} />
                </>
              );
            })()}

            {/* Archives */}
            {orderSub === "archived" && (() => {
              if (archived.length === 0) return (
                <div className="text-center py-20 text-neutral-600">
                  <Archive size={32} className="mx-auto mb-3 opacity-20" />
                  <p>Aucune commande archivée.</p>
                </div>
              );
              const groups = groupByMonth(archived);
              return (
                <div className="space-y-3">
                  {groups.map(([key, monthOrders]) => (
                    <ArchivedMonthBlock
                      key={key}
                      monthKey={key}
                      orders={monthOrders}
                      onUnarchive={() => unarchiveMonth(monthOrders.map((o) => o.id))}
                      copiedId={copiedId}
                      revertingId={revertingId}
                      sendingFilesId={sendingFilesId}
                      onCopy={(order) => copyLink(`${window.location.origin}/download/${order.download_token}`, order.id)}
                      onRevert={(id) => revertToPending(id)}
                      onSendFiles={(id) => sendFiles(id)}
                      statusBadge={statusBadge}
                    />
                  ))}
                </div>
              );
            })()}

            {/* Supprimées */}
            {orderSub === "deleted" && (() => {
              const pageItems = deleted.slice((deletedPage - 1) * ORDER_PAGE_SIZE, deletedPage * ORDER_PAGE_SIZE);
              const sel = [...selectedIds].filter((id) => deleted.some((o) => o.id === id));
              return deleted.length === 0 ? (
                <div className="text-center py-20 text-neutral-600">Aucune commande supprimée.</div>
              ) : (
                <>
                  <SelectionBar
                    sel={sel} pageIds={pageItems.map((o) => o.id)} allIds={deleted.map((o) => o.id)}
                    onClear={clearSelection} onSelectPage={() => selectAll(pageItems.map((o) => o.id))} onSelectAll={() => selectAll(deleted.map((o) => o.id))}
                    loading={bulkLoading}
                  >
                    <button onClick={() => bulkRestoreToCancel(sel)} disabled={bulkLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono"
                      style={{ background: "#6b728020", border: "1px solid #6b728050", color: "#9ca3af" }}>
                      <RefreshCw size={12} /> Restaurer
                    </button>
                    <button onClick={() => bulkPermanentDelete(sel)} disabled={bulkLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono"
                      style={{ background: "#ef444415", border: "1px solid #ef444430", color: "#ef4444" }}>
                      <XCircle size={12} /> Supprimer définitivement
                    </button>
                  </SelectionBar>
                  <div className="space-y-3">
                    {pageItems.map((order) => (
                      <OrderRow
                        key={order.id}
                        order={order}
                        selected={selectedIds.has(order.id)}
                        onToggleSelect={() => toggleSelect(order.id)}
                        onConfirm={() => {}}
                        onCancel={() => {}}
                        onRestore={() => restoreDeleted(order.id)}
                        onPermanentDelete={() => permanentDelete(order.id)}
                        cancelling={false}
                        copied={false}
                        onCopy={() => {}}
                        statusBadge={statusBadge}
                      />
                    ))}
                  </div>
                  <Pagination page={deletedPage} total={deleted.length} pageSize={ORDER_PAGE_SIZE} onChange={setDeletedPage} />
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

function SelectionBar({
  sel, pageIds, allIds, onClear, onSelectPage, onSelectAll, loading, children,
}: {
  sel: string[]; pageIds: string[]; allIds: string[];
  onClear: () => void; onSelectPage: () => void; onSelectAll: () => void;
  loading: boolean; children: React.ReactNode;
}) {
  if (sel.length === 0) return null;
  return (
    <div className="flex items-center justify-between mb-4 px-4 py-2.5 rounded-xl border"
      style={{ background: "#b400ff0a", borderColor: "#b400ff30" }}>
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-mono font-bold" style={{ color: "#b400ff" }}>
          {sel.length} sélectionnée{sel.length > 1 ? "s" : ""}
        </span>
        <button onClick={onClear} className="text-xs text-neutral-500 hover:text-white transition-colors">
          Désélectionner
        </button>
        {sel.length < pageIds.length && (
          <button onClick={onSelectPage} className="text-xs text-neutral-500 hover:text-white transition-colors">
            Page ({pageIds.length})
          </button>
        )}
        {sel.length < allIds.length && (
          <button onClick={onSelectAll} className="text-xs text-neutral-500 hover:text-white transition-colors">
            Tout ({allIds.length})
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {loading && <Loader2 size={13} className="animate-spin text-neutral-500" />}
        {children}
      </div>
    </div>
  );
}

function OrderRow({
  order,
  onConfirm,
  onCancel,
  onRestore,
  onDelete,
  onRevert,
  onSendFiles,
  onPermanentDelete,
  selected,
  onToggleSelect,
  cancelling,
  reverting,
  deleting,
  sendingFiles,
  copied,
  onCopy,
  statusBadge,
}: {
  order: Order;
  onConfirm: () => void;
  onCancel: () => void;
  onRestore: () => void;
  onDelete?: () => void;
  onRevert?: () => void;
  onSendFiles?: () => void;
  onPermanentDelete?: () => void;
  selected?: boolean;
  onToggleSelect?: () => void;
  cancelling: boolean;
  reverting?: boolean;
  deleting?: boolean;
  sendingFiles?: boolean;
  copied: boolean;
  onCopy: () => void;
  statusBadge: (s: Order["status"]) => React.ReactNode;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // Upload custom files state
  const [customFiles, setCustomFiles] = useState<string[]>(order.custom_files ?? []);
  const [uploadingCustom, setUploadingCustom] = useState(false);
  const [deletingCustomFile, setDeletingCustomFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const uploadCustomFiles = async (files: FileList) => {
    setUploadingCustom(true);
    const token = getToken();
    const fd = new FormData();
    for (const f of Array.from(files)) fd.append("files", f);
    const res = await fetch(`/api/orders/${order.id}/upload-custom`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: fd,
    });
    const data = await res.json();
    if (data.files) setCustomFiles(data.files);
    else alert(data.error ?? "Erreur upload");
    setUploadingCustom(false);
  };

  const deleteCustomFile = async (filename?: string) => {
    if (!confirm(filename ? `Supprimer "${filename}" du serveur ?` : "Supprimer tous les fichiers de cette commande ?")) return;
    setDeletingCustomFile(filename ?? "__all__");
    const token = getToken();
    const res = await fetch(`/api/orders/${order.id}/delete-custom-files`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(filename ? { filename } : {}),
    });
    const data = await res.json();
    if (data.files !== undefined) setCustomFiles(data.files);
    else alert(data.error ?? "Erreur suppression");
    setDeletingCustomFile(null);
  };

  const togglePreview = () => {
    if (!order.preview_url) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(order.preview_url);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const downloadUrl = order.download_token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/download/${order.download_token}`
    : null;

  const createdAt = new Date(order.created_at);
  const dateLabel = createdAt.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
  const timeLabel = createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const copyEmail = () => navigator.clipboard.writeText(order.buyer_email);

  return (
    <div
      className="bg-[#111] rounded-xl p-4 transition-colors"
      style={{ border: selected ? "1px solid #b400ff50" : "1px solid #2a2a2a", background: selected ? "#b400ff08" : "#111" }}
    >
      {/* Ligne info */}
      <div className="flex items-start gap-3 mb-3">
        {onToggleSelect && (
          <button
            onClick={onToggleSelect}
            className="mt-1 w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all"
            style={selected
              ? { background: "#b400ff", borderColor: "#b400ff" }
              : { background: "transparent", borderColor: "#444" }
            }
          >
            {selected && <CheckCircle size={10} color="#fff" fill="#fff" strokeWidth={0} />}
          </button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-bold text-white text-sm">{order.buyer_name}</span>
            {statusBadge(order.status)}
          </div>
          {order.license_type === "exclusive" ? (
            <a
              href={`mailto:${order.buyer_email}?subject=Licence exclusive – ${order.beat_title}`}
              className="text-xs text-[#f59e0b] hover:text-[#fbbf24] transition-colors text-left truncate max-w-full block underline underline-offset-2"
              title="Envoyer un email"
            >
              {order.buyer_email}
            </a>
          ) : (
            <button
              onClick={copyEmail}
              className="text-xs text-neutral-500 hover:text-[#00f5ff] transition-colors text-left truncate max-w-full block"
              title="Copier l'email"
            >
              {order.buyer_email}
            </button>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-neutral-600 font-mono flex items-center gap-2 flex-wrap">
              {order.beat_title} ·{" "}
              {order.product_type === "custom" ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                  style={{ background: "#39ff1420", color: "#39ff14" }}>
                  SUR MESURE
                </span>
              ) : order.product_type === "kit" ? (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                  style={{ background: "#f59e0b20", color: "#f59e0b" }}>
                  KIT
                </span>
              ) : order.license_type && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded font-mono"
                  style={
                    order.license_type === "exclusive"
                      ? { background: "#f59e0b20", color: "#f59e0b" }
                      : order.license_type === "wav"
                      ? { background: "#00f5ff15", color: "#00f5ff" }
                      : { background: "#b400ff15", color: "#b400ff" }
                  }>
                  {order.license_type === "exclusive" ? "EXCLUSIF" : order.license_type.toUpperCase()}
                </span>
              )}
              <span className="text-[#b400ff]">{Number(order.amount).toFixed(2)}€</span>
            </p>
            {order.preview_url && (
              <button
                onClick={togglePreview}
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono transition-all"
                style={playing
                  ? { background: "#b400ff25", border: "1px solid #b400ff60", color: "#b400ff" }
                  : { background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#666" }
                }
              >
                {playing ? <Square size={9} fill="currentColor" /> : <Play size={9} fill="currentColor" />}
                {playing ? "Stop" : "Aperçu"}
              </button>
            )}
          </div>
          <p className="text-[10px] text-neutral-700 font-mono mt-0.5">{dateLabel} à {timeLabel}</p>

          {/* Historique envois fichiers */}
          {order.files_sent_history && order.files_sent_history.length > 0 && (
            <div className="mt-1.5 flex flex-col gap-0.5">
              {order.files_sent_history.map((ts, i) => {
                const d = new Date(ts);
                return (
                  <p key={i} className="text-[10px] font-mono flex items-center gap-1" style={{ color: "#00f5ff99" }}>
                    <span style={{ color: "#00f5ff" }}>↑</span>
                    Envoyé le {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })} à {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    {order.files_sent_history!.length > 1 && (
                      <span className="text-neutral-700 ml-0.5">#{i + 1}</span>
                    )}
                  </p>
                );
              })}
            </div>
          )}

          {/* Historique téléchargements */}
          {order.downloaded_at && order.downloaded_at.length > 0 && (
            <div className="mt-1 flex flex-col gap-0.5">
              {order.downloaded_at.map((entry, i) => {
                // Format stocké : "ISO_TIMESTAMP|filetype" ou ancienne valeur ISO pure
                const pipeIdx = entry.indexOf("|");
                const ts       = pipeIdx >= 0 ? entry.slice(0, pipeIdx) : entry;
                const fileType = pipeIdx >= 0 ? entry.slice(pipeIdx + 1).toUpperCase() : "—";
                const d = new Date(ts);
                const fileColor = fileType === "MP3" ? "#b400ff" : fileType === "WAV" ? "#00f5ff" : fileType === "ZIP" ? "#f59e0b" : "#888";
                return (
                  <p key={i} className="text-[10px] font-mono flex items-center gap-1" style={{ color: "#39ff1499" }}>
                    <span style={{ color: "#39ff14" }}>↓</span>
                    <span className="font-bold px-1 rounded" style={{ color: fileColor, background: `${fileColor}18` }}>{fileType}</span>
                    {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })} à {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    {order.downloaded_at!.length > 1 && (
                      <span className="text-neutral-700 ml-0.5">#{i + 1}</span>
                    )}
                  </p>
                );
              })}
            </div>
          )}

          {order.notes && (
            <p className="text-xs text-neutral-500 mt-1 italic">{order.notes}</p>
          )}

          {/* Gestion fichiers custom (commandes sur mesure) */}
          {order.product_type === "custom" && order.status === "paid" && (
            <div className="mt-3 p-3 rounded-xl border" style={{ background: "#001a0044", borderColor: "#39ff1422" }}>
              <p className="text-[10px] font-mono uppercase tracking-widest text-[#39ff1488] mb-2">Fichiers à livrer</p>
              {customFiles.length > 0 && (
                <div className="space-y-1 mb-2">
                  {customFiles.map(f => (
                    <div key={f} className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg bg-[#1a1a1a]">
                      <span className="text-xs font-mono text-neutral-300 truncate">{f}</span>
                      <button
                        onClick={() => deleteCustomFile(f)}
                        disabled={deletingCustomFile === f}
                        className="text-[10px] font-mono text-neutral-600 hover:text-red-400 transition-colors flex-shrink-0"
                        title="Supprimer ce fichier"
                      >
                        {deletingCustomFile === f ? <Loader2 size={11} className="animate-spin" /> : "✕"}
                      </button>
                    </div>
                  ))}
                  {customFiles.length > 1 && (
                    <button onClick={() => deleteCustomFile()}
                      disabled={deletingCustomFile === "__all__"}
                      className="text-[10px] font-mono text-neutral-600 hover:text-red-400 transition-colors mt-1">
                      {deletingCustomFile === "__all__" ? "Suppression…" : "🗑 Tout supprimer"}
                    </button>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => { if (e.target.files?.length) uploadCustomFiles(e.target.files); }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingCustom}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#39ff14,#22cc00)", color: "#000" }}
              >
                {uploadingCustom ? <><Loader2 size={12} className="animate-spin" /> Upload…</> : <>{customFiles.length > 0 ? "➕ Ajouter des fichiers" : "⬆ Uploader les fichiers"}</>}
              </button>
            </div>
          )}

          {/* Notice compte client */}
          {order.has_account && order.status === "paid" && (
            <div className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed px-2.5 py-2 rounded-lg"
              style={{ background: "#39ff1408", border: "1px solid #39ff1425", color: "#39ff14cc" }}>
              <span className="flex-shrink-0 mt-px">👤</span>
              <span>
                Cet acheteur a un compte — il peut télécharger directement depuis son espace.
                Tu peux tout de même lui envoyer les fichiers par email en cas de besoin.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Boutons — pleine largeur sur mobile */}
      <div className="flex items-center gap-2 flex-wrap">
          {order.status === "pending" && (
            <>
              <button
                onClick={onCancel}
                disabled={cancelling}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition-all"
                style={{ background: "#ef444415", border: "1px solid #ef444430", color: "#ef4444" }}
              >
                <XCircle size={13} />
                {cancelling ? "…" : "Annuler"}
              </button>
              <button
                onClick={onConfirm}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-black text-xs font-bold transition-all hover:scale-105"
                style={{ background: "#39ff14", boxShadow: "0 0 15px rgba(57,255,20,0.3)" }}
              >
                <CheckCircle size={13} />
                Confirmer paiement
              </button>
            </>
          )}
          {order.status === "cancelled" && (
            <>
              {onDelete && (
                <button
                  onClick={onDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all"
                  style={{ background: "#ef444415", border: "1px solid #ef444430", color: "#ef4444" }}
                >
                  <XCircle size={13} />
                  {deleting ? "…" : "Supprimer"}
                </button>
              )}
              <button
                onClick={onRestore}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ background: "#f59e0b20", border: "1px solid #f59e0b50", color: "#f59e0b" }}
              >
                <RefreshCw size={13} />
                Restaurer
              </button>
            </>
          )}
          {order.status === "deleted" && (
            <>
              {onPermanentDelete && (
                <button
                  onClick={onPermanentDelete}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition-all"
                  style={{ background: "#ef444415", border: "1px solid #ef444430", color: "#ef4444" }}
                >
                  <XCircle size={13} />
                  <span className="hidden sm:inline">Supprimer définitivement</span>
                  <span className="sm:hidden">Supprimer</span>
                </button>
              )}
              <button
                onClick={onRestore}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105"
                style={{ background: "#6b728020", border: "1px solid #6b728050", color: "#9ca3af" }}
              >
                <RefreshCw size={13} /> Restaurer
              </button>
            </>
          )}
          {order.status === "paid" && (
            <>
              {onRevert && (
                <button
                  onClick={onRevert}
                  disabled={reverting}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all"
                  style={{ background: "#f59e0b15", border: "1px solid #f59e0b30", color: "#f59e0b" }}
                >
                  <RefreshCw size={13} className={reverting ? "animate-spin" : ""} />
                  <span className="hidden sm:inline">{reverting ? "…" : "Remettre en attente"}</span>
                  <span className="sm:hidden">{reverting ? "…" : "↩ Attente"}</span>
                </button>
              )}
              {onSendFiles && downloadUrl && (() => {
                const alreadySent = !!order.files_sent_at;
                if (alreadySent) {
                  return (
                    <>
                      {/* Badge permanent "Email envoyé" */}
                      <span
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold"
                        style={{ background: "#39ff1420", border: "1px solid #39ff1450", color: "#39ff14" }}
                      >
                        <CheckCircle size={12} /> Email envoyé
                      </span>
                      {/* Bouton renvoyer */}
                      <button
                        onClick={onSendFiles}
                        disabled={sendingFiles}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition-all hover:scale-105 disabled:opacity-60"
                        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888" }}
                      >
                        {sendingFiles
                          ? <><Loader2 size={12} className="animate-spin" /> Envoi…</>
                          : <><RefreshCw size={12} /> Renvoyer les fichiers</>
                        }
                      </button>
                    </>
                  );
                }
                return (
                  <button
                    onClick={onSendFiles}
                    disabled={sendingFiles}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all hover:scale-105 disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#b400ff,#7000cc)", color: "#fff", boxShadow: "0 0 12px rgba(180,0,255,0.3)" }}
                  >
                    {sendingFiles
                      ? <><Loader2 size={12} className="animate-spin" /> Envoi…</>
                      : <>📧 Envoyer les fichiers</>
                    }
                  </button>
                );
              })()}
              {downloadUrl && (
                <button
                  onClick={onCopy}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all"
                  style={{
                    background: "#1a1a1a",
                    border: "1px solid #2a2a2a",
                    color: "#555",
                  }}
                  title="Copier le lien de téléchargement"
                >
                  <Copy size={12} />
                </button>
              )}
            </>
          )}
      </div>

      {order.status === "paid" && downloadUrl && (
        <div className="mt-2 text-xs font-mono text-neutral-600 bg-[#1a1a1a] rounded-lg px-3 py-2 truncate">
          {downloadUrl}
        </div>
      )}
    </div>
  );
}

function ArchivedMonthBlock({
  monthKey, orders, onUnarchive,
  copiedId, revertingId, sendingFilesId,
  onCopy, onRevert, onSendFiles, statusBadge,
}: {
  monthKey: string;
  orders: Order[];
  onUnarchive: () => void;
  copiedId: string | null;
  revertingId: string | null;
  sendingFilesId: string | null;
  onCopy: (order: Order) => void;
  onRevert: (id: string) => void;
  onSendFiles: (id: string) => void;
  statusBadge: (status: Order["status"]) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [y, m] = monthKey.split("-");
  const label = new Date(parseInt(y), parseInt(m) - 1, 1)
    .toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    .replace(/^./, (c) => c.toUpperCase());
  const total = orders.reduce((s, o) => s + Number(o.amount), 0);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid #1a1a1a" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0d0d0d]">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <ChevronRight
            size={14}
            className="text-neutral-600 transition-transform flex-shrink-0"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          />
          <span className="text-xs font-mono tracking-widest uppercase text-neutral-400">{label}</span>
          <span className="text-xs text-neutral-600">{orders.length} commande{orders.length > 1 ? "s" : ""}</span>
          <span className="text-sm font-black text-[#39ff14]">{total}€</span>
        </button>
        <button
          onClick={onUnarchive}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all hover:bg-[#ffffff10] flex-shrink-0 ml-4"
          style={{ background: "#ffffff06", border: "1px solid #2a2a2a", color: "#666" }}
        >
          <RefreshCw size={11} /> Désarchiver
        </button>
      </div>
      {/* Orders */}
      {open && (
        <div className="divide-y divide-[#111] border-t border-[#1a1a1a]">
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              order={order}
              selected={false}
              onToggleSelect={() => {}}
              onConfirm={() => {}}
              onCancel={() => {}}
              onRestore={() => {}}
              onRevert={() => onRevert(order.id)}
              onSendFiles={() => onSendFiles(order.id)}
              cancelling={false}
              reverting={revertingId === order.id}
              sendingFiles={sendingFilesId === order.id}
              copied={copiedId === order.id}
              onCopy={() => onCopy(order)}
              statusBadge={statusBadge}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────── */
/* Composant StorageBadge                                   */
/* ──────────────────────────────────────────────────────── */

function SubTabs({ tabs, active, onChange }: {
  tabs: { id: string; label: string; icon: React.ReactNode }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex gap-1 mb-6 p-1 rounded-xl bg-[#0d0d0d] border border-[#1a1a1a] w-fit">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono tracking-widest uppercase transition-all"
          style={active === t.id
            ? { background: "#b400ff", color: "#fff" }
            : { color: "#555" }
          }
        >
          {t.icon}{t.label}
        </button>
      ))}
    </div>
  );
}

function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024)        return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  if (bytes >= 1024)               return `${(bytes / 1024).toFixed(0)} KB`;
  return `${bytes} B`;
}

function StorageBar({ used, total, color }: { used: number; total: number; color: string }) {
  const pct = Math.min((used / total) * 100, 100);
  return (
    <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}60` }} />
    </div>
  );
}

function StorageBadge({
  totalBytes, beatBytes, previewBytes, coverBytes, quotaBytes, onRefresh,
}: {
  totalBytes: number;
  beatBytes: number;
  previewBytes: number;
  coverBytes: number;
  quotaBytes: number;
  onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pct = Math.min((totalBytes / quotaBytes) * 100, 100);

  const color =
    pct >= 85 ? "#ef4444" :
    pct >= 60 ? "#f59e0b" :
    "#39ff14";

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(v => !v)}
        title="Stockage serveur"
        className="flex items-center gap-1.5 text-xs transition-colors px-2.5 py-2 rounded-lg bg-[#1a1a1a] border border-transparent hover:border-[#2a2a2a]"
        style={{ color }}
      >
        <HardDrive size={13} />
        <span className="hidden sm:inline font-mono">{fmtBytes(totalBytes)}</span>
        <span className="hidden sm:flex w-12 h-1.5 rounded-full bg-[#2a2a2a] overflow-hidden">
          <span className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
        </span>
        <span className="hidden sm:inline text-neutral-600 font-mono">{pct.toFixed(0)}%</span>
      </button>

      {/* Popover détaillé */}
      {expanded && (
        <div
          className="absolute right-0 top-full mt-2 z-50 rounded-xl border border-[#2a2a2a] bg-[#111] shadow-2xl p-4 w-[300px]"
          style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.7)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase flex items-center gap-1.5">
              <HardDrive size={11} /> Stockage Serveur · Dédié
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); onRefresh(); }}
              className="text-neutral-600 hover:text-white transition-colors"
              title="Recalculer"
            >
              <RefreshCw size={11} />
            </button>
          </div>

          {/* ── STOCKAGE FICHIERS ── */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-mono text-white font-bold">Stockage fichiers</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono font-bold" style={{ color }}>{fmtBytes(totalBytes)}</span>
                <span className="text-[10px] font-mono text-neutral-600">/ {fmtBytes(quotaBytes)}</span>
              </div>
            </div>
            <StorageBar used={totalBytes} total={quotaBytes} color={color} />
            <p className="text-right text-[10px] font-mono mt-1 text-neutral-600">
              {pct.toFixed(1)}% · {fmtBytes(Math.max(0, quotaBytes - totalBytes))} restants
            </p>

            {/* Détail par bucket */}
            <div className="mt-2.5 space-y-1.5 border-t border-[#1e1e1e] pt-2.5">
              {[
                { label: "Beats · WAV · ZIP", bytes: beatBytes, color: "#b400ff" },
                { label: "Extraits audio",     bytes: previewBytes, color: "#00f5ff" },
                { label: "Covers",             bytes: coverBytes, color: "#f59e0b" },
              ].map(({ label, bytes, color: c }) => (
                <div key={label}>
                  <div className="flex justify-between text-[10px] font-mono mb-1">
                    <span className="text-neutral-500">{label}</span>
                    <span style={{ color: c }}>{fmtBytes(bytes)}</span>
                  </div>
                  <StorageBar used={bytes} total={quotaBytes} color={c} />
                </div>
              ))}
            </div>
          </div>

          {/* ── INFOS SERVEUR ── */}
          <div className="mb-4 border-t border-[#1e1e1e] pt-3">
            <p className="text-[10px] font-mono text-white font-bold mb-1.5">Serveur dédié</p>
            <p className="text-[10px] font-mono text-neutral-500 leading-relaxed">
              87.106.196.227 · /var/www/toxic-files · Bande passante illimitée
            </p>
          </div>


          {/* Alerte quota */}
          {pct >= 80 && (
            <div className="mt-3 px-3 py-2 rounded-lg text-[10px] font-mono"
              style={{ background: `${color}10`, border: `1px solid ${color}30`, color }}>
              {pct >= 95
                ? "🔴 Espace critique — libère des fichiers."
                : pct >= 85
                ? "🟠 Plus de 85% — pense à nettoyer les anciens fichiers."
                : "🟡 Plus de 80% — surveille l'espace restant."}
            </div>
          )}
        </div>
      )}

      {/* Fermeture au clic extérieur */}
      {expanded && (
        <div className="fixed inset-0 z-40" onClick={() => setExpanded(false)} />
      )}
    </div>
  );
}
