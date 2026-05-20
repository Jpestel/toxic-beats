"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, RefreshCw } from "lucide-react";

type PromoType = "percentage" | "fixed" | "free_mp3" | "free_wav" | "free_exclusive" | "free_kit";

type PromoCode = {
  id: string;
  code: string;
  type: PromoType;
  value: number | null;
  description: string | null;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

const TYPE_LABELS: Record<PromoType, string> = {
  percentage:    "% Remise",
  fixed:         "€ Fixe",
  free_mp3:      "Beat MP3 offert",
  free_wav:      "Beat MP3+WAV offert",
  free_exclusive:"Beat Exclusif offert",
  free_kit:      "Kit offert",
};

const TYPE_COLORS: Record<PromoType, string> = {
  percentage:    "#b400ff",
  fixed:         "#00f5ff",
  free_mp3:      "#39ff14",
  free_wav:      "#39ff14",
  free_exclusive:"#f59e0b",
  free_kit:      "#f59e0b",
};

const NEEDS_VALUE: PromoType[] = ["percentage", "fixed"];

const defaultForm = {
  code: "",
  type: "percentage" as PromoType,
  value: "",
  description: "",
  max_uses: "",
  expires_at: "",
};

export default function PromoManager() {
  const [codes, setCodes]       = useState<PromoCode[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState(defaultForm);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session?.access_token}`,
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const headers = await authHeaders();
    const res = await fetch("/api/admin/promo", { headers });
    const data = await res.json();
    setCodes(data.codes ?? []);
    setLoading(false);
  }, [authHeaders]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const body: Record<string, unknown> = {
      code:        form.code,
      type:        form.type,
      description: form.description,
      max_uses:    form.max_uses || null,
      expires_at:  form.expires_at || null,
    };
    if (NEEDS_VALUE.includes(form.type)) {
      body.value = parseFloat(form.value);
    }

    const headers = await authHeaders();
    const res = await fetch("/api/admin/promo", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Erreur");
    } else {
      setForm(defaultForm);
      setShowForm(false);
      load();
    }
    setSaving(false);
  };

  const toggleActive = async (code: PromoCode) => {
    const headers = await authHeaders();
    await fetch(`/api/admin/promo/${code.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ is_active: !code.is_active }),
    });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce code promo ?")) return;
    setDeleting(id);
    const headers = await authHeaders();
    await fetch(`/api/admin/promo/${id}`, { method: "DELETE", headers });
    setDeleting(null);
    load();
  };

  const formatDiscount = (code: PromoCode) => {
    if (code.type === "percentage") return `-${code.value}%`;
    if (code.type === "fixed") return `-${code.value}€`;
    return "Gratuit";
  };

  const formatExpiry = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag size={18} style={{ color: "#b400ff" }} />
          <h2 className="text-lg font-bold text-white font-mono tracking-widest uppercase">
            Codes Promo <span className="text-neutral-500 text-sm">({codes.length})</span>
          </h2>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-lg bg-[#1a1a1a] text-neutral-500 hover:text-white transition-colors">
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-black transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)" }}
          >
            <Plus size={15} />
            Nouveau code
          </button>
        </div>
      </div>

      {/* Formulaire de création */}
      {showForm && (
        <form onSubmit={handleCreate} className="border border-[#2a2a2a] rounded-2xl p-5 bg-[#0d0d0d] space-y-4">
          <p className="text-xs font-mono text-neutral-400 uppercase tracking-widest mb-2">Nouveau code promo</p>

          <div className="grid grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 uppercase tracking-widest">Code *</label>
              <input
                required
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="EX: SUMMER20"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm font-mono uppercase focus:outline-none focus:border-[#b400ff] transition-colors"
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 uppercase tracking-widest">Type *</label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as PromoType, value: "" }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
              >
                {(Object.entries(TYPE_LABELS) as [PromoType, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Valeur (seulement pour % et fixe) */}
            {NEEDS_VALUE.includes(form.type) && (
              <div>
                <label className="block text-xs text-neutral-400 mb-1.5 uppercase tracking-widest">
                  {form.type === "percentage" ? "Remise (%)" : "Remise (€)"} *
                </label>
                <input
                  required
                  type="number"
                  min={0}
                  max={form.type === "percentage" ? 100 : undefined}
                  step={form.type === "percentage" ? 1 : 0.01}
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  placeholder={form.type === "percentage" ? "20" : "10"}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                />
              </div>
            )}

            {/* Max utilisations */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 uppercase tracking-widest">Utilisations max</label>
              <input
                type="number"
                min={1}
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="Illimité"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
              />
            </div>

            {/* Date d'expiration */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 uppercase tracking-widest">Expire le</label>
              <input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
              />
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-xs text-neutral-400 mb-1.5 uppercase tracking-widest">Note interne</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Code pour les followers Instagram"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)" }}
            >
              {saving ? "Création..." : "Créer le code"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(""); setForm(defaultForm); }}
              className="px-6 py-2.5 rounded-xl text-sm text-neutral-400 bg-[#1a1a1a] hover:text-white transition-colors"
            >
              Annuler
            </button>
          </div>
        </form>
      )}

      {/* Liste des codes */}
      {loading ? (
        <div className="text-center text-neutral-500 py-12 font-mono text-sm">Chargement...</div>
      ) : codes.length === 0 ? (
        <div className="text-center text-neutral-500 py-16 border border-dashed border-[#2a2a2a] rounded-2xl">
          <Tag size={32} className="mx-auto mb-3 opacity-30" />
          <p className="font-mono text-sm">Aucun code promo</p>
          <p className="text-xs text-neutral-600 mt-1">Crée ton premier code avec le bouton ci-dessus</p>
        </div>
      ) : (
        <div className="space-y-2">
          {codes.map(code => (
            <div
              key={code.id}
              className="flex items-center gap-4 p-4 rounded-2xl border transition-all"
              style={{
                background: "#0d0d0d",
                borderColor: code.is_active ? "#2a2a2a" : "#1a1a1a",
                opacity: code.is_active ? 1 : 0.5,
              }}
            >
              {/* Code */}
              <div className="font-mono font-black text-white text-sm tracking-widest min-w-[120px]">
                {code.code}
              </div>

              {/* Type badge */}
              <span
                className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg"
                style={{ background: `${TYPE_COLORS[code.type]}15`, color: TYPE_COLORS[code.type] }}
              >
                {TYPE_LABELS[code.type]}
              </span>

              {/* Valeur */}
              <span className="text-sm font-bold" style={{ color: TYPE_COLORS[code.type] }}>
                {formatDiscount(code)}
              </span>

              {/* Description */}
              {code.description && (
                <span className="text-xs text-neutral-500 truncate flex-1">{code.description}</span>
              )}
              {!code.description && <div className="flex-1" />}

              {/* Stats */}
              <div className="text-xs font-mono text-neutral-500 text-right">
                <div>{code.uses_count}{code.max_uses ? `/${code.max_uses}` : ""} utilisation{code.uses_count !== 1 ? "s" : ""}</div>
                <div>Expire : {formatExpiry(code.expires_at)}</div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={() => toggleActive(code)}
                  className="transition-colors hover:opacity-80"
                  title={code.is_active ? "Désactiver" : "Activer"}
                >
                  {code.is_active
                    ? <ToggleRight size={22} style={{ color: "#39ff14" }} />
                    : <ToggleLeft size={22} className="text-neutral-600" />
                  }
                </button>
                <button
                  onClick={() => handleDelete(code.id)}
                  disabled={deleting === code.id}
                  className="text-neutral-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
