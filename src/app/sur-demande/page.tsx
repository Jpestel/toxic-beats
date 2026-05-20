"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send, CheckCircle } from "lucide-react";

const PROJECT_TYPES = ["Mixtape / EP", "Album", "Single", "Clip / Vidéo", "Freestyle", "Autre"];
const BUDGETS = ["Moins de 50 €", "50 – 100 €", "100 – 200 €", "200 – 500 €", "Plus de 500 €", "À discuter"];

export default function SurDemandePage() {
  const [form, setForm] = useState({
    name: "", email: "", project_type: "", style: "",
    budget: "", deadline: "", inspirations: "", description: "", honeypot: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/beat-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) setSuccess(true);
      else setError(data.error || "Une erreur est survenue.");
    } catch {
      setError("Impossible de contacter le serveur.");
    } finally {
      setLoading(false);
    }
  }

  const inputClass = "w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors placeholder-neutral-700";
  const labelClass = "block text-xs font-mono uppercase tracking-widest mb-1.5 text-[#b400ff]";

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-200">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-[#1a1a1a] backdrop-blur-md bg-[#080808f2]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft size={16} className="text-neutral-500 group-hover:text-white transition-colors" />
            <span className="text-sm font-mono tracking-widest uppercase text-neutral-500 group-hover:text-white transition-colors">Retour</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-black tracking-widest text-white" style={{ textShadow: "0 0 10px #b400ff99" }}>TOXIC</span>
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#b400ff]">Beatmaker</span>
          </Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-16">
        {/* Titre */}
        <div className="text-center mb-12">
          <p className="text-xs font-mono tracking-[0.4em] uppercase mb-3 text-[#b400ff]">◆ EXCLUSIF ◆</p>
          <h1 className="text-5xl font-black text-white mb-4">BEAT SUR MESURE</h1>
          <div className="w-24 h-[2px] mx-auto mb-6" style={{ background: "linear-gradient(90deg, transparent, #b400ff, transparent)" }} />
          <p className="text-neutral-400 leading-relaxed">
            Tu veux un son unique, produit spécialement pour toi ?<br />
            Remplis ce formulaire et je te reviens rapidement avec une offre personnalisée.
          </p>
        </div>

        {success ? (
          <div className="text-center py-16 flex flex-col items-center gap-5">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "#b400ff22", border: "1px solid #b400ff44" }}>
              <CheckCircle size={32} className="text-[#b400ff]" />
            </div>
            <div>
              <p className="text-white font-bold text-xl mb-2">Demande envoyée !</p>
              <p className="text-neutral-500 text-sm">Je te répondrai dès que possible sur <span className="text-white">{form.email}</span>.</p>
            </div>
            <button
              onClick={() => { setSuccess(false); setForm({ name: "", email: "", project_type: "", style: "", budget: "", deadline: "", inspirations: "", description: "", honeypot: "" }); }}
              className="mt-2 text-xs font-mono tracking-widest uppercase text-neutral-500 hover:text-white transition-colors"
            >
              Soumettre une autre demande
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-5">
            {/* Honeypot */}
            <div style={{ display: "none" }} aria-hidden="true">
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.honeypot} onChange={e => set("honeypot", e.target.value)} />
            </div>

            {/* Identité */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Ton nom / artiste *</label>
                <input type="text" required value={form.name} onChange={e => set("name", e.target.value)}
                  placeholder="Skrilla, Young67, Lil 67..." className={inputClass}
                  onFocus={e => (e.target.style.borderColor = "#b400ff80")} onBlur={e => (e.target.style.borderColor = "#2a2a2a")} />
              </div>
              <div>
                <label className={labelClass}>Ton email *</label>
                <input type="email" required value={form.email} onChange={e => set("email", e.target.value)}
                  placeholder="ton@email.com" className={inputClass}
                  onFocus={e => (e.target.style.borderColor = "#b400ff80")} onBlur={e => (e.target.style.borderColor = "#2a2a2a")} />
              </div>
            </div>

            {/* Projet */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Type de projet</label>
                <select value={form.project_type} onChange={e => set("project_type", e.target.value)}
                  className={inputClass + " cursor-pointer"} style={{ colorScheme: "dark" }}>
                  <option value="">— Sélectionner —</option>
                  {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Style / Genre souhaité</label>
                <input type="text" value={form.style} onChange={e => set("style", e.target.value)}
                  placeholder="Trap, Drill, Boom Bap, R&B..." className={inputClass}
                  onFocus={e => (e.target.style.borderColor = "#b400ff80")} onBlur={e => (e.target.style.borderColor = "#2a2a2a")} />
              </div>
            </div>

            {/* Budget & deadline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Budget</label>
                <select value={form.budget} onChange={e => set("budget", e.target.value)}
                  className={inputClass + " cursor-pointer"} style={{ colorScheme: "dark" }}>
                  <option value="">— Sélectionner —</option>
                  {BUDGETS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Deadline souhaitée</label>
                <input type="text" value={form.deadline} onChange={e => set("deadline", e.target.value)}
                  placeholder="Dans 2 semaines, le 15 juin..." className={inputClass}
                  onFocus={e => (e.target.style.borderColor = "#b400ff80")} onBlur={e => (e.target.style.borderColor = "#2a2a2a")} />
              </div>
            </div>

            {/* Inspirations */}
            <div>
              <label className={labelClass}>Références / Inspirations</label>
              <input type="text" value={form.inspirations} onChange={e => set("inspirations", e.target.value)}
                placeholder="Artistes, sons YouTube, liens SoundCloud..." className={inputClass}
                onFocus={e => (e.target.style.borderColor = "#b400ff80")} onBlur={e => (e.target.style.borderColor = "#2a2a2a")} />
            </div>

            {/* Description */}
            <div>
              <label className={labelClass}>Description du projet *</label>
              <textarea required rows={5} value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Décris ton projet, l'ambiance souhaitée, les émotions que tu veux transmettre, les samples si tu en as en tête..."
                className={inputClass + " resize-none"}
                onFocus={e => (e.target.style.borderColor = "#b400ff80")} onBlur={e => (e.target.style.borderColor = "#2a2a2a")} />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button type="submit" disabled={loading}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm tracking-wider text-white transition-all hover:scale-[1.02] disabled:opacity-50 mt-2"
              style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 30px #b400ff44" }}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Envoi en cours…</> : <><Send size={16} /> Envoyer ma demande</>}
            </button>

            <p className="text-center text-xs text-neutral-700 font-mono">Réponse sous 24–48h · Pas d&apos;engagement</p>
          </form>
        )}
      </div>
    </div>
  );
}
