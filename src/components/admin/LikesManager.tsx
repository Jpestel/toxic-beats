"use client";

import { useState, useEffect, useCallback } from "react";
import { Heart, Loader2, CheckCircle } from "lucide-react";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("toxic_auth_token") : null;
}

export default function LikesManager() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/settings/likes");
    const data = await res.json();
    setEnabled(!!data.enabled);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings/likes", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ enabled }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Heart size={18} style={{ color: "#ff6b6b" }} />
        <h2 className="text-lg font-bold text-white font-mono tracking-widest uppercase">
          Likes / Réactions
        </h2>
      </div>

      <p className="text-sm text-neutral-500 font-mono">
        Active le bouton ❤️ sur les beats et les kits. Les visiteurs peuvent liker leurs extraits préférés.
      </p>

      {loading ? (
        <div className="text-center py-8 text-neutral-500 font-mono text-sm">Chargement…</div>
      ) : (
        <div
          className="flex items-center justify-between px-4 py-4 rounded-xl border cursor-pointer transition-colors"
          style={enabled
            ? { background: "#ff6b6b0a", borderColor: "#ff6b6b30" }
            : { background: "#0d0d0d", borderColor: "#2a2a2a" }}
          onClick={() => { setEnabled(v => !v); setSaved(false); }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">❤️</span>
            <div>
              <p className="text-sm font-bold text-white">Bouton like activé</p>
              <p className="text-[10px] text-neutral-600 font-mono">
                {enabled ? "Les visiteurs peuvent liker beats & kits" : "Aucun bouton like affiché sur le site"}
              </p>
            </div>
          </div>
          <div className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0"
            style={{ background: enabled ? "#ff6b6b" : "#2a2a2a" }}>
            <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: enabled ? "22px" : "2px" }} />
          </div>
        </div>
      )}

      <button
        onClick={save}
        disabled={saving || loading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#ff6b6b,#cc4444)", color: "#fff" }}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Heart size={14} />}
        {saved ? "Sauvegardé !" : "Sauvegarder"}
      </button>
    </div>
  );
}
