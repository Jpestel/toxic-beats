"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Package, Upload, Loader2, X, Pencil, Eye, EyeOff, FileArchive } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { Kit } from "@/types";

const KITS_PAGE_SIZE = 6;

type UploadState = "idle" | "uploading" | "done" | "error";

export default function KitsManager() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingKit, setEditingKit] = useState<Kit | null>(null);
  const [page, setPage] = useState(1);

  const fetchKits = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    // Admin voit tous les kits (y compris cachés)
    const { data } = await supabase
      .from("kits")
      .select("*")
      .order("created_at", { ascending: false });
    setKits(data ?? []);
    setLoading(false);
    // session used for type-checking only
    void session;
  };

  useEffect(() => { fetchKits(); }, []);

  const deleteKit = async (kit: Kit) => {
    if (!confirm(`Supprimer le kit "${kit.title}" définitivement ?`)) return;
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/kits/${kit.id}`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${session?.access_token}` },
    });
    await fetchKits();
  };

  const toggleStatus = async (kit: Kit) => {
    const newStatus = kit.status === "available" ? "hidden" : "available";
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/kits/${kit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchKits();
  };

  const handleEdit = (kit: Kit) => {
    setShowForm(false);
    setEditingKit(kit);
  };

  const handleAdd = () => {
    setEditingKit(null);
    setShowForm(!showForm);
  };

  const totalPages = Math.ceil(kits.length / KITS_PAGE_SIZE);
  const paginated = kits.slice((page - 1) * KITS_PAGE_SIZE, page * KITS_PAGE_SIZE);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-mono tracking-widest text-[#f59e0b] uppercase flex items-center gap-2">
          <Package size={14} /> Kits ({kits.length})
        </h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-black text-sm font-bold transition-all hover:scale-105"
          style={{ background: "#f59e0b", boxShadow: "0 0 15px rgba(245,158,11,0.3)" }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Annuler" : "Nouveau kit"}
        </button>
      </div>

      {/* Formulaire d'ajout */}
      {showForm && (
        <KitForm
          onSaved={() => { setShowForm(false); fetchKits(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Formulaire d'édition */}
      {editingKit && (
        <KitForm
          kit={editingKit}
          onSaved={() => { setEditingKit(null); fetchKits(); }}
          onCancel={() => setEditingKit(null)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={28} className="text-[#f59e0b] animate-spin" />
        </div>
      ) : kits.length === 0 ? (
        <div className="text-center py-16 text-neutral-600 text-sm">
          Aucun kit pour le moment. Crée ton premier kit !
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {paginated.map((kit) => (
              <KitRow
                key={kit.id}
                kit={kit}
                onEdit={() => handleEdit(kit)}
                onDelete={() => deleteKit(kit)}
                onToggleStatus={() => toggleStatus(kit)}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className="rounded-full transition-all"
                  style={{
                    width: page === i + 1 ? 24 : 8,
                    height: 8,
                    background: page === i + 1 ? "#f59e0b" : "#2a2a2a",
                    boxShadow: page === i + 1 ? "0 0 8px rgba(245,158,11,0.6)" : "none",
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KitRow({ kit, onEdit, onDelete, onToggleStatus }: {
  kit: Kit;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}) {
  const [viewing, setViewing] = useState(false);

  const shortName = (path: string | null | undefined) =>
    path ? decodeURIComponent(path.split("/").pop() ?? path).replace(/^(kits\/preview-|kits\/zip-)\d+\./, (m) => m.replace(/\d+/, "")) : null;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        border: viewing ? "1px solid #ffffff18" : "1px solid #2a2a2a",
        background: "#111",
      }}
    >
      {/* ── Ligne principale ── */}
      <div className="p-4 flex items-center gap-4">
        {/* Cover */}
        <div className="w-14 h-14 rounded-lg flex-shrink-0 overflow-hidden border border-[#2a2a2a]"
          style={{ background: "linear-gradient(135deg, #1a0f00, #0a0800)" }}>
          {kit.image_url ? (
            <img src={kit.image_url} alt={kit.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package size={20} className="text-[#f59e0b] opacity-30" />
            </div>
          )}
        </div>

        {/* Infos */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-bold text-white text-sm truncate">{kit.title}</span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
              style={kit.status === "available"
                ? { background: "#f59e0b20", color: "#f59e0b" }
                : { background: "#6b728020", color: "#9ca3af" }
              }>
              {kit.status === "available" ? "VISIBLE" : "CACHÉ"}
            </span>
          </div>
          {kit.description && (
            <p className="text-neutral-500 text-xs truncate max-w-md">{kit.description}</p>
          )}
          <p className="text-[#f59e0b] font-bold text-sm mt-0.5">{kit.price}€</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setViewing(v => !v)}
            title={viewing ? "Masquer le détail" : "Voir le détail"}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={viewing ? { color: "#fff", background: "#ffffff10" } : { color: "#555" }}
          >
            <Eye size={14} />
          </button>
          <button
            onClick={onToggleStatus}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{ color: "#555" }}
            title={kit.status === "available" ? "Cacher" : "Afficher"}
          >
            {kit.status === "available" ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button
            onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono transition-all"
            style={{ background: "#f59e0b15", border: "1px solid #f59e0b30", color: "#f59e0b" }}
          >
            <Pencil size={13} />
            Éditer
          </button>
          <button
            onClick={onDelete}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={{ color: "#555" }}
            title="Supprimer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* ── Panneau de détail (lecture seule) ── */}
      {viewing && (
        <div className="border-t border-[#1e1e1e] bg-[#0d0d0d] px-5 py-4 space-y-4">
          <div className="flex gap-5 flex-wrap">

            {/* Colonne cover + infos textuelles */}
            <div className="flex gap-4 flex-1 min-w-0">
              {kit.image_url && (
                <img src={kit.image_url} alt={kit.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border border-[#2a2a2a]" />
              )}
              <div className="min-w-0 space-y-1.5">
                <p className="text-white font-bold text-base">{kit.title}</p>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded inline-block"
                  style={kit.status === "available"
                    ? { background: "#f59e0b20", color: "#f59e0b" }
                    : { background: "#6b728020", color: "#9ca3af" }
                  }>
                  {kit.status === "available" ? "VISIBLE" : "CACHÉ"}
                </span>
                {kit.description && (
                  <p className="text-xs text-neutral-400 leading-relaxed whitespace-pre-line">{kit.description}</p>
                )}
              </div>
            </div>

            {/* Colonne prix + fichiers */}
            <div className="space-y-3 flex-shrink-0 min-w-[200px]">
              <div>
                <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-1.5">Prix</p>
                <span className="text-lg font-black text-[#f59e0b]">{kit.price}€</span>
              </div>

              <div>
                <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-1.5">Fichiers</p>
                <div className="space-y-1.5">
                  {/* Preview WAV */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-neutral-600 flex-shrink-0">WAV</span>
                    <span className={`text-[10px] font-mono truncate max-w-[150px] ${kit.preview_path ? "text-neutral-400" : "text-neutral-700 italic"}`}
                      title={kit.preview_path ?? undefined}>
                      {shortName(kit.preview_path) ?? "Aucun aperçu"}
                    </span>
                    <span className={`text-[9px] font-mono ml-auto flex-shrink-0 ${kit.preview_path ? "text-[#39ff14]" : "text-neutral-700"}`}>
                      {kit.preview_path ? "✓" : "✗"}
                    </span>
                  </div>
                  {/* ZIP */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-neutral-600 flex-shrink-0">ZIP</span>
                    <span className={`text-[10px] font-mono truncate max-w-[150px] ${kit.zip_path ? "text-neutral-400" : "text-neutral-700 italic"}`}
                      title={kit.zip_path ?? undefined}>
                      {shortName(kit.zip_path) ?? "Aucun ZIP"}
                    </span>
                    <span className={`text-[9px] font-mono ml-auto flex-shrink-0 ${kit.zip_path ? "text-[#39ff14]" : "text-neutral-700"}`}>
                      {kit.zip_path ? "✓" : "✗"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lecteur aperçu */}
          {kit.preview_url && (
            <div>
              <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-1.5">Extrait audio</p>
              <audio src={kit.preview_url} controls className="w-full h-8" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function KitForm({ kit, onSaved, onCancel }: {
  kit?: Kit;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const isEditing = !!kit;
  const [title, setTitle] = useState(kit?.title ?? "");
  const [description, setDescription] = useState(kit?.description ?? "");
  const [price, setPrice] = useState(kit?.price?.toString() ?? "");
  const [status, setStatus] = useState<"available" | "hidden">(kit?.status ?? "available");

  // Upload preview WAV
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [previewUploadState, setPreviewUploadState] = useState<UploadState>("idle");
  const [previewUrl, setPreviewUrl] = useState(kit?.preview_url ?? "");
  const [previewPath, setPreviewPath] = useState(kit?.preview_path ?? "");
  const previewInputRef = useRef<HTMLInputElement>(null);

  // Upload ZIP
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipUploadState, setZipUploadState] = useState<UploadState>("idle");
  const [zipPath, setZipPath] = useState(kit?.zip_path ?? "");
  const zipInputRef = useRef<HTMLInputElement>(null);

  // Upload cover image
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUploadState, setCoverUploadState] = useState<UploadState>("idle");
  const [imageUrl, setImageUrl] = useState(kit?.image_url ?? "");
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const uploadPreview = async () => {
    if (!previewFile) return;
    setPreviewUploadState("uploading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const ext = previewFile.name.split(".").pop() ?? "wav";
      const kitPreviewName = `kits/preview-${Date.now()}.${ext}`;

      const res = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ kitPreviewName }),
      });
      const { kitPreviewSignedUrl, kitPreviewPublicUrl } = await res.json();

      await fetch(kitPreviewSignedUrl, {
        method: "PUT",
        body: previewFile,
        headers: { "Content-Type": previewFile.type || "audio/wav" },
      });

      setPreviewUrl(kitPreviewPublicUrl);
      setPreviewPath(kitPreviewName);
      setPreviewUploadState("done");
    } catch {
      setPreviewUploadState("error");
    }
  };

  const uploadZip = async () => {
    if (!zipFile) return;
    setZipUploadState("uploading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const kitZipName = `kits/zip-${Date.now()}.zip`;

      const res = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ kitZipName }),
      });
      const { kitZipSignedUrl } = await res.json();

      await fetch(kitZipSignedUrl, {
        method: "PUT",
        body: zipFile,
        headers: { "Content-Type": "application/zip" },
      });

      setZipPath(kitZipName);
      setZipUploadState("done");
    } catch {
      setZipUploadState("error");
    }
  };

  const uploadCover = async () => {
    if (!coverFile) return;
    setCoverUploadState("uploading");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const ext = coverFile.name.split(".").pop() ?? "jpg";
      const coverName = `kits/cover-${Date.now()}.${ext}`;

      const res = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ coverName }),
      });
      const { coverSignedUrl, coverPublicUrl } = await res.json();

      await fetch(coverSignedUrl, {
        method: "PUT",
        body: coverFile,
        headers: { "Content-Type": coverFile.type || "image/jpeg" },
      });

      setImageUrl(coverPublicUrl);
      setCoverUploadState("done");
    } catch {
      setCoverUploadState("error");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!title || !price) {
      setError("Titre et prix sont requis.");
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const payload = {
        title,
        description,
        price: parseFloat(price),
        preview_url: previewUrl,
        preview_path: previewPath,
        zip_path: zipPath || null,
        image_url: imageUrl || null,
        status,
      };

      const url = isEditing ? `/api/kits/${kit!.id}` : "/api/kits";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Erreur serveur");
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  const uploadStateIcon = (state: UploadState) => {
    if (state === "uploading") return <Loader2 size={13} className="animate-spin text-[#f59e0b]" />;
    if (state === "done") return <span className="text-[#39ff14] text-xs">✓</span>;
    if (state === "error") return <span className="text-red-400 text-xs">✗</span>;
    return null;
  };

  return (
    <div className="mb-6 bg-[#111] border border-[#f59e0b30] rounded-2xl p-6"
      style={{ boxShadow: "0 0 30px rgba(245,158,11,0.05)" }}>
      <h3 className="text-sm font-mono tracking-widest text-[#f59e0b] uppercase mb-5">
        {isEditing ? `Éditer : ${kit!.title}` : "Nouveau Kit"}
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Titre */}
        <div>
          <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Titre *</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f59e0b] transition-colors"
            placeholder="Ex : Drill Essentials Vol.1"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f59e0b] transition-colors resize-none"
            placeholder="Décris le contenu du kit : nombre de samples, types de sons, style musical…"
          />
        </div>

        {/* Prix + Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Prix (€) *</label>
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f59e0b] transition-colors"
              placeholder="14.99"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "available" | "hidden")}
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f59e0b] transition-colors"
            >
              <option value="available">Visible</option>
              <option value="hidden">Caché</option>
            </select>
          </div>
        </div>

        {/* Upload Preview WAV */}
        <div>
          <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">
            Aperçu WAV (~30s) — public
          </label>
          {previewUrl && (
            <div className="mb-2 flex items-center gap-2">
              <audio src={previewUrl} controls className="h-8 flex-1" style={{ filter: "invert(0)" }} />
              <span className="text-[#39ff14] text-xs">✓ Uploadé</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={previewInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => setPreviewFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => previewInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888" }}
            >
              <Upload size={13} />
              {previewFile ? previewFile.name : "Choisir fichier WAV"}
            </button>
            {previewFile && previewUploadState !== "done" && (
              <button
                type="button"
                onClick={uploadPreview}
                disabled={previewUploadState === "uploading"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                style={{ background: "#f59e0b20", border: "1px solid #f59e0b40", color: "#f59e0b" }}
              >
                {uploadStateIcon(previewUploadState) ?? "Uploader"}
              </button>
            )}
            {uploadStateIcon(previewUploadState)}
          </div>
        </div>

        {/* Upload ZIP */}
        <div>
          <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">
            ZIP complet — privé (le vrai produit)
          </label>
          {zipPath && (
            <p className="text-[#39ff14] text-xs mb-2">✓ ZIP uploadé : {zipPath.split("/").pop()}</p>
          )}
          <div className="flex items-center gap-2">
            <input
              ref={zipInputRef}
              type="file"
              accept=".zip,application/zip"
              className="hidden"
              onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => zipInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888" }}
            >
              <Upload size={13} />
              {zipFile ? zipFile.name : "Choisir fichier ZIP"}
            </button>
            {zipFile && zipUploadState !== "done" && (
              <button
                type="button"
                onClick={uploadZip}
                disabled={zipUploadState === "uploading"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                style={{ background: "#f59e0b20", border: "1px solid #f59e0b40", color: "#f59e0b" }}
              >
                {uploadStateIcon(zipUploadState) ?? "Uploader"}
              </button>
            )}
            {uploadStateIcon(zipUploadState)}
          </div>
        </div>

        {/* Upload Cover */}
        <div>
          <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">
            Image de couverture (optionnel)
          </label>
          {imageUrl && (
            <img src={imageUrl} alt="cover" className="w-16 h-16 rounded-lg object-cover mb-2 border border-[#2a2a2a]" />
          )}
          <div className="flex items-center gap-2">
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setCoverFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono transition-all"
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888" }}
            >
              <Upload size={13} />
              {coverFile ? coverFile.name : "Choisir image"}
            </button>
            {coverFile && coverUploadState !== "done" && (
              <button
                type="button"
                onClick={uploadCover}
                disabled={coverUploadState === "uploading"}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-60"
                style={{ background: "#f59e0b20", border: "1px solid #f59e0b40", color: "#f59e0b" }}
              >
                {uploadStateIcon(coverUploadState) ?? "Uploader"}
              </button>
            )}
            {uploadStateIcon(coverUploadState)}
          </div>
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 h-11 rounded-xl border border-[#2a2a2a] text-neutral-400 text-sm font-mono hover:text-white hover:border-[#3a3a3a] transition-all"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 h-11 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:scale-[1.01]"
            style={{ background: "linear-gradient(135deg, #f59e0b, #b87009)", boxShadow: "0 0 20px rgba(245,158,11,0.3)" }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : (isEditing ? "Enregistrer" : "Créer le kit")}
          </button>
        </div>
      </form>
    </div>
  );
}
