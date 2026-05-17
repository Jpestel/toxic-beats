"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Loader2, CheckCircle, User, FileText, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function BioManager() {
  const [bioText, setBioText]       = useState("");
  const [bioImageUrl, setBioImageUrl] = useState<string | null>(null);
  const [file, setFile]             = useState<File | null>(null);
  const [preview, setPreview]       = useState<string | null>(null);
  const [statusImg, setStatusImg]   = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [progress, setProgress]     = useState("");
  const [error, setError]           = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings/bio")
      .then(r => r.json())
      .then(d => {
        setBioText(d.bio_text ?? "");
        setBioImageUrl(d.bio_image_url ?? null);
      });
  }, []);

  /* ── Redimensionne la photo en carré 600×600 WebP ── */
  const resizeSquare = (f: File): Promise<File> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const SIZE = 600;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext("2d")!;
        // Recadrage centré
        const s = Math.min(img.width, img.height);
        const ox = (img.width - s) / 2, oy = (img.height - s) / 2;
        ctx.drawImage(img, ox, oy, s, s, 0, 0, SIZE, SIZE);
        canvas.toBlob(
          (blob) => blob
            ? resolve(new File([blob], "bio-photo.webp", { type: "image/webp" }))
            : reject(new Error("Compression échouée")),
          "image/webp", 0.88
        );
      };
      img.onerror = () => reject(new Error("Image invalide"));
      img.src = url;
    });

  /* ── Upload photo ── */
  const handleUploadPhoto = async () => {
    if (!file) return;
    setStatusImg("uploading"); setError("");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const optimized = await resizeSquare(file);
      const fileName = `bio-photo-${Date.now()}.webp`;

      setProgress("Optimisation…");
      const presignRes = await fetch("/api/settings/bio", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ fileName }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok) throw new Error(presign.error);

      setProgress("Upload…");
      const uploadRes = await fetch(presign.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/webp" },
        body: optimized,
      });
      if (!uploadRes.ok) throw new Error("Échec de l'upload");

      setProgress("Enregistrement…");
      const saveRes = await fetch("/api/settings/bio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ bio_image_url: presign.publicUrl }),
      });
      if (!saveRes.ok) throw new Error("Erreur sauvegarde");

      setBioImageUrl(presign.publicUrl);
      setStatusImg("success");
      setFile(null); setPreview(null);
    } catch (err: unknown) {
      setStatusImg("error");
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  /* ── Sauvegarder le texte ── */
  const handleSaveText = async () => {
    setStatusText("saving");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/settings/bio", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ bio_text: bioText }),
      });
      if (!res.ok) throw new Error();
      setStatusText("success");
      setTimeout(() => setStatusText("idle"), 2500);
    } catch {
      setStatusText("error");
    }
  };

  return (
    <div className="space-y-8">

      {/* ── PHOTO ── */}
      <div>
        <h2 className="text-sm font-mono tracking-widest text-[#b400ff] uppercase flex items-center gap-2 mb-5">
          <User size={14} /> Photo de profil
        </h2>

        <div className="grid sm:grid-cols-2 gap-5 items-start">
          {/* Photo actuelle */}
          <div>
            <p className="text-xs text-neutral-500 tracking-widest uppercase mb-2">Photo actuelle</p>
            <div
              className="aspect-square rounded-2xl overflow-hidden border border-[#2a2a2a] flex items-center justify-center max-w-[200px]"
              style={{ background: "linear-gradient(135deg, #1a0a2e, #0a0a1a)" }}
            >
              {bioImageUrl ? (
                <img src={bioImageUrl} alt="Bio" className="w-full h-full object-cover" />
              ) : (
                <span className="text-6xl font-black text-[#b400ff] opacity-20">T</span>
              )}
            </div>
          </div>

          {/* Upload nouvelle photo */}
          <div>
            <p className="text-xs text-neutral-500 tracking-widest uppercase mb-2">
              {bioImageUrl ? "Remplacer" : "Uploader une photo"}
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              className="aspect-square rounded-2xl border border-dashed border-[#2a2a2a] hover:border-[#b400ff]/50 cursor-pointer transition-colors overflow-hidden max-w-[200px] flex items-center justify-center"
              style={{ background: "#0d0d0d" }}
            >
              {preview ? (
                <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 p-4 text-center">
                  <Upload size={22} className="text-neutral-600" />
                  <span className="text-xs text-neutral-600">Cliquer pour choisir</span>
                  <span className="text-[10px] text-neutral-700">Recadré en carré · WebP</span>
                </div>
              )}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.heic,image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setPreview(f ? URL.createObjectURL(f) : null);
                setStatusImg("idle"); setError("");
              }}
            />

            {file && (
              <p className="text-xs text-[#b400ff] truncate mt-2">{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB</p>
            )}
            {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
            {statusImg === "success" && (
              <div className="flex items-center gap-1.5 text-[#39ff14] text-xs mt-2">
                <CheckCircle size={13} /> Photo mise à jour !
              </div>
            )}

            {file && statusImg !== "success" && (
              <button
                onClick={handleUploadPhoto}
                disabled={statusImg === "uploading"}
                className="mt-3 w-full max-w-[200px] h-10 rounded-xl font-bold text-xs text-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:scale-[1.01]"
                style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 15px rgba(180,0,255,0.3)" }}
              >
                {statusImg === "uploading"
                  ? <><Loader2 size={13} className="animate-spin" />{progress}</>
                  : <><Upload size={13} />Publier</>
                }
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── BIOGRAPHIE ── */}
      <div>
        <h2 className="text-sm font-mono tracking-widest text-[#00f5ff] uppercase flex items-center gap-2 mb-5">
          <FileText size={14} /> Texte de biographie
        </h2>

        <textarea
          value={bioText}
          onChange={(e) => { setBioText(e.target.value); setStatusText("idle"); }}
          rows={6}
          placeholder="Écris ici ta biographie, ton style, ton parcours…"
          className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00f5ff] transition-colors resize-none leading-relaxed"
        />
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-neutral-600">{bioText.length} caractères</span>

          {statusText === "success" && (
            <div className="flex items-center gap-1.5 text-[#39ff14] text-xs">
              <CheckCircle size={13} /> Sauvegardé !
            </div>
          )}

          <button
            onClick={handleSaveText}
            disabled={statusText === "saving"}
            className="flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs text-black disabled:opacity-60 transition-all hover:scale-[1.01]"
            style={{ background: "linear-gradient(135deg, #00f5ff, #0099bb)", boxShadow: "0 0 12px rgba(0,245,255,0.3)" }}
          >
            {statusText === "saving"
              ? <><Loader2 size={13} className="animate-spin" />Sauvegarde…</>
              : <><Save size={13} />Sauvegarder</>
            }
          </button>
        </div>
      </div>

    </div>
  );
}
