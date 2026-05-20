"use client";

import { useState } from "react";
import { KeyRound, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("toxic_auth_token") : null;
}

export default function ChangePasswordManager() {
  const [current, setCurrent]     = useState("");
  const [next, setNext]           = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext]   = useState(false);
  const [status, setStatus]       = useState<"idle" | "saving" | "success" | "error">("idle");
  const [error, setError]         = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (next !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (next.length < 8)  { setError("Le nouveau mot de passe doit faire au moins 8 caractères."); return; }

    setStatus("saving");
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${getToken()}` },
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur inconnue"); setStatus("error"); return; }
      setStatus("success");
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => setStatus("idle"), 3000);
    } catch {
      setError("Erreur réseau."); setStatus("error");
    }
  };

  return (
    <div>
      <h2 className="text-sm font-mono tracking-widest text-[#b400ff] uppercase flex items-center gap-2 mb-6">
        <KeyRound size={14} /> Changer le mot de passe
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
        {/* Mot de passe actuel */}
        <div>
          <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-1.5">Mot de passe actuel</label>
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={current}
              onChange={e => { setCurrent(e.target.value); setStatus("idle"); setError(""); }}
              required
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 pr-10 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
            />
            <button type="button" onClick={() => setShowCurrent(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors">
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Nouveau mot de passe */}
        <div>
          <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-1.5">Nouveau mot de passe</label>
          <div className="relative">
            <input
              type={showNext ? "text" : "password"}
              value={next}
              onChange={e => { setNext(e.target.value); setStatus("idle"); setError(""); }}
              required
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 pr-10 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
            />
            <button type="button" onClick={() => setShowNext(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-neutral-300 transition-colors">
              {showNext ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>

        {/* Confirmation */}
        <div>
          <label className="block text-xs text-neutral-500 tracking-widest uppercase mb-1.5">Confirmer le nouveau mot de passe</label>
          <input
            type="password"
            value={confirm}
            onChange={e => { setConfirm(e.target.value); setStatus("idle"); setError(""); }}
            required
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
          />
        </div>

        {error && <p className="text-red-400 text-xs">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={status === "saving"}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-black disabled:opacity-60 transition-all hover:scale-[1.01]"
            style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 15px rgba(180,0,255,0.3)" }}
          >
            {status === "saving"
              ? <><Loader2 size={15} className="animate-spin" />Mise à jour…</>
              : <><KeyRound size={15} />Mettre à jour</>
            }
          </button>
          {status === "success" && (
            <div className="flex items-center gap-1.5 text-[#39ff14] text-sm">
              <CheckCircle size={15} /> Mot de passe mis à jour !
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
