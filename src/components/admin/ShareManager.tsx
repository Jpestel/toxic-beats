"use client";

import { useState, useEffect, useCallback } from "react";
import { Share2, Loader2, CheckCircle } from "lucide-react";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("toxic_auth_token") : null;
}

type Network = {
  id: string;
  label: string;
  icon: string;
  description: string;
};

const NETWORKS: Network[] = [
  { id: "whatsapp",  label: "WhatsApp",      icon: "💬", description: "Partage via WhatsApp" },
  { id: "twitter",   label: "X / Twitter",   icon: "𝕏",  description: "Tweet avec lien et titre" },
  { id: "facebook",  label: "Facebook",      icon: "📘", description: "Partage sur Facebook" },
  { id: "sms",       label: "SMS",           icon: "📱", description: "Envoyer par SMS" },
  { id: "copy",      label: "Copier le lien",icon: "🔗", description: "Copier l'URL dans le presse-papiers" },
];

export default function ShareManager() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/settings/share");
    const data = await res.json();
    setEnabled(data.networks ?? {});
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = (id: string) => {
    setEnabled(prev => ({ ...prev, [id]: !prev[id] }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    await fetch("/api/settings/share", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
      body: JSON.stringify({ networks: enabled }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Share2 size={18} style={{ color: "#00f5ff" }} />
        <h2 className="text-lg font-bold text-white font-mono tracking-widest uppercase">
          Partage des beats
        </h2>
      </div>

      <p className="text-sm text-neutral-500 font-mono">
        Active les réseaux sur lesquels les visiteurs peuvent partager un beat depuis la page d&apos;accueil.
      </p>

      {loading ? (
        <div className="text-center py-8 text-neutral-500 font-mono text-sm">Chargement…</div>
      ) : (
        <div className="space-y-3">
          {NETWORKS.map(n => {
            const active = !!enabled[n.id];
            return (
              <div key={n.id}
                className="flex items-center justify-between px-4 py-3 rounded-xl border transition-colors cursor-pointer"
                style={active
                  ? { background: "#00f5ff0a", borderColor: "#00f5ff30" }
                  : { background: "#0d0d0d", borderColor: "#2a2a2a" }}
                onClick={() => toggle(n.id)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl w-7 text-center">{n.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{n.label}</p>
                    <p className="text-[10px] text-neutral-600 font-mono">{n.description}</p>
                  </div>
                </div>
                <div className="w-10 h-5 rounded-full relative transition-colors flex-shrink-0"
                  style={{ background: active ? "#00f5ff" : "#2a2a2a" }}>
                  <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: active ? "22px" : "2px" }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <button
        onClick={save}
        disabled={saving || loading}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 disabled:opacity-50"
        style={{ background: "linear-gradient(135deg,#00f5ff,#00c4cc)", color: "#000" }}
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <CheckCircle size={14} /> : <Share2 size={14} />}
        {saved ? "Sauvegardé !" : "Sauvegarder"}
      </button>
    </div>
  );
}
