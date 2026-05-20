"use client";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";

function UnsubContent() {
  const params = useSearchParams();
  const success = params.get("success");
  const already = params.get("already");

  if (success || already) return (
    <div className="text-center">
      <div className="text-5xl mb-6">👋</div>
      <p className="text-xs font-mono tracking-[0.4em] uppercase mb-3" style={{ color: "#555" }}>◆ NEWSLETTER ◆</p>
      <h1 className="text-3xl font-black text-white mb-4">
        {already ? "Déjà désinscrit(e)" : "Désinscription confirmée"}
      </h1>
      <p className="text-neutral-500 mb-8">
        Tu ne recevras plus d'emails de notre part.<br />
        Tu peux te réinscrire à tout moment depuis le site.
      </p>
      <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm tracking-widest uppercase text-neutral-400 border border-[#2a2a2a] hover:border-[#444] transition-all">
        ← Retour au site
      </Link>
    </div>
  );

  return (
    <div className="text-center">
      <div className="text-5xl mb-6">⚠️</div>
      <h1 className="text-3xl font-black text-white mb-4">Lien invalide</h1>
      <p className="text-neutral-500 mb-8">Ce lien est invalide ou a déjà été utilisé.</p>
      <Link href="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm tracking-widest uppercase text-neutral-400 border border-[#2a2a2a]">
        ← Retour au site
      </Link>
    </div>
  );
}

export default function UnsubscribedPage() {
  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <Suspense>
          <UnsubContent />
        </Suspense>
      </div>
    </div>
  );
}
