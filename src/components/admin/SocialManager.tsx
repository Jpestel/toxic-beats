"use client";

import { useState, useEffect, useRef } from "react";
import { Save, Loader2, CheckCircle, Plus, Trash2, Upload, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  SocialIcon, PREDEFINED_NETWORKS,
  DEFAULT_SOCIALS_CONFIG,
  type SocialsConfig, type CustomSocialNetwork,
} from "@/lib/socialIcons";

function Toggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className="relative flex-shrink-0 w-11 h-6 rounded-full transition-all duration-200"
      style={{ background: active ? "#b400ff" : "#2a2a2a", boxShadow: active ? "0 0 10px rgba(180,0,255,0.4)" : "none" }}
    >
      <span
        className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-200"
        style={{ left: active ? "calc(100% - 1.375rem)" : "2px" }}
      />
    </button>
  );
}

export default function SocialManager() {
  const [config, setConfig] = useState<SocialsConfig>(DEFAULT_SOCIALS_CONFIG);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingCustomId = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/socials")
      .then(r => r.json())
      .then(d => {
        if (d.config) {
          // Fusionner avec les réseaux prédéfinis manquants éventuels
          const existing = d.config as SocialsConfig;
          const merged = DEFAULT_SOCIALS_CONFIG.predefined.map(def => {
            const found = existing.predefined?.find(p => p.id === def.id);
            return found ?? def;
          });
          setConfig({ predefined: merged, custom: existing.custom ?? [] });
        }
      });
  }, []);

  const updatePredefined = (id: string, field: "url" | "active", value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      predefined: prev.predefined.map(n => n.id === id ? { ...n, [field]: value } : n),
    }));
    setStatus("idle");
  };

  const updateCustom = (id: string, field: keyof CustomSocialNetwork, value: string | boolean) => {
    setConfig(prev => ({
      ...prev,
      custom: prev.custom.map(n => n.id === id ? { ...n, [field]: value } : n),
    }));
    setStatus("idle");
  };

  const addCustom = () => {
    const newId = crypto.randomUUID();
    setConfig(prev => ({
      ...prev,
      custom: [...prev.custom, { id: newId, name: "", icon_url: "", url: "", active: false }],
    }));
  };

  const removeCustom = (id: string) => {
    setConfig(prev => ({ ...prev, custom: prev.custom.filter(n => n.id !== id) }));
  };

  // Redimensionne l'icône en carré 48×48 WebP
  const resizeIcon = (file: File): Promise<File> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const SIZE = 48;
        const canvas = document.createElement("canvas");
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext("2d")!;
        const s = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, SIZE, SIZE);
        canvas.toBlob(
          blob => blob
            ? resolve(new File([blob], "icon.webp", { type: "image/webp" }))
            : reject(new Error("Échec")),
          "image/webp", 0.9
        );
      };
      img.onerror = () => reject(new Error("Image invalide"));
      img.src = url;
    });

  const handleIconUpload = async (file: File, customId: string) => {
    setUploadingId(customId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const optimized = await resizeIcon(file);
      const fileName = `icon-${Date.now()}.webp`;

      const presignRes = await fetch("/api/settings/socials", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ fileName }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok) throw new Error(presign.error);

      await fetch(presign.signedUrl, {
        method: "PUT", headers: { "Content-Type": "image/webp" }, body: optimized,
      });

      updateCustom(customId, "icon_url", presign.publicUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingId(null);
    }
  };

  const handleSave = async () => {
    setStatus("saving");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/settings/socials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
    }
  };

  return (
    <div>
      <h2 className="text-sm font-mono tracking-widest text-[#39ff14] uppercase flex items-center gap-2 mb-6">
        <Share2 size={14} /> Réseaux sociaux
      </h2>

      {/* ── Réseaux prédéfinis ── */}
      <div className="space-y-3 mb-8">
        {config.predefined.map((net) => {
          const meta = PREDEFINED_NETWORKS.find(n => n.id === net.id)!;
          return (
            <div key={net.id}
              className="flex items-center gap-3 bg-[#1a1a1a] rounded-xl px-4 py-3 border border-[#2a2a2a]">
              {/* Icône */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: net.active ? "#b400ff20" : "#111", color: net.active ? "#b400ff" : "#555" }}>
                <SocialIcon id={net.id} size={18} />
              </div>
              {/* Nom */}
              <span className="text-sm font-mono text-neutral-300 w-24 flex-shrink-0">{meta.label}</span>
              {/* URL */}
              <input
                type="url"
                value={net.url}
                onChange={e => updatePredefined(net.id, "url", e.target.value)}
                placeholder={`URL ${meta.label}`}
                className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors min-w-0"
              />
              {/* Toggle */}
              <Toggle active={net.active} onChange={v => updatePredefined(net.id, "active", v)} />
            </div>
          );
        })}
      </div>

      {/* ── Réseaux personnalisés ── */}
      <div className="mb-6">
        <p className="text-xs font-mono tracking-widest text-neutral-500 uppercase mb-3">Réseaux personnalisés</p>

        {config.custom.length === 0 && (
          <p className="text-xs text-neutral-600 mb-3">Aucun réseau personnalisé pour le moment.</p>
        )}

        <div className="space-y-3 mb-3">
          {config.custom.map((net) => (
            <div key={net.id}
              className="bg-[#1a1a1a] rounded-xl p-3 border border-[#2a2a2a] space-y-2">
              <div className="flex items-center gap-2">
                {/* Upload icône */}
                <div
                  onClick={() => { pendingCustomId.current = net.id; fileInputRef.current?.click(); }}
                  className="flex-shrink-0 w-10 h-10 rounded-lg border border-dashed border-[#2a2a2a] hover:border-[#b400ff]/50 cursor-pointer flex items-center justify-center overflow-hidden transition-colors"
                  style={{ background: "#111" }}
                >
                  {uploadingId === net.id ? (
                    <Loader2 size={14} className="text-[#b400ff] animate-spin" />
                  ) : net.icon_url ? (
                    <img src={net.icon_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Upload size={14} className="text-neutral-600" />
                  )}
                </div>
                {/* Nom */}
                <input
                  type="text"
                  value={net.name}
                  onChange={e => updateCustom(net.id, "name", e.target.value)}
                  placeholder="Nom du réseau"
                  className="w-28 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                />
                {/* URL */}
                <input
                  type="url"
                  value={net.url}
                  onChange={e => updateCustom(net.id, "url", e.target.value)}
                  placeholder="URL"
                  className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors min-w-0"
                />
                {/* Toggle */}
                <Toggle active={net.active} onChange={v => updateCustom(net.id, "active", v)} />
                {/* Supprimer */}
                <button onClick={() => removeCustom(net.id)} className="text-neutral-600 hover:text-red-400 transition-colors flex-shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
              {!net.icon_url && (
                <p className="text-[10px] text-neutral-600 pl-12">Clique sur le carré pour uploader une icône (PNG, SVG, WebP — recadré en 48×48)</p>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addCustom}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono tracking-widest uppercase border border-dashed border-[#2a2a2a] text-neutral-500 hover:border-[#b400ff]/50 hover:text-[#b400ff] transition-all"
        >
          <Plus size={13} /> Ajouter un réseau
        </button>
      </div>

      {/* Input file caché pour les icônes custom */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,.svg,image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f && pendingCustomId.current) handleIconUpload(f, pendingCustomId.current);
          e.target.value = "";
        }}
      />

      {/* Bouton sauvegarder */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black disabled:opacity-60 transition-all hover:scale-[1.01]"
          style={{ background: "linear-gradient(135deg, #39ff14, #22cc0a)", boxShadow: "0 0 15px rgba(57,255,20,0.3)" }}
        >
          {status === "saving"
            ? <><Loader2 size={15} className="animate-spin" />Sauvegarde…</>
            : <><Save size={15} />Sauvegarder</>
          }
        </button>
        {status === "success" && (
          <div className="flex items-center gap-1.5 text-[#39ff14] text-sm">
            <CheckCircle size={15} /> Réseaux mis à jour !
          </div>
        )}
        {status === "error" && <p className="text-red-400 text-sm">Erreur lors de la sauvegarde.</p>}
      </div>
    </div>
  );
}
