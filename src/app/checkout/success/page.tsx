import { CheckCircle, Mail } from "lucide-react";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "linear-gradient(135deg, #39ff1420, #39ff1440)" }}>
          <CheckCircle size={40} style={{ color: "#39ff14", filter: "drop-shadow(0 0 10px #39ff1480)" }} />
        </div>
        <h1 className="text-2xl font-black text-white tracking-widest mb-3">PAIEMENT CONFIRMÉ</h1>
        <p className="text-neutral-400 text-sm leading-relaxed mb-2">
          Merci pour ton achat !
        </p>
        <p className="text-neutral-500 text-sm leading-relaxed mb-8 flex items-center justify-center gap-2">
          <Mail size={14} />
          Tu vas recevoir ton lien de téléchargement par email dans quelques instants.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-xl text-sm font-bold text-black transition-all hover:scale-[1.02]"
          style={{ background: "linear-gradient(135deg, #39ff14, #22cc0a)", boxShadow: "0 0 20px rgba(57,255,20,0.3)" }}
        >
          Retour au site
        </Link>
      </div>
    </div>
  );
}
