"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, LayoutList } from "lucide-react";
import { supabase } from "@/lib/supabase";

type CarouselConfig = {
  visible: boolean;
  title: string;
  subtitle: string;
  badge_text: string;
  count: number;
  speed: "slow" | "normal" | "fast";
  // Kits
  show_kits: boolean;
  kit_count: number;
  kit_badge_text: string;
  // Couleurs
  color_accent: string;  // sous-titre, séparateur, prix, nav buttons
  color_beat: string;    // accent cards beats
  color_kit: string;     // accent cards kits
};

const DEFAULTS: CarouselConfig = {
  visible: true,
  title: "DERNIÈRES SORTIES",
  subtitle: "◆ NEW RELEASES ◆",
  badge_text: "NEW",
  count: 8,
  speed: "normal",
  show_kits: false,
  kit_count: 4,
  kit_badge_text: "KIT",
  color_accent: "#00f5ff",
  color_beat: "#b400ff",
  color_kit: "#f59e0b",
};

const SPEED_OPTIONS = [
  { value: "slow",   label: "Lent" },
  { value: "normal", label: "Normal" },
  { value: "fast",   label: "Rapide" },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full transition-all flex-shrink-0"
      style={{ background: value ? "#b400ff" : "#2a2a2a" }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
        style={{ transform: value ? "translateX(20px)" : "translateX(0)" }}
      />
    </button>
  );
}

