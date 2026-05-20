"use client";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("toxic_auth_token") : null;
}

import { useState, useEffect, useRef } from "react";
import { Upload, Loader2, CheckCircle, ImageIcon, Info, Mail } from "lucide-react";

export default function SiteManager() {
  const [currentBanner, setCurrentBanner] = useState<string | null>(null);
  const [bannerFit, setBannerFit] = useState<"cover" | "contain">("cover");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // Email de contact
  const [contactEmail, setContactEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailError, setEmailError] = useState("");

  useEffect(() => {
    fetch("/api/settings/banner")
      .then(r => r.json())
      .then(d => {
        setCurrentBanner(d.banner_url);
        if (d.banner_fit) setBannerFit(d.banner_fit as "cover" | "contain");
      });
    fetch("/api/settings/site")
      .then(r => r.json())
      .then(d => setContactEmail(d.contact_email ?? ""));
  }, []);

  const handleSaveEmail = async () => {
    setEmailSaving(true);
    setEmailError("");
    setEmailSaved(false);
    try {
      
      const res = await fetch("/api/settings/site", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ contact_email: contactEmail }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      setEmailSaved(true);
      setTimeout(() => setEmailSaved(false), 3000);
    } catch (err: unknown) {
      setEmailError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setEmailSaving(false);
    }
  };

  // Redimensionne et compresse l'image avant upload (max 1920×640, WebP, qualité 85%)
  const resizeImage = (f: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(f);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const MAX_W = 1920;
        const MAX_H = 640;
        let { width, height } = img;
        // Réduction proportionnelle
        if (width > MAX_W) { height = Math.round(height * MAX_W / width); width = MAX_W; }
        if (height > MAX_H) { width = Math.round(width * MAX_H / height); height = MAX_H; }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Échec de la compression"));
            resolve(new File([blob], "banner.webp", { type: "image/webp" }));
          },
          "image/webp",
          0.85
        );
      };
      img.onerror = () => reject(new Error("Image invalide"));
      img.src = url;
    });
  };

  const handleFitChange = async (fit: "cover" | "contain") => {
    setBannerFit(fit);
    
    await fetch("/api/settings/banner", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
      body: JSON.stringify({ banner_fit: fit }),
    });
  };

  const handleFileChange = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
    setStatus("idle");
    setError("");
  };

  const handleUpload = async () => {
    if (!file) return;
    setStatus("uploading");
    setError("");

    try {
      const token = getToken();

      // Redimensionner + compresser avant upload
      setProgress("Optimisation de l'image…");
      const optimized = await resizeImage(file);
      const fileName = `banner-${Date.now()}.webp`;

      // Obtenir l'URL présignée
      setProgress("Préparation…");
      const presignRes = await fetch("/api/settings/banner", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ fileName }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok) throw new Error(presign.error);

      // Upload de l'image optimisée
      setProgress("Upload de la bannière…");
      const uploadRes = await fetch(presign.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/webp" },
        body: optimized,
      });
      if (!uploadRes.ok) throw new Error(`Upload : ${uploadRes.statusText}`);

      // Enregistrer l'URL et le mode en base
      setProgress("Enregistrement…");
      const saveRes = await fetch("/api/settings/banner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ banner_url: presign.publicUrl, banner_fit: bannerFit }),
      });
      if (!saveRes.ok) throw new Error("Erreur lors de la sauvegarde");

      setCurrentBanner(presign.publicUrl);
      setStatus("success");
      setFile(null);
      setPreview(null);
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  return (
    <div>
      {/* ===== EMAIL DE CONTACT ===== */}
      <h2 className="text-sm font-mono tracking-widest text-[#00f5ff] uppercase flex items-center gap-2 mb-4">
        <Mail size={14} /> Email de contact
      </h2>
      <div className="bg-[#111] border border-[#2a2a2a] rounded-xl p-5 mb-10">
        <p className="text-xs text-neutral-500 mb-3">
          Adresse email affichée dans la section "Me contacter" du site. Les visiteurs cliquent dessus pour t'écrire directement.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => { setContactEmail(e.target.value); setEmailSaved(false); }}
            placeholder="ton@email.com"
            className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors font-mono"
          />
          <button
            onClick={handleSaveEmail}
            disabled={emailSaving || !contactEmail}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-black disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{ background: emailSaved ? "#39ff14" : "linear-gradient(135deg, #b400ff, #9000cc)" }}
          >
            {emailSaving
              ? <Loader2 size={14} className="animate-spin" />
              : emailSaved
              ? <><CheckCircle size={14} /> Sauvegardé !</>
              : "Sauvegarder"
            }
          </button>
        </div>
        {emailError && <p className="text-red-400 text-xs mt-2">{emailError}</p>}
      </div>

      {/* ===== BANNIÈRE ===== */}
      <h2 className="text-sm font-mono tracking-widest text-[#00f5ff] uppercase flex items-center gap-2 mb-6">
        <ImageIcon size={14} /> Bannière du site
      </h2>

      {/* Recommandations */}
      <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 mb-6 flex gap-3">
        <Info size={16} className="text-[#b400ff] flex-shrink-0 mt-0.5" />
        <div className="text-xs text-neutral-500 leading-relaxed space-y-1">
          <p><span className="text-neutral-300 font-semibold">Redimensionnement automatique :</span> max 1920 × 640 px, converti en WebP</p>
          <p><span className="text-neutral-300 font-semibold">Format accepté :</span> JPG, PNG, WebP, HEIC · N'importe quelle taille</p>
          <p><span className="text-neutral-300 font-semibold">Conseil :</span> Centre le sujet — les bords sont rognés sur mobile</p>
        </div>
      </div>

      {/* Bannière actuelle */}
      {currentBanner && (
        <div className="mb-6">
          <p className="text-xs text-neutral-500 tracking-widest uppercase mb-2">Bannière actuelle</p>
          <div className="rounded-xl overflow-hidden border border-[#2a2a2a] aspect-[3/1] relative bg-black">
            <img
              src={currentBanner}
              alt="Bannière actuelle"
              className="w-full h-full"
              style={{ objectFit: bannerFit, objectPosition: "center" }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
              <span className="text-white text-xs font-mono">Bannière en ligne</span>
            </div>
          </div>

          {/* Mode d'affichage */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-neutral-500 tracking-widest uppercase">Mode :</span>
            <div className="flex gap-2">
              {([
                { value: "cover" as const, label: "Remplir", desc: "Remplit tout, peut rogner les bords" },
                { value: "contain" as const, label: "Adapter", desc: "Tout visible, fond noir autour si besoin" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleFitChange(opt.value)}
                  title={opt.desc}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all"
                  style={bannerFit === opt.value
                    ? { background: "#b400ff", color: "#fff" }
                    : { background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }
                  }
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-neutral-600 hidden sm:inline">
              {bannerFit === "contain" ? "Tout le logo est visible, fond noir sur les bords" : "Remplit le cadre, peut couper les bords"}
            </span>
          </div>
        </div>
      )}

      {/* Nouvelle bannière */}
      <div>
        <p className="text-xs text-neutral-500 tracking-widest uppercase mb-2">
          {currentBanner ? "Remplacer la bannière" : "Uploader une bannière"}
        </p>

        {/* Zone de drop/aperçu */}
        <div
          onClick={() => fileRef.current?.click()}
          className="border border-dashed border-[#2a2a2a] hover:border-[#b400ff]/50 rounded-xl cursor-pointer transition-colors overflow-hidden mb-3"
          style={{ aspectRatio: "3/1" }}
        >
          {preview ? (
            <img src={preview} alt="Aperçu" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Upload size={24} className="text-neutral-600" />
              <span className="text-xs text-neutral-600">Clique pour choisir une image</span>
              <span className="text-xs text-neutral-700">JPG, PNG, WebP · Max 2 MB</span>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.heic,image/*"
          className="hidden"
          onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
        />

        {file && (
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-[#b400ff] truncate">{file.name}</span>
            <span className="text-xs text-neutral-600 ml-2 flex-shrink-0">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </span>
          </div>
        )}

        {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

        {status === "success" && (
          <div className="flex items-center gap-2 text-[#39ff14] text-sm mb-3">
            <CheckCircle size={16} />
            Bannière mise à jour — visible sur le site !
          </div>
        )}

        {file && status !== "success" && (
          <button
            onClick={handleUpload}
            disabled={status === "uploading"}
            className="w-full h-12 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:scale-[1.01]"
            style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px rgba(180,0,255,0.3)" }}
          >
            {status === "uploading"
              ? <><Loader2 size={16} className="animate-spin" />{progress}</>
              : <><Upload size={16} />Publier la bannière</>
            }
          </button>
        )}
      </div>
    </div>
  );
}
