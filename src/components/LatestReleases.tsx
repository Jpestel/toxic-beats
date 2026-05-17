"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import type { Beat, Kit } from "@/types";

const CARD_W = 208;
const GAP = 12;
const SPEED_FAST = 5;

const SPEED_MAP = { slow: 0.35, normal: 0.7, fast: 1.4 };

type CarouselConfig = {
  visible: boolean;
  title: string;
  subtitle: string;
  badge_text: string;
  count: number;
  speed: "slow" | "normal" | "fast";
  show_kits: boolean;
  kit_count: number;
  kit_badge_text: string;
  color_accent: string;
  color_beat: string;
  color_kit: string;
};

const CONFIG_DEFAULTS: CarouselConfig = {
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

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "").padEnd(6, "0");
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
}

type CarouselItem =
  | { kind: "beat"; data: Beat }
  | { kind: "kit";  data: Kit  };

function pickFromLibrary(id: string, library: string[]): string | null {
  if (!library.length) return null;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return library[hash % library.length];
}

export default function LatestReleases({ beats, kits = [], genreCovers, coverLibrary }: {
  beats: Beat[];
  kits?: Kit[];
  genreCovers?: Record<string, string>;
  coverLibrary?: string[];
}) {
  const [cfg, setCfg] = useState<CarouselConfig>(CONFIG_DEFAULTS);

  useEffect(() => {
    fetch("/api/settings/carousel")
      .then((r) => r.json())
      .then((d) => setCfg({ ...CONFIG_DEFAULTS, ...d }));
  }, []);

  // Construction de la liste mixte beats + kits
  const latestBeats: CarouselItem[] = beats.slice(0, cfg.count).map((b) => ({ kind: "beat", data: b }));
  const latestKits: CarouselItem[]  = cfg.show_kits ? kits.slice(0, cfg.kit_count).map((k) => ({ kind: "kit", data: k })) : [];

  // Interleave : on mélange beats et kits pour un rendu varié
  const latest: CarouselItem[] = [];
  const maxLen = Math.max(latestBeats.length, latestKits.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < latestBeats.length) latest.push(latestBeats[i]);
    if (i < latestKits.length)  latest.push(latestKits[i]);
  }
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef     = useRef<HTMLAudioElement | null>(null);
  const playingIdRef = useRef<string | null>(null);
  const trackRef   = useRef<HTMLDivElement>(null);
  const offsetRef  = useRef(0);
  const speedRef   = useRef(SPEED_MAP.normal);
  const rafRef     = useRef<number>(0);
  const hoveredRef = useRef(false);

  const baseSpeed = SPEED_MAP[cfg.speed] ?? SPEED_MAP.normal;
  const setWidth  = latest.length * (CARD_W + GAP);

  const tick = useCallback(() => {
    offsetRef.current += speedRef.current;
    if (offsetRef.current >= setWidth)  offsetRef.current -= setWidth;
    if (offsetRef.current < 0)          offsetRef.current += setWidth;
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${offsetRef.current}px)`;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [setWidth]);

  useEffect(() => {
    speedRef.current = baseSpeed;
  }, [baseSpeed]);

  useEffect(() => {
    if (!latest.length) return;
    speedRef.current = baseSpeed;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick, latest.length, baseSpeed]);

  // S'arrêter si un autre lecteur (BeatCard ou autre item du carousel) prend la main
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id !== playingIdRef.current && playingIdRef.current !== null) {
        audioRef.current?.pause();
        setPlayingId(null);
        playingIdRef.current = null;
      }
    };
    window.addEventListener("beat-play", handler);
    return () => window.removeEventListener("beat-play", handler);
  }, []);

  if (!cfg.visible || !latest.length) return null;

  const items = [...latest, ...latest, ...latest];

  const togglePlay = (item: CarouselItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const id  = item.data.id;
    const url = item.data.preview_url;
    if (!url) return;
    if (playingId === id) {
      audioRef.current?.pause();
      setPlayingId(null);
      playingIdRef.current = null;
    } else {
      // Signaler aux autres lecteurs de s'arrêter
      window.dispatchEvent(new CustomEvent("beat-play", { detail: id }));
      // (le listener ci-dessus s'exécute ici de façon synchrone et stoppe l'ancien beat)
      audioRef.current?.pause();
      const audio = new Audio(url);
      audio.play();
      audio.onended = () => { setPlayingId(null); playingIdRef.current = null; };
      audioRef.current = audio;
      setPlayingId(id);
      playingIdRef.current = id;
    }
  };

  // Survol / touch → pause ; fin survol → reprise
  const onEnter = () => { hoveredRef.current = true;  speedRef.current = 0; };
  const onLeave = () => { hoveredRef.current = false; speedRef.current = baseSpeed; };

  // Bouton enfoncé → vitesse rapide (ignore le hover) ; relâché → reprise selon état hover
  const btnDown = (dir: "left" | "right") => {
    speedRef.current = dir === "left" ? -SPEED_FAST : SPEED_FAST;
  };
  const btnUp = () => {
    speedRef.current = hoveredRef.current ? 0 : baseSpeed;
  };

  return (
    <section className="py-14 px-4 border-b border-[#1a1a1a]">
      <div className="max-w-6xl mx-auto">

        {/* Titre */}
        <div className="text-center mb-8">
          {cfg.subtitle && (
            <p className="text-xs font-mono tracking-[0.4em] uppercase mb-1" style={{ color: cfg.color_accent }}>{cfg.subtitle}</p>
          )}
          <h2 className="text-2xl md:text-3xl font-black text-white">{cfg.title}</h2>
          <div className="w-16 h-[2px] mx-auto mt-3"
            style={{ background: `linear-gradient(90deg, transparent, ${cfg.color_accent}, transparent)` }} />
        </div>

        {/* Cadre — 3 cartes visibles */}
        <div
          className="mx-auto overflow-hidden rounded-2xl relative cursor-pointer"
          style={{ maxWidth: `${3 * CARD_W + 2 * GAP}px` }}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onTouchStart={onEnter}
          onTouchEnd={onLeave}
          onTouchCancel={onLeave}
        >
          {/* Dégradés bords */}
          <div className="absolute left-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to right, #080808, transparent)" }} />
          <div className="absolute right-0 top-0 bottom-0 w-10 z-10 pointer-events-none"
            style={{ background: "linear-gradient(to left, #080808, transparent)" }} />

          {/* Bande défilante */}
          <div
            ref={trackRef}
            className="flex will-change-transform"
            style={{ gap: `${GAP}px`, width: "max-content" }}
          >
            {items.map((item, i) => {
              const isKit     = item.kind === "kit";
              const id        = item.data.id;
              const isPlaying = playingId === id;
              const accent    = isKit ? cfg.color_kit : cfg.color_beat;
              const accentRgb = hexToRgb(accent);
              const badgeText = isKit ? cfg.kit_badge_text : cfg.badge_text;

              const coverUrl = isKit
                ? (item.data as Kit).image_url ?? null
                : (item.data as Beat).image_url
                    ?? (genreCovers ?? {})[(item.data as Beat).genre]
                    ?? pickFromLibrary(id, coverLibrary ?? []);

              return (
              <div
                key={`${id}-${i}`}
                className="flex-shrink-0 rounded-xl overflow-hidden border transition-all duration-300 group"
                style={{
                  width: `${CARD_W}px`,
                  background: "#111",
                  borderColor: isPlaying ? accent : "#2a2a2a",
                  boxShadow: isPlaying ? `0 0 20px rgba(${accentRgb},0.5), 0 0 40px rgba(${accentRgb},0.2)` : "none",
                  transform: isPlaying ? "scale(1.03)" : "scale(1)",
                }}
              >
                {/* Visuel */}
                <div className="relative overflow-hidden" style={{ aspectRatio: "1/1" }}>
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={item.data.title}
                      className="w-full h-full object-cover transition-transform duration-500"
                      style={{ transform: isPlaying ? "scale(1.08)" : undefined }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: isKit ? "linear-gradient(135deg, #2a1a00, #1a1000)" : "linear-gradient(135deg, #1a0a2e, #0a0a1a)" }}>
                      <span className="text-5xl font-black opacity-20" style={{ color: accent }}>
                        {isKit ? "K" : "T"}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={(e) => togglePlay(item, e)}
                    className="absolute inset-0 flex items-center justify-center transition-all duration-200"
                    style={{ background: isPlaying ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.25)" }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full transition-all duration-200"
                      style={{
                        width: isPlaying ? 52 : 44,
                        height: isPlaying ? 52 : 44,
                        background: isPlaying ? accent : `rgba(${accentRgb},0.75)`,
                        boxShadow: isPlaying
                          ? `0 0 24px rgba(${accentRgb},0.9), 0 0 48px rgba(${accentRgb},0.4)`
                          : `0 0 12px rgba(${accentRgb},0.4)`,
                        opacity: isPlaying ? 1 : 0.7,
                      }}
                    >
                      {isPlaying
                        ? <Pause size={18} className="text-white" fill="white" />
                        : <Play  size={18} className={isKit ? "text-black ml-0.5" : "text-white ml-0.5"} fill={isKit ? "black" : "white"} />
                      }
                    </div>
                    {isPlaying && (
                      <span className="absolute rounded-full animate-ping"
                        style={{ width: 52, height: 52, background: `rgba(${accentRgb},0.25)`, animationDuration: "1s" }}
                      />
                    )}
                  </button>

                  {/* Badge */}
                  {badgeText && (
                    <div className="absolute top-2 left-2 z-10">
                      <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full"
                        style={{ background: accent, color: isKit ? "#000" : "#fff", boxShadow: `0 0 8px rgba(${accentRgb},0.5)` }}>
                        {badgeText.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {isPlaying && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden">
                      <div className="h-full animate-pulse"
                        style={{ background: isKit
                          ? `linear-gradient(90deg, ${cfg.color_kit}, ${cfg.color_accent}, ${cfg.color_kit})`
                          : `linear-gradient(90deg, ${cfg.color_beat}, ${cfg.color_accent}, ${cfg.color_beat})`,
                          backgroundSize: "200%" }} />
                    </div>
                  )}
                </div>

                {/* Infos */}
                <div className="px-3 py-2.5">
                  <p className="font-bold text-white text-sm truncate">{item.data.title}</p>
                  <div className="flex items-center justify-between mt-1">
                    {isKit
                      ? <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: accent }}>Kit de samples</span>
                      : <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: cfg.color_beat }}>{(item.data as Beat).genre}</span>
                    }
                    <span className="text-xs font-bold" style={{ color: isKit ? cfg.color_kit : cfg.color_accent }}>{item.data.price}€</span>
                  </div>
                </div>
              </div>
            );})}
          </div>
        </div>

        {/* Boutons navigation */}
        <div className="flex justify-center gap-4 mt-5">
          <button
            onMouseDown={() => btnDown("left")}
            onMouseUp={btnUp}
            onMouseLeave={btnUp}
            onTouchStart={() => btnDown("left")}
            onTouchEnd={btnUp}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs tracking-widest uppercase border transition-all active:scale-95 select-none"
            style={{ background: "#111", borderColor: `${cfg.color_beat}50`, color: cfg.color_beat }}
          >
            <ChevronLeft size={15} /> Précédent
          </button>
          <button
            onMouseDown={() => btnDown("right")}
            onMouseUp={btnUp}
            onMouseLeave={btnUp}
            onTouchStart={() => btnDown("right")}
            onTouchEnd={btnUp}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs tracking-widest uppercase border transition-all active:scale-95 select-none"
            style={{ background: "#111", borderColor: `${cfg.color_beat}50`, color: cfg.color_beat }}
          >
            Suivant <ChevronRight size={15} />
          </button>
        </div>

      </div>
    </section>
  );
}
