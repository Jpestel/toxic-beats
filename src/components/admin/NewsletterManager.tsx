"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { NewsletterSubscriber } from "@/types";
import { Trash2, Send, Eye, EyeOff, Users, CheckCircle, Clock, UserMinus, Download, RefreshCw, ChevronDown, ChevronUp, Bold, Italic, Link as LinkIcon, Minus, Heading2 } from "lucide-react";

type Tab = "subscribers" | "compose";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed:    { label: "Confirmé",     color: "#39ff14" },
  pending:      { label: "En attente",   color: "#f59e0b" },
  unsubscribed: { label: "Désinscrit",   color: "#555" },
};

export default function NewsletterManager() {
  const [tab, setTab] = useState<Tab>("subscribers");
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "confirmed" | "pending" | "unsubscribed">("all");

  // Compose state
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; total: number; errors?: string[] } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const fetchSubscribers = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setLoading(false); return; }
    const res = await fetch("/api/admin/newsletter/subscribers", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const json = await res.json();
    setSubscribers(json.subscribers || []);
    setLoading(false);
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const deleteSubscriber = async (id: string) => {
    setDeletingId(id);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await fetch("/api/admin/newsletter/subscribers", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
    setSubscribers(prev => prev.filter(s => s.id !== id));
    setDeletingId(null);
  };

  const confirmed = subscribers.filter(s => s.status === "confirmed");
  const pending   = subscribers.filter(s => s.status === "pending");
  const unsub     = subscribers.filter(s => s.status === "unsubscribed");
  const filtered  = filterStatus === "all" ? subscribers : subscribers.filter(s => s.status === filterStatus);

  // CSV export
  const exportCsv = () => {
    const rows = [["Email", "Statut", "Inscrit le", "Confirmé le"]];
    filtered.forEach(s => rows.push([
      s.email, s.status,
      new Date(s.subscribed_at).toLocaleDateString("fr-FR"),
      s.confirmed_at ? new Date(s.confirmed_at).toLocaleDateString("fr-FR") : "",
    ]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `newsletter_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  // Text formatting helpers
  const insertAtCursor = (before: string, after = "") => {
    const ta = editorRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = bodyHtml.slice(start, end);
    const newVal = bodyHtml.slice(0, start) + before + selected + after + bodyHtml.slice(end);
    setBodyHtml(newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const sendNewsletter = async () => {
    if (!subject.trim() || !bodyHtml.trim()) return;
    setSending(true);
    setSendError(null);
    setSendResult(null);
    setConfirmSend(false);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setSending(false); return; }
    const res = await fetch("/api/admin/newsletter/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ subject, body_html: bodyHtml }),
    });
    const json = await res.json();
    if (!res.ok) setSendError(json.error || "Erreur lors de l'envoi.");
    else setSendResult(json);
    setSending(false);
  };

  const previewHtml = `<!DOCTYPE html><html><body style="margin:0;padding:24px;background:#0d0d0d;font-family:Helvetica,Arial,sans-serif;color:#ccc;font-size:15px;line-height:1.7;">${bodyHtml}</body></html>`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono tracking-widest uppercase text-white">Newsletter</h2>
          <p className="text-xs text-[#555] mt-1 font-mono">{confirmed.length} abonné{confirmed.length !== 1 ? "s" : ""} confirmé{confirmed.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSubscribers} className="p-2 rounded-lg text-[#555] hover:text-white transition-colors" style={{ background: "#111", border: "1px solid #1a1a1a" }} title="Rafraîchir">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex border-b border-[#1a1a1a]">
        {([
          { id: "subscribers", label: "Abonnés", count: subscribers.length },
          { id: "compose",     label: "Rédiger & Envoyer", count: 0 },
        ] as { id: Tab; label: string; count: number }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-mono tracking-widest uppercase border-b-2 -mb-px transition-all"
            style={tab === t.id ? { color: "#b400ff", borderColor: "#b400ff" } : { color: "#555", borderColor: "transparent" }}>
            {t.label}
            {t.count > 0 && <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black text-black" style={{ background: "#b400ff" }}>{t.count}</span>}
          </button>
        ))}
      </div>

      {/* ===== SUBSCRIBERS TAB ===== */}
      {tab === "subscribers" && (
        <div className="flex flex-col gap-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Confirmés",   count: confirmed.length, color: "#39ff14", icon: <CheckCircle size={16} /> },
              { label: "En attente", count: pending.length,   color: "#f59e0b", icon: <Clock size={16} /> },
              { label: "Désinscrits", count: unsub.length,    color: "#555",     icon: <UserMinus size={16} /> },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-4 flex items-center gap-3" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
                <span style={{ color: s.color }}>{s.icon}</span>
                <div>
                  <p className="text-lg font-black text-white">{s.count}</p>
                  <p className="text-[10px] font-mono uppercase text-[#555]">{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Filter + export */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1">
              {(["all", "confirmed", "pending", "unsubscribed"] as const).map(f => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all"
                  style={filterStatus === f
                    ? { background: "#b400ff", color: "#fff" }
                    : { background: "#111", color: "#555", border: "1px solid #1a1a1a" }}>
                  {f === "all" ? "Tous" : STATUS_LABELS[f].label}
                </button>
              ))}
            </div>
            <button onClick={exportCsv}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest text-[#555] transition-all hover:text-white"
              style={{ background: "#111", border: "1px solid #1a1a1a" }}>
              <Download size={11} />
              Export CSV
            </button>
          </div>

          {/* List */}
          {loading ? (
            <div className="py-12 text-center text-[#555] font-mono text-sm">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-[#555] font-mono text-sm">Aucun abonné dans cette catégorie.</div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1a1a1a" }}>
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a" }}>
                    <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-[#555]">Email</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-[#555]">Statut</th>
                    <th className="text-left px-4 py-2.5 text-[10px] font-mono uppercase tracking-widest text-[#555] hidden sm:table-cell">Inscrit le</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sub, i) => {
                    const st = STATUS_LABELS[sub.status];
                    return (
                      <tr key={sub.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #111" : "none" }}>
                        <td className="px-4 py-3 text-sm text-neutral-300 font-mono">{sub.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold" style={{ color: st.color, background: st.color + "15" }}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#555] font-mono hidden sm:table-cell">
                          {new Date(sub.subscribed_at).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button onClick={() => deleteSubscriber(sub.id)} disabled={deletingId === sub.id}
                            className="p-1.5 rounded-lg text-[#333] hover:text-red-500 transition-colors disabled:opacity-50">
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== COMPOSE TAB ===== */}
      {tab === "compose" && (
        <div className="flex flex-col gap-5">
          {sendResult && (
            <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: "#39ff1410", border: "1px solid #39ff1430" }}>
              <CheckCircle size={16} className="mt-0.5 flex-shrink-0" style={{ color: "#39ff14" }} />
              <div className="text-sm font-mono" style={{ color: "#39ff14" }}>
                Newsletter envoyée à <strong>{sendResult.sent}</strong> abonné{sendResult.sent !== 1 ? "s" : ""} !
                {sendResult.errors?.length ? <><br /><span className="text-[#f59e0b]">{sendResult.errors.length} erreur(s) d'envoi.</span></> : null}
              </div>
            </div>
          )}
          {sendError && (
            <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: "#ff003310", border: "1px solid #ff003330" }}>
              <span className="text-sm font-mono text-red-400">{sendError}</span>
            </div>
          )}

          {/* Destinataires info */}
          <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: "#111", border: "1px solid #1a1a1a" }}>
            <Users size={14} style={{ color: "#b400ff" }} />
            <span className="text-xs font-mono text-neutral-400">
              Envoi à <strong className="text-white">{confirmed.length}</strong> abonné{confirmed.length !== 1 ? "s" : ""} confirmé{confirmed.length !== 1 ? "s" : ""}
            </span>
            {confirmed.length === 0 && (
              <span className="text-xs font-mono text-red-400 ml-auto">⚠ Aucun abonné confirmé</span>
            )}
          </div>

          {/* Sujet */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-2">Sujet *</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Ex: 🔥 Nouveau pack de beats dispo !"
              className="w-full px-4 py-3 rounded-xl text-sm text-white font-mono outline-none transition-all"
              style={{ background: "#111", border: "1px solid #1a1a1a" }}
            />
          </div>

          {/* Toolbar */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-2">Contenu (HTML) *</label>
            <div className="flex flex-wrap gap-1 mb-2 p-2 rounded-t-xl" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderBottom: "none" }}>
              {[
                { icon: <Bold size={13} />,    title: "Gras",      action: () => insertAtCursor("<strong>", "</strong>") },
                { icon: <Italic size={13} />,  title: "Italique",  action: () => insertAtCursor("<em>", "</em>") },
                { icon: <Heading2 size={13} />,title: "Titre",     action: () => insertAtCursor('<h2 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 12px;">', "</h2>") },
                { icon: <LinkIcon size={13} />,title: "Lien",      action: () => insertAtCursor('<a href="URL" style="color:#b400ff;text-decoration:none;">', "</a>") },
                { icon: <Minus size={13} />,   title: "Séparateur",action: () => insertAtCursor('\n<hr style="border:none;border-top:1px solid #1a1a1a;margin:24px 0;" />\n') },
              ].map(btn => (
                <button key={btn.title} onClick={btn.action} title={btn.title}
                  className="p-2 rounded-lg text-[#555] hover:text-white transition-colors"
                  style={{ background: "#111" }}>
                  {btn.icon}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-1">
                <button onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all"
                  style={showPreview ? { background: "#b400ff", color: "#fff" } : { background: "#111", color: "#555" }}>
                  {showPreview ? <EyeOff size={11} /> : <Eye size={11} />}
                  Aperçu
                </button>
              </div>
            </div>

            <div className={showPreview ? "grid grid-cols-2 gap-0" : ""}>
              {/* Editor */}
              <textarea
                ref={editorRef}
                value={bodyHtml}
                onChange={e => setBodyHtml(e.target.value)}
                rows={16}
                placeholder={`<p>Salut 🎵</p>\n<p>De nouveaux beats viennent d'être ajoutés sur le site !</p>\n<p><a href="https://toxic-files.com" style="color:#b400ff;">→ Voir les nouveautés</a></p>`}
                className="w-full px-4 py-3 text-sm text-neutral-300 font-mono outline-none resize-y"
                style={{
                  background: "#111",
                  border: "1px solid #1a1a1a",
                  borderRadius: showPreview ? "0 0 0 12px" : "0 0 12px 12px",
                  lineHeight: "1.6",
                  minHeight: "280px",
                }}
              />
              {/* Preview */}
              {showPreview && (
                <iframe
                  srcDoc={previewHtml}
                  className="w-full"
                  style={{
                    background: "#0d0d0d",
                    border: "1px solid #1a1a1a",
                    borderLeft: "none",
                    borderRadius: "0 0 12px 0",
                    minHeight: "280px",
                  }}
                  title="Aperçu newsletter"
                />
              )}
            </div>
            <p className="text-[10px] font-mono text-[#333] mt-1.5">
              Le lien de désinscription est ajouté automatiquement en pied de chaque email.
            </p>
          </div>

          {/* Send button */}
          {!confirmSend ? (
            <button
              onClick={() => setConfirmSend(true)}
              disabled={!subject.trim() || !bodyHtml.trim() || confirmed.length === 0 || sending}
              className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-mono tracking-widest uppercase text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "#b400ff" }}>
              <Send size={14} />
              Envoyer la newsletter
            </button>
          ) : (
            <div className="flex flex-col gap-3 p-4 rounded-xl" style={{ background: "#1a0010", border: "1px solid #b400ff40" }}>
              <p className="text-sm font-mono text-neutral-300 text-center">
                Envoyer &quot;<strong>{subject}</strong>&quot; à <strong>{confirmed.length}</strong> abonné{confirmed.length !== 1 ? "s" : ""} ?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmSend(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest text-[#555] transition-all"
                  style={{ background: "#111", border: "1px solid #1a1a1a" }}>
                  Annuler
                </button>
                <button onClick={sendNewsletter} disabled={sending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest text-white transition-all disabled:opacity-50"
                  style={{ background: "#b400ff" }}>
                  {sending ? "Envoi…" : <><Send size={12} /> Confirmer l&apos;envoi</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
