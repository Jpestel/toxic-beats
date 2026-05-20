"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function ConfirmContent() {
  const params = useSearchParams();
  const success = params.get("success");
  const already = params.get("already");
  const error = params.get("error");

  if (success) return (
    <div className="text-center">
      <div className="text-5xl mb-6">🎵</div>
      <p className="text-xs font-mono tracking-[0.4em] uppercase mb-3" style={{ color: "#b400ff" }}>◆ NEWSLETTER ◆</p>
      <h1 className="text-3xl font-black text-white mb-4">Inscription confirmée !</h1>
      <p className="text-neutral-500 mb-8">
        Tu es maintenant inscrit(e) à la newsletter TOXIC.<br />
        Tu recevras en avant-première les nouveaux beats et actus.
      </p>
      <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm tracking-widest uppercase text-white transition-all"
        style={{ background: "#b400ff" }}>
        ← Retour au site
      </Link>
    </div>
  );

  if (already) return (
    <div className="text-center">
      <div className="text-5xl mb-6">✅</div>
      <h1 className="text-3xl font-black text-white mb-4">Déjà confirmé</h1>
      <p className="text-neutral-500 mb-8">Ton inscription était déjà active.</p>
      <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm tracking-widest uppercase text-white"
        style={{ background: "#b400ff" }}>
        ← Retour au site
      </Link>
    </div>
  );

  return (
    <div className="text-center">
      <div className="text-5xl mb-6">⚠️</div>
      <h1 className="text-3xl font-black text-white mb-4">Lien invalide</h1>
      <p className="text-neutral-500 mb-8">Ce lien de confirmation est invalide ou a expiré.</p>
      <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm tracking-widest uppercase text-neutral-400 border border-[#2a2a2a]">
        ← Retour au site
      </Link>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Suspense>
          <ConfirmContent />
        </Suspense>
      </div>
    </div>
  );
}
