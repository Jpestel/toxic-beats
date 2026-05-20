"use client";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("toxic_auth_token") : null;
}

import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Upload, X, Loader2, GripVertical, ChevronUp, ChevronDown, Music2 } from "lucide-react";
import { PLATFORMS, PlatformIcon, type PlatformId, type PlatformLink } from "@/lib/platforms";

export type Credit = {
  id: string;
  artist_name: string;
  project_title: string;
  project_type: string;
  beat_title: string;
  release_date: string;
  cover_url: string | null;
  platforms: PlatformLink[];
  description: string;
  visible: boolean;
};

const PROJECT_TYPES = ["Single", "EP", "Album", "Mixtape", "Freestyle", "Compilation", "Clip", "Autre"];

const EMPTY_CREDIT: Omit<Credit, "id"> = {
  artist_name: "", project_title: "", project_type: "Single",
  beat_title: "", release_date: "", cover_url: null,
  platforms: [], description: "", visible: true,
};

async function optimizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 800;
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round(h * MAX / w); w = MAX; }
        else        { w = Math.round(w * MAX / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (!blob) { reject(new Error("Conversion échouée")); return; }
        resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
      }, "image/webp", 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Lecture impossible")); };
    img.src = url;
  });
}

export default function CreditsManager() {
  const [credits, setCredits]     = useState<Credit[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [editing, setEditing]     = useState<Credit | null>(null);
  const [showForm, setShowForm]   = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [formError, setFormError] = useState("");
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings/credits")
      .then(r => r.json())
      .then(d => setCredits(d.credits ?? []))
      .finally(() => setLoading(false));
  }, []);

  const save = async (newCredits: Credit[]) => {
    setSaving(true);
    
    await fetch("/api/settings/credits", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
      body: JSON.stringify({ credits: newCredits }),
    });
    setSaving(false);
  };

  // ── Upload cover ──────────────────────────────────────────────────────────
  const handleCoverUpload = async (rawFile: File) => {
    setUploadingCover(true);
    try {
      const file = await optimizeImage(rawFile).catch(() => rawFile);
      
      const coverName = `credits/credit-${Date.now()}.webp`;
      const res = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ coverName }),
      });
      const presign = await res.json();
      if (!res.ok) throw new Error(presign.error);
      const uploadRes = await fetch(presign.coverSignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/webp" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Erreur upload");
      setEditing(e => e ? { ...e, cover_url: presign.coverPublicUrl } : e);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Erreur upload");
    } finally {
      setUploadingCover(false);
    }
  };

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const openNew = () => {
    setEditing({ id: crypto.randomUUID(), ...EMPTY_CREDIT });
    setShowForm(true);
    setFormError("");
  };

  const openEdit = (credit: Credit) => {
    setEditing({ ...credit });
    setShowForm(true);
    setFormError("");
  };

  const cancelForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = async () => {
    if (!editing) return;
    if (!editing.artist_name.trim() || !editing.project_title.trim()) {
      setFormError("Artiste et titre du projet sont obligatoires.");
      return;
    }
    setFormError("");
    const exists = credits.find(c => c.id === editing.id);
    const newCredits = exists
      ? credits.map(c => c.id === editing.id ? editing : c)
      : [editing, ...credits];
    setCredits(newCredits);
    await save(newCredits);
    cancelForm();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer cette production ?")) return;
    const newCredits = credits.filter(c => c.id !== id);
    setCredits(newCredits);
    await save(newCredits);
  };

  const toggleVisible = async (id: string) => {
    const newCredits = credits.map(c => c.id === id ? { ...c, visible: !c.visible } : c);
    setCredits(newCredits);
    await save(newCredits);
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= credits.length) return;
    const arr = [...credits];
    [arr[idx], arr[to]] = [arr[to], arr[idx]];
    setCredits(arr);
    await save(arr);
  };

  // ── Gestion des plateformes dans le formulaire ────────────────────────────
  const addPlatform = () => {
    if (!editing) return;
    const used = editing.platforms.map(p => p.id);
    const next = PLATFORMS.find(p => !used.includes(p.id));
    if (!next) return;
    setEditing({ ...editing, platforms: [...editing.platforms, { id: next.id, url: "" }] });
  };

  const updatePlatform = (i: number, field: "id" | "url", val: string) => {
    if (!editing) return;
    const updated = editing.platforms.map((p, idx) =>
      idx === i ? { ...p, [field]: val } : p
    );
    setEditing({ ...editing, platforms: updated as PlatformLink[] });
  };

  const removePlatform = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, platforms: editing.platforms.filter((_, idx) => idx !== i) });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <Loader2 size={20} className="animate-spin text-[#b400ff]" />
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-mono tracking-widest text-[#b400ff] uppercase flex items-center gap-2">
          <Music2 size={14} /> Mes productions
        </h2>
        <div className="flex items-center gap-3">
          {saving && <span className="text-[10px] text-[#b400ff] font-mono">Sauvegarde…</span>}
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-black transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)" }}
          >
            <Plus size={13} /> Ajouter
          </button>
        </div>
      </div>

      <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
        Mets en avant les artistes qui ont utilisé tes beats. Ces productions s'affichent dans la section "Mes Productions" du site.
      </p>

      {/* ── Formulaire add/edit ── */}
      {showForm && editing && (
        <div className="mb-6 p-5 bg-[#0d0d0d] border border-[#b400ff30] rounded-2xl space-y-4">
          <p className="text-xs font-mono tracking-widest text-[#b400ff] uppercase mb-4">
            {credits.find(c => c.id === editing.id) ? "Modifier" : "Nouvelle production"}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1 uppercase tracking-widest">Artiste *</label>
              <input value={editing.artist_name} onChange={e => setEditing({ ...editing, artist_name: e.target.value })}
                placeholder="Nom de l'artiste"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1 uppercase tracking-widest">Titre du projet *</label>
              <input value={editing.project_title} onChange={e => setEditing({ ...editing, project_title: e.target.value })}
                placeholder="Titre de l'album, EP, single…"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1 uppercase tracking-widest">Type</label>
              <select value={editing.project_type} onChange={e => setEditing({ ...editing, project_type: e.target.value })}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors">
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1 uppercase tracking-widest">Beat utilisé</label>
              <input value={editing.beat_title} onChange={e => setEditing({ ...editing, beat_title: e.target.value })}
                placeholder="Titre du beat"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1 uppercase tracking-widest">Date de sortie</label>
              <input type="month" value={editing.release_date} onChange={e => setEditing({ ...editing, release_date: e.target.value })}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors" />
            </div>
            <div>
              <label className="block text-[10px] text-neutral-500 mb-1 uppercase tracking-widest">Visible sur le site</label>
              <button onClick={() => setEditing({ ...editing, visible: !editing.visible })}
                className="flex items-center gap-2 mt-1 px-3 py-2 rounded-xl border text-xs font-mono transition-all"
                style={editing.visible
                  ? { background: "#39ff1415", border: "1px solid #39ff1440", color: "#39ff14" }
                  : { background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#666" }}>
                {editing.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                {editing.visible ? "Visible" : "Masqué"}
              </button>
            </div>
          </div>

          {/* Cover */}
          <div>
            <label className="block text-[10px] text-neutral-500 mb-2 uppercase tracking-widest">Artwork / Cover</label>
            <div className="flex items-center gap-3">
              {editing.cover_url && (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <img src={editing.cover_url} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setEditing({ ...editing, cover_url: null })}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
                    <X size={9} className="text-white" />
                  </button>
                </div>
              )}
              <button onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#2a2a2a] text-xs text-neutral-400 hover:text-white hover:border-[#b400ff] transition-all">
                {uploadingCover ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                {editing.cover_url ? "Remplacer" : "Uploader l'artwork"}
              </button>
              <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) { handleCoverUpload(f); e.target.value = ""; } }} />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[10px] text-neutral-500 mb-1 uppercase tracking-widest">Note / Description (optionnel)</label>
            <textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })}
              placeholder="Ex: Feature sur le titre, collaboration spéciale…"
              rows={2}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors resize-none" />
          </div>

          {/* Plateformes */}
          <div>
            <label className="block text-[10px] text-neutral-500 mb-2 uppercase tracking-widest">Liens plateformes</label>
            <div className="space-y-2">
              {editing.platforms.map((p, i) => {
                const platform = PLATFORMS.find(pl => pl.id === p.id);
                return (
                  <div key={i} className="flex items-center gap-2">
                    <select value={p.id} onChange={e => updatePlatform(i, "id", e.target.value)}
                      className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-2 text-white text-xs focus:outline-none focus:border-[#b400ff] transition-colors flex-shrink-0">
                      {PLATFORMS.map(pl => (
                        <option key={pl.id} value={pl.id}>{pl.label}</option>
                      ))}
                    </select>
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex-shrink-0" style={{ color: platform?.color }}>
                        <PlatformIcon id={p.id} size={13} />
                      </div>
                      <input value={p.url} onChange={e => updatePlatform(i, "url", e.target.value)}
                        placeholder={`Lien ${platform?.label ?? ""}…`}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg pl-8 pr-3 py-2 text-white text-xs focus:outline-none focus:border-[#b400ff] transition-colors" />
                    </div>
                    <button onClick={() => removePlatform(i)} className="text-neutral-600 hover:text-red-400 transition-colors flex-shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                );
              })}
              <button onClick={addPlatform} disabled={editing.platforms.length >= PLATFORMS.length}
                className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-[#b400ff] transition-colors disabled:opacity-30">
                <Plus size={12} /> Ajouter une plateforme
              </button>
            </div>
          </div>

          {formError && <p className="text-red-400 text-xs">{formError}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Enregistrer
            </button>
            <button onClick={cancelForm}
              className="px-5 py-2.5 rounded-xl text-sm text-neutral-400 border border-[#2a2a2a] hover:text-white hover:border-[#3a3a3a] transition-all">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Liste des productions ── */}
      {credits.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#2a2a2a] rounded-2xl">
          <Music2 size={32} className="mx-auto mb-3 text-neutral-700" />
          <p className="text-neutral-500 text-sm">Aucune production ajoutée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {credits.map((credit, idx) => (
            <div key={credit.id}
              className="flex items-center gap-3 p-3 rounded-xl border transition-colors"
              style={{ background: "#0d0d0d", borderColor: credit.visible ? "#2a2a2a" : "#1a1a1a", opacity: credit.visible ? 1 : 0.55 }}>
              {/* Ordre */}
              <div className="flex flex-col gap-0.5 flex-shrink-0">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="text-neutral-700 hover:text-neutral-400 disabled:opacity-20 transition-colors"><ChevronUp size={12} /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === credits.length - 1} className="text-neutral-700 hover:text-neutral-400 disabled:opacity-20 transition-colors"><ChevronDown size={12} /></button>
              </div>

              {/* Cover */}
              <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-[#1a1a1a] flex items-center justify-center">
                {credit.cover_url
                  ? <img src={credit.cover_url} alt="" className="w-full h-full object-cover" />
                  : <Music2 size={18} className="text-neutral-700" />}
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-bold text-sm truncate">{credit.artist_name}</span>
                  <span className="text-neutral-500 text-xs">—</span>
                  <span className="text-neutral-300 text-sm truncate">{credit.project_title}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                    style={{ background: "#b400ff20", color: "#b400ff" }}>
                    {credit.project_type}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {credit.beat_title && (
                    <span className="text-[11px] text-neutral-500 font-mono">Prod. TOXIC · {credit.beat_title}</span>
                  )}
                  {credit.release_date && (
                    <span className="text-[11px] text-neutral-600 font-mono">
                      {new Date(credit.release_date + "-01").toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                    </span>
                  )}
                  {credit.platforms.length > 0 && (
                    <div className="flex items-center gap-1">
                      {credit.platforms.slice(0, 4).map(p => {
                        const pl = PLATFORMS.find(pl => pl.id === p.id);
                        return (
                          <span key={p.id} style={{ color: pl?.color ?? "#888" }}>
                            <PlatformIcon id={p.id} size={11} />
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button onClick={() => toggleVisible(credit.id)}
                  className="p-2 rounded-lg transition-colors text-neutral-600 hover:text-white"
                  title={credit.visible ? "Masquer" : "Rendre visible"}>
                  {credit.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
                <button onClick={() => openEdit(credit)}
                  className="p-2 rounded-lg transition-colors text-neutral-600 hover:text-[#b400ff]">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(credit.id)}
                  className="p-2 rounded-lg transition-colors text-neutral-600 hover:text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
