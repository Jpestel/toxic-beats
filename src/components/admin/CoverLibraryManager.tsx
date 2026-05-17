"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, X, ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const MAX_SLOTS = 12;

/** Redimensionne et compresse l'image en WebP (max 600×600, qualité 0.88) */
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
      canvas.width  = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.imageSmoothingEnabled  = true;
      ctx.imageSmoothingQuality  = "high";
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        blob => {
          if (!blob) { reject(new Error("Conversion échouée")); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".webp"), { type: "image/webp" }));
        },
        "image/webp",
        0.88
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Lecture image impossible")); };
    img.src = objectUrl;
  });
}

export default function CoverLibraryManager() {
  const [urls, setUrls] = useState<(string | null)[]>(Array(MAX_SLOTS).fill(null));
  const [uploading, setUploading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    fetch("/api/settings/covers")
      .then(r => r.json())
      .then(d => {
        const loaded: (string | null)[] = Array(MAX_SLOTS).fill(null);
        (d.urls ?? []).forEach((url: string, i: number) => { if (i < MAX_SLOTS) loaded[i] = url; });
        setUrls(loaded);
      })
      .catch(() => {});
  }, []);

  const save = async (newUrls: (string | null)[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch("/api/settings/covers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ urls: newUrls.filter(Boolean) }),
    });
  };

  const handleUpload = async (index: number, rawFile: File) => {
    setError("");
    setUploading(index);
    try {
      // Optimisation : redimensionnement + conversion WebP avant upload
      const file = await optimizeCoverImage(rawFile).catch(() => rawFile);

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const coverName = `library-${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ coverName }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok) throw new Error(presign.error);

      const uploadRes = await fetch(presign.coverSignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "image/webp" },
        body: file,
      });
      if (!uploadRes.ok) throw new Error("Erreur lors de l'upload");

      const newUrls = [...urls];
      newUrls[index] = presign.coverPublicUrl;
      setUrls(newUrls);
      await save(newUrls);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setUploading(null);
    }
  };

  const handleRemove = async (index: number) => {
    const newUrls = [...urls];
    newUrls[index] = null;
    setUrls(newUrls);
    await save(newUrls);
  };

  const filledCount = urls.filter(Boolean).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-mono tracking-widest text-[#00f5ff] uppercase flex items-center gap-2">
          <ImageIcon size={14} /> Bibliothèque de covers
        </h2>
        <span className="text-xs font-mono text-neutral-600">
          {filledCount} / {MAX_SLOTS}
        </span>
      </div>

      <p className="text-xs text-neutral-500 mb-5 leading-relaxed">
        Ces images sont utilisées automatiquement comme cover pour les beats qui n'en ont pas.
        Chaque beat sans cover pioche dans cette bibliothèque de façon fixe (toujours la même image pour le même beat).
      </p>

      {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {urls.map((url, i) => (
          <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[#2a2a2a] bg-[#111] group">
            {url ? (
              <>
                <img
                  src={url}
                  alt={`Cover ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                {/* Overlay au survol */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => inputRefs.current[i]?.click()}
                    disabled={uploading === i}
                    className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    title="Remplacer"
                  >
                    <Upload size={14} className="text-white" />
                  </button>
                  <button
                    onClick={() => handleRemove(i)}
                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 transition-colors"
                    title="Supprimer"
                  >
                    <X size={14} className="text-red-400" />
                  </button>
                </div>
                {/* Numéro de slot */}
                <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center">
                  <span className="text-[9px] text-white font-mono">{i + 1}</span>
                </div>
              </>
            ) : (
              <button
                onClick={() => inputRefs.current[i]?.click()}
                disabled={uploading !== null}
                className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-neutral-700 hover:text-neutral-500 transition-colors"
              >
                {uploading === i ? (
                  <Loader2 size={20} className="animate-spin text-[#b400ff]" />
                ) : (
                  <>
                    <Upload size={18} />
                    <span className="text-[10px] font-mono">{i + 1}</span>
                  </>
                )}
              </button>
            )}

            <input
              ref={el => { inputRefs.current[i] = el; }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) { handleUpload(i, f); e.target.value = ""; }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
