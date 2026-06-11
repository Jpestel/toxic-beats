"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Music, Upload, Loader2, CheckCircle, X, Scissors, BadgeCheck, Pencil, FileCheck, RotateCcw, RefreshCw, Eye, EyeOff, FileAudio, FileArchive, ImageIcon, Play, Pause } from "lucide-react";
import CoverPicker, { type CoverPickerResult } from "./CoverPicker";
import Pagination from "./Pagination";
import { trimAudioToWav } from "@/lib/trimAudio";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("toxic_auth_token");
}
import type { Beat, GenreConfig } from "@/types";

const DEFAULT_GENRES: GenreConfig[] = [
  { name: "RAP", color: "#b400ff" }, { name: "Trap", color: "#b400ff" },
  { name: "Drill", color: "#00f5ff" }, { name: "Electro", color: "#00f5ff" },
  { name: "RnB", color: "#ff6b35" }, { name: "Afro", color: "#39ff14" },
];

const BEATS_PAGE_SIZE = 8;

export default function BeatsManager() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBeat, setEditingBeat] = useState<Beat | null>(null);
  const [genres, setGenres] = useState<GenreConfig[]>(DEFAULT_GENRES);
  const [activePage, setActivePage] = useState(1);
  const [soldPage, setSoldPage] = useState(1);

  useEffect(() => {
    fetch("/api/settings/genres")
      .then(r => r.json())
      .then(d => { if (d.genres?.length) setGenres(d.genres); })
      .catch(() => {});
  }, []);

  const fetchBeats = async () => {
    setLoading(true);
    const res = await fetch("/api/beats", {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const data = res.ok ? await res.json() : [];
    setBeats(data);
    setLoading(false);
  };

  const activeBeats = beats.filter((b) => b.status !== "sold");
  const soldBeats = beats.filter((b) => b.status === "sold");

  useEffect(() => { fetchBeats(); }, []);

  const deleteBeat = async (id: string) => {
    if (!confirm("Supprimer ce beat définitivement ?")) return;
    await fetch(`/api/beats/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    await fetchBeats();
  };

  const toggleBeatVisible = async (beat: Beat) => {
    const newVisible = beat.visible === false ? true : false;
    await fetch(`/api/beats/${beat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
      body: JSON.stringify({ visible: newVisible }),
    });
    setBeats(prev => prev.map(b => b.id === beat.id ? { ...b, visible: newVisible } : b));
  };

  const handleEdit = (beat: Beat) => {
    setShowForm(false);
    setEditingBeat(beat);
  };

  const handleAdd = () => {
    setEditingBeat(null);
    setShowForm(!showForm);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-mono tracking-widest text-[#00f5ff] uppercase flex items-center gap-2">
          <Music size={14} /> Catalogue beats ({activeBeats.length})
        </h2>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-black text-sm font-bold transition-all hover:scale-105"
          style={{ background: "#b400ff", boxShadow: "0 0 15px rgba(180,0,255,0.3)" }}
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? "Annuler" : "Ajouter un beat"}
        </button>
      </div>

      {showForm && (
        <AddBeatForm genres={genres} onAdded={() => { fetchBeats(); setShowForm(false); }} />
      )}

      {editingBeat && (
        <EditBeatForm
          beat={editingBeat}
          genres={genres}
          onSaved={() => { fetchBeats(); setEditingBeat(null); }}
          onCancel={() => setEditingBeat(null)}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 size={24} className="text-[#b400ff] animate-spin" />
        </div>
      ) : activeBeats.length === 0 ? (
        <div className="text-center py-16 text-neutral-600">
          <Music size={32} className="mx-auto mb-3 opacity-30" />
          <p>Aucun beat actif. Ajoute le premier !</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {activeBeats.slice((activePage - 1) * BEATS_PAGE_SIZE, activePage * BEATS_PAGE_SIZE).map((beat) => (
              <BeatRow
                key={beat.id}
                beat={beat}
                genreColors={Object.fromEntries(genres.map(g => [g.name, g.color]))}
                onEdit={() => handleEdit(beat)}
                onDelete={() => deleteBeat(beat.id)}
                onToggleVisible={() => toggleBeatVisible(beat)}
                editing={editingBeat?.id === beat.id}
              />
            ))}
          </div>
          <Pagination page={activePage} total={activeBeats.length} pageSize={BEATS_PAGE_SIZE} onChange={setActivePage} />
        </>
      )}

      {soldBeats.length > 0 && (
        <div className="mt-10 pt-8 border-t border-[#1a1a1a]">
          <h2 className="text-sm font-mono tracking-widest text-[#39ff14] uppercase flex items-center gap-2 mb-4">
            <BadgeCheck size={14} /> Beats vendus ({soldBeats.length})
          </h2>
          <div className="space-y-3">
            {soldBeats.slice((soldPage - 1) * BEATS_PAGE_SIZE, soldPage * BEATS_PAGE_SIZE).map((beat) => (
              <BeatRow
                key={beat.id}
                beat={beat}
                genreColors={Object.fromEntries(genres.map(g => [g.name, g.color]))}
                onEdit={() => handleEdit(beat)}
                onDelete={() => deleteBeat(beat.id)}
                onToggleVisible={() => toggleBeatVisible(beat)}
                editing={editingBeat?.id === beat.id}
                sold
              />
            ))}
          </div>
          <Pagination page={soldPage} total={soldBeats.length} pageSize={BEATS_PAGE_SIZE} onChange={setSoldPage} />
        </div>
      )}
    </div>
  );
}

function BeatRow({ beat, genreColors, onEdit, onDelete, onToggleVisible, editing, sold }: {
  beat: Beat;
  genreColors: Record<string, string>;
  onEdit: () => void;
  onDelete: () => void;
  onToggleVisible?: () => void;
  editing?: boolean;
  sold?: boolean;
}) {
  const [viewing, setViewing] = useState(false);
  const color = genreColors[beat.genre] ?? "#b400ff";
  const isReserved = beat.status === "reserved";

  const shortName = (path: string | null | undefined) =>
    path ? decodeURIComponent(path.split("/").pop() ?? path).replace(/^(wav|stems|full|kits\/preview|kits\/zip)-\d+-/, "") : null;

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{
        border: editing ? "1px solid #b400ff50" : sold ? "1px solid #39ff1420" : isReserved ? "1px solid #f59e0b30" : viewing ? "1px solid #ffffff18" : "1px solid #2a2a2a",
        opacity: sold ? 0.7 : isReserved ? 0.85 : 1,
        background: editing ? "#b400ff08" : "#111",
      }}
    >
      {/* ── Ligne principale ── */}
      <div className="p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ background: beat.image_url ? undefined : `${color}15`, border: `1px solid ${color}30` }}>
            {beat.image_url
              ? <img src={beat.image_url} alt={beat.title} className="w-full h-full object-cover" />
              : sold ? <BadgeCheck size={16} className="text-[#39ff14]" /> : <Music size={16} style={{ color }} />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-white truncate">{beat.title}</p>
              {isReserved && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: "#f59e0b20", border: "1px solid #f59e0b40", color: "#f59e0b" }}>
                  Réservé
                </span>
              )}
              {sold && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: "#39ff1415", border: "1px solid #39ff1430", color: "#39ff14" }}>
                  Vendu
                </span>
              )}
              {beat.visible === false && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 flex items-center gap-1"
                  style={{ background: "#ff660015", border: "1px solid #ff660040", color: "#ff6600" }}>
                  <EyeOff size={9} /> Masqué
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500 font-mono">
              {beat.genre} · {beat.bpm} BPM
              {beat.key && <span className="text-neutral-400"> · {beat.key}</span>}
              {beat.duration && <span> · {Math.floor(beat.duration / 60)}:{String(beat.duration % 60).padStart(2, "0")}</span>}
              {" · "}<span style={{ color }}>{beat.price}€ MP3</span>
              {beat.wav_extra != null && <span className="text-[#00f5ff]"> · {beat.price + beat.wav_extra}€ WAV</span>}
              {beat.exclusive_price != null && <span className="text-[#f59e0b]"> · {beat.exclusive_price}€ EXCLU</span>}
            </p>
          </div>
        </div>
        {beat.tags && beat.tags.length > 0 && (
          <div className="hidden md:flex gap-1 flex-shrink-0">
            {beat.tags.slice(0, 3).map(t => (
              <span key={t} className="text-xs text-neutral-600 bg-[#1a1a1a] px-2 py-0.5 rounded">#{t}</span>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={onToggleVisible}
            title={beat.visible === false ? "Beat masqué — cliquer pour afficher sur le site" : "Visible — cliquer pour masquer du catalogue"}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={beat.visible === false
              ? { color: "#ff6600", background: "#ff660015" }
              : { color: "#3a3a3a" }
            }
          >
            {beat.visible === false ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
          <button
            onClick={() => setViewing(v => !v)}
            title={viewing ? "Fermer le détail" : "Voir le détail"}
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={viewing ? { color: "#fff", background: "#ffffff10" } : { color: "#555" }}
          >
            <Eye size={14} />
          </button>
          <button
            onClick={onEdit}
            title="Modifier"
            className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
            style={editing ? { color: "#b400ff", background: "#b400ff15" } : { color: "#555" }}
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={onDelete}
            title="Supprimer"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-red-400/10 transition-all"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {/* ── Panneau de détail (lecture seule) ── */}
      {viewing && (
        <div className="border-t border-[#1e1e1e] bg-[#0d0d0d] px-5 py-4 space-y-4">
          <div className="flex gap-5 flex-wrap">

            {/* Infos principales */}
            <div className="flex gap-4 flex-1 min-w-0">
              {beat.image_url && (
                <img src={beat.image_url} alt={beat.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0 border border-[#2a2a2a]" />
              )}
              <div className="min-w-0 space-y-1.5">
                <p className="text-white font-bold text-base">{beat.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                    style={{ color, borderColor: `${color}40`, background: `${color}10` }}>
                    {beat.genre}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500 bg-[#1a1a1a] px-2 py-0.5 rounded-full">
                    {beat.bpm} BPM
                  </span>
                  {beat.key && (
                    <span className="text-[10px] font-mono text-neutral-400 bg-[#1a1a1a] px-2 py-0.5 rounded-full border border-[#2a2a2a]">
                      🎵 {beat.key}
                    </span>
                  )}
                  {beat.duration && (
                    <span className="text-[10px] font-mono text-neutral-400 bg-[#1a1a1a] px-2 py-0.5 rounded-full border border-[#2a2a2a]">
                      ⏱ {Math.floor(beat.duration / 60)}:{String(beat.duration % 60).padStart(2, "0")}
                    </span>
                  )}
                </div>
                {beat.tags && beat.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {beat.tags.map(t => (
                      <span key={t} className="text-[10px] text-neutral-600 bg-[#1a1a1a] px-2 py-0.5 rounded">#{t}</span>
                    ))}
                  </div>
                )}
                {beat.description && (
                  <p className="text-xs text-neutral-400 leading-relaxed">{beat.description}</p>
                )}
              </div>
            </div>

            {/* Tarifs + fichiers */}
            <div className="space-y-3 flex-shrink-0 min-w-[200px]">
              <div>
                <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-1.5">Tarifs</p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-6">
                    <span className="text-xs text-neutral-500 font-mono">MP3</span>
                    <span className="text-xs font-bold" style={{ color }}>{beat.price}€</span>
                  </div>
                  {beat.wav_extra != null && (
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-xs text-neutral-500 font-mono">WAV</span>
                      <span className="text-xs font-bold text-[#00f5ff]">{beat.price + beat.wav_extra}€</span>
                    </div>
                  )}
                  {beat.exclusive_price != null && (
                    <div className="flex items-center justify-between gap-6">
                      <span className="text-xs text-neutral-500 font-mono">EXCLUSIF</span>
                      <span className="text-xs font-bold text-[#f59e0b]">{beat.exclusive_price}€</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-1.5">Fichiers</p>
                <div className="space-y-1.5">
                  {/* MP3 — toujours présent */}
                  <div className="flex items-center gap-2">
                    <FileAudio size={11} className="text-[#b400ff] flex-shrink-0" />
                    <span className="text-[10px] font-mono text-neutral-400 truncate max-w-[150px]" title={beat.full_file_path}>
                      {shortName(beat.full_file_path) ?? "—"}
                    </span>
                    <span className="text-[9px] text-[#39ff14] font-mono ml-auto flex-shrink-0">✓ MP3</span>
                  </div>
                  {/* WAV */}
                  <div className="flex items-center gap-2">
                    <FileAudio size={11} className={beat.wav_file_path ? "text-[#00f5ff]" : "text-neutral-700"} />
                    <span className={`text-[10px] font-mono truncate max-w-[150px] ${beat.wav_file_path ? "text-neutral-400" : "text-neutral-700 italic"}`}
                      title={beat.wav_file_path ?? undefined}>
                      {shortName(beat.wav_file_path) ?? "Aucun fichier WAV"}
                    </span>
                    <span className={`text-[9px] font-mono ml-auto flex-shrink-0 ${beat.wav_file_path ? "text-[#39ff14]" : "text-neutral-700"}`}>
                      {beat.wav_file_path ? "✓ WAV" : "✗ WAV"}
                    </span>
                  </div>
                  {/* ZIP */}
                  <div className="flex items-center gap-2">
                    <FileArchive size={11} className={beat.stems_zip_path ? "text-[#f59e0b]" : "text-neutral-700"} />
                    <span className={`text-[10px] font-mono truncate max-w-[150px] ${beat.stems_zip_path ? "text-neutral-400" : "text-neutral-700 italic"}`}
                      title={beat.stems_zip_path ?? undefined}>
                      {shortName(beat.stems_zip_path) ?? "Aucun ZIP"}
                    </span>
                    <span className={`text-[9px] font-mono ml-auto flex-shrink-0 ${beat.stems_zip_path ? "text-[#39ff14]" : "text-neutral-700"}`}>
                      {beat.stems_zip_path ? "✓ ZIP" : "✗ ZIP"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lecteur extrait */}
          {beat.preview_url && (
            <div>
              <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-1.5">Extrait audio</p>
              <audio src={beat.preview_url} controls className="w-full h-8" />
            </div>
          )}

          {/* Dates */}
          <div className="flex flex-wrap gap-4 border-t border-[#1e1e1e] pt-3">
            <div>
              <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-0.5">Ajouté le</p>
              <p className="text-[10px] font-mono text-neutral-400">
                {new Date(beat.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                {" · "}
                {new Date(beat.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>
            {beat.updated_at && beat.updated_at !== beat.created_at && (
              <div>
                <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-0.5">Modifié le</p>
                <p className="text-[10px] font-mono text-neutral-400">
                  {new Date(beat.updated_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                  {" · "}
                  {new Date(beat.updated_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * FileSlot — affiche clairement l'état d'un fichier uploadé dans le formulaire d'édition.
 * Trois états : fichier existant | nouveau fichier sélectionné | suppression programmée
 */
function FileSlot({
  label,
  accent = "#b400ff",
  existingPath,       // chemin en DB (null si aucun)
  newFile,            // fichier sélectionné localement
  markedForRemoval,   // suppression programmée
  missing,            // requis mais absent
  missingHint,
  inputRef,
  accept,
  onFileChange,
  onReplace,
  onRemove,
  onCancelRemove,
}: {
  label: string;
  accent?: string;
  existingPath: string | null | undefined;
  newFile: File | null;
  markedForRemoval: boolean;
  missing?: boolean;
  missingHint?: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  accept: string;
  onFileChange: (f: File | null) => void;
  onReplace: () => void;
  onRemove: () => void;
  onCancelRemove: () => void;
}) {
  // Nom court depuis le chemin (ex: "wav-1715000000-beat.wav")
  const existingName = existingPath
    ? decodeURIComponent(existingPath.split("/").pop() ?? existingPath).replace(/^(wav|stems|full)-\d+-/, "")
    : null;

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          onFileChange(e.target.files?.[0] ?? null);
          // reset pour permettre re-sélection du même fichier
          e.target.value = "";
        }}
      />

      {/* ── Nouveau fichier sélectionné ── */}
      {newFile && !markedForRemoval && (
        <div className="rounded-xl border p-3 flex items-center gap-3"
          style={{ background: `${accent}0d`, borderColor: `${accent}50` }}>
          <FileCheck size={16} style={{ color: accent }} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono tracking-widest uppercase mb-0.5" style={{ color: accent }}>
              Nouveau fichier · {(newFile.size / 1024 / 1024).toFixed(1)} MB
            </p>
            <p className="text-sm text-white truncate font-mono">{newFile.name}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button type="button" onClick={onReplace} title="Choisir un autre fichier"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all"
              style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}>
              <RefreshCw size={10} /> Changer
            </button>
            <button type="button" onClick={() => onFileChange(null)} title="Annuler"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all border border-[#333] text-neutral-500 hover:text-white">
              <X size={10} /> Annuler
            </button>
          </div>
        </div>
      )}

      {/* ── Fichier existant (pas de nouveau fichier, pas supprimé) ── */}
      {!newFile && existingPath && !markedForRemoval && (
        <div className="rounded-xl border border-[#2a2a2a] p-3 flex items-center gap-3 bg-[#161616]">
          <CheckCircle size={16} style={{ color: accent }} className="flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono tracking-widest uppercase mb-0.5" style={{ color: accent }}>
              {label} · présent
            </p>
            <p className="text-xs text-neutral-400 truncate font-mono">{existingName}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button type="button" onClick={onReplace}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-all"
              style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}40` }}>
              <RefreshCw size={10} /> Remplacer
            </button>
            <button type="button" onClick={onRemove}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono border border-[#333] text-neutral-500 hover:text-red-400 hover:border-red-400/40 transition-all">
              <Trash2 size={10} /> Supprimer
            </button>
          </div>
        </div>
      )}

      {/* ── Aucun fichier existant, rien de sélectionné ── */}
      {!newFile && !existingPath && !markedForRemoval && (
        <div
          onClick={onReplace}
          className="border border-dashed rounded-xl p-4 cursor-pointer transition-colors flex items-center gap-3"
          style={{
            borderColor: missing ? "#ef4444" : "#333",
          }}
        >
          <Upload size={16} style={{ color: `${accent}66` }} className="flex-shrink-0" />
          <span className="text-sm text-neutral-600">Aucun fichier — cliquer pour uploader…</span>
        </div>
      )}

      {/* ── Suppression programmée ── */}
      {markedForRemoval && (
        <div className="rounded-xl border border-red-500/30 p-3 flex items-center gap-3 bg-red-500/5">
          <Trash2 size={16} className="text-red-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono tracking-widest uppercase text-red-400 mb-0.5">Sera supprimé à l'enregistrement</p>
            {existingName && <p className="text-xs text-neutral-600 truncate font-mono">{existingName}</p>}
          </div>
          <button type="button" onClick={onCancelRemove}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-mono border border-[#333] text-neutral-500 hover:text-white transition-all flex-shrink-0">
            <RotateCcw size={10} /> Annuler
          </button>
        </div>
      )}

      {missing && !markedForRemoval && (
        <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
          ⚠ {missingHint ?? "Requis"}
        </p>
      )}
    </div>
  );
}

/** Lecteur audio pour un fichier local (avant upload) */
function LocalFileAudio({ file, accent = "#b400ff" }: { file: File; accent?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    setPlaying(false);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  if (!url) return null;
  return (
    <div className="flex items-center gap-3 bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-3 py-2">
      <button type="button" onClick={toggle}
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
        style={{ background: `${accent}20`, border: `1px solid ${accent}40`, color: accent }}>
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-0.5">Aperçu local</p>
        <p className="text-xs text-neutral-400 truncate font-mono">{file.name}</p>
      </div>
      <audio ref={audioRef} src={url} onEnded={() => setPlaying(false)} className="hidden" />
    </div>
  );
}

/** Formate un nombre de secondes en "m:ss" */
function fmtTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Sélecteur visuel d'intervalle d'extrait.
 * Détecte automatiquement la durée totale du fichier audio.
 */
function PreviewTrimmer({
  file,
  start,
  duration,
  onStartChange,
  onDurationChange,
}: {
  file: File;
  start: number;
  duration: number;
  onStartChange: (v: number) => void;
  onDurationChange: (v: number) => void;
}) {
  const [totalDuration, setTotalDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setTotalDuration(null);
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setTotalDuration(Math.floor(audio.duration));
      setLoading(false);
      URL.revokeObjectURL(url);
    };
    audio.onerror = () => { setLoading(false); URL.revokeObjectURL(url); };
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const total = totalDuration ?? 0;
  const maxStart = Math.max(0, total - 5);
  const maxDuration = total > 0 ? Math.min(120, total - start) : 120;
  const end = start + duration;

  const handleStartChange = (v: number) => {
    const newStart = Math.min(v, maxStart);
    onStartChange(newStart);
    // Si le end dépasse la durée totale, réduire la durée
    if (total > 0 && newStart + duration > total) {
      onDurationChange(Math.max(5, total - newStart));
    }
  };

  const handleDurationChange = (v: number) => {
    const newDur = Math.max(5, Math.min(v, maxDuration));
    onDurationChange(newDur);
  };

  return (
    <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scissors size={13} className="text-[#b400ff]" />
          <span className="text-xs font-mono tracking-widest text-neutral-500 uppercase">Intervalle de l'extrait</span>
        </div>
        {loading ? (
          <span className="text-xs text-neutral-600 font-mono">Analyse…</span>
        ) : total > 0 ? (
          <span className="text-xs text-neutral-500 font-mono">Durée totale : {fmtTime(total)}</span>
        ) : null}
      </div>

      {/* Barre de progression visuelle */}
      <div className="space-y-1">
        <div className="relative h-4 rounded-full bg-[#1a1a1a] overflow-hidden cursor-default">
          {total > 0 && (
            <div
              className="absolute top-0 h-full rounded-full transition-all"
              style={{
                left: `${(start / total) * 100}%`,
                width: `${(Math.min(duration, total - start) / total) * 100}%`,
                background: "linear-gradient(90deg, #b400ff, #00f5ff)",
                boxShadow: "0 0 8px rgba(180,0,255,0.5)",
              }}
            />
          )}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 size={10} className="animate-spin text-neutral-600" />
            </div>
          )}
        </div>
        {total > 0 && (
          <div className="flex justify-between text-[10px] font-mono text-neutral-700">
            <span>0:00</span>
            <span className="text-[#b400ff]">{fmtTime(start)} → {fmtTime(Math.min(end, total))}</span>
            <span>{fmtTime(total)}</span>
          </div>
        )}
      </div>

      {/* Slider Début */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono tracking-widest text-neutral-600 uppercase">Début</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleStartChange(Math.max(0, start - 5))}
              className="w-6 h-6 rounded text-xs font-bold text-neutral-500 bg-[#1a1a1a] hover:text-white hover:bg-[#2a2a2a] transition-all flex items-center justify-center">
              −
            </button>
            <span className="text-sm font-bold text-white font-mono w-12 text-center">{fmtTime(start)}</span>
            <button type="button" onClick={() => handleStartChange(Math.min(maxStart, start + 5))}
              className="w-6 h-6 rounded text-xs font-bold text-neutral-500 bg-[#1a1a1a] hover:text-white hover:bg-[#2a2a2a] transition-all flex items-center justify-center">
              +
            </button>
          </div>
        </div>
        <input
          type="range" min={0} max={maxStart || 300} step={1}
          value={start}
          onChange={(e) => handleStartChange(parseInt(e.target.value))}
          disabled={loading || total === 0}
          className="w-full accent-[#b400ff] disabled:opacity-30"
        />
      </div>

      {/* Slider Durée */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-mono tracking-widest text-neutral-600 uppercase">Durée</label>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => handleDurationChange(Math.max(5, duration - 5))}
              className="w-6 h-6 rounded text-xs font-bold text-neutral-500 bg-[#1a1a1a] hover:text-white hover:bg-[#2a2a2a] transition-all flex items-center justify-center">
              −
            </button>
            <span className="text-sm font-bold text-[#00f5ff] font-mono w-12 text-center">{duration}s</span>
            <button type="button" onClick={() => handleDurationChange(Math.min(maxDuration, duration + 5))}
              className="w-6 h-6 rounded text-xs font-bold text-neutral-500 bg-[#1a1a1a] hover:text-white hover:bg-[#2a2a2a] transition-all flex items-center justify-center">
              +
            </button>
          </div>
        </div>
        <input
          type="range" min={5} max={maxDuration || 120} step={5}
          value={duration}
          onChange={(e) => handleDurationChange(parseInt(e.target.value))}
          disabled={loading || total === 0}
          className="w-full accent-[#00f5ff] disabled:opacity-30"
        />
      </div>

      {/* Résumé */}
      {total > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a]">
          <CheckCircle size={12} className="text-[#39ff14] flex-shrink-0" />
          <p className="text-[11px] font-mono text-neutral-400">
            Extrait de <span className="text-white font-bold">{duration}s</span> · de{" "}
            <span className="text-[#b400ff]">{fmtTime(start)}</span> à{" "}
            <span className="text-[#00f5ff]">{fmtTime(Math.min(end, total))}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function EditBeatForm({ beat, genres, onSaved, onCancel }: {
  beat: Beat;
  genres: GenreConfig[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: beat.title,
    genre: beat.genre,
    bpm: String(beat.bpm),
    price: String(beat.price),
    wav_extra: beat.wav_extra != null ? String(beat.wav_extra) : "",
    exclusive_price: beat.exclusive_price != null ? String(beat.exclusive_price) : "",
    tags: (beat.tags ?? []).join(", "),
    description: beat.description ?? "",
    key: beat.key ?? "",
    duration: beat.duration != null ? String(beat.duration) : "",
  });
  const [coverPicker, setCoverPicker] = useState<CoverPickerResult>(
    beat.image_url ? { type: "url", url: beat.image_url } : null
  );
  const [newFullFile, setNewFullFile] = useState<File | null>(null);
  const [newWavFile, setNewWavFile] = useState<File | null>(null);
  const [removeWav, setRemoveWav] = useState(false);
  const [newZipFile, setNewZipFile] = useState<File | null>(null);
  const [removeZip, setRemoveZip] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimDuration, setTrimDuration] = useState(30);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fullRef = useRef<HTMLInputElement>(null);
  const wavRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  // Auto-détection de la durée quand un nouveau fichier MP3 est sélectionné
  useEffect(() => {
    if (!newFullFile) return;
    const url = URL.createObjectURL(newFullFile);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setForm(f => ({ ...f, duration: String(Math.round(audio.duration)) }));
      URL.revokeObjectURL(url);
    };
    return () => URL.revokeObjectURL(url);
  }, [newFullFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    setError("");

    try {
      const hasWav = !!(newWavFile || (beat.wav_file_path && !removeWav));
      const hasZip = !!(newZipFile || (beat.stems_zip_path && !removeZip));

      if (form.wav_extra && !hasWav) {
        setStatus("error");
        setError("Un fichier WAV est requis car un prix WAV est renseigné.");
        return;
      }
      if (form.exclusive_price && !hasWav) {
        setStatus("error");
        setError("Un fichier WAV est requis pour proposer la licence exclusive.");
        return;
      }
      // ZIP optionnel pour l'exclusif — peut être ajouté et renvoyé à la demande

      const token = getToken();

      const update: Record<string, unknown> = {
        title: form.title.toUpperCase(),
        genre: form.genre,
        bpm: parseInt(form.bpm),
        price: parseFloat(form.price),
        wav_extra: form.wav_extra ? parseInt(form.wav_extra) : null,
        exclusive_price: form.exclusive_price ? parseInt(form.exclusive_price) : null,
        tags: form.tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean),
        description: form.description || null,
        key: form.key.trim() || null,
        duration: form.duration ? parseInt(form.duration) : null,
      };

      // Cover
      const isUrlFromLibrary = (url: string) => !url.includes("/covers/library-") && url.startsWith("http");
      if (coverPicker?.type === "file") {
        // Nouvelle image depuis le PC
        setProgress("Upload de la cover…");
        const coverName = `${Date.now()}-cover-${coverPicker.file.name.replace(/\s+/g, "-")}`;
        const coverPresignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ coverName }),
        });
        const coverPresign = await coverPresignRes.json();
        if (!coverPresignRes.ok) throw new Error(coverPresign.error);
        const uploadRes = await fetch(coverPresign.coverSignedUrl, {
          method: "PUT",
          headers: { "Content-Type": coverPicker.file.type || "image/jpeg" },
          body: coverPicker.file,
        });
        if (!uploadRes.ok) throw new Error(`Cover : ${uploadRes.statusText}`);
        update.image_url = coverPresign.coverPublicUrl;
      } else if (coverPicker?.type === "url" && coverPicker.url !== beat.image_url) {
        update.image_url = coverPicker.url;
      } else if (coverPicker === null && beat.image_url) {
        update.image_url = null;
      }
      void isUrlFromLibrary; // unused helper suppressed

      // Audio MP3 : nouveau fichier complet + nouveau preview
      if (newFullFile) {
        const baseName = `${Date.now()}-${newFullFile.name.replace(/\s+/g, "-")}`;
        const previewName = baseName.replace(/\.[^.]+$/, "") + "-preview.wav";
        const fullName = "full-" + baseName;

        setProgress("Génération de l'extrait…");
        const previewBlob = await trimAudioToWav(newFullFile, trimDuration, trimStart);

        setProgress("Préparation de l'upload…");
        const presignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ previewName, fullName }),
        });
        const presign = await presignRes.json();
        if (!presignRes.ok) throw new Error(presign.error);

        setProgress("Upload de l'extrait…");
        const prevUpload = await fetch(presign.previewSignedUrl, {
          method: "PUT",
          headers: { "Content-Type": "audio/wav" },
          body: previewBlob,
        });
        if (!prevUpload.ok) throw new Error(`Extrait : ${prevUpload.statusText}`);

        setProgress("Upload du fichier MP3…");
        const fullUpload = await fetch(presign.fullSignedUrl, {
          method: "PUT",
          headers: { "Content-Type": newFullFile.type || "audio/mpeg" },
          body: newFullFile,
        });
        if (!fullUpload.ok) throw new Error(`Fichier MP3 : ${fullUpload.statusText}`);

        update.preview_url = presign.previewPublicUrl;
        update.full_file_path = fullName;
      }

      // Audio WAV haute qualité (optionnel)
      if (newWavFile) {
        const wavName = `wav-${Date.now()}-${newWavFile.name.replace(/\s+/g, "-")}`;
        const wavPresignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ wavName }),
        });
        const wavPresign = await wavPresignRes.json();
        if (!wavPresignRes.ok) throw new Error(wavPresign.error);

        setProgress("Upload du fichier WAV…");
        const wavUpload = await fetch(wavPresign.wavSignedUrl, {
          method: "PUT",
          headers: { "Content-Type": "audio/wav" },
          body: newWavFile,
        });
        if (!wavUpload.ok) throw new Error(`Fichier WAV : ${wavUpload.statusText}`);

        update.wav_file_path = wavName;
      } else if (removeWav) {
        update.wav_file_path = null;
      }

      // ZIP des pistes (optionnel)
      if (newZipFile) {
        const zipName = `stems-${Date.now()}-${newZipFile.name.replace(/\s+/g, "-")}`;
        const zipPresignRes = await fetch("/api/upload/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ zipName }),
        });
        const zipPresign = await zipPresignRes.json();
        if (!zipPresignRes.ok) throw new Error(zipPresign.error);

        setProgress("Upload du ZIP des pistes…");
        const zipUpload = await fetch(zipPresign.zipSignedUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/zip" },
          body: newZipFile,
        });
        if (!zipUpload.ok) throw new Error(`ZIP pistes : ${zipUpload.statusText}`);

        update.stems_zip_path = zipName;
      } else if (removeZip) {
        update.stems_zip_path = null;
      }

      setProgress("Enregistrement…");
      const saveRes = await fetch(`/api/beats/${beat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify(update),
      });
      if (!saveRes.ok) {
        const d = await saveRes.json();
        throw new Error(d.error ?? "Erreur serveur");
      }

      setStatus("success");
      setTimeout(() => onSaved(), 700);
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  const wavRequired = !!(form.wav_extra || form.exclusive_price);
  const hasWavVisual = !!(newWavFile || (beat.wav_file_path && !removeWav));
  const wavMissing = wavRequired && !hasWavVisual;
  const hasZipVisual = !!(newZipFile || (beat.stems_zip_path && !removeZip));
  const zipMissing = false; // ZIP toujours optionnel, ajout possible à la demande

  return (
    <div className="bg-[#0d0d0d] border border-[#b400ff]/30 rounded-2xl p-5 mb-6"
      style={{ boxShadow: "0 0 30px rgba(180,0,255,0.08)" }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-mono tracking-widest text-[#b400ff] uppercase">◆ Modifier · {beat.title}</h3>
        <button onClick={onCancel} className="text-neutral-600 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {status === "success" ? (
        <div className="text-center py-6">
          <CheckCircle size={36} className="mx-auto mb-2 text-[#39ff14]" />
          <p className="text-white font-bold">Beat mis à jour !</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Titre</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors uppercase"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Genre</label>
              <select
                value={form.genre}
                onChange={(e) => setForm(f => ({ ...f, genre: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
              >
                {genres.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">BPM</label>
              <input required type="number" min="60" max="200" value={form.bpm}
                onChange={(e) => setForm(f => ({ ...f, bpm: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Tonalité</label>
              <input
                list="keys-edit"
                value={form.key}
                onChange={(e) => setForm(f => ({ ...f, key: e.target.value }))}
                placeholder="ex: Am, C#m, F maj…"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors font-mono"
              />
              <datalist id="keys-edit">
                {["Am","A#m","Bm","Cm","C#m","Dm","D#m","Em","Fm","F#m","Gm","G#m",
                  "A maj","A# maj","B maj","C maj","C# maj","D maj","D# maj","E maj","F maj","F# maj","G maj","G# maj"].map(k => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">
                Durée <span className="text-neutral-700 normal-case">— pré-remplie à l'upload</span>
              </label>
              <div className="relative">
                <input
                  type="number" min="1" value={form.duration}
                  onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))}
                  placeholder="secondes"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-16 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                />
                {form.duration && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-mono pointer-events-none">
                    {Math.floor(parseInt(form.duration) / 60)}:{String(parseInt(form.duration) % 60).padStart(2, "0")}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Prix MP3 (€)</label>
              <input required type="number" min="1" step="0.01" value={form.price}
                onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Supplément WAV (€) <span className="text-neutral-700 normal-case">— vide = désactivé</span></label>
              <input type="number" min="0" step="1" value={form.wav_extra}
                onChange={(e) => setForm(f => ({ ...f, wav_extra: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00f5ff] transition-colors"
                placeholder="ex: 20"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Prix exclusif (€) <span className="text-neutral-700 normal-case">— vide = désactivé</span></label>
              <input type="number" min="1" step="1" value={form.exclusive_price}
                onChange={(e) => setForm(f => ({ ...f, exclusive_price: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f59e0b] transition-colors"
                placeholder="ex: 150"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Tags (séparés par des virgules)</label>
              <input value={form.tags}
                onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                placeholder="dark, lourd, 808"
              />
            </div>
          </div>

          {/* Cover */}
          <CoverPicker
            label="Visuel / Cover (optionnel)"
            value={coverPicker}
            onChange={setCoverPicker}
          />

          {/* ── Fichier MP3 principal ── */}
          <div className="space-y-2">
            <label className="block text-xs text-neutral-500 tracking-widest uppercase">
              Fichier MP3 <span className="text-neutral-700 normal-case">— licence de base · laisse vide pour conserver l'actuel</span>
            </label>
            <FileSlot
              label="MP3"
              accent="#b400ff"
              existingPath={beat.full_file_path}
              newFile={newFullFile}
              markedForRemoval={false}
              inputRef={fullRef}
              accept=".mp3,.wav,.aiff,.m4a,.aac,.flac,audio/*"
              onFileChange={setNewFullFile}
              onReplace={() => fullRef.current?.click()}
              onRemove={() => {}}       // le MP3 ne peut pas être supprimé
              onCancelRemove={() => {}}
            />
            <input ref={fullRef} type="file" accept=".mp3,.wav,.aiff,.m4a,.aac,.flac,audio/*"
              className="hidden" onChange={(e) => setNewFullFile(e.target.files?.[0] ?? null)} />
            {newFullFile && (
              <div className="mt-2">
                <LocalFileAudio file={newFullFile} accent="#b400ff" />
              </div>
            )}
            {!newFullFile && beat.preview_url && (
              <div className="mt-2">
                <p className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase mb-1">Extrait actuel</p>
                <audio src={beat.preview_url} controls className="w-full h-8" />
              </div>
            )}
            {newFullFile && (
              <PreviewTrimmer
                file={newFullFile}
                start={trimStart}
                duration={trimDuration}
                onStartChange={setTrimStart}
                onDurationChange={setTrimDuration}
              />
            )}
          </div>

          {/* ── Fichier WAV haute qualité ── */}
          <div className="space-y-2">
            <label className="block text-xs text-neutral-500 tracking-widest uppercase">
              Fichier WAV <span className="text-[#00f5ff]/60 normal-case">— licences WAV &amp; exclusif</span>
            </label>
            <FileSlot
              label="WAV"
              accent="#00f5ff"
              existingPath={beat.wav_file_path}
              newFile={newWavFile}
              markedForRemoval={removeWav}
              missing={wavMissing}
              missingHint="Requis — prix WAV ou exclusif renseigné"
              inputRef={wavRef}
              accept=".wav,.aiff,.flac,audio/wav,audio/x-wav"
              onFileChange={(f) => { setNewWavFile(f); setRemoveWav(false); }}
              onReplace={() => wavRef.current?.click()}
              onRemove={() => { setNewWavFile(null); setRemoveWav(true); }}
              onCancelRemove={() => setRemoveWav(false)}
            />
            <input ref={wavRef} type="file" accept=".wav,.aiff,.flac,audio/wav,audio/x-wav"
              className="hidden" onChange={(e) => { setNewWavFile(e.target.files?.[0] ?? null); setRemoveWav(false); }} />
          </div>

          {/* ── ZIP des pistes — licence exclusive ── */}
          <div className="space-y-2">
            <label className="block text-xs text-neutral-500 tracking-widest uppercase">
              ZIP pistes <span className="text-[#f59e0b]/60 normal-case">— exclusif · optionnel, envoi à la demande</span>
            </label>
            <FileSlot
              label="ZIP"
              accent="#f59e0b"
              existingPath={beat.stems_zip_path}
              newFile={newZipFile}
              markedForRemoval={removeZip}
              missing={zipMissing}
              missingHint="Optionnel — peut être ajouté et envoyé à la demande"
              inputRef={zipRef}
              accept=".zip,application/zip,application/x-zip-compressed"
              onFileChange={(f) => { setNewZipFile(f); setRemoveZip(false); }}
              onReplace={() => zipRef.current?.click()}
              onRemove={() => { setNewZipFile(null); setRemoveZip(true); }}
              onCancelRemove={() => setRemoveZip(false)}
            />
            <input ref={zipRef} type="file" accept=".zip,application/zip,application/x-zip-compressed"
              className="hidden" onChange={(e) => { setNewZipFile(e.target.files?.[0] ?? null); setRemoveZip(false); }} />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={onCancel}
              className="flex-1 h-11 rounded-xl font-bold text-sm border border-[#2a2a2a] text-neutral-500 hover:text-white hover:border-[#444] transition-all">
              Annuler
            </button>
            <button type="submit" disabled={status === "saving"}
              className="flex-1 h-11 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:scale-[1.01]"
              style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px rgba(180,0,255,0.3)" }}>
              {status === "saving"
                ? <><Loader2 size={15} className="animate-spin" />{progress || "Enregistrement…"}</>
                : <><CheckCircle size={15} />Enregistrer</>
              }
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function AddBeatForm({ genres, onAdded }: { genres: GenreConfig[]; onAdded: () => void }) {
  const [form, setForm] = useState({
    title: "", genre: genres[0]?.name ?? "Trap", bpm: "140", price: "35",
    wav_extra: "", exclusive_price: "", tags: "", description: "", key: "", duration: "",
  });
  const [fullFile, setFullFile] = useState<File | null>(null);
  const [wavFile, setWavFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [coverPicker, setCoverPicker] = useState<CoverPickerResult>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimDuration, setTrimDuration] = useState(30);
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const fullRef = useRef<HTMLInputElement>(null);
  const wavRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);

  // Auto-détection de la durée dès que le fichier MP3 est sélectionné
  useEffect(() => {
    if (!fullFile) { setForm(f => ({ ...f, duration: "" })); return; }
    const url = URL.createObjectURL(fullFile);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setForm(f => ({ ...f, duration: String(Math.round(audio.duration)) }));
      URL.revokeObjectURL(url);
    };
    return () => URL.revokeObjectURL(url);
  }, [fullFile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullFile) { setError("Le fichier audio est requis."); return; }
    if (form.wav_extra && !wavFile) {
      setError("Un fichier WAV est requis car un prix WAV est renseigné.");
      return;
    }
    if (form.exclusive_price && !wavFile) {
      setError("Un fichier WAV est requis pour proposer la licence exclusive.");
      return;
    }
    // ZIP optionnel pour l'exclusif — peut être uploadé et renvoyé à la demande
    setStatus("uploading");
    setError("");

    try {
      const token = getToken();
      const baseName = `${Date.now()}-${fullFile.name.replace(/\s+/g, "-")}`;
      const previewName = baseName.replace(/\.[^.]+$/, "") + "-preview.wav";
      const fullName = "full-" + baseName;

      setProgress("Génération de l'extrait…");
      const previewBlob = await trimAudioToWav(fullFile, trimDuration, trimStart);

      setProgress("Préparation de l'upload…");
      const coverFile = coverPicker?.type === "file" ? coverPicker.file : null;
      const coverName = coverFile
        ? `${Date.now()}-cover-${coverFile.name.replace(/\s+/g, "-")}`
        : null;
      const wavName = wavFile ? `wav-${Date.now()}-${wavFile.name.replace(/\s+/g, "-")}` : null;
      const zipName = zipFile ? `stems-${Date.now()}-${zipFile.name.replace(/\s+/g, "-")}` : null;
      const presignRes = await fetch("/api/upload/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ previewName, fullName, wavName, zipName, coverName }),
      });
      const presign = await presignRes.json();
      if (!presignRes.ok) throw new Error(presign.error);

      setProgress("Upload de l'extrait…");
      const prevUpload = await fetch(presign.previewSignedUrl, {
        method: "PUT",
        headers: { "Content-Type": "audio/wav" },
        body: previewBlob,
      });
      if (!prevUpload.ok) throw new Error(`Extrait : ${prevUpload.statusText}`);

      setProgress("Upload du fichier MP3…");
      const fullUpload = await fetch(presign.fullSignedUrl, {
        method: "PUT",
        headers: { "Content-Type": fullFile.type || "audio/mpeg" },
        body: fullFile,
      });
      if (!fullUpload.ok) throw new Error(`Fichier MP3 : ${fullUpload.statusText}`);

      if (wavFile && presign.wavSignedUrl) {
        setProgress("Upload du fichier WAV…");
        const wavUpload = await fetch(presign.wavSignedUrl, {
          method: "PUT",
          headers: { "Content-Type": "audio/wav" },
          body: wavFile,
        });
        if (!wavUpload.ok) throw new Error(`Fichier WAV : ${wavUpload.statusText}`);
      }

      if (zipFile && presign.zipSignedUrl) {
        setProgress("Upload du ZIP des pistes…");
        const zipUpload = await fetch(presign.zipSignedUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/zip" },
          body: zipFile,
        });
        if (!zipUpload.ok) throw new Error(`ZIP pistes : ${zipUpload.statusText}`);
      }

      let imageUrl: string | null = null;
      if (coverPicker?.type === "url") {
        // URL directe depuis la bibliothèque
        imageUrl = coverPicker.url;
      } else if (coverFile && presign.coverSignedUrl) {
        setProgress("Upload de la cover…");
        const coverUpload = await fetch(presign.coverSignedUrl, {
          method: "PUT",
          headers: { "Content-Type": coverFile.type || "image/jpeg" },
          body: coverFile,
        });
        if (!coverUpload.ok) throw new Error(`Cover : ${coverUpload.statusText}`);
        imageUrl = presign.coverPublicUrl;
      }

      setProgress("Enregistrement…");
      const tags = form.tags.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
      const saveRes = await fetch("/api/beats", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title.toUpperCase(),
          genre: form.genre,
          bpm: parseInt(form.bpm),
          price: parseFloat(form.price),
          wav_extra: form.wav_extra ? parseInt(form.wav_extra) : null,
          exclusive_price: form.exclusive_price ? parseInt(form.exclusive_price) : null,
          preview_url: presign.previewPublicUrl,
          full_file_path: fullName,
          wav_file_path: wavName ?? null,
          stems_zip_path: zipName ?? null,
          image_url: imageUrl,
          description: form.description || null,
          tags: tags.length > 0 ? tags : null,
          key: form.key.trim() || null,
          duration: form.duration ? parseInt(form.duration) : null,
        }),
      });
      if (!saveRes.ok) {
        const d = await saveRes.json();
        throw new Error(d.error ?? "Erreur serveur");
      }

      setStatus("success");
      setTimeout(() => onAdded(), 800);
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  };

  const wavRequired = !!(form.wav_extra || form.exclusive_price);
  const wavMissing = wavRequired && !wavFile;
  const zipMissing = false; // ZIP toujours optionnel, ajout possible à la demande

  return (
    <div className="bg-[#0d0d0d] border border-[#b400ff]/30 rounded-2xl p-5 mb-6"
      style={{ boxShadow: "0 0 30px rgba(180,0,255,0.08)" }}>
      <h3 className="text-sm font-mono tracking-widest text-[#b400ff] uppercase mb-5">◆ Nouveau beat</h3>

      {status === "success" ? (
        <div className="text-center py-6">
          <CheckCircle size={36} className="mx-auto mb-2 text-[#39ff14]" />
          <p className="text-white font-bold">Beat ajouté avec succès !</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Titre du beat</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors uppercase"
                placeholder="SHADOW ZONE"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Genre</label>
              <select
                value={form.genre}
                onChange={(e) => setForm(f => ({ ...f, genre: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
              >
                {genres.map(g => <option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">BPM</label>
              <input required type="number" min="60" max="200" value={form.bpm}
                onChange={(e) => setForm(f => ({ ...f, bpm: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Tonalité</label>
              <input
                list="keys-add"
                value={form.key}
                onChange={(e) => setForm(f => ({ ...f, key: e.target.value }))}
                placeholder="ex: Am, C#m, F maj…"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors font-mono"
              />
              <datalist id="keys-add">
                {["Am","A#m","Bm","Cm","C#m","Dm","D#m","Em","Fm","F#m","Gm","G#m",
                  "A maj","A# maj","B maj","C maj","C# maj","D maj","D# maj","E maj","F maj","F# maj","G maj","G# maj"].map(k => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">
                Durée <span className="text-neutral-700 normal-case">— pré-remplie à l'upload</span>
              </label>
              <div className="relative">
                <input
                  type="number" min="1" value={form.duration}
                  onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))}
                  placeholder={fullFile ? "Détection…" : "secondes"}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-16 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                />
                {form.duration && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-500 font-mono pointer-events-none">
                    {Math.floor(parseInt(form.duration) / 60)}:{String(parseInt(form.duration) % 60).padStart(2, "0")}
                  </span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Prix MP3 (€)</label>
              <input required type="number" min="1" step="0.01" value={form.price}
                onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Supplément WAV (€) <span className="text-neutral-700 normal-case">— vide = désactivé</span></label>
              <input type="number" min="0" step="1" value={form.wav_extra}
                onChange={(e) => setForm(f => ({ ...f, wav_extra: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#00f5ff] transition-colors"
                placeholder="ex: 20"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Prix exclusif (€) <span className="text-neutral-700 normal-case">— vide = désactivé</span></label>
              <input type="number" min="1" step="1" value={form.exclusive_price}
                onChange={(e) => setForm(f => ({ ...f, exclusive_price: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#f59e0b] transition-colors"
                placeholder="ex: 150"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">Tags (séparés par des virgules)</label>
              <input value={form.tags} onChange={(e) => setForm(f => ({ ...f, tags: e.target.value }))}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                placeholder="dark, lourd, 808"
              />
            </div>
          </div>

          <CoverPicker
            label="Visuel / Cover (optionnel · JPG, PNG)"
            value={coverPicker}
            onChange={setCoverPicker}
          />

          {/* Fichier MP3 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-neutral-500 tracking-widest uppercase">
                Fichier MP3 <span className="text-neutral-700 normal-case">— licence de base</span>
              </label>
              {fullFile && (
                <span className="text-xs text-neutral-600 font-mono">
                  {(fullFile.size / 1024 / 1024).toFixed(1)} MB
                </span>
              )}
            </div>
            <div
              onClick={() => fullRef.current?.click()}
              className="border border-dashed border-[#2a2a2a] hover:border-[#b400ff]/50 rounded-xl p-4 cursor-pointer transition-colors flex items-center gap-3"
            >
              <Upload size={18} className="text-neutral-500 flex-shrink-0" />
              <span className="text-sm">
                {fullFile
                  ? <span className="text-[#b400ff]">{fullFile.name}</span>
                  : <span className="text-neutral-500">Clique pour choisir le fichier MP3…</span>
                }
              </span>
            </div>
            <input ref={fullRef} type="file"
              accept=".mp3,.aac,.m4a,audio/*"
              className="hidden"
              onChange={(e) => setFullFile(e.target.files?.[0] ?? null)} />
            {fullFile && (
              <div className="mt-2">
                <LocalFileAudio file={fullFile} accent="#b400ff" />
              </div>
            )}
          </div>

          {/* Fichier WAV haute qualité */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-neutral-500 tracking-widest uppercase">
                Fichier WAV <span className="text-[#00f5ff]/60 text-[10px] normal-case">— licences WAV &amp; exclusif</span>
              </label>
              {wavFile && (
                <span className="text-xs text-neutral-600 font-mono">
                  {(wavFile.size / 1024 / 1024).toFixed(1)} MB
                </span>
              )}
            </div>
            <div
              onClick={() => wavRef.current?.click()}
              className="border border-dashed border-[#2a2a2a] hover:border-[#00f5ff]/50 rounded-xl p-4 cursor-pointer transition-colors flex items-center gap-3"
              style={{ borderColor: wavMissing ? "#ef4444" : undefined, borderStyle: "dashed" }}
            >
              <Upload size={18} className="text-[#00f5ff]/40 flex-shrink-0" />
              <span className="text-sm">
                {wavFile
                  ? <span className="text-[#00f5ff]">{wavFile.name}</span>
                  : <span className="text-neutral-600">Fichier WAV 44.1kHz haute qualité (optionnel)</span>
                }
              </span>
            </div>
            {wavMissing && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                ⚠ Requis — prix WAV ou exclusif renseigné
              </p>
            )}
            {wavFile && (
              <button type="button" onClick={() => setWavFile(null)}
                className="mt-1 text-xs text-neutral-600 hover:text-red-400 transition-colors">
                × Supprimer
              </button>
            )}
            <input ref={wavRef} type="file"
              accept=".wav,.aiff,.flac,audio/wav,audio/x-wav"
              className="hidden"
              onChange={(e) => setWavFile(e.target.files?.[0] ?? null)} />
          </div>

          {/* ZIP des pistes — licence exclusive */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs text-neutral-500 tracking-widest uppercase">
                ZIP pistes <span className="text-[#f59e0b]/60 text-[10px] normal-case">— licence exclusive</span>
              </label>
              {zipFile && (
                <span className="text-xs text-neutral-600 font-mono">
                  {(zipFile.size / 1024 / 1024).toFixed(1)} MB
                </span>
              )}
            </div>
            <div
              onClick={() => zipRef.current?.click()}
              className="border border-dashed border-[#2a2a2a] hover:border-[#f59e0b]/50 rounded-xl p-4 cursor-pointer transition-colors flex items-center gap-3"
              style={{ borderColor: zipMissing ? "#ef4444" : undefined, borderStyle: "dashed" }}
            >
              <Upload size={18} className="text-[#f59e0b]/40 flex-shrink-0" />
              <span className="text-sm">
                {zipFile
                  ? <span className="text-[#f59e0b]">{zipFile.name}</span>
                  : <span className="text-neutral-600">ZIP contenant toutes les pistes (optionnel)</span>
                }
              </span>
            </div>
            {zipMissing && (
              <p className="text-xs text-red-400 mt-1.5 flex items-center gap-1">
                ⚠ Requis — prix exclusif renseigné
              </p>
            )}
            {zipFile && (
              <button type="button" onClick={() => setZipFile(null)}
                className="mt-1 text-xs text-neutral-600 hover:text-red-400 transition-colors">
                × Supprimer
              </button>
            )}
            <input ref={zipRef} type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="hidden"
              onChange={(e) => setZipFile(e.target.files?.[0] ?? null)} />
          </div>

          {fullFile ? (
            <PreviewTrimmer
              file={fullFile}
              start={trimStart}
              duration={trimDuration}
              onStartChange={setTrimStart}
              onDurationChange={setTrimDuration}
            />
          ) : (
            <div className="bg-[#0d0d0d] border border-[#2a2a2a] rounded-xl px-4 py-3 flex items-center gap-3 opacity-40">
              <Scissors size={13} className="text-[#b400ff]" />
              <span className="text-xs font-mono text-neutral-600">Sélectionne un fichier MP3 pour configurer l'intervalle de l'extrait</span>
            </div>
          )}

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={status === "uploading"}
            className="w-full h-12 rounded-xl font-bold text-sm text-black flex items-center justify-center gap-2 disabled:opacity-60 transition-all hover:scale-[1.01]"
            style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px rgba(180,0,255,0.3)" }}
          >
            {status === "uploading"
              ? <><Loader2 size={16} className="animate-spin" />{progress}</>
              : <><Plus size={16} />Publier le beat</>
            }
          </button>
        </form>
      )}
    </div>
  );
}
