"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPwd, setShowPwd]     = useState(false);
  const [status, setStatus]       = useState<"idle" | "loading" | "success" | "error">("idle");
  const [error, setError]         = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 8)  { setError("Au moins 8 caractères requis."); return; }

    setStatus("loading");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Erreur inconnue"); setStatus("error"); return; }
      setStatus("success");
      setTimeout(() => router.push("/mon-compte"), 3000);
    } catch {
      setError("Erreur réseau."); setStatus("error");
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #b400ff20, #b400ff40)" }}>
            <KeyRound size={28} style={{ color: "#b400ff" }} />
          </div>
          <h1 className="text-2xl font-black tracking-widest text-white mb-2">NOUVEAU MOT DE PASSE</h1>
          <p className="text-neutral-400 text-sm">Choisis un nouveau mot de passe pour ton compte.</p>
        </div>

        {status === "success" ? (
          <div className="text-center py-8">
            <CheckCircle size={48} className="mx-auto mb-4" style={{ color: "#39ff14" }} />
            <p className="text-white font-bold mb-1">Mot de passe mis à jour !</p>
            <p className="text-neutral-500 text-sm">Redirection vers ton compte…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 uppercase tracking-widest">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showPwd ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  placeholder="••••••••"
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-10 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
                />
                <button type="button" onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white transition-colors">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1.5 uppercase tracking-widest">Confirmer</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={e => { setConfirm(e.target.value); setError(""); }}
                placeholder="••••••••"
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full h-12 rounded-xl font-bold text-sm text-black disabled:opacity-60 transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px rgba(180,0,255,0.3)" }}
            >
              {status === "loading" ? <><Loader2 size={15} className="animate-spin" />Mise à jour…</> : "Valider"}
            </button>

            <p className="text-center">
              <Link href="/mon-compte" className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors">
                ← Retour à la connexion
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
