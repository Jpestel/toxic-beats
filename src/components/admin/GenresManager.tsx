"use client";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("toxic_auth_token") : null;
}

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Save, Loader2, CheckCircle, Tag, Lock, Upload, X } from "lucide-react";
import type { GenreConfig } from "@/types";

const DEFAULT_GENRES: GenreConfig[] = [
  { name: "RAP",     color: "#b400ff" },
  { name: "Trap",    color: "#b400ff" },
  { name: "Drill",   color: "#00f5ff" },
  { name: "Electro", color: "#00f5ff" },
  { name: "RnB",     color: "#ff6b35" },
  { name: "Afro",    color: "#39ff14" },
];

const PROTECTED_NAME = "Non classé";

export default function GenresManager() {
  const [genres, setGenres] = useState<GenreConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch("/api/settings/genres")
      .then(r => r.json())
      .then(d => setGenres(d.genres ?? DEFAULT_GENRES))
      .catch(() => setGenres(DEFAULT_GENRES))
      .finally(() => setLoading(false));
  }, []);

  const update = (index: number, field: keyof GenreConfig, value: string) => {
    setGenres(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));
    setStatus("idle");
  };

  const addGenre = () => {
    setGenres(prev => [...prev, { name: "", color: "#b400ff" }]);
    setStatus("idle");
  };

  const removeGenre = (index: number) => {
    setGenres(prev => prev.filter((_, i) => i !== index));
    setStatus("idle");
  };

  const removeCover = (index: number) => {
    setGenres(prev => prev.map((g, i) => i === index ? { ...g, cover_url: undefined } : g));
    setStatus("idle");
  };

  const uploadCover = async (index: number, file: File) => {
    setUploadingIdx(index);
    try {
      
      const coverName = `genre-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const res = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ coverName }),
      });
      const presign = await res.json();
      if (!res.ok) throw new Error(presign.error);

      const upload = await fetch(presign.coverSignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/jpeg" },
        body: file,
      });
      if (!upload.ok) throw new Error("Échec de l'upload");

      setGenres(prev => prev.map((g, i) => i === index ? { ...g, cover_url: presign.coverPublicUrl } : g));
      setStatus("idle");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setUploadingIdx(null);
    }
  };

  const save = async () => {
    const valid = genres.filter(g => g.name.trim());
    if (valid.length === 0) { setError("Ajoute au moins un genre."); return; }

    setStatus("saving");
    setError("");
    try {
      
      const res = await fetch("/api/settings/genres", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ genres: valid }),
      });
      if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
      setGenres(valid);
      setStatus("success");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 size={24} className="text-[#b400ff] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-sm font-mono tracking-widest text-[#b400ff] uppercase flex items-center gap-2 mb-6">
        <Tag size={14} /> Catégories &amp; Couleurs
      </h2>

      <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
        Chaque catégorie a une couleur et une cover par défaut. La cover est utilisée pour les beats sans visuel propre.
      </p>

      <div className="space-y-3 mb-5">
        {genres.map((genre, i) => {
          const isProtected = genre.name === PROTECTED_NAME;
          const isUploading = uploadingIdx === i;

          return (
            <div
              key={i}
              className="rounded-xl border border-[#2a2a2a] overflow-hidden"
              style={{ background: isProtected ? "#111" : "#1a1a1a", opacity: isProtected ? 0.75 : 1 }}
            >
              {/* Ligne principale */}
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Couleur */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-[#333]"
                    style={{ background: genre.color, cursor: isProtected ? "not-allowed" : "pointer" }}
                    onClick={() => !isProtected && document.getElementById(`color-${i}`)?.click()}
                  />
                  {!isProtected && (
                    <input id={`color-${i}`} type="color" value={genre.color}
                      onChange={e => update(i, "color", e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  )}
                </div>

                {/* Nom */}
                <input
                  type="text"
                  value={genre.name}
                  onChange={e => !isProtected && update(i, "name", e.target.value)}
                  readOnly={isProtected}
                  placeholder="Nom du genre…"
                  className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-neutral-600 min-w-0"
                  style={{ color: isProtected ? "#555" : "#fff", caretColor: genre.color, cursor: isProtected ? "default" : "text" }}
                />

                {/* Badge */}
                <span
                  className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full border flex-shrink-0"
                  style={{ color: genre.color, borderColor: `${genre.color}50`, background: `${genre.color}10` }}
                >
                  {genre.name || "…"}
                </span>

                {/* Cadenas ou Supprimer */}
                {isProtected ? (
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-neutral-700" title="Catégorie protégée">
                    <Lock size={13} />
                  </div>
                ) : (
                  <button onClick={() => removeGenre(i)}
                    className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-red-400/10 transition-all">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>

              {/* Zone cover */}
              <div className="px-4 pb-3 flex items-center gap-3">
                <span className="text-[10px] text-neutral-600 uppercase tracking-widest w-8 text-right flex-shrink-0">Cover</span>

                {/* Miniature */}
                <div
                  className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center border border-[#2a2a2a] relative"
                  style={{ background: genre.cover_url ? undefined : `${genre.color}10`, cursor: "pointer" }}
                  onClick={() => !isUploading && fileRefs.current[i]?.click()}
                >
                  {isUploading ? (
                    <Loader2 size={16} className="animate-spin text-neutral-500" />
                  ) : genre.cover_url ? (
                    <img src={genre.cover_url} alt={genre.name} className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={14} className="text-neutral-600" />
                  )}
                </div>

                <input
                  ref={el => { fileRefs.current[i] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(i, f); e.target.value = ""; }}
                />

                <div className="flex-1 min-w-0">
                  {genre.cover_url ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-neutral-500 truncate">Cover définie</span>
                      <button
                        type="button"
                        onClick={() => fileRefs.current[i]?.click()}
                        className="text-[10px] text-neutral-600 hover:text-[#b400ff] transition-colors"
                      >
                        Remplacer
                      </button>
                      <button
                        type="button"
                        onClick={() => removeCover(i)}
                        className="text-[10px] text-neutral-600 hover:text-red-400 transition-colors flex items-center gap-0.5"
                      >
                        <X size={9} /> Supprimer
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRefs.current[i]?.click()}
                      disabled={isUploading}
                      className="text-xs text-neutral-600 hover:text-[#b400ff] transition-colors text-left"
                    >
                      {isUploading ? "Upload en cours…" : "Cliquer pour ajouter une cover par défaut"}
                    </button>
                  )}
                  <p className="text-[10px] text-neutral-700 mt-0.5">Utilisée si le beat n'a pas de visuel propre</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={addGenre}
        className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-[#2a2a2a] hover:border-[#b400ff]/50 text-neutral-600 hover:text-[#b400ff] text-sm transition-all mb-6"
      >
        <Plus size={14} />
        Ajouter une catégorie
      </button>

      {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

      {status === "success" && (
        <div className="flex items-center gap-2 text-[#39ff14] text-sm mb-3">
          <CheckCircle size={16} />
          Catégories sauvegardées — visibles sur le site !
        </div>
      )}

      <button
        onClick={save}
        disabled={status === "saving"}
        className="w-full h-12 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:scale-[1.01]"
        style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px rgba(180,0,255,0.3)" }}
      >
        {status === "saving"
          ? <><Loader2 size={16} className="animate-spin" />Sauvegarde…</>
          : <><Save size={16} />Enregistrer les catégories</>
        }
      </button>
    </div>
  );
}
