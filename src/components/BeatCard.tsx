"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, ShoppingCart, Music, Share2, Check, X } from "lucide-react";
import type { Beat, LicenseType } from "@/types";

type ShareNetworks = Record<string, boolean>;

type Props = {
  beat: Beat;
  onBuy: (beat: Beat, licenseType: LicenseType) => void;
  cartLicenses?: LicenseType[];
  genreColors?: Record<string, string>;
  genreCovers?: Record<string, string>;
  coverLibrary?: string[];
  shareNetworks?: ShareNetworks;
  siteUrl?: string;
};

function pickFromLibrary(id: string, library: string[]): string | null {
  if (!library.length) return null;
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return library[hash % library.length];
}

const LICENSE_LABELS: Record<LicenseType, string> = {
  mp3: "MP3",
  wav: "MP3+WAV",
  exclusive: "ZIP EXCLU",
};

export default function BeatCard({ beat, onBuy, cartLicenses = [], genreColors, genreCovers, coverLibrary, shareNetworks = {}, siteUrl = "" }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedLicense, setSelectedLicense] = useState<LicenseType>("mp3");
  const [shareOpen, setShareOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const hasWav = beat.wav_extra != null;
  const hasExclusive = beat.exclusive_price != null;
  const hasMultipleLicenses = hasWav || hasExclusive;

  const wavPrice = beat.price + (beat.wav_extra ?? 0);
  const exclusivePrice = beat.exclusive_price ?? 0;

  const computedPrice =
    selectedLicense === "exclusive" ? exclusivePrice :
    selectedLicense === "wav" ? wavPrice :
    beat.price;

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      // Signaler aux autres lecteurs (carousel, autres cards) de s'arrêter
      window.dispatchEvent(new CustomEvent("beat-play", { detail: beat.id }));
      audioRef.current.play();
      setPlaying(true);
    }
  };

  // S'arrêter si un autre lecteur prend la main
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id !== beat.id && playing) {
        audioRef.current?.pause();
        setPlaying(false);
      }
    };
    window.addEventListener("beat-play", handler);
    return () => window.removeEventListener("beat-play", handler);
  }, [beat.id, playing]);

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  };

  const handleEnded = () => setPlaying(false);

  const shareUrl = siteUrl || (typeof window !== "undefined" ? window.location.origin : "");
  const shareText = `🎵 Écoute "${beat.title}" par TOXIC Beatmaker`;

  const SHARE_OPTIONS = [
    { id: "whatsapp", label: "WhatsApp", icon: "💬", href: `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}` },
    { id: "twitter",  label: "X",        icon: "𝕏",  href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}` },
    { id: "facebook", label: "Facebook", icon: "📘", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareText)}` },
    { id: "sms",      label: "SMS",      icon: "📱", href: `sms:?body=${encodeURIComponent(shareText + " " + shareUrl)}` },
  ];

  const activeShareOptions = SHARE_OPTIONS.filter(o => shareNetworks[o.id]);
  const showCopy = !!shareNetworks["copy"];
  const hasAnyShare = activeShareOptions.length > 0 || showCopy;

  const copyLink = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * audioRef.current.duration;
  };

  const color = (genreColors ?? {})[beat.genre] ?? "#b400ff";
  const coverUrl = beat.image_url ?? (genreCovers ?? {})[beat.genre] ?? pickFromLibrary(beat.id, coverLibrary ?? []);
  const isReserved = beat.status === "reserved";
  const isSold = beat.status === "sold";
  const isUnavailable = isReserved || isSold;
  // La licence actuellement sélectionnée est-elle déjà dans le panier ?
  const isSelectedInCart = cartLicenses.includes(selectedLicense);

  return (
    <div
      className="relative border border-[#2a2a2a] bg-[#111111] overflow-hidden group transition-all duration-300"
      style={{
        borderRadius: "var(--card-radius, 16px)",
        boxShadow: playing ? `0 0 30px ${color}30` : "none",
        borderColor: isSold ? "#39ff1440" : isReserved ? "#f59e0b40" : (playing ? color : undefined),
        opacity: isSold ? 0.7 : isReserved ? 0.75 : 1,
      }}
    >
      {/* Trait couleur haut */}
      <div className="h-[2px] w-full" style={{ background: isSold ? "linear-gradient(90deg, #39ff14, transparent)" : isReserved ? "linear-gradient(90deg, #f59e0b, transparent)" : `linear-gradient(90deg, ${color}, transparent)` }} />

      {/* Badge vendu */}
      {isSold && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
          style={{ background: "#39ff14cc", color: "#000", backdropFilter: "blur(4px)" }}>
          ✓ Vendu
        </div>
      )}

      {/* Badge réservé */}
      {isReserved && !isSold && (
        <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase"
          style={{ background: "#f59e0bcc", color: "#000", backdropFilter: "blur(4px)" }}>
          ⏳ Réservé
        </div>
      )}

      {/* ===== IMAGE + PLAY OVERLAY ===== */}
      <div className="relative w-full aspect-square overflow-hidden">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={beat.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ transform: playing ? "scale(1.06)" : undefined }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1a0a2e, #0a0a1a)" }}>
            <span className="text-6xl font-black opacity-20" style={{ color }}>T</span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 45%, #111111 100%)" }} />

        {/* Bouton Play */}
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center transition-all duration-200 lg:opacity-0 lg:group-hover:opacity-100"
          style={{ background: playing ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.2)" }}
        >
          <div
            className="flex items-center justify-center rounded-full transition-all duration-200"
            style={{
              width: playing ? 52 : 44, height: playing ? 52 : 44,
              background: playing ? color : `${color}cc`,
              boxShadow: playing ? `0 0 24px ${color}, 0 0 48px ${color}66` : `0 0 12px ${color}66`,
              opacity: playing ? 1 : 0.85,
            }}
          >
            {playing
              ? <Pause size={18} className="text-white" fill="white" />
              : <Play  size={18} className="text-white ml-0.5" fill="white" />
            }
          </div>
          {playing && (
            <span className="absolute rounded-full animate-ping pointer-events-none"
              style={{ width: 52, height: 52, background: `${color}33`, animationDuration: "1s" }} />
          )}
        </button>

        {/* Prix en overlay */}
        <div className="absolute bottom-3 right-3">
          <span className="text-lg font-black" style={{ color, textShadow: `0 0 10px ${color}80` }}>
            {computedPrice}€
          </span>
        </div>

        {/* Barre de lecture */}
        {playing && (
          <div className="absolute bottom-0 left-0 right-0 h-1">
            <div className="h-full" style={{ width: `${progress}%`, background: color, transition: "width 0.1s linear" }} />
          </div>
        )}
      </div>

      {/* ===== INFOS ===== */}
      <div className="px-3 pt-2 pb-3 lg:px-5 lg:pt-1 lg:pb-4">
        <h3 className="font-bold text-white text-sm lg:text-lg leading-tight truncate">{beat.title}</h3>
        <div className="flex items-center gap-2 mt-1 mb-3">
          <span className="text-[10px] lg:text-xs font-mono px-2 py-0.5 rounded-full border"
            style={{ color, borderColor: `${color}50`, background: `${color}10` }}>
            {beat.genre}
          </span>
          <span className="text-[10px] lg:text-xs text-neutral-500 font-mono">{beat.bpm} BPM</span>
        </div>

        {/* Waveform */}
        <div
          className="relative h-10 sm:h-12 rounded-lg bg-[#1a1a1a] cursor-pointer mb-3 overflow-hidden flex items-center"
          onClick={handleSeek}
        >
          <div className="absolute inset-0 flex items-center gap-[2px] px-2 opacity-40">
            {Array.from({ length: 40 }, (_, i) => (
              <div key={i} className="flex-1 rounded-sm"
                style={{
                  height: `${20 + Math.sin(i * 0.5) * 15 + Math.random() * 10}%`,
                  background: color,
                  opacity: (i / 40) * 100 < progress ? 1 : 0.3,
                }} />
            ))}
          </div>
          <div className="absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-100"
            style={{ width: `${progress}%`, background: color }} />
          {!playing && progress === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Music size={20} className="text-neutral-600" />
            </div>
          )}
        </div>

        {beat.preview_url && (
          <audio ref={audioRef} src={beat.preview_url} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} />
        )}

        {/* Tags — desktop seulement */}
        {beat.tags && beat.tags.length > 0 && (
          <div className="hidden lg:flex flex-wrap gap-1 mb-3">
            {beat.tags.map((tag) => (
              <span key={tag} className="text-xs text-neutral-500 bg-[#1a1a1a] px-2 py-0.5 rounded">#{tag}</span>
            ))}
          </div>
        )}

        {/* Sélecteur de licence — si plusieurs options */}
        {hasMultipleLicenses && !isUnavailable && (
          <div className="flex gap-1 mb-2">
            {(["mp3", ...(hasWav ? ["wav"] : []), ...(hasExclusive ? ["exclusive"] : [])] as LicenseType[]).map((lic) => {
              const licPrice = lic === "exclusive" ? exclusivePrice : lic === "wav" ? wavPrice : beat.price;
              const isSelected = selectedLicense === lic;
              const inCart = cartLicenses.includes(lic);
              return (
                <button
                  key={lic}
                  onClick={() => setSelectedLicense(lic)}
                  className="flex-1 py-1 rounded-lg text-[10px] font-mono font-bold tracking-widest uppercase transition-all relative"
                  style={isSelected
                    ? { background: color, color: "#000" }
                    : inCart
                      ? { background: `${color}15`, color, border: `1px solid ${color}50` }
                      : { background: "#1a1a1a", color: "#666", border: `1px solid #2a2a2a` }
                  }
                >
                  {inCart && <span className="absolute top-0.5 right-1 text-[8px]">✓</span>}
                  {LICENSE_LABELS[lic]}<br />
                  <span className="text-[9px]">{licPrice}€</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Boutons */}
        <div className="flex gap-2">
          {/* Bouton play séparé — desktop seulement */}
          <button
            onClick={togglePlay}
            className="hidden lg:flex items-center justify-center w-11 h-11 rounded-xl border transition-all duration-200"
            style={{
              borderColor: color, color,
              background: playing ? `${color}20` : "transparent",
              boxShadow: playing ? `0 0 15px ${color}40` : "none",
            }}
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {isSold ? (
            <div className="flex-1 flex items-center justify-center gap-1.5 h-9 lg:h-11 rounded-xl text-xs lg:text-sm font-bold tracking-wider cursor-not-allowed"
              style={{ background: "#39ff1415", border: "1px solid #39ff1440", color: "#39ff14" }}>
              ✓ Beat vendu
            </div>
          ) : isReserved ? (
            <div className="flex-1 flex items-center justify-center gap-1.5 h-9 lg:h-11 rounded-xl text-xs lg:text-sm font-bold tracking-wider cursor-not-allowed"
              style={{ background: "#f59e0b15", border: "1px solid #f59e0b40", color: "#f59e0b" }}>
              ⏳ En attente de paiement
            </div>
          ) : isSelectedInCart ? (
            <div className="flex-1 flex items-center justify-center gap-1.5 h-9 lg:h-11 rounded-xl text-xs lg:text-sm font-bold tracking-wider"
              style={{ background: `${color}15`, border: `1px solid ${color}40`, color }}>
              <ShoppingCart size={14} /> Dans le panier
            </div>
          ) : (
            <button
              onClick={() => onBuy(beat, selectedLicense)}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 lg:h-11 rounded-xl font-bold text-xs lg:text-sm tracking-wider text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, boxShadow: `0 0 20px ${color}40` }}
            >
              <ShoppingCart size={14} />
              {hasMultipleLicenses ? `${LICENSE_LABELS[selectedLicense]} · ${computedPrice}€` : "+ Panier"}
            </button>
          )}
        </div>

        {/* Bouton partage */}
        {hasAnyShare && (
          <div className="relative mt-2">
            <button
              onClick={e => { e.stopPropagation(); setShareOpen(o => !o); }}
              className="flex items-center justify-center gap-1.5 w-full h-8 rounded-xl text-xs font-mono transition-all"
              style={shareOpen
                ? { background: "#ffffff15", border: "1px solid #ffffff30", color: "#fff" }
                : { background: "#ffffff08", border: "1px solid #ffffff15", color: "#666" }}
            >
              <Share2 size={12} /> Partager
            </button>

            {shareOpen && (
              <div
                className="absolute bottom-10 left-0 right-0 z-20 rounded-xl border p-3 space-y-2"
                style={{ background: "#161616", borderColor: "#2a2a2a", boxShadow: "0 -8px 32px rgba(0,0,0,0.6)" }}
                onClick={e => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Partager ce beat</span>
                  <button onClick={() => setShareOpen(false)} className="text-neutral-600 hover:text-white transition-colors">
                    <X size={12} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeShareOptions.map(o => (
                    <a key={o.id} href={o.href} target="_blank" rel="noopener noreferrer"
                      onClick={() => setShareOpen(false)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
                      style={{ background: "#2a2a2a" }}>
                      <span>{o.icon}</span> {o.label}
                    </a>
                  ))}
                  {showCopy && (
                    <button onClick={copyLink}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105"
                      style={copied
                        ? { background: "#39ff1420", color: "#39ff14" }
                        : { background: "#2a2a2a", color: "#fff" }}>
                      {copied ? <><Check size={11} /> Copié !</> : <>🔗 Copier le lien</>}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
