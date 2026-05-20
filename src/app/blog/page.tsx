"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Loader2 } from "lucide-react";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_url: string | null;
  published_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default function BlogPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/blog")
      .then(r => r.json())
      .then(d => { setPosts(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-neutral-200">
      {/* Header */}
      <div className="sticky top-0 z-50 border-b border-[#1a1a1a] backdrop-blur-md bg-[#080808f2]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <ArrowLeft size={16} className="text-neutral-500 group-hover:text-white transition-colors" />
            <span className="text-sm font-mono tracking-widest uppercase text-neutral-500 group-hover:text-white transition-colors">
              Retour
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

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Titre */}
        <div className="text-center mb-14">
          <p className="text-xs font-mono tracking-[0.4em] uppercase mb-3 text-[#b400ff]">◆ ACTUALITÉS ◆</p>
          <h1 className="text-5xl md:text-6xl font-black text-white">LE BLOG</h1>
          <div className="w-24 h-[2px] mx-auto mt-4" style={{ background: "linear-gradient(90deg, transparent, #b400ff, transparent)" }} />
          <p className="text-neutral-500 text-sm mt-4">Nouvelles sorties, studio, techniques et actus</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-[#b400ff]" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 text-neutral-600">
            <p className="text-lg">Aucun article pour l&apos;instant.</p>
            <p className="text-sm mt-2">Reviens bientôt !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map(post => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="group block rounded-2xl overflow-hidden bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#b400ff44] transition-all duration-300 hover:scale-[1.02]"
                style={{ boxShadow: "0 0 0 transparent" }}
              >
                {/* Cover */}
                <div className="aspect-video overflow-hidden bg-[#111] relative">
                  {post.cover_url ? (
                    <img
                      src={post.cover_url}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: "linear-gradient(135deg, #1a001a, #0d0d0d)" }}>
                      <span className="text-4xl font-black opacity-10 text-[#b400ff]">TOXIC</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent opacity-60" />
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Calendar size={11} className="text-[#b400ff]" />
                    <span className="text-[11px] font-mono text-neutral-600">{formatDate(post.published_at)}</span>
                  </div>
                  <h2 className="font-black text-white text-lg leading-tight mb-2 group-hover:text-[#b400ff] transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="text-neutral-500 text-sm leading-relaxed line-clamp-3">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-1 mt-4 text-[#b400ff] text-xs font-mono uppercase tracking-widest">
                    <span>Lire</span>
                    <ArrowLeft size={11} className="rotate-180" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
