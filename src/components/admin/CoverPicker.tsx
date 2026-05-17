"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, ImageIcon, X } from "lucide-react";

export type CoverPickerResult =
  | { type: "file"; file: File; preview: string }
  | { type: "url"; url: string }
  | null;

interface Props {
  value: CoverPickerResult;
  onChange: (val: CoverPickerResult) => void;
  label?: string;
}

export default function CoverPicker({ value, onChange, label }: Props) {
  const [tab, setTab] = useState<"pc" | "library">("pc");
  const [library, setLibrary] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings/covers")
      .then(r => r.json())
      .then(d => setLibrary(d.urls ?? []))
      .catch(() => {});
  }, []);

  const previewUrl =
    value?.type === "file" ? value.preview :
    value?.type === "url" ? value.url :
    null;

  const handleFile = (file: File | null) => {
    if (!file) { onChange(null); return; }
    onChange({ type: "file", file, preview: URL.createObjectURL(file) });
  };

  const handleLibraryPick = (url: string) => {
    if (value?.type === "url" && value.url === url) { onChange(null); return; }
    onChange({ type: "url", url });
  };

  return (
    <div>
      {label !== undefined && (
        <label className="block text-xs text-neutral-500 mb-1.5 tracking-widest uppercase">
          {label}
        </label>
      )}

      <div className="flex gap-3 items-start">
        {/* Aperçu carré */}
        <div className="relative w-20 h-20 rounded-xl border border-[#2a2a2a] overflow-hidden flex-shrink-0 bg-[#1a1a1a] flex items-center justify-center">
          {previewUrl
            ? <img src={previewUrl} alt="cover" className="w-full h-full object-cover" />
            : <ImageIcon size={20} className="text-neutral-700" />
          }
          {previewUrl && (
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-500/80 transition-colors"
            >
              <X size={10} className="text-white" />
            </button>
          )}
        </div>

        {/* Panneau droit */}
        <div className="flex-1 min-w-0">
          {/* Onglets */}
          <div className="flex gap-1 mb-2">
            {([
              { id: "pc"      as const, label: "Mon PC" },
              { id: "library" as const, label: `Bibliothèque${library.length ? ` (${library.length})` : ""}` },
            ]).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all"
                style={tab === t.id
                  ? { background: "#b400ff", color: "#fff" }
                  : { background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Onglet PC */}
          {tab === "pc" && (
            <div>
              <div
                onClick={() => fileRef.current?.click()}
                className="border border-dashed border-[#2a2a2a] hover:border-[#b400ff]/50 rounded-xl p-3 cursor-pointer transition-colors flex items-center gap-2"
              >
                <Upload size={14} className="text-neutral-600 flex-shrink-0" />
                <span className="text-sm truncate">
                  {value?.type === "file"
                    ? <span className="text-[#b400ff]">{value.file.name}</span>
                    : <span className="text-neutral-500">
                        {previewUrl ? "Cliquer pour remplacer…" : "Cliquer pour ajouter une cover…"}
                      </span>
                  }
                </span>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic,image/*"
                className="hidden"
                onChange={e => { handleFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
              />
            </div>
          )}

          {/* Onglet Bibliothèque */}
          {tab === "library" && (
            library.length === 0 ? (
              <p className="text-xs text-neutral-600 py-3 text-center border border-dashed border-[#2a2a2a] rounded-xl">
                Bibliothèque vide — ajoute des images dans Admin → Site.
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto">
                {library.map((url) => {
                  const selected = value?.type === "url" && value.url === url;
                  return (
                    <button
                      key={url}
                      type="button"
                      onClick={() => handleLibraryPick(url)}
                      title={selected ? "Cliquer pour désélectionner" : "Sélectionner"}
                      className="aspect-square rounded-lg overflow-hidden border-2 transition-all"
                      style={{ borderColor: selected ? "#b400ff" : "transparent", outline: selected ? "1px solid #b400ff" : "none" }}
                    >
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover transition-opacity"
                        style={{ opacity: selected ? 1 : 0.65 }}
                      />
                    </button>
                  );
                })}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
