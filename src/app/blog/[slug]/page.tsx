"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";

type Post = {
  id: string;
  title: string;
  slug: string;
  content_html: string;
  excerpt: string;
  cover_url: string | null;
  published_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function readingTime(html: string) {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

export default function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/blog/${slug}`)
      .then(r => {
        if (!r.ok) { setNotFound(true); setLoading(false); return null; }
        return r.json();
      })
      .then(d => { if (d) { setPost(d); setLoading(false); } })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [slug]);

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-200">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-[#1a1a1a] backdrop-blur-md bg-[#080808f2]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/blog" className="flex items-center gap-2 group">
            <ArrowLeft size={16} className="text-neutral-500 group-hover:text-white transition-colors" />
            <span className="text-sm font-mono tracking-widest uppercase text-neutral-500 group-hover:text-white transition-colors">
              Blog
            </span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-black tracking-widest text-white" style={{ textShadow: "0 0 10px #b400ff99" }}>
              TOXIC
            </span>
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase text-[#b400ff]">Beatmaker</span>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-32">
          <Loader2 size={32} className="animate-spin text-[#b400ff]" />
        </div>
      ) : notFound || !post ? (
        <div className="text-center py-32">
          <p className="text-neutral-600 text-lg mb-4">Article introuvable.</p>
          <Link href="/blog" className="text-[#b400ff] font-mono text-sm hover:underline">← Retour au blog</Link>
        </div>
      ) : (
        <article className="max-w-3xl mx-auto px-6 py-12">
          {/* Cover */}
          {post.cover_url && (
            <div className="rounded-2xl overflow-hidden mb-10 aspect-video">
              <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1.5">
              <Calendar size={12} className="text-[#b400ff]" />
              <span className="text-xs font-mono text-neutral-500">{formatDate(post.published_at)}</span>
            </div>
            <span className="text-neutral-700 text-xs">·</span>
            <span className="text-xs font-mono text-neutral-500">{readingTime(post.content_html)} min de lecture</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6" style={{ textShadow: "0 0 40px #b400ff20" }}>
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-neutral-400 text-lg leading-relaxed mb-10 border-l-2 border-[#b400ff] pl-5 italic">
              {post.excerpt}
            </p>
          )}

          <div className="w-full h-px bg-[#1a1a1a] mb-10" />

          {/* Content */}
          <div
            className="prose-blog"
            dangerouslySetInnerHTML={{ __html: post.content_html }}
          />

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-[#1a1a1a] flex items-center justify-between">
            <Link href="/blog" className="flex items-center gap-2 text-neutral-500 hover:text-white transition-colors text-sm font-mono">
              <ArrowLeft size={14} /> Tous les articles
            </Link>
            <Link href="/#beats" className="text-xs font-mono tracking-widest uppercase text-[#b400ff] hover:underline">
              Écouter les beats →
            </Link>
          </div>
        </article>
      )}
    </div>
  );
}
