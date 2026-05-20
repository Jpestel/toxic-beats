"use client";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("toxic_auth_token") : null;
}

import { useState, useEffect, useRef } from "react";
import { Upload, X, ImageIcon, Loader2, Plus, Tag, FolderOpen, Pencil, Check } from "lucide-react";

const MAX_COVERS = 100;

type CoverEntry = { url: string; category: string };

async function optimizeCoverImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 600;
      let { naturalWidth: w, naturalHeight: h } = img;
      if (w > MAX || h > MAX) {
        if (w >= h) { h = Math.round((h * MAX) / w); w = MAX; }
        else        { w = Math.round((w * MAX) / h); h = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error("Conversion échouée")); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
        },
        "image/webp", 0.88
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Lecture impossible")); };
    img.src = objectUrl;
  });
}

export default function CoverLibraryManager() {
  const [covers, setCovers]         = useState<CoverEntry[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab]   = useState<string>("Toutes");
  const [uploading, setUploading]   = useState(false);
  const [uploadCategory, setUploadCategory] = useState<string>("");
  const [error, setError]           = useState("");
  const [saving, setSaving]         = useState(false);

  // Gestion catégories
  const [newCatInput, setNewCatInput]   = useState("");
  const [renamingCat, setRenamingCat]   = useState<string | null>(null);
  const [renameInput, setRenameInput]   = useState("");

  // Changer catégorie d'une cover
  const [changingIdx, setChangingIdx]   = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings/covers")
      .then(r => r.json())
      .then(d => {
        setCovers(d.covers ?? []);
        setCategories(d.categories ?? []);
        if (d.categories?.length) setUploadCategory(d.categories[0]);
      });
  }, []);

  const save = async (newCovers: CoverEntry[], newCategories: string[]) => {
    setSaving(true);
    
    await fetch("/api/settings/covers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
      body: JSON.stringify({ covers: newCovers, categories: newCategories }),
    });
    setSaving(false);
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async (rawFile: File) => {
    if (covers.length >= MAX_COVERS) {
      setError(`Limite de ${MAX_COVERS} covers atteinte.`);
      return;
    }
    setError("");
    setUploading(true);
    try {
      const file = await optimizeCoverImage(rawFile).catch(() => rawFile);
      const token = getToken();
      const coverName = `library-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ coverName }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok) throw new Error(presign.error);
      const uploadRes = await fetch(presign.coverSignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/webp" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Erreur upload");
      const newEntry: CoverEntry = { url: presign.coverPublicUrl, category: uploadCategory };
      const newCovers = [...covers, newEntry];
      setCovers(newCovers);
      await save(newCovers, categories);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setUploading(false);
    }
  };

  // ── Supprimer ─────────────────────────────────────────────────────────────
  const handleRemove = async (url: string) => {
    const newCovers = covers.filter(c => c.url !== url);
    setCovers(newCovers);
    await save(newCovers, categories);
  };

  // ── Changer catégorie d'une cover ─────────────────────────────────────────
  const handleChangeCategory = async (url: string, cat: string) => {
    const newCovers = covers.map(c => c.url === url ? { ...c, category: cat } : c);
    setCovers(newCovers);
    setChangingIdx(null);
    await save(newCovers, categories);
  };

  // ── Catégories ────────────────────────────────────────────────────────────
  const addCategory = async () => {
    const name = newCatInput.trim();
    if (!name || categories.includes(name)) return;
    const newCats = [...categories, name];
    setCategories(newCats);
    setUploadCategory(name);
    setNewCatInput("");
    await save(covers, newCats);
  };

  const renameCategory = async (oldName: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName || categories.includes(trimmed)) return;
    const newCats = categories.map(c => c === oldName ? trimmed : c);
    const newCovers = covers.map(c => c.category === oldName ? { ...c, category: trimmed } : c);
    setCategories(newCats);
    setCovers(newCovers);
    if (activeTab === oldName) setActiveTab(trimmed);
    if (uploadCategory === oldName) setUploadCategory(trimmed);
    setRenamingCat(null);
    await save(newCovers, newCats);
  };

  const deleteCategory = async (name: string) => {
    if (!confirm(`Supprimer la catégorie "${name}" ? Les covers associées seront sans catégorie.`)) return;
    const newCats = categories.filter(c => c !== name);
    const newCovers = covers.map(c => c.category === name ? { ...c, category: "" } : c);
    setCategories(newCats);
    setCovers(newCovers);
    if (activeTab === name) setActiveTab("Toutes");
    if (uploadCategory === name) setUploadCategory(newCats[0] ?? "");
    await save(newCovers, newCats);
  };

  // ── Affichage filtré ─────────────────────────────────────────────────────
  const visibleCovers = activeTab === "Toutes"
    ? covers
    : activeTab === "Sans catégorie"
    ? covers.filter(c => !c.category)
    : covers.filter(c => c.category === activeTab);

  const tabs = ["Toutes", ...categories, ...(covers.some(c => !c.category) ? ["Sans catégorie"] : [])];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-mono tracking-widest text-[#00f5ff] uppercase flex items-center gap-2">
          <ImageIcon size={14} /> Bibliothèque de covers
        </h2>
        <span className="text-xs font-mono text-neutral-600">
          {covers.length} / {MAX_COVERS}
          {saving && <span className="ml-2 text-[#b400ff]">↑</span>}
        </span>
      </div>

      <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
        Ces images sont utilisées automatiquement comme cover pour les beats qui n'en ont pas.
        Chaque beat sans cover pioche dans la bibliothèque de façon fixe.
      </p>

      {/* ── Gestion des catégories ── */}
      <div className="mb-5 p-4 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl">
        <p className="text-[11px] font-mono text-neutral-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
          <Tag size={10} /> Catégories
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-mono"
              style={{ background: "#b400ff12", borderColor: "#b400ff30", color: "#b400ff" }}>
              {renamingCat === cat ? (
                <>
                  <input
                    autoFocus
                    value={renameInput}
                    onChange={e => setRenameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") renameCategory(cat, renameInput); if (e.key === "Escape") setRenamingCat(null); }}
                    className="bg-transparent border-none outline-none w-20 text-white text-xs"
                  />
                  <button onClick={() => renameCategory(cat, renameInput)}><Check size={10} /></button>
                  <button onClick={() => setRenamingCat(null)}><X size={10} /></button>
                </>
              ) : (
                <>
                  <FolderOpen size={10} />
                  <span>{cat}</span>
                  <span className="text-neutral-600 ml-1">({covers.filter(c => c.category === cat).length})</span>
                  <button onClick={() => { setRenamingCat(cat); setRenameInput(cat); }}
                    className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
                    <Pencil size={9} />
                  </button>
                  <button onClick={() => deleteCategory(cat)}
                    className="opacity-50 hover:opacity-100 transition-opacity text-red-400">
                    <X size={9} />
                  </button>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <span className="text-xs text-neutral-600 italic">Aucune catégorie — ajoutes-en une ci-dessous</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={newCatInput}
            onChange={e => setNewCatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCategory()}
            placeholder="Nouvelle catégorie…"
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-xs focus:outline-none focus:border-[#b400ff] transition-colors"
          />
          <button
            onClick={addCategory}
            disabled={!newCatInput.trim()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-black disabled:opacity-40 transition-all"
            style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)" }}
          >
            <Plus size={12} /> Ajouter
          </button>
        </div>
      </div>

      {/* ── Upload ── */}
      <div className="mb-5 flex items-center gap-3 flex-wrap">
        {categories.length > 0 && (
          <select
            value={uploadCategory}
            onChange={e => setUploadCategory(e.target.value)}
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-[#b400ff] transition-colors"
          >
            {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            <option value="">Sans catégorie</option>
          </select>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || covers.length >= MAX_COVERS}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-black disabled:opacity-40 transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #00f5ff, #0099aa)" }}
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? "Upload en cours…" : "Ajouter une cover"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) { handleUpload(f); e.target.value = ""; } }} />
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {/* ── Onglets catégories ── */}
      <div className="flex gap-1 flex-wrap mb-4">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
            style={activeTab === tab
              ? { background: "#b400ff", color: "#fff" }
              : { background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#666" }
            }
          >
            {tab}
            <span className="ml-1.5 text-[10px] opacity-60">
              ({tab === "Toutes" ? covers.length
                : tab === "Sans catégorie" ? covers.filter(c => !c.category).length
                : covers.filter(c => c.category === tab).length})
            </span>
          </button>
        ))}
      </div>

      {/* ── Grille ── */}
      {visibleCovers.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#2a2a2a] rounded-xl text-neutral-600 text-sm">
          Aucune cover dans cette catégorie
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
          {visibleCovers.map((cover, i) => {
            const globalIdx = covers.findIndex(c => c.url === cover.url);
            return (
              <div key={cover.url} className="relative aspect-square rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#111] group">
                <img
                  src={cover.url}
                  alt={`Cover ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Badge catégorie */}
                {cover.category && (
                  <div className="absolute bottom-1.5 left-1.5 right-1.5">
                    <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-black/70 text-[#b400ff] truncate block text-center">
                      {cover.category}
                    </span>
                  </div>
                )}

                {/* Overlay actions */}
                <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                  {/* Changer catégorie */}
                  {categories.length > 0 && (
                    changingIdx === globalIdx ? (
                      <div className="w-full">
                        <select
                          autoFocus
                          defaultValue={cover.category}
                          onChange={e => handleChangeCategory(cover.url, e.target.value)}
                          onBlur={() => setChangingIdx(null)}
                          className="w-full bg-[#111] border border-[#b400ff] rounded text-white text-[10px] px-1 py-1 focus:outline-none"
                        >
                          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          <option value="">Sans catégorie</option>
                        </select>
                      </div>
                    ) : (
                      <button
                        onClick={() => setChangingIdx(globalIdx)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-[10px] text-white font-mono"
                      >
                        <Tag size={10} /> Catégorie
                      </button>
                    )
                  )}
                  <button
                    onClick={() => handleRemove(cover.url)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 transition-colors text-[10px] text-red-400"
                  >
                    <X size={10} /> Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
