"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#2a2a2a] bg-[#080808]/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-2xl font-black tracking-widest text-white group-hover:text-glow-purple transition-all duration-300"
            style={{ textShadow: "0 0 10px rgba(180,0,255,0.6)" }}>
            TOXIC
          </span>
          <span className="text-xs text-[#b400ff] font-mono tracking-[0.3em] uppercase mt-1">Beatmaker</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="/#beats" className="text-sm text-neutral-400 hover:text-[#00f5ff] transition-colors duration-200 tracking-widest uppercase">
            Beats
          </Link>
          <Link href="/#about" className="text-sm text-neutral-400 hover:text-[#00f5ff] transition-colors duration-200 tracking-widest uppercase">
            À propos
          </Link>
          <Link href="/#contact" className="text-sm text-neutral-400 hover:text-[#00f5ff] transition-colors duration-200 tracking-widest uppercase">
            Contact
          </Link>
        </div>

        <button
          className="md:hidden text-neutral-400 hover:text-white"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[#2a2a2a] bg-[#0d0d0d] px-4 py-4 flex flex-col gap-4">
          {["#beats", "#about", "#contact"].map((href) => (
            <Link
              key={href}
              href={`/${href}`}
              onClick={() => setOpen(false)}
              className="text-sm text-neutral-400 hover:text-[#00f5ff] tracking-widest uppercase"
            >
              {href.replace("#", "")}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
