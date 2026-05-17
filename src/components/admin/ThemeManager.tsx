"use client";

import { useState, useEffect } from "react";
import { Loader2, CheckCircle, Palette, Type, LayoutGrid, Eye, Columns, MonitorSmartphone, ArrowUp, ArrowDown, GripVertical, Navigation, ShoppingCart, Package, User, Mail } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ThemeConfig = {
  site_name:        string;
  site_tagline:     string;
  hero_subtitle:    string;
  hero_description: string;
  color_accent:     string;
  color_accent2:    string;
  color_accent3:    string;
  color_bg:         string;
  card_radius:      "none" | "sm" | "md" | "lg";
  beats_per_page:   number;
  grid_cols:        number;
  show_about:       boolean;
  show_contact:     boolean;
  nav_order:        string[];
};

const DEFAULTS: ThemeConfig = {
  site_name:        "TOXIC",
  site_tagline:     "Beatmaker",
  hero_subtitle:    "Beats RAP · Trap · Drill · Electro",
  hero_description: "Produit à 100% · Kits exclusifs · Licences disponibles",
  color_accent:     "#b400ff",
  color_accent2:    "#00f5ff",
  color_accent3:    "#39ff14",
  color_bg:         "#080808",
  card_radius:      "md",
  beats_per_page:   4,
  grid_cols:        4,
  show_about:       true,
  show_contact:     true,
  nav_order:        ["beats", "kits", "about", "contact"],
};

const RADIUS_OPTS: { value: ThemeConfig["card_radius"]; label: string; px: number }[] = [
  { value: "none", label: "Carré",  px: 0  },
  { value: "sm",   label: "Léger",  px: 8  },
  { value: "md",   label: "Normal", px: 16 },
  { value: "lg",   label: "Fort",   px: 24 },
];

const COLOR_FIELDS: {
  key: keyof Pick<ThemeConfig, "color_accent" | "color_accent2" | "color_accent3" | "color_bg">;
  label: string;
  desc: string;
}[] = [
  { key: "color_accent",  label: "Couleur principale", desc: "Buttons, nav, titres de section" },
  { key: "color_accent2", label: "Couleur secondaire",  desc: "À propos, carousel, accents" },
  { key: "color_accent3", label: "Couleur tertiaire",   desc: "Contact, statut vendu, succès" },
  { key: "color_bg",      label: "Fond de page",        desc: "Arrière-plan général du site" },
];

const PRESETS: { label: string; colors: Pick<ThemeConfig, "color_accent" | "color_accent2" | "color_accent3" | "color_bg"> }[] = [
  { label: "Néon violet",  colors: { color_accent: "#b400ff", color_accent2: "#00f5ff", color_accent3: "#39ff14", color_bg: "#080808" } },
  { label: "Feu rouge",    colors: { color_accent: "#ff2d55", color_accent2: "#ff9f0a", color_accent3: "#30d158", color_bg: "#0a0505" } },
  { label: "Or & Nuit",    colors: { color_accent: "#f59e0b", color_accent2: "#e879f9", color_accent3: "#22d3ee", color_bg: "#060606" } },
  { label: "Émeraude",     colors: { color_accent: "#00c896", color_accent2: "#818cf8", color_accent3: "#f472b6", color_bg: "#030a07" } },
  { label: "Acier bleu",   colors: { color_accent: "#3b82f6", color_accent2: "#a78bfa", color_accent3: "#34d399", color_bg: "#05080f" } },
];

