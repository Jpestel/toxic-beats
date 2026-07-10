"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, ChevronDown, ChevronUp, RefreshCw, ShoppingBag, Euro } from "lucide-react";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("toxic_auth_token") : null;
}

type Order = {
  id: string;
  beat_title: string;
  amount: number;
  status: string;
  license_type: string | null;
  product_type: string;
  created_at: string;
};

type UserRow = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
  orders: Order[];
};

const STATUS_COLORS: Record<string, string> = {
  paid:     "#39ff14",
  pending:  "#f59e0b",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  paid:     "Payé",
  pending:  "En attente",
  cancelled: "Annulé",
};

const LICENSE_LABELS: Record<string, string> = {
  mp3:       "MP3",
  wav:       "MP3+WAV",
  exclusive: "Exclusif",
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/users", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()),
  );

  const totalUsers  = users.length;
  const totalSpent  = users.reduce((s, u) => s + Number(u.total_spent), 0);
  const activeUsers = users.filter(u => u.order_count > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users size={18} style={{ color: "#00f5ff" }} />
          <h2 className="text-lg font-bold text-white font-mono tracking-widest uppercase">
            Comptes <span className="text-neutral-500 text-sm">({totalUsers})</span>
          </h2>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-[#1a1a1a] text-neutral-500 hover:text-white transition-colors">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-4">
          <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-1">Comptes</p>
          <p className="text-2xl font-black text-white">{totalUsers}</p>
        </div>
        <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-4">
          <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-1">Avec commandes</p>
          <p className="text-2xl font-black" style={{ color: "#00f5ff" }}>{activeUsers}</p>
        </div>
        <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-2xl p-4">
          <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-1">Total dépensé</p>
          <p className="text-2xl font-black" style={{ color: "#39ff14" }}>{totalSpent.toFixed(2)}€</p>
        </div>
      </div>

      {/* Recherche */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher par email…"
        className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#00f5ff] transition-colors font-mono"
      />

      {/* Liste */}
      {loading ? (
        <div className="text-center text-neutral-500 py-12 font-mono text-sm">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-neutral-600 py-12 border border-dashed border-[#2a2a2a] rounded-2xl">
          <Users size={32} className="mx-auto mb-3 opacity-20" />
          <p className="font-mono text-sm">Aucun compte</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => {
            const isOpen = expanded === user.id;
            const paidOrders = user.orders.filter(o => o.status === "paid");
            const pendingOrders = user.orders.filter(o => o.status === "pending");
            return (
              <div key={user.id} className="rounded-2xl border border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden">
                {/* Ligne principale */}
                <button
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-[#111] transition-colors"
                  onClick={() => setExpanded(isOpen ? null : user.id)}
                >
                  {/* Avatar initial */}
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                    style={{ background: "#00f5ff15", border: "1px solid #00f5ff30", color: "#00f5ff" }}>
                    {user.email[0].toUpperCase()}
                  </div>

                  {/* Email + date */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-mono truncate">{user.email}</p>
                    <p className="text-[10px] text-neutral-600 font-mono">Inscrit le {fmt(user.created_at)}</p>
                  </div>

                  {/* Stats rapides */}
                  <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <ShoppingBag size={12} className="text-neutral-500" />
                      <span className={user.order_count > 0 ? "text-white font-bold" : "text-neutral-600"}>
                        {user.order_count} cmd
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-mono">
                      <Euro size={12} className="text-neutral-500" />
                      <span className={Number(user.total_spent) > 0 ? "text-[#39ff14] font-bold" : "text-neutral-600"}>
                        {Number(user.total_spent).toFixed(2)}€
                      </span>
                    </div>
                    {pendingOrders.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#f59e0b20", border: "1px solid #f59e0b40", color: "#f59e0b" }}>
                        {pendingOrders.length} en attente
                      </span>
                    )}
                    {paidOrders.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: "#39ff1415", border: "1px solid #39ff1430", color: "#39ff14" }}>
                        {paidOrders.length} payé{paidOrders.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>

                  {isOpen ? <ChevronUp size={14} className="text-neutral-500 flex-shrink-0" /> : <ChevronDown size={14} className="text-neutral-500 flex-shrink-0" />}
                </button>

                {/* Détail dépliable */}
                {isOpen && (
                  <div className="border-t border-[#1e1e1e] px-4 pb-4 pt-3 space-y-3">
                    {/* Infos compte */}
                    <div className="flex flex-wrap gap-3 text-[10px] font-mono">
                      <span className="text-neutral-600">ID : <span className="text-neutral-400">{user.id}</span></span>
                      <span className="text-neutral-600">Rôle : <span className="text-neutral-400">{user.role}</span></span>
                      {user.last_order_at && (
                        <span className="text-neutral-600">Dernière commande : <span className="text-neutral-400">{fmt(user.last_order_at)}</span></span>
                      )}
                    </div>

                    {/* Commandes */}
                    {user.orders.length === 0 ? (
                      <p className="text-xs text-neutral-600 font-mono italic">Aucune commande associée à cet email.</p>
                    ) : (
                      <div className="space-y-1.5">
                        <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-2">Commandes</p>
                        {user.orders.map(o => {
                          const color = STATUS_COLORS[o.status] ?? "#555";
                          return (
                            <div key={o.id} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[#111] border border-[#1e1e1e]">
                              {/* Statut */}
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 font-mono"
                                style={{ background: `${color}15`, border: `1px solid ${color}30`, color }}>
                                {STATUS_LABELS[o.status] ?? o.status}
                              </span>
                              {/* Titre */}
                              <span className="flex-1 text-xs text-white font-mono truncate">
                                {o.beat_title}
                                {o.product_type === "kit" && <span className="text-[#f59e0b] ml-1">(Kit)</span>}
                                {o.product_type === "beat" && o.license_type && (
                                  <span className="text-neutral-500 ml-1">· {LICENSE_LABELS[o.license_type] ?? o.license_type}</span>
                                )}
                              </span>
                              {/* Montant */}
                              <span className="text-xs font-bold flex-shrink-0" style={{ color }}>
                                {Number(o.amount).toFixed(2)}€
                              </span>
                              {/* Date */}
                              <span className="text-[10px] text-neutral-600 font-mono flex-shrink-0 hidden sm:block">
                                {fmt(o.created_at)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
