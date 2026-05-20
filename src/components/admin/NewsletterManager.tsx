"use client";

import { useState, useEffect, useRef } from "react";
import type { NewsletterSubscriber } from "@/types";

function getToken() {
  return typeof window !== "undefined" ? localStorage.getItem("toxic_auth_token") : null;
}
import {
  Trash2, Send, Eye, EyeOff, Users, CheckCircle, Clock, UserMinus,
  Download, RefreshCw, Bold, Italic, Link as LinkIcon, Minus, Heading2,
  Image as ImageIcon, Loader2, MousePointer2, X, Palette,
} from "lucide-react";

type Tab = "subscribers" | "compose";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  confirmed:    { label: "Confirmé",     color: "#39ff14" },
  pending:      { label: "En attente",   color: "#f59e0b" },
  unsubscribed: { label: "Désinscrit",   color: "#555" },
};

const TEXT_COLORS = [
  { label: "Blanc",   value: "#ffffff" },
  { label: "Violet",  value: "#b400ff" },
  { label: "Cyan",    value: "#00f5ff" },
  { label: "Vert",    value: "#39ff14" },
  { label: "Ambre",   value: "#f59e0b" },
  { label: "Gris",    value: "#888888" },
];

function wrapEmailTemplate(content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#080808;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#0d0d0d;border:1px solid #1a1a1a;border-radius:16px;overflow:hidden;">
        <tr><td style="background:linear-gradient(135deg,#1a001a,#0d0d0d);padding:32px 40px;text-align:center;border-bottom:1px solid #1a1a1a;">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:6px;text-transform:uppercase;color:#b400ff;font-weight:700;">◆ TOXIC ◆</p>
          <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;">Beatmaker</h1>
        </td></tr>
        <tr><td style="padding:40px;color:#cccccc;font-size:15px;line-height:1.7;">
          ${content}
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #1a1a1a;text-align:center;">
          <p style="margin:0 0 8px;font-size:11px;color:#555;font-family:Helvetica,Arial,sans-serif;">
            Tu reçois cet email car tu es inscrit(e) à la newsletter TOXIC.<br>
            <a href="#" style="color:#777;text-decoration:underline;">Se désinscrire</a>
          </p>
          <p style="margin:0;font-size:11px;color:#333;">© ${new Date().getFullYear()} TOXIC — toxic-files.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default function NewsletterManager() {
  const [tab, setTab] = useState<Tab>("subscribers");
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<"all" | "confirmed" | "pending" | "unsubscribed">("all");

  // Compose
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ sent: number; total: number; errors?: string[] } | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Image upload
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Dialogs
  const [dialog, setDialog] = useState<"link" | "cta" | null>(null);
  const [dialogUrl, setDialogUrl] = useState("");
  const [dialogText, setDialogText] = useState("");
  const [showColorMenu, setShowColorMenu] = useState(false);
  const savedCursor = useRef<{ start: number; end: number } | null>(null);

  const fetchSubscribers = async () => {
    setLoading(true);
    
    const token = getToken();
    const res = await fetch("/api/admin/newsletter/subscribers", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    setSubscribers(json.subscribers || []);
    setLoading(false);
  };

  useEffect(() => { fetchSubscribers(); }, []);

  const deleteSubscriber = async (id: string) => {
    setDeletingId(id);
    
    const token = getToken();
    await fetch("/api/admin/newsletter/subscribers", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setSubscribers(prev => prev.filter(s => s.id !== id));
    setDeletingId(null);
  };

  const confirmed = subscribers.filter(s => s.status === "confirmed");
  const pending   = subscribers.filter(s => s.status === "pending");
  const unsub     = subscribers.filter(s => s.status === "unsubscribed");
  const filtered  = filterStatus === "all" ? subscribers : subscribers.filter(s => s.status === filterStatus);

  const exportCsv = () => {
    const rows = [["Email", "Statut", "Inscrit le", "Confirmé le"]];
    filtered.forEach(s => rows.push([
      s.email, s.status,
      new Date(s.subscribed_at).toLocaleDateString("fr-FR"),
      s.confirmed_at ? new Date(s.confirmed_at).toLocaleDateString("fr-FR") : "",
    ]));
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `newsletter_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  // Insert text at cursor position
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

  // Save cursor before opening a dialog
  const saveCursorAndOpenDialog = (type: "link" | "cta") => {
    const ta = editorRef.current;
    if (ta) {
      savedCursor.current = { start: ta.selectionStart, end: ta.selectionEnd };
      const selected = bodyHtml.slice(ta.selectionStart, ta.selectionEnd);
      setDialogText(type === "link" ? selected : "Voir les nouveaux beats →");
    }
    setDialogUrl("");
    setDialog(type);
  };

  // Insert link from dialog
  const confirmLinkDialog = () => {
    if (!dialogUrl.trim()) return;
    const url = dialogUrl.startsWith("http") ? dialogUrl : `https://${dialogUrl}`;
    const text = dialogText || url;
    const html = `<a href="${url}" style="color:#b400ff;text-decoration:none;font-weight:600;">${text}</a>`;
    insertAtCursorAt(html, savedCursor.current);
    setDialog(null);
  };

  // Insert CTA button from dialog
  const confirmCtaDialog = () => {
    if (!dialogUrl.trim()) return;
    const url = dialogUrl.startsWith("http") ? dialogUrl : `https://${dialogUrl}`;
    const text = dialogText || "Voir les nouveaux beats →";
    const html = `\n<table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td align="center">
    <a href="${url}" style="display:inline-block;background:#b400ff;color:#ffffff;font-size:13px;font-weight:700;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:10px;">${text}</a>
  </td></tr>
</table>\n`;
    insertAtCursorAt(html, savedCursor.current);
    setDialog(null);
  };

  const insertAtCursorAt = (html: string, cursor: { start: number; end: number } | null) => {
    if (!cursor) { insertAtCursor(html); return; }
    const newVal = bodyHtml.slice(0, cursor.start) + html + bodyHtml.slice(cursor.end);
    setBodyHtml(newVal);
    const pos = cursor.start + html.length;
    setTimeout(() => {
      const ta = editorRef.current;
      if (ta) { ta.focus(); ta.setSelectionRange(pos, pos); }
    }, 0);
  };

  // Insert colored text
  const insertColor = (color: string) => {
    const ta = editorRef.current;
    if (!ta) return;
    setShowColorMenu(false);
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = bodyHtml.slice(start, end) || "texte";
    insertAtCursor(`<span style="color:${color};">`, "</span>");
  };

  // Image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      
      const token = getToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/newsletter/upload-image", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const json = await res.json();
      if (res.ok && json.url) {
        insertAtCursor(`<img src="${json.url}" alt="" style="max-width:100%;border-radius:8px;display:block;margin:16px auto;" />`);
      } else {
        alert(json.error || "Erreur upload image.");
      }
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const sendNewsletter = async () => {
    if (!subject.trim() || !bodyHtml.trim()) return;
    setSending(true);
    setSendError(null);
    setSendResult(null);
    setConfirmSend(false);
    
    const token = getToken();
    const res = await fetch("/api/admin/newsletter/send", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body_html: bodyHtml }),
    });
    const json = await res.json();
    if (!res.ok) setSendError(json.error || "Erreur lors de l'envoi.");
    else setSendResult(json);
    setSending(false);
  };

  return (
    <div className="flex flex-col gap-6">

      {/* ===== Header ===== */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono tracking-widest uppercase text-white">Newsletter</h2>
          <p className="text-xs text-[#555] mt-1 font-mono">
            {confirmed.length} abonné{confirmed.length !== 1 ? "s" : ""} confirmé{confirmed.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={fetchSubscribers}
          className="p-2 rounded-lg text-[#555] hover:text-white transition-colors"
          style={{ background: "#111", border: "1px solid #1a1a1a" }}>
          <RefreshCw size={14} />
        </button>
      </div>

      {/* ===== Sub-tabs ===== */}
      <div className="flex border-b border-[#1a1a1a]">
        {([
          { id: "subscribers" as Tab, label: "Abonnés",         count: subscribers.length },
          { id: "compose"     as Tab, label: "Rédiger & Envoyer", count: 0 },
        ]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-mono tracking-widest uppercase border-b-2 -mb-px transition-all"
            style={tab === t.id ? { color: "#b400ff", borderColor: "#b400ff" } : { color: "#555", borderColor: "transparent" }}>
            {t.label}
            {t.count > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black text-black" style={{ background: "#b400ff" }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ===== SUBSCRIBERS TAB ===== */}
      {tab === "subscribers" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Confirmés",   count: confirmed.length, color: "#39ff14", icon: <CheckCircle size={16} /> },
              { label: "En attente",  count: pending.length,   color: "#f59e0b", icon: <Clock size={16} /> },
              { label: "Désinscrits", count: unsub.length,     color: "#555",    icon: <UserMinus size={16} /> },
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
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest text-[#555] hover:text-white transition-all"
              style={{ background: "#111", border: "1px solid #1a1a1a" }}>
              <Download size={11} /> Export CSV
            </button>
          </div>

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
                    <th className="px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((sub, i) => {
                    const st = STATUS_LABELS[sub.status];
                    return (
                      <tr key={sub.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #111" : "none" }}>
                        <td className="px-4 py-3 text-sm text-neutral-300 font-mono">{sub.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold"
                            style={{ color: st.color, background: st.color + "15" }}>
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
                {sendResult.errors?.length ? <><br /><span className="text-[#f59e0b]">{sendResult.errors.length} erreur(s) d&apos;envoi.</span></> : null}
              </div>
            </div>
          )}

          {sendError && (
            <div className="p-4 rounded-xl" style={{ background: "#ff003310", border: "1px solid #ff003330" }}>
              <span className="text-sm font-mono text-red-400">{sendError}</span>
            </div>
          )}

          {/* Destinataires */}
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
              className="w-full px-4 py-3 rounded-xl text-sm text-white font-mono outline-none"
              style={{ background: "#111", border: "1px solid #1a1a1a" }}
            />
          </div>

          {/* Éditeur */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-2">Contenu *</label>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 rounded-t-xl" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderBottom: "none" }}>

              {/* Séparateur visuel */}
              <ToolbarSeparator />

              {/* Formatage texte */}
              <ToolbarBtn title="Gras" onClick={() => insertAtCursor("<strong>", "</strong>")}><Bold size={13} /></ToolbarBtn>
              <ToolbarBtn title="Italique" onClick={() => insertAtCursor("<em>", "</em>")}><Italic size={13} /></ToolbarBtn>
              <ToolbarBtn title="Titre H2" onClick={() => insertAtCursor('<h2 style="color:#fff;font-size:22px;font-weight:900;margin:0 0 12px;">', "</h2>")}><Heading2 size={13} /></ToolbarBtn>

              {/* Couleur */}
              <div className="relative">
                <ToolbarBtn title="Couleur de texte" onClick={() => setShowColorMenu(v => !v)}>
                  <Palette size={13} />
                </ToolbarBtn>
                {showColorMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowColorMenu(false)} />
                    <div className="absolute left-0 top-full mt-1 z-50 p-2 rounded-xl grid grid-cols-3 gap-1.5"
                      style={{ background: "#111", border: "1px solid #2a2a2a", boxShadow: "0 8px 24px rgba(0,0,0,0.6)", width: 120 }}>
                      {TEXT_COLORS.map(c => (
                        <button key={c.value} title={c.label}
                          onClick={() => insertColor(c.value)}
                          className="w-8 h-8 rounded-lg border-2 border-transparent hover:border-white transition-all"
                          style={{ background: c.value }} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              <ToolbarSeparator />

              {/* Lien */}
              <ToolbarBtn title="Insérer un lien" onClick={() => saveCursorAndOpenDialog("link")}>
                <LinkIcon size={13} />
              </ToolbarBtn>

              {/* Bouton CTA */}
              <ToolbarBtn title="Bouton CTA (lien stylisé)" onClick={() => saveCursorAndOpenDialog("cta")}>
                <MousePointer2 size={13} />
              </ToolbarBtn>

              {/* Image */}
              <ToolbarBtn title="Insérer une image" onClick={() => imageInputRef.current?.click()} disabled={imageUploading}>
                {imageUploading ? <Loader2 size={13} className="animate-spin" /> : <ImageIcon size={13} />}
              </ToolbarBtn>
              <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

              <ToolbarSeparator />

              {/* Séparateur horizontal */}
              <ToolbarBtn title="Ligne de séparation" onClick={() => insertAtCursor('\n<hr style="border:none;border-top:1px solid #1a1a1a;margin:24px 0;" />\n')}>
                <Minus size={13} />
              </ToolbarBtn>

              {/* Aperçu */}
              <div className="ml-auto">
                <button onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono uppercase tracking-widest transition-all"
                  style={showPreview ? { background: "#b400ff", color: "#fff" } : { background: "#111", color: "#555", border: "1px solid #1a1a1a" }}>
                  {showPreview ? <EyeOff size={11} /> : <Eye size={11} />}
                  Aperçu
                </button>
              </div>
            </div>

            {/* Editor + Preview */}
            <div className={showPreview ? "grid grid-cols-2 gap-0" : ""}>
              <textarea
                ref={editorRef}
                value={bodyHtml}
                onChange={e => setBodyHtml(e.target.value)}
                rows={18}
                placeholder={`<p>Salut 🎵</p>\n<p>De nouveaux beats viennent d'être ajoutés sur le site !</p>`}
                className="w-full px-4 py-3 text-sm text-neutral-300 font-mono outline-none resize-y"
                style={{
                  background: "#111",
                  border: "1px solid #1a1a1a",
                  borderRadius: showPreview ? "0 0 0 12px" : "0 0 12px 12px",
                  lineHeight: "1.6",
                  minHeight: "320px",
                }}
              />
              {showPreview && (
                <iframe
                  srcDoc={wrapEmailTemplate(bodyHtml)}
                  className="w-full"
                  style={{
                    border: "1px solid #1a1a1a",
                    borderLeft: "none",
                    borderRadius: "0 0 12px 0",
                    minHeight: "320px",
                    background: "#080808",
                  }}
                  title="Aperçu email"
                />
              )}
            </div>
            <p className="text-[10px] font-mono text-[#333] mt-1.5">
              Le lien de désinscription est ajouté automatiquement en pied de chaque email.
            </p>
          </div>

          {/* Bouton envoi */}
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
                  className="flex-1 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest text-[#555]"
                  style={{ background: "#111", border: "1px solid #1a1a1a" }}>
                  Annuler
                </button>
                <button onClick={sendNewsletter} disabled={sending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest text-white disabled:opacity-50"
                  style={{ background: "#b400ff" }}>
                  {sending ? <><Loader2 size={12} className="animate-spin" /> Envoi…</> : <><Send size={12} /> Confirmer</>}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== DIALOG LIEN ===== */}
      {dialog === "link" && (
        <DialogOverlay onClose={() => setDialog(null)} title="Insérer un lien">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-1.5">URL *</label>
              <input
                type="url"
                autoFocus
                value={dialogUrl}
                onChange={e => setDialogUrl(e.target.value)}
                placeholder="https://toxic-files.com"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white font-mono outline-none"
                style={{ background: "#0d0d0d", border: "1px solid #2a2a2a" }}
                onKeyDown={e => e.key === "Enter" && confirmLinkDialog()}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-1.5">Texte du lien</label>
              <input
                type="text"
                value={dialogText}
                onChange={e => setDialogText(e.target.value)}
                placeholder="Voir les nouveaux beats →"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white font-mono outline-none"
                style={{ background: "#0d0d0d", border: "1px solid #2a2a2a" }}
                onKeyDown={e => e.key === "Enter" && confirmLinkDialog()}
              />
            </div>
            <button onClick={confirmLinkDialog} disabled={!dialogUrl.trim()}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest text-white disabled:opacity-40"
              style={{ background: "#b400ff" }}>
              <LinkIcon size={12} /> Insérer le lien
            </button>
          </div>
        </DialogOverlay>
      )}

      {/* ===== DIALOG BOUTON CTA ===== */}
      {dialog === "cta" && (
        <DialogOverlay onClose={() => setDialog(null)} title="Bouton CTA">
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-1.5">URL *</label>
              <input
                type="url"
                autoFocus
                value={dialogUrl}
                onChange={e => setDialogUrl(e.target.value)}
                placeholder="https://toxic-files.com"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white font-mono outline-none"
                style={{ background: "#0d0d0d", border: "1px solid #2a2a2a" }}
                onKeyDown={e => e.key === "Enter" && confirmCtaDialog()}
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-[#555] mb-1.5">Texte du bouton</label>
              <input
                type="text"
                value={dialogText}
                onChange={e => setDialogText(e.target.value)}
                placeholder="Voir les nouveaux beats →"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white font-mono outline-none"
                style={{ background: "#0d0d0d", border: "1px solid #2a2a2a" }}
                onKeyDown={e => e.key === "Enter" && confirmCtaDialog()}
              />
            </div>
            {/* Prévisualisation bouton */}
            <div className="py-3 text-center rounded-xl" style={{ background: "#0d0d0d", border: "1px solid #1a1a1a" }}>
              <span className="inline-block px-6 py-2.5 rounded-lg text-xs font-bold text-white tracking-widest uppercase"
                style={{ background: "#b400ff" }}>
                {dialogText || "Voir les nouveaux beats →"}
              </span>
            </div>
            <button onClick={confirmCtaDialog} disabled={!dialogUrl.trim()}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest text-white disabled:opacity-40"
              style={{ background: "#b400ff" }}>
              <MousePointer2 size={12} /> Insérer le bouton
            </button>
          </div>
        </DialogOverlay>
      )}
    </div>
  );
}

/* ── Toolbar helpers ── */

function ToolbarBtn({ title, onClick, disabled, children }: {
  title: string; onClick?: () => void; disabled?: boolean; children: React.ReactNode;
}) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className="p-2 rounded-lg text-[#555] hover:text-white transition-colors disabled:opacity-40"
      style={{ background: "#111" }}>
      {children}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-5 mx-0.5 self-center" style={{ background: "#2a2a2a" }} />;
}

/* ── Dialog overlay ── */

function DialogOverlay({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
        style={{ background: "#111", border: "1px solid #2a2a2a", boxShadow: "0 24px 64px rgba(0,0,0,0.8)" }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-mono tracking-widest uppercase text-white">{title}</h3>
          <button onClick={onClose} className="text-[#555] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
