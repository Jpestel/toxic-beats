import { XCircle } from "lucide-react";
import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "#1a1a1a" }}>
          <XCircle size={40} className="text-neutral-600" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-widest mb-3">PAIEMENT ANNULÉ</h1>
        <p className="text-neutral-500 text-sm leading-relaxed mb-8">
          Tu as annulé le paiement. Ton panier est toujours disponible.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-black transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px rgba(180,0,255,0.3)" }}
        >
          Retour au site
        </Link>
      </div>
    </div>
  );
}