export default function CarouselManager() {
  const [config, setConfig] = useState<CarouselConfig>(DEFAULTS);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  useEffect(() => {
    fetch("/api/settings/carousel")
      .then((r) => r.json())
      .then((d) => setConfig({ ...DEFAULTS, ...d }));
  }, []);

  const set = <K extends keyof CarouselConfig>(k: K, v: CarouselConfig[K]) =>
    setConfig((prev) => ({ ...prev, [k]: v }));

  const save = async () => {
    setStatus("saving");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/settings/carousel", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify(config),
    });
    setStatus(res.ok ? "success" : "error");
    if (res.ok) setTimeout(() => setStatus("idle"), 2500);
  };

  return (
    <div className="mt-10 pt-8 border-t border-[#1a1a1a]">
      <h2 className="text-sm font-mono tracking-widest text-[#b400ff] uppercase flex items-center gap-2 mb-6">
        <LayoutList size={14} /> Carrousel · Dernières sorties
      </h2>

      <div className="space-y-5">

        {/* Visible */}
        <div className="flex items-center justify-between bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3">
          <div>
            <p className="text-sm text-white font-semibold">Section visible</p>
            <p className="text-xs text-neutral-500 mt-0.5">Afficher ou masquer le carrousel sur le site</p>
          </div>
          <Toggle value={config.visible} onChange={(v) => set("visible", v)} />
        </div>

        {/* Titre principal */}
        <div>
          <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-2">Titre principal</label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={60}
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors font-bold uppercase tracking-widest"
            placeholder="DERNIÈRES SORTIES"
          />
        </div>

        {/* Sous-titre */}
        <div>
          <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-2">Sous-titre</label>
          <input
            type="text"
            value={config.subtitle}
            onChange={(e) => set("subtitle", e.target.value)}
            maxLength={60}
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors font-mono"
            placeholder="◆ NEW RELEASES ◆"
          />
        </div>

        {/* ── SECTION BEATS ── */}
        <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-[#b400ff10] border-b border-[#2a2a2a]">
            <p className="text-xs font-mono tracking-widest text-[#b400ff] uppercase">Beats</p>
          </div>
          <div className="p-4 space-y-4">

            {/* Badge beats */}
            <div>
              <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-2">
                Badge sur les cards <span className="text-neutral-600 normal-case">(vide = pas de badge)</span>
              </label>
              <input
                type="text"
                value={config.badge_text}
                onChange={(e) => set("badge_text", e.target.value)}
                maxLength={10}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors font-mono uppercase tracking-widest"
                placeholder="NEW"
              />
              {config.badge_text && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ background: config.color_beat, color: "#fff", boxShadow: `0 0 8px ${config.color_beat}80` }}>
                    {config.badge_text.toUpperCase()}
                  </span>
                  <span className="text-xs text-neutral-600">Aperçu</span>
                </div>
              )}
            </div>

            {/* Nombre de beats */}
            <div>
              <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-2">
                Beats affichés · <span className="text-[#b400ff]">{config.count}</span>
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-neutral-600 font-mono w-4">4</span>
                <input
                  type="range" min={4} max={12} step={1} value={config.count}
                  onChange={(e) => set("count", Number(e.target.value))}
                  className="flex-1 accent-[#b400ff]"
                />
                <span className="text-xs text-neutral-600 font-mono w-4">12</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SECTION KITS ── */}
        <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-[#f59e0b10] border-b border-[#2a2a2a] flex items-center justify-between">
            <p className="text-xs font-mono tracking-widest text-[#f59e0b] uppercase">Kits</p>
            <Toggle value={config.show_kits} onChange={(v) => set("show_kits", v)} />
          </div>

          {config.show_kits && (
            <div className="p-4 space-y-4">

              {/* Badge kits */}
              <div>
                <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-2">
                  Badge sur les cards kits <span className="text-neutral-600 normal-case">(vide = pas de badge)</span>
                </label>
                <input
                  type="text"
                  value={config.kit_badge_text}
                  onChange={(e) => set("kit_badge_text", e.target.value)}
                  maxLength={10}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f59e0b] transition-colors font-mono uppercase tracking-widest"
                  placeholder="KIT"
                />
                {config.kit_badge_text && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full"
                      style={{ background: config.color_kit, color: "#000", boxShadow: `0 0 8px ${config.color_kit}80` }}>
                      {config.kit_badge_text.toUpperCase()}
                    </span>
                    <span className="text-xs text-neutral-600">Aperçu</span>
                  </div>
                )}
              </div>

              {/* Nombre de kits */}
              <div>
                <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-2">
                  Kits affichés · <span className="text-[#f59e0b]">{config.kit_count}</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-neutral-600 font-mono w-4">2</span>
                  <input
                    type="range" min={2} max={12} step={1} value={config.kit_count}
                    onChange={(e) => set("kit_count", Number(e.target.value))}
                    className="flex-1 accent-[#f59e0b]"
                  />
                  <span className="text-xs text-neutral-600 font-mono w-4">12</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── COULEURS ── */}
        <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-[#ffffff08] border-b border-[#2a2a2a]">
            <p className="text-xs font-mono tracking-widest text-neutral-400 uppercase">Couleurs</p>
          </div>
          <div className="p-4 space-y-3">
            {([
              { key: "color_accent" as const, label: "Accent section", hint: "Sous-titre · séparateur · prix · boutons nav" },
              { key: "color_beat"   as const, label: "Beats",          hint: "Badge · bouton play · lueur · genre" },
              { key: "color_kit"    as const, label: "Kits",           hint: "Badge · bouton play · lueur" },
            ] as const).map(({ key, label, hint }) => (
              <div key={key} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-white">{label}</p>
                  <p className="text-[10px] text-neutral-600 mt-0.5">{hint}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Swatch cliquable */}
                  <label className="relative w-8 h-8 rounded-lg border border-[#333] overflow-hidden cursor-pointer flex-shrink-0 hover:border-[#555] transition-colors"
                    style={{ background: config[key] }}>
                    <input
                      type="color"
                      value={config[key]}
                      onChange={(e) => set(key, e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>
                  {/* Hex input */}
                  <input
                    type="text"
                    value={config[key]}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9a-fA-F]{0,6}$/.test(v)) set(key, v);
                    }}
                    maxLength={7}
                    className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#b400ff] transition-colors uppercase text-center"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Vitesse */}
        <div>
          <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-2">Vitesse de défilement</label>
          <div className="flex gap-2">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => set("speed", opt.value as CarouselConfig["speed"])}
                className="flex-1 py-2.5 rounded-xl text-xs font-mono font-bold transition-all"
                style={config.speed === opt.value
                  ? { background: "#b400ff", color: "#fff", boxShadow: "0 0 12px rgba(180,0,255,0.4)" }
                  : { background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Sauvegarde */}
      <button
        onClick={save}
        disabled={status === "saving"}
        className="mt-6 w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", color: "#fff", boxShadow: "0 0 20px rgba(180,0,255,0.3)" }}
      >
        {status === "saving" && <Loader2 size={15} className="animate-spin" />}
        {status === "success" && <CheckCircle size={15} />}
        {status === "saving" ? "Enregistrement…" : status === "success" ? "Enregistré !" : "Enregistrer"}
      </button>
      {status === "error" && <p className="text-red-400 text-xs mt-2 text-center">Erreur lors de la sauvegarde.</p>}
    </div>
  );
}