const NAV_ITEMS: { id: string; label: string; icon: React.ReactNode; alwaysVisible?: boolean }[] = [
  { id: "beats",   label: "Beats / Panier", icon: <ShoppingCart size={13} />, alwaysVisible: true },
  { id: "kits",    label: "Kits",            icon: <Package size={13} />,      alwaysVisible: true },
  { id: "about",   label: "À propos",        icon: <User size={13} /> },
  { id: "contact", label: "Contact",         icon: <Mail size={13} /> },
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

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-[#2a2a2a] rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-[#b400ff08] border-b border-[#2a2a2a] flex items-center gap-2">
        <span className="text-[#b400ff]">{icon}</span>
        <p className="text-xs font-mono tracking-widest text-[#b400ff] uppercase">{title}</p>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

export default function ThemeManager() {
  const [config, setConfig] = useState<ThemeConfig>(DEFAULTS);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  useEffect(() => {
    fetch("/api/settings/theme")
      .then(r => r.json())
      .then(d => setConfig({ ...DEFAULTS, ...d }));
  }, []);

  const set = <K extends keyof ThemeConfig>(k: K, v: ThemeConfig[K]) =>
    setConfig(prev => ({ ...prev, [k]: v }));

  const moveNav = (idx: number, dir: -1 | 1) => {
    const order = [...config.nav_order];
    const target = idx + dir;
    if (target < 0 || target >= order.length) return;
    [order[idx], order[target]] = [order[target], order[idx]];
    set("nav_order", order);
  };

  const applyPreset = (preset: typeof PRESETS[number]) =>
    setConfig(prev => ({ ...prev, ...preset.colors }));

  const save = async () => {
    setStatus("saving");
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/settings/theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      body: JSON.stringify(config),
    });
    setStatus(res.ok ? "success" : "error");
    if (res.ok) setTimeout(() => setStatus("idle"), 2500);
  };

  return (
    <div className="pt-10 mt-10 border-t border-[#1a1a1a]">
      <h2 className="text-sm font-mono tracking-widest text-[#b400ff] uppercase flex items-center gap-2 mb-6">
        <Palette size={14} /> Thème & Personnalisation
      </h2>

      <div className="space-y-5">

        {/* ── Identité ── */}
        <Section icon={<Type size={13} />} title="Identité du site">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-1.5">Nom du site</label>
              <input
                value={config.site_name}
                onChange={e => set("site_name", e.target.value)}
                maxLength={20}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm font-black uppercase tracking-widest focus:outline-none focus:border-[#b400ff] transition-colors"
                placeholder="TOXIC"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-1.5">Tagline (sous le nom)</label>
              <input
                value={config.site_tagline}
                onChange={e => set("site_tagline", e.target.value)}
                maxLength={30}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                placeholder="Beatmaker"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-1.5">Sous-titre héro</label>
              <input
                value={config.hero_subtitle}
                onChange={e => set("hero_subtitle", e.target.value)}
                maxLength={60}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                placeholder="Beats RAP · Trap · Drill · Electro"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-1.5">Description héro</label>
              <input
                value={config.hero_description}
                onChange={e => set("hero_description", e.target.value)}
                maxLength={80}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                placeholder="Produit à 100% · Kits exclusifs · Licences disponibles"
              />
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-xl bg-[#0a0a0a] border border-[#1e1e1e] p-4 flex flex-col items-center gap-1">
            <p className="text-[9px] font-mono text-neutral-700 tracking-widest uppercase mb-2">Aperçu navigation</p>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black tracking-widest" style={{ color: config.color_accent, textShadow: `0 0 10px ${config.color_accent}60` }}>
                {config.site_name || "TOXIC"}
              </span>
              <span className="text-[10px] font-mono tracking-[0.3em] uppercase" style={{ color: config.color_accent }}>
                {config.site_tagline || "Beatmaker"}
              </span>
            </div>
            {config.hero_subtitle && (
              <p className="text-xs text-neutral-400 mt-1">{config.hero_subtitle}</p>
            )}
          </div>
        </Section>

        {/* ── Couleurs ── */}
        <Section icon={<Palette size={13} />} title="Couleurs">

          {/* Presets */}
          <div>
            <p className="text-xs text-neutral-500 tracking-widest uppercase mb-2">Palettes prêtes</p>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#888" }}
                >
                  <span className="flex gap-0.5">
                    {[p.colors.color_accent, p.colors.color_accent2, p.colors.color_accent3].map((c, i) => (
                      <span key={i} className="w-3 h-3 rounded-full inline-block" style={{ background: c }} />
                    ))}
                  </span>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {COLOR_FIELDS.map(({ key, label, desc }) => (
              <div key={key} className="flex items-center gap-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3">
                <div className="relative flex-shrink-0">
                  <div
                    className="w-8 h-8 rounded-lg border-2 border-[#3a3a3a] overflow-hidden cursor-pointer"
                    style={{ background: config[key] }}
                  >
                    <input
                      type="color"
                      value={config[key]}
                      onChange={e => set(key, e.target.value)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white font-semibold">{label}</p>
                  <p className="text-[10px] text-neutral-600">{desc}</p>
                </div>
                <input
                  type="text"
                  value={config[key]}
                  onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) set(key, e.target.value); }}
                  className="w-20 bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1 text-xs font-mono text-neutral-300 focus:outline-none focus:border-[#b400ff] text-center"
                  maxLength={7}
                />
              </div>
            ))}
          </div>

          {/* Live color preview */}
          <div className="rounded-xl overflow-hidden border border-[#2a2a2a]" style={{ background: config.color_bg }}>
            <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
              <span className="font-black text-sm" style={{ color: config.color_accent }}>{config.site_name || "TOXIC"}</span>
              <span className="text-xs font-mono" style={{ color: config.color_accent2 }}>◆ BEATS ◆</span>
            </div>
            <div className="px-4 py-4 flex gap-2">
              <div className="flex-1 rounded-xl border p-3 text-center" style={{ borderColor: `${config.color_accent}40`, background: `${config.color_accent}10` }}>
                <p className="text-[10px] font-bold" style={{ color: config.color_accent }}>Ajouter</p>
              </div>
              <div className="flex-1 rounded-xl border p-3 text-center" style={{ borderColor: `${config.color_accent2}40`, background: `${config.color_accent2}10` }}>
                <p className="text-[10px] font-bold" style={{ color: config.color_accent2 }}>À propos</p>
              </div>
              <div className="flex-1 rounded-xl border p-3 text-center" style={{ borderColor: `${config.color_accent3}40`, background: `${config.color_accent3}10` }}>
                <p className="text-[10px] font-bold" style={{ color: config.color_accent3 }}>Contact</p>
              </div>
            </div>
          </div>
        </Section>

        {/* ── Cards ── */}
        <Section icon={<LayoutGrid size={13} />} title="Apparence des cards">
          <div>
            <p className="text-xs text-neutral-500 tracking-widest uppercase mb-3">Arrondi des coins</p>
            <div className="flex gap-2">
              {RADIUS_OPTS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set("card_radius", opt.value)}
                  className="flex-1 flex flex-col items-center gap-2 py-3 px-2 transition-all"
                  style={config.card_radius === opt.value
                    ? { background: "#b400ff15", border: "1px solid #b400ff60", borderRadius: 10, color: "#b400ff" }
                    : { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, color: "#555" }
                  }
                >
                  {/* Mini card preview */}
                  <div
                    className="w-10 h-7 border-2"
                    style={{
                      borderRadius: opt.px,
                      borderColor: config.card_radius === opt.value ? "#b400ff" : "#3a3a3a",
                      background: config.card_radius === opt.value ? "#b400ff15" : "#111",
                    }}
                  />
                  <span className="text-[10px] font-mono">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Catalogue ── */}
        <Section icon={<Columns size={13} />} title="Catalogue beats">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-xs text-neutral-500 tracking-widest uppercase mb-3">
                Beats par page · <span style={{ color: "#b400ff" }}>{config.beats_per_page}</span>
              </p>
              <div className="flex gap-2">
                {[2, 4, 6, 8].map(n => (
                  <button
                    key={n}
                    onClick={() => set("beats_per_page", n)}
                    className="flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all"
                    style={config.beats_per_page === n
                      ? { background: "#b400ff", color: "#fff", boxShadow: "0 0 12px rgba(180,0,255,0.4)" }
                      : { background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs text-neutral-500 tracking-widest uppercase mb-3">
                Colonnes desktop · <span style={{ color: "#b400ff" }}>{config.grid_cols}</span>
              </p>
              <div className="flex gap-2">
                {[2, 3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => set("grid_cols", n)}
                    className="flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all"
                    style={config.grid_cols === n
                      ? { background: "#b400ff", color: "#fff", boxShadow: "0 0 12px rgba(180,0,255,0.4)" }
                      : { background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }
                    }
                  >
                    {/* Mini grid preview */}
                    <span className="flex justify-center gap-0.5 mb-1">
                      {Array.from({ length: n }).map((_, i) => (
                        <span key={i} className="w-3 h-4 rounded-sm inline-block"
                          style={{ background: config.grid_cols === n ? "#b400ff60" : "#333" }} />
                      ))}
                    </span>
                    {n} col.
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* ── Menu ── */}
        <Section icon={<Navigation size={13} />} title="Ordre du menu">
          <p className="text-xs text-neutral-500 leading-relaxed">
            Glissez ou utilisez les flèches pour réordonner les boutons de la barre de navigation.
          </p>
          <div className="space-y-2">
            {(config.nav_order.length ? config.nav_order : ["beats", "kits", "about", "contact"]).map((id, idx) => {
              const item = NAV_ITEMS.find(n => n.id === id);
              if (!item) return null;
              const isHidden =
                (id === "about"   && !config.show_about) ||
                (id === "contact" && !config.show_contact);
              const order = config.nav_order.length ? config.nav_order : ["beats", "kits", "about", "contact"];
              return (
                <div
                  key={id}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all"
                  style={{
                    background: isHidden ? "#111" : "#1a1a1a",
                    border: `1px solid ${isHidden ? "#1e1e1e" : "#2a2a2a"}`,
                    opacity: isHidden ? 0.5 : 1,
                  }}
                >
                  <GripVertical size={14} className="text-neutral-600 flex-shrink-0" />
                  <span className="flex items-center gap-2 flex-1 min-w-0">
                    <span style={{ color: isHidden ? "#444" : "#b400ff" }}>{item.icon}</span>
                    <span className="text-xs font-mono text-neutral-300">{item.label}</span>
                    {isHidden && (
                      <span className="text-[10px] font-mono text-neutral-600 bg-[#111] border border-[#222] rounded px-1.5 py-0.5">masqué</span>
                    )}
                  </span>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => moveNav(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg transition-all disabled:opacity-20"
                      style={{ background: "#111", border: "1px solid #2a2a2a", color: "#aaa" }}
                    >
                      <ArrowUp size={11} />
                    </button>
                    <button
                      onClick={() => moveNav(idx, 1)}
                      disabled={idx === order.length - 1}
                      className="p-1.5 rounded-lg transition-all disabled:opacity-20"
                      style={{ background: "#111", border: "1px solid #2a2a2a", color: "#aaa" }}
                    >
                      <ArrowDown size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-neutral-600 flex items-center gap-1.5">
            <Eye size={10} />
            Les éléments masqués (À propos / Contact) restent dans la liste mais n'apparaissent pas sur le site.
          </p>
        </Section>

        {/* ── Sections ── */}
        <Section icon={<MonitorSmartphone size={13} />} title="Sections visibles">
          {[
            { key: "show_about" as const,   label: "Section À propos",  desc: "Bio, photo, présentation du beatmaker" },
            { key: "show_contact" as const, label: "Section Contact",    desc: "Email, réseaux sociaux" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3">
              <div>
                <p className="text-sm text-white font-semibold">{label}</p>
                <p className="text-xs text-neutral-500 mt-0.5">{desc}</p>
              </div>
              <Toggle value={config[key]} onChange={v => set(key, v)} />
            </div>
          ))}
          <div className="flex items-start gap-2 text-xs text-neutral-600 bg-[#111] border border-[#1e1e1e] rounded-xl px-4 py-3">
            <Eye size={12} className="flex-shrink-0 mt-0.5" />
            <span>La section Kits se masque automatiquement si aucun kit n'est publié.</span>
          </div>
        </Section>

      </div>

      {/* Sauvegarde */}
      <button
        onClick={save}
        disabled={status === "saving"}
        className="mt-6 w-full h-11 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-60"
        style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", color: "#fff", boxShadow: "0 0 20px rgba(180,0,255,0.3)" }}
      >
        {status === "saving"  && <Loader2 size={15} className="animate-spin" />}
        {status === "success" && <CheckCircle size={15} />}
        {status === "saving"  ? "Enregistrement…" : status === "success" ? "Enregistré !" : "Enregistrer le thème"}
      </button>
      {status === "error" && <p className="text-red-400 text-xs mt-2 text-center">Erreur lors de la sauvegarde.</p>}
    </div>
  );
}
