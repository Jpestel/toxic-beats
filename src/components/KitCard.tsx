"use client";

import { useState, useRef } from "react";
import { Play, Pause, ShoppingCart, Package } from "lucide-react";
import type { Kit } from "@/types";

type Props = {
  kit: Kit;
  onBuy: (kit: Kit) => void;
  isInCart?: boolean;
};

export default function KitCard({ kit, onBuy, isInCart }: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    const pct = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setProgress(isNaN(pct) ? 0 : pct);
  };

  const handleEnded = () => { setPlaying(false); setProgress(0); };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * audioRef.current.duration;
  };

  const color = "#f59e0b";

  return (
    <div
      className="relative border border-[#2a2a2a] bg-[#111111] overflow-hidden group transition-all duration-300"
      style={{
        borderRadius: "var(--card-radius, 16px)",
        boxShadow: playing ? `0 0 30px ${color}30` : "none",
        borderColor: playing ? color : undefined,
      }}
    >
      {/* Trait couleur haut — amber pour les kits */}
      <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />

      {/* Badge KIT */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase"
        style={{ background: "#f59e0bcc", color: "#000", backdropFilter: "blur(4px)" }}>
        <Package size={9} /> KIT
      </div>

      {/* Image + Play overlay */}
      <div className="relative w-full aspect-square overflow-hidden">
        {kit.image_url ? (
          <img
            src={kit.image_url}
            alt={kit.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ transform: playing ? "scale(1.06)" : undefined }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #1a0f00, #0a0800)" }}>
            <Package size={48} className="opacity-20" style={{ color }} />
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 45%, #111111 100%)" }} />

        {/* Bouton Play */}
        {kit.preview_url && (
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
                ? <Pause size={18} className="text-black" fill="black" />
                : <Play  size={18} className="text-black ml-0.5" fill="black" />
              }
            </div>
            {playing && (
              <span className="absolute rounded-full animate-ping pointer-events-none"
                style={{ width: 52, height: 52, background: `${color}33`, animationDuration: "1s" }} />
            )}
          </button>
        )}

        {/* Prix en overlay */}
        <div className="absolute bottom-3 right-3">
          <span className="text-lg font-black" style={{ color, textShadow: `0 0 10px ${color}80` }}>
            {kit.price}€
          </span>
        </div>

        {/* Barre de lecture */}
        {playing && (
          <div className="absolute bottom-0 left-0 right-0 h-1">
            <div className="h-full" style={{ width: `${progress}%`, background: color, transition: "width 0.1s linear" }} />
          </div>
        )}
      </div>

      {/* Infos */}
      <div className="px-3 pt-2 pb-3 lg:px-5 lg:pt-1 lg:pb-4">
        <h3 className="font-bold text-white text-sm lg:text-lg leading-tight truncate">{kit.title}</h3>

        {kit.description && (
          <div className="mt-1 mb-2">
            <p className={`text-neutral-500 text-xs leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
              {kit.description}
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="text-[10px] font-mono mt-1 transition-colors"
              style={{ color: "#f59e0b" }}
            >
              {expanded ? "▲ Réduire" : "▼ Lire plus"}
            </button>
          </div>
        )}

        {/* Waveform / barre de lecture — desktop seulement */}
        {kit.preview_url && (
          <div
            className="relative h-12 rounded-lg bg-[#1a1a1a] cursor-pointer mb-3 overflow-hidden items-center hidden lg:flex"
            onClick={handleSeek}
          >
            <div className="absolute inset-0 flex items-center gap-[2px] px-2 opacity-40">
              {Array.from({ length: 60 }, (_, i) => (
                <div key={i} className="flex-1 rounded-sm"
                  style={{
                    height: `${20 + Math.sin(i * 0.5) * 15 + Math.random() * 10}%`,
                    background: color,
                    opacity: (i / 60) * 100 < progress ? 1 : 0.3,
                  }} />
              ))}
            </div>
            <div className="absolute left-0 top-0 bottom-0 opacity-20 transition-all duration-100"
              style={{ width: `${progress}%`, background: color }} />
            {!playing && progress === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Package size={20} className="text-neutral-600" />
              </div>
            )}
          </div>
        )}

        {kit.preview_url && (
          <audio ref={audioRef} src={kit.preview_url} onTimeUpdate={handleTimeUpdate} onEnded={handleEnded} />
        )}

        {/* Boutons */}
        <div className="flex gap-2">
          {/* Bouton play séparé — desktop seulement */}
          {kit.preview_url && (
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
          )}

          {isInCart ? (
            <div className="flex-1 flex items-center justify-center gap-1.5 h-9 lg:h-11 rounded-xl text-xs lg:text-sm font-bold tracking-wider"
              style={{ background: `${color}15`, border: `1px solid ${color}40`, color }}>
              <ShoppingCart size={14} /> Dans le panier
            </div>
          ) : (
            <button
              onClick={() => onBuy(kit)}
              className="flex-1 flex items-center justify-center gap-1.5 h-9 lg:h-11 rounded-xl font-bold text-xs lg:text-sm tracking-wider text-black transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)`, boxShadow: `0 0 20px ${color}40` }}
            >
              <ShoppingCart size={14} />
              {kit.price}€ — Ajouter
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
