"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
};

export default function Pagination({ page, total, pageSize, onChange }: Props) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages: (number | "…")[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "…") {
      pages.push("…");
    }
  }

  return (
    <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#1a1a1a]">
      <span className="text-xs text-neutral-600 font-mono">
        {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} sur {total}
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft size={15} />
        </button>
        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`ellipsis-${i}`} className="w-8 text-center text-neutral-600 text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className="w-8 h-8 rounded-lg text-xs font-mono font-bold transition-all"
              style={p === page
                ? { background: "#b400ff", color: "#fff" }
                : { color: "#555", background: "transparent" }
              }
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-white hover:bg-[#1a1a1a] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
