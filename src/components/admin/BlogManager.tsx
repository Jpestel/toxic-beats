"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Plus, Edit2, Trash2, Eye, EyeOff, Loader2, ArrowLeft, Save, Image, Bold, Italic, Link2, Type, ExternalLink } from "lucide-react";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_url: string | null;
  published_at: string;
  visible: boolean;
  content_html: string;
  created_at: string;
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function getToken() {
  return typeof window !== "undefined" ? (localStorage.getItem("toxic_auth_token") ?? "") : "";
}

// ——— Toolbar button ———
function Btn({ title, onClick, active, children }: { title: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className="flex items-center justify-center w-7 h-7 rounded text-xs font-bold transition-all"
      style={{ background: active ? "#b400ff22" : "transparent", color: active ? "#b400ff" : "#888" }}
    >
      {children}
    </button>
  );
}

export default function BlogManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "edit">("list");
  const [editing, setEditing] = useState<Post | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [error, setError] = useState("");
  const [slugManual, setSlugManual] = useState(false);

  // Form fields
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [publishedAt, setPublishedAt] = useState("");
  const [visible, setVisible] = useState(true);

  const editorRef = useRef<HTMLDivElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const token = getToken();
    const res = await fetch("/api/admin/blog", { headers: { authorization: `Bearer ${token}` } });
    const data = await res.json();
    setPosts(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditing(null);
    setTitle(""); setSlug(""); setExcerpt(""); setCoverUrl("");
    setPublishedAt(new Date().toISOString().slice(0, 16));
    setVisible(true); setSlugManual(false); setError("");
    if (editorRef.current) editorRef.current.innerHTML = "";
    setView("edit");
  }

  function openEdit(p: Post) {
    setEditing(p);
    setTitle(p.title); setSlug(p.slug); setExcerpt(p.excerpt ?? "");
    setCoverUrl(p.cover_url ?? "");
    setPublishedAt(new Date(p.published_at).toISOString().slice(0, 16));
    setVisible(p.visible); setSlugManual(true); setError("");
    if (editorRef.current) editorRef.current.innerHTML = p.content_html ?? "";
    setView("edit");
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!slugManual) setSlug(slugify(v));
  }

  async function save() {
    if (!title.trim() || !slug.trim()) { setError("Titre et slug requis."); return; }
    setSaving(true); setError("");
    const token = getToken();
    const body = {
      title: title.trim(),
      slug: slug.trim(),
      excerpt: excerpt.trim(),
      cover_url: coverUrl || null,
      published_at: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
      visible,
      content_html: editorRef.current?.innerHTML ?? "",
    };
    const url = editing ? `/api/admin/blog/${editing.id}` : "/api/admin/blog";
    const method = editing ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Erreur."); setSaving(false); return; }
    await load();
    setView("list");
    setSaving(false);
  }

  async function toggleVisible(p: Post) {
    const token = getToken();
    await fetch(`/api/admin/blog/${p.id}`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !p.visible }),
    });
    setPosts(prev => prev.map(x => x.id === p.id ? { ...x, visible: !x.visible } : x));
  }

  async function deletePost(id: string) {
    if (!confirm("Supprimer cet article ?")) return;
    setDeleting(id);
    const token = getToken();
    await fetch(`/api/admin/blog/${id}`, { method: "DELETE", headers: { authorization: `Bearer ${token}` } });
    setPosts(prev => prev.filter(x => x.id !== id));
    setDeleting(null);
  }

  // Cover image upload
  async function uploadCover(file: File) {
    setUploadingCover(true);
    const token = getToken();
    const form = new FormData(); form.append("file", file);
    const res = await fetch("/api/admin/newsletter/upload-image", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
    const data = await res.json();
    if (data.url) setCoverUrl(data.url);
    setUploadingCover(false);
  }

  // Inline image upload (into editor)
  async function uploadInlineImage(file: File) {
    setUploadingImg(true);
    const token = getToken();
    const form = new FormData(); form.append("file", file);
    const res = await fetch("/api/admin/newsletter/upload-image", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
    const data = await res.json();
    if (data.url && editorRef.current) {
      editorRef.current.focus();
      document.execCommand("insertHTML", false, `<img src="${data.url}" alt="" style="max-width:100%;border-radius:8px;margin:12px 0;" />`);
    }
    setUploadingImg(false);
  }

  function execCmd(cmd: string, val?: string) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
  }

  function insertH2() {
    editorRef.current?.focus();
    document.execCommand("formatBlock", false, "h2");
  }

  function insertLink() {
    const url = prompt("URL du lien :");
    if (!url) return;
    const text = window.getSelection()?.toString() || url;
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#b400ff;">${text}</a>`);
  }

  // ——— LIST VIEW ———
  if (view === "list") {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black text-white">Blog / Actus</h2>
            <p className="text-xs text-neutral-600 font-mono mt-0.5">{posts.length} article{posts.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-white transition-all hover:scale-105"
            style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px #b400ff44" }}
          >
            <Plus size={14} /> Nouvel article
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#b400ff]" /></div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-neutral-600">
            <p className="mb-3">Aucun article.</p>
            <button onClick={openNew} className="text-[#b400ff] text-sm hover:underline">Créer le premier article →</button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl bg-[#111] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-all">
                {/* Cover thumb */}
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-[#1a1a1a] flex-shrink-0">
                  {p.cover_url
                    ? <img src={p.cover_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#1a001a,#0d0d0d)" }}><span className="text-[8px] font-black text-[#b400ff] opacity-40">TOXIC</span></div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{p.title}</p>
                  <p className="text-xs text-neutral-600 font-mono mt-0.5">{formatDate(p.published_at)} · /blog/{p.slug}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors text-neutral-600 hover:text-white hover:bg-[#1a1a1a]">
                    <ExternalLink size={14} />
                  </a>
                  <button onClick={() => toggleVisible(p)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors hover:bg-[#1a1a1a]"
                    style={{ color: p.visible ? "#39ff14" : "#555" }}
                    title={p.visible ? "Masquer" : "Publier"}>
                    {p.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button onClick={() => openEdit(p)}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-500 hover:text-white hover:bg-[#1a1a1a] transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => deletePost(p.id)} disabled={deleting === p.id}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-600 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                    {deleting === p.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ——— EDIT VIEW ———
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setView("list")} className="flex items-center gap-1.5 text-neutral-500 hover:text-white transition-colors text-sm font-mono">
          <ArrowLeft size={14} /> Articles
        </button>
        <span className="text-neutral-700">·</span>
        <span className="text-sm text-neutral-400">{editing ? "Modifier" : "Nouvel article"}</span>
      </div>

      <div className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-[#b400ff] mb-1.5">Titre *</label>
          <input
            type="text"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Titre de l'article"
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff80] transition-colors"
          />
        </div>

        {/* Slug */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1.5">Slug (URL)</label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-600 font-mono flex-shrink-0">/blog/</span>
            <input
              type="text"
              value={slug}
              onChange={e => { setSlug(slugify(e.target.value)); setSlugManual(true); }}
              placeholder="mon-article"
              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff80] transition-colors font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1.5">Date de publication</label>
            <input
              type="datetime-local"
              value={publishedAt}
              onChange={e => setPublishedAt(e.target.value)}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff80] transition-colors"
              style={{ colorScheme: "dark" }}
            />
          </div>
          {/* Visible */}
          <div className="flex items-end">
            <label className="flex items-center gap-3 cursor-pointer pb-1">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={visible} onChange={e => setVisible(e.target.checked)} />
                <div className="w-10 h-5 rounded-full transition-colors" style={{ background: visible ? "#b400ff" : "#333" }} />
                <div className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform" style={{ transform: visible ? "translateX(22px)" : "translateX(2px)" }} />
              </div>
              <span className="text-sm text-neutral-400">Article publié</span>
            </label>
          </div>
        </div>

        {/* Cover */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1.5">Image de couverture</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={coverUrl}
              onChange={e => setCoverUrl(e.target.value)}
              placeholder="https://... ou upload"
              className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#b400ff80] transition-colors"
            />
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-mono uppercase tracking-widest border border-[#2a2a2a] text-neutral-400 hover:text-white hover:border-[#444] transition-colors"
            >
              {uploadingCover ? <Loader2 size={13} className="animate-spin" /> : <Image size={13} />}
              Upload
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && uploadCover(e.target.files[0])} />
          </div>
          {coverUrl && (
            <div className="mt-2 rounded-xl overflow-hidden" style={{ maxHeight: 160 }}>
              <img src={coverUrl} alt="Cover" className="w-full object-cover" style={{ maxHeight: 160 }} />
            </div>
          )}
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1.5">Extrait (affiché sur la liste)</label>
          <textarea
            rows={2}
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="Courte description de l'article..."
            className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff80] transition-colors resize-none"
          />
        </div>

        {/* Content editor */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-widest text-neutral-500 mb-1.5">Contenu</label>

          {/* Toolbar */}
          <div className="flex items-center gap-0.5 px-2 py-1.5 bg-[#111] border border-[#2a2a2a] border-b-0 rounded-t-xl">
            <Btn title="Gras" onClick={() => execCmd("bold")}><Bold size={12} /></Btn>
            <Btn title="Italique" onClick={() => execCmd("italic")}><Italic size={12} /></Btn>
            <div className="w-px h-4 bg-[#2a2a2a] mx-1" />
            <Btn title="Titre H2" onClick={insertH2}><Type size={12} /></Btn>
            <div className="w-px h-4 bg-[#2a2a2a] mx-1" />
            <Btn title="Lien" onClick={insertLink}><Link2 size={12} /></Btn>
            <div className="w-px h-4 bg-[#2a2a2a] mx-1" />
            <button
              type="button"
              title="Image"
              onMouseDown={e => { e.preventDefault(); imgInputRef.current?.click(); }}
              disabled={uploadingImg}
              className="flex items-center justify-center w-7 h-7 rounded text-xs font-bold transition-all text-neutral-500 hover:text-[#b400ff]"
            >
              {uploadingImg ? <Loader2 size={12} className="animate-spin" /> : <Image size={12} />}
            </button>
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => e.target.files?.[0] && uploadInlineImage(e.target.files[0])} />
          </div>

          {/* Editor */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="min-h-[320px] bg-[#0d0d0d] border border-[#2a2a2a] rounded-b-xl px-5 py-4 text-neutral-300 text-sm leading-relaxed focus:outline-none focus:border-[#b400ff44] transition-colors prose-blog"
            style={{ wordBreak: "break-word" }}
            onInput={() => {}}
          />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setView("list")} className="text-sm text-neutral-600 hover:text-white font-mono transition-colors">
            Annuler
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #b400ff, #9000cc)", boxShadow: "0 0 20px #b400ff44" }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? "Enregistrement…" : editing ? "Mettre à jour" : "Publier"}
          </button>
        </div>
      </div>
    </div>
  );
}
