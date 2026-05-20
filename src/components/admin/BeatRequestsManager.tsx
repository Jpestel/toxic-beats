"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, ChevronDown, ChevronUp, Mail, Clock, CheckCircle, XCircle, Zap } from "lucide-react";

type BeatRequest = {
  id: string;
  name: string;
  email: string;
  project_type: string;
  style: string;
  budget: string;
  deadline: string;
  inspirations: string;
  description: string;
  status: "new" | "in_progress" | "completed" | "declined";
  notes: string;
  created_at: string;
};

const STATUS_CONFIG = {
  new:         { label: "Nouveau",    color: "#b400ff", bg: "#b400ff22", icon: <Zap size={12} /> },
  in_progress: { label: "En cours",  color: "#f59e0b", bg: "#f59e0b22", icon: <Clock size={12} /> },
  completed:   { label: "Terminé",   color: "#39ff14", bg: "#39ff1422", icon: <CheckCircle size={12} /> },
  declined:    { label: "Refusé",    color: "#666",    bg: "#33333322", icon: <XCircle size={12} /> },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}

export default function BeatRequestsManager() {
  const [requests, setRequests] = useState<BeatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"all" | BeatRequest["status"]>("all");

  const load = useCallback(async () => {
    setLoading(true);
    const token = await getToken();
    const res = await fetch("/api/admin/beat-requests", { headers: { authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (Array.isArray(data)) {
      setRequests(data);
      const n: Record<string, string> = {};
      data.forEach((r: BeatRequest) => { n[r.id] = r.notes ?? ""; });
      setNotes(n);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function updateStatus(id: string, status: BeatRequest["status"]) {
    setSavingId(id);
    const token = await getToken();
    await fetch(`/api/admin/beat-requests/${id}`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    setSavingId(null);
  }

  async function saveNotes(id: string) {
    setSavingId(id);
    const token = await getToken();
    await fetch(`/api/admin/beat-requests/${id}`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notes[id] ?? "" }),
    });
    setRequests(prev => prev.map(r => r.id === id ? { ...r, notes: notes[id] ?? "" } : r));
    setSavingId(null);
  }

  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);
  const counts = {
    all: requests.length,
    new: requests.filter(r => r.status === "new").length,
    in_progress: requests.filter(r => r.status === "in_progress").length,
    completed: requests.filter(r => r.status === "completed").length,
    declined: requests.filter(r => r.status === "declined").length,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-black text-white">Beats sur demande</h2>
          <p className="text-xs text-neutral-600 font-mono mt-0.5">{requests.length} demande{requests.length !== 1 ? "s" : ""}</p>
        </div>
        {counts.new > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{ background: "#b400ff22", color: "#b400ff", border: "1px solid #b400ff44" }}>
            <Zap size={11} /> {counts.new} nouveau{counts.new > 1 ? "x" : ""}
          </span>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["all", "new", "in_progress", "completed", "declined"] as const).map(s => {
          const cfg = s === "all" ? { label: "Tout", color: "#888", bg: "#22222222" } : STATUS_CONFIG[s];
          const active = filter === s;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono transition-all"
              style={active ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}44` } : { background: "#111", color: "#555", border: "1px solid #222" }}>
              {cfg.label} ({counts[s]})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#b400ff]" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-neutral-600">
          <p>{filter === "all" ? "Aucune demande pour l'instant." : "Aucune demande dans cette catégorie."}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const cfg = STATUS_CONFIG[req.status];
            const isOpen = expanded === req.id;
            return (
              <div key={req.id} className="rounded-xl bg-[#111] border border-[#1a1a1a] overflow-hidden transition-all">
                {/* Header row */}
                <button className="w-full flex items-center gap-4 p-4 text-left hover:bg-[#151515] transition-colors"
                  onClick={() => setExpanded(isOpen ? null : req.id)}>
                  {/* Status badge */}
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono flex-shrink-0"
                    style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}33` }}>
                    {cfg.icon} {cfg.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{req.name}
                      {req.project_type && <span className="ml-2 text-xs text-neutral-500 font-normal">· {req.project_type}</span>}
                    </p>
                    <p className="text-xs text-neutral-600 font-mono mt-0.5 truncate">{req.email} · {formatDate(req.created_at)}</p>
                  </div>
                  {req.budget && <span className="text-xs font-mono text-neutral-500 flex-shrink-0 hidden sm:block">{req.budget}</span>}
                  {isOpen ? <ChevronUp size={16} className="text-neutral-600 flex-shrink-0" /> : <ChevronDown size={16} className="text-neutral-600 flex-shrink-0" />}
                </button>

                {/* Detail panel */}
                {isOpen && (
                  <div className="border-t border-[#1a1a1a] p-5 space-y-5">
                    {/* Info grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {[
                        ["Style", req.style], ["Budget", req.budget], ["Deadline", req.deadline],
                        ["Inspirations", req.inspirations],
                      ].filter(([, v]) => v).map(([label, value]) => (
                        <div key={label} className="bg-[#0d0d0d] rounded-lg p-3 border border-[#1a1a1a]">
                          <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-1">{label}</p>
                          <p className="text-sm text-neutral-300">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Description */}
                    <div className="bg-[#0d0d0d] rounded-lg p-4 border-l-2 border-[#b400ff]">
                      <p className="text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-2">Description</p>
                      <p className="text-sm text-neutral-300 leading-relaxed whitespace-pre-wrap">{req.description}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <a href={`mailto:${req.email}?subject=Re: Beat sur mesure - ${req.name}`}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono border border-[#2a2a2a] text-neutral-400 hover:text-white hover:border-[#444] transition-colors">
                        <Mail size={13} /> Répondre
                      </a>
                      {(["new", "in_progress", "completed", "declined"] as const).map(s => {
                        if (s === req.status) return null;
                        const c = STATUS_CONFIG[s];
                        return (
                          <button key={s} onClick={() => updateStatus(req.id, s)}
                            disabled={savingId === req.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-all"
                            style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}33` }}>
                            {savingId === req.id ? <Loader2 size={11} className="animate-spin" /> : c.icon}
                            {c.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[10px] font-mono uppercase tracking-widest text-neutral-600 mb-1.5">Notes internes</label>
                      <textarea rows={2} value={notes[req.id] ?? ""} onChange={e => setNotes(n => ({ ...n, [req.id]: e.target.value }))}
                        placeholder="Prix proposé, échanges, détails..."
                        className="w-full bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff80] transition-colors resize-none placeholder-neutral-700" />
                      <button onClick={() => saveNotes(req.id)} disabled={savingId === req.id}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors text-neutral-500 hover:text-white bg-[#1a1a1a] hover:bg-[#222]">
                        {savingId === req.id ? <Loader2 size={11} className="animate-spin" /> : null}
                        Sauvegarder les notes
                      </button>
                    </div>
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
