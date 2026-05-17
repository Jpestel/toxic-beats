"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import LatestReleases from "@/components/LatestReleases";
import BeatCard from "@/components/BeatCard";
import KitCard from "@/components/KitCard";
import CartNotification from "@/components/CartNotification";
import CartModal from "@/components/CartModal";
import type { Beat, Kit, CartItem, BeatCartItem, KitCartItem, GenreConfig, LicenseType } from "@/types";

type ThemeConfig = {
  site_name: string; site_tagline: string;
  hero_subtitle: string; hero_description: string;
  color_accent: string; color_accent2: string; color_accent3: string; color_bg: string;
  card_radius: "none" | "sm" | "md" | "lg";
  beats_per_page: number; grid_cols: number;
  show_about: boolean; show_contact: boolean;
  nav_order: string[];
};
const THEME_DEFAULTS: ThemeConfig = {
  site_name: "TOXIC", site_tagline: "Beatmaker",
  hero_subtitle: "Beats RAP · Trap · Drill · Electro",
  hero_description: "Produit à 100% · Kits exclusifs · Licences disponibles",
  color_accent: "#b400ff", color_accent2: "#00f5ff", color_accent3: "#39ff14", color_bg: "#080808",
  card_radius: "md", beats_per_page: 4, grid_cols: 4, show_about: true, show_contact: true,
  nav_order: ["beats", "kits", "about", "contact"],
};
const RADIUS_MAP = { none: "0px", sm: "8px", md: "16px", lg: "24px" };
const GRID_COLS_CLASS: Record<number, string> = {
  2: "grid-cols-2 lg:grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
};
import { Mail, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, ShoppingCart, User, Package } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SocialIcon, type SocialsConfig } from "@/lib/socialIcons";


export default function HomePage() {
  const [theme, setTheme] = useState<ThemeConfig>(THEME_DEFAULTS);
  const [beats, setBeats] = useState<Beat[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [loadingBeats, setLoadingBeats] = useState(true);
  const [loadingKits, setLoadingKits] = useState(true);
  const [activeGenre, setActiveGenre] = useState("Tous");
  const [activeStatus, setActiveStatus] = useState<"tous" | "available" | "reserved" | "sold">("tous");
  const [beatPage, setBeatPage] = useState(0);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartNotif, setCartNotif] = useState<{ beat: Beat; price: number; licenseType: LicenseType } | null>(null);
  const [showCart, setShowCart] = useState(false);

  const addToCart = (beat: Beat, licenseType: LicenseType = "mp3") => {
    if (beat.status === "sold") return;
    // Autoriser plusieurs licences pour un même beat, mais pas la même licence deux fois
    if (cart.some((i) => i.type === "beat" && i.beat.id === beat.id && i.licenseType === licenseType)) return;
    const price =
      licenseType === "exclusive" ? (beat.exclusive_price ?? beat.price) :
      licenseType === "wav" ? beat.price + (beat.wav_extra ?? 0) :
      beat.price;
    const item: BeatCartItem = { type: "beat", beat, licenseType, price };
    setCart((prev) => [...prev, item]);
    setCartNotif({ beat, price, licenseType });
    // Réservation locale uniquement pour les licences exclusives
    if (licenseType === "exclusive") {
      setBeats((prev) => prev.map((b) => b.id === beat.id ? { ...b, status: "reserved" as const } : b));
    }
  };

  const addKitToCart = (kit: Kit) => {
    if (cart.some((i) => i.type === "kit" && i.kit.id === kit.id)) return;
    const item: KitCartItem = { type: "kit", kit, price: kit.price };
    setCart((prev) => [...prev, item]);
  };

  const removeFromCart = (key: string) => {
    if (key.includes("|")) {
      // Clé composite pour les beats : "beatId|licenseType"
      const [beatId, licenseType] = key.split("|") as [string, LicenseType];
      const item = cart.find((i) => i.type === "beat" && i.beat.id === beatId && i.licenseType === licenseType);
      setCart((prev) => prev.filter((i) => !(i.type === "beat" && i.beat.id === beatId && i.licenseType === licenseType)));
      if (item?.type === "beat" && item.licenseType === "exclusive") {
        setBeats((prev) => prev.map((b) => b.id === beatId ? { ...b, status: "available" as const } : b));
      }
    } else {
      // ID simple pour les kits
      setCart((prev) => prev.filter((i) => !(i.type === "kit" && i.kit.id === key)));
    }
  };
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerFit, setBannerFit] = useState<"cover" | "contain">("cover");
  const [loadingBanner, setLoadingBanner] = useState(true);
  const [bannerLoaded, setBannerLoaded] = useState(false);
  const [bioText, setBioText] = useState<string | null>(null);
  const [bioImageUrl, setBioImageUrl] = useState<string | null>(null);
  const [socials, setSocials] = useState<SocialsConfig | null>(null);
  const [genres, setGenres] = useState<GenreConfig[]>([]);
  const [contactEmail, setContactEmail] = useState<string>("contact@toxic.fr");
  const [coverLibrary, setCoverLibrary] = useState<string[]>([]);
  const [showBackTop, setShowBackTop] = useState(false);
  const bannerImgRef = useRef<HTMLImageElement>(null);

  const handleScroll = useCallback(() => {
    setShowBackTop(window.scrollY > 300);
    if (bannerImgRef.current) {
      bannerImgRef.current.style.transform = `translateY(${window.scrollY * 0.35}px)`;
    }
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Injecter les CSS variables du thème
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent",      theme.color_accent);
    root.style.setProperty("--accent2",     theme.color_accent2);
    root.style.setProperty("--accent3",     theme.color_accent3);
    root.style.setProperty("--bg",          theme.color_bg);
    root.style.setProperty("--card-radius", RADIUS_MAP[theme.card_radius] ?? "16px");
  }, [theme]);

  useEffect(() => {
    document.title = `${theme.site_name || "TOXIC"} | Beatmaker`;
    // Charger le thème
    fetch("/api/settings/theme")
      .then(r => r.json())
      .then(d => setTheme({ ...THEME_DEFAULTS, ...d }))
      .catch(() => {});
    // Charger les beats
    supabase
      .from("beats")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setBeats(data ?? []);
        setLoadingBeats(false);
      });
    // Charger les kits
    fetch("/api/kits")
      .then(r => r.json())
      .then(d => { setKits(Array.isArray(d) ? d : []); setLoadingKits(false); })
      .catch(() => setLoadingKits(false));
    // Charger les réseaux sociaux
    fetch("/api/settings/socials")
      .then(r => r.json())
      .then(d => setSocials(d.config ?? null))
      .catch(() => {});
    // Charger la bio
    fetch("/api/settings/bio")
      .then(r => r.json())
      .then(d => {
        setBioText(d.bio_text ?? null);
        setBioImageUrl(d.bio_image_url ?? null);
      })
      .catch(() => {});
    // Charger les genres
    fetch("/api/settings/genres")
      .then(r => r.json())
      .then(d => setGenres(d.genres ?? []))
      .catch(() => {});
    // Charger la bannière
    fetch("/api/settings/banner")
      .then(r => r.json())
      .then(d => {
        setBannerUrl(d.banner_url ?? null);
        if (d.banner_fit) setBannerFit(d.banner_fit as "cover" | "contain");
        setLoadingBanner(false);
      })
      .catch(() => setLoadingBanner(false));
    // Charger la bibliothèque de covers
    fetch("/api/settings/covers")
      .then(r => r.json())
      .then(d => setCoverLibrary(d.urls ?? []))
      .catch(() => {});
    // Charger l'email de contact
    fetch("/api/settings/site")
      .then(r => r.json())
      .then(d => { if (d.contact_email) setContactEmail(d.contact_email); })
      .catch(() => {});
  }, []);

  const genreColors: Record<string, string> = Object.fromEntries(genres.map(g => [g.name, g.color]));
  const genreCovers: Record<string, string> = Object.fromEntries(genres.filter(g => g.cover_url).map(g => [g.name, g.cover_url!]));
  const genreList = ["Tous", ...genres.map(g => g.name)];

  const filtered = beats
    .filter((b) => b.visible !== false)
    .filter((b) => activeGenre === "Tous" || b.genre === activeGenre)
    .filter((b) => activeStatus === "tous" || b.status === activeStatus);

  const totalPages = Math.ceil(filtered.length / theme.beats_per_page);
  const paginated = filtered.slice(beatPage * theme.beats_per_page, (beatPage + 1) * theme.beats_per_page);

  const setGenre = (g: string) => { setActiveGenre(g); setBeatPage(0); };
  const setStatus = (s: typeof activeStatus) => { setActiveStatus(s); setBeatPage(0); };

  return (
    <div className="min-h-screen grid-bg" style={{ background: theme.color_bg }}>

      {/* ===== BANNIÈRE (tout en haut, pleine largeur) ===== */}
      {bannerUrl && (
        <div className="w-full">
          <div className="relative w-full overflow-hidden bg-black" style={{ aspectRatio: "3/1" }}>
            <img
              ref={bannerImgRef}
              src={bannerUrl}
              alt="TOXIC Beatmaker"
              className="w-full object-center absolute inset-x-0"
              style={{
                height: "130%",
                top: "-15%",
                willChange: "transform",
                objectFit: bannerFit,
              }}
              onLoad={() => setBannerLoaded(true)}
            />
            <div className="absolute bottom-0 left-0 right-0 h-1/3"
              style={{ background: `linear-gradient(to bottom, transparent, ${theme.color_bg})` }}
            />
          </div>
        </div>
      )}

      {/* ===== BARRE DE NAVIGATION (remplace le menu + icônes) ===== */}
      <div className="sticky top-0 z-50 w-full border-b border-[#1a1a1a] backdrop-blur-md" style={{ background: `${theme.color_bg}f2` }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-xl font-black tracking-widest text-white transition-all"
              style={{ textShadow: `0 0 10px ${theme.color_accent}99` }}>
              {theme.site_name || "TOXIC"}
            </span>
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase mt-0.5" style={{ color: theme.color_accent }}>
              {theme.site_tagline || "Beatmaker"}
            </span>
          </Link>

          {/* Actions — ordre défini par nav_order */}
          <div className="flex items-center gap-2">
            {(theme.nav_order ?? ["beats", "kits", "about", "contact"]).map((id) => {
              if (id === "beats") return (
                <button
                  key="beats"
                  onClick={() => cart.length > 0 ? setShowCart(true) : window.location.assign("#beats")}
                  className="relative flex items-center justify-center gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl bg-[#111] border border-[#2a2a2a] transition-all group"
                >
                  <ShoppingCart size={16} className="group-hover:scale-110 transition-transform flex-shrink-0" style={{ color: theme.color_accent }} />
                  <span className="text-xs font-mono tracking-widest text-neutral-400 group-hover:text-white transition-colors uppercase hidden sm:block">
                    {cart.length > 0 ? `Panier (${cart.length})` : "Beats"}
                  </span>
                  {cart.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center sm:hidden"
                      style={{ background: theme.color_accent, color: "#fff" }}>
                      {cart.length}
                    </span>
                  )}
                </button>
              );
              if (id === "kits") return (
                <a
                  key="kits"
                  href="#kits"
                  className="flex items-center justify-center gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl bg-[#111] border border-[#2a2a2a] transition-all group"
                >
                  <Package size={16} className="group-hover:scale-110 transition-transform flex-shrink-0" style={{ color: theme.color_accent2 }} />
                  <span className="text-xs font-mono tracking-widest text-neutral-400 group-hover:text-white transition-colors uppercase hidden sm:block">Kits</span>
                </a>
              );
              if (id === "about" && theme.show_about) return (
                <a
                  key="about"
                  href="#about"
                  className="flex items-center justify-center gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl bg-[#111] border border-[#2a2a2a] transition-all group"
                >
                  <User size={16} className="group-hover:scale-110 transition-transform flex-shrink-0" style={{ color: theme.color_accent2 }} />
                  <span className="text-xs font-mono tracking-widest text-neutral-400 group-hover:text-white transition-colors uppercase hidden sm:block">À propos</span>
                </a>
              );
              if (id === "contact" && theme.show_contact) return (
                <a
                  key="contact"
                  href="#contact"
                  className="flex items-center justify-center gap-2 w-10 h-10 sm:w-auto sm:h-auto sm:px-4 sm:py-2 rounded-xl bg-[#111] border border-[#2a2a2a] transition-all group"
                >
                  <Mail size={16} className="group-hover:scale-110 transition-transform flex-shrink-0" style={{ color: theme.color_accent3 }} />
                  <span className="text-xs font-mono tracking-widest text-neutral-400 group-hover:text-white transition-colors uppercase hidden sm:block">Contact</span>
                </a>
              );
              return null;
            })}
          </div>
        </div>
      </div>

      {/* ===== CONTENU (affiché après chargement bannière, ou sans bannière) ===== */}
      {(bannerLoaded || (!loadingBanner && !bannerUrl)) && <>

      {/* ===== HERO (uniquement sans bannière) ===== */}
      {!bannerUrl && (
        <section className="relative flex flex-col items-center justify-center text-center px-4 overflow-hidden min-h-[calc(100vh-56px)]">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(180,0,255,0.12) 0%, transparent 70%)" }} />
          <div className="absolute top-1/2 left-1/4 w-[300px] h-[300px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(0,245,255,0.06) 0%, transparent 70%)" }} />

          <div className="relative z-10 max-w-4xl mx-auto w-full">
            <p className="text-xs font-mono tracking-[0.4em] uppercase mb-6 pulse-neon" style={{ color: theme.color_accent }}>
              ◆ BEATMAKER ◆
            </p>
            <h1 className="text-7xl md:text-[10rem] font-black tracking-tighter leading-none mb-6">
              <span className="block text-white" style={{ textShadow: `0 0 40px ${theme.color_accent}80, 0 0 80px ${theme.color_accent}33` }}>
                {theme.site_name || "TOXIC"}
              </span>
            </h1>
            <p className="text-neutral-400 text-lg md:text-xl max-w-xl mx-auto mb-4 leading-relaxed">
              {theme.hero_subtitle}
            </p>
            <p className="text-neutral-500 text-sm max-w-md mx-auto mb-10">
              {theme.hero_description}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="#beats"
                className="px-8 py-4 rounded-xl font-bold tracking-wider text-black transition-all hover:scale-105"
                style={{ background: `linear-gradient(135deg, ${theme.color_accent}, ${theme.color_accent}bb)`, boxShadow: `0 0 30px ${theme.color_accent}66` }}
              >
                ÉCOUTER LES BEATS
              </a>
              {theme.show_contact && (
                <a
                  href="#contact"
                  className="px-8 py-4 rounded-xl font-bold tracking-wider border transition-all"
                  style={{ color: theme.color_accent2, borderColor: `${theme.color_accent2}30` }}
                >
                  CONTACT
                </a>
              )}
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
            <ChevronDown size={24} className="text-neutral-600" />
          </div>
        </section>
      )}

      {/* ===== DERNIÈRES SORTIES ===== */}
      {!loadingBeats && <LatestReleases beats={beats} kits={kits} genreCovers={genreCovers} coverLibrary={coverLibrary} />}

      {/* ===== BEATS CATALOG ===== */}
      <section id="beats" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs font-mono tracking-[0.4em] uppercase mb-3" style={{ color: theme.color_accent }}>◆ CATALOGUE ◆</p>
            <h2 className="text-4xl md:text-5xl font-black text-white">MES BEATS</h2>
            <div className="w-24 h-[2px] mx-auto mt-4" style={{ background: `linear-gradient(90deg, transparent, ${theme.color_accent}, transparent)` }} />
          </div>

          {/* Genre filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {genreList.map((g) => {
              const activeColor = g === "Tous" ? theme.color_accent : (genreColors[g] ?? theme.color_accent);
              return (
                <button
                  key={g}
                  onClick={() => setGenre(g)}
                  className="px-4 py-2 rounded-full text-sm font-mono tracking-widest transition-all duration-200"
                  style={
                    activeGenre === g
                      ? { background: activeColor, color: "#fff", boxShadow: `0 0 15px ${activeColor}66` }
                      : { background: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }
                  }
                >
                  {g.toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {(["tous", "available", "reserved", "sold"] as const).map((s) => {
              const labels = { tous: "Tous", available: "Disponible", reserved: "Réservé", sold: "Vendu" };
              const colors = { tous: theme.color_accent, available: "#39ff14", reserved: "#f59e0b", sold: "#888" };
              const isActive = activeStatus === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className="px-3 py-1 rounded-full text-[11px] font-mono tracking-widest transition-all duration-200"
                  style={
                    isActive
                      ? { background: colors[s], color: s === "sold" ? "#111" : "#000", boxShadow: `0 0 10px ${colors[s]}55` }
                      : { background: "#111", color: "#444", border: "1px solid #222" }
                  }
                >
                  {labels[s].toUpperCase()}
                </button>
              );
            })}
          </div>

          {/* Grid */}
          {loadingBeats ? (
            <div className="flex justify-center py-20">
              <Loader2 size={32} className="animate-spin" style={{ color: theme.color_accent }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-neutral-600">
              <p className="text-lg">Aucun beat ne correspond à ces filtres.</p>
            </div>
          ) : (
            <>
              <div className={`grid gap-3 lg:gap-5 mb-8 ${GRID_COLS_CLASS[theme.grid_cols] ?? "grid-cols-2 lg:grid-cols-4"}`}>
                {paginated.map((beat) => (
                  <BeatCard
                    key={beat.id}
                    beat={beat}
                    onBuy={addToCart}
                    cartLicenses={cart
                      .filter((i) => i.type === "beat" && i.beat.id === beat.id)
                      .map((i) => (i as BeatCartItem).licenseType)}
                    genreColors={genreColors}
                    genreCovers={genreCovers}
                    coverLibrary={coverLibrary}
                  />
                ))}
              </div>

              {/* Navigation pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setBeatPage(p => Math.max(0, p - 1))}
                    disabled={beatPage === 0}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs tracking-widest uppercase border transition-all disabled:opacity-25"
                    style={{ background: "#111", borderColor: `${theme.color_accent}50`, color: theme.color_accent }}
                  >
                    <ChevronLeft size={15} /> Précédent
                  </button>

                  {/* Points de page */}
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => (
                      <button
                        key={i}
                        onClick={() => setBeatPage(i)}
                        className="rounded-full transition-all"
                        style={{
                          width: beatPage === i ? 24 : 8,
                          height: 8,
                          background: beatPage === i ? theme.color_accent : "#2a2a2a",
                          boxShadow: beatPage === i ? `0 0 8px ${theme.color_accent}99` : "none",
                        }}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setBeatPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={beatPage === totalPages - 1}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-mono text-xs tracking-widest uppercase border transition-all disabled:opacity-25"
                    style={{ background: "#111", borderColor: `${theme.color_accent}50`, color: theme.color_accent }}
                  >
                    Suivant <ChevronRight size={15} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* ===== KITS ===== */}
      {(loadingKits || kits.length > 0) && (
        <section id="kits" className="py-24 px-4 border-t border-[#1a1a1a]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-mono tracking-[0.4em] text-[#f59e0b] uppercase mb-3">◆ SAMPLES ◆</p>
              <h2 className="text-4xl md:text-5xl font-black text-white flex items-center justify-center gap-3">
                <Package size={36} className="text-[#f59e0b]" />
                KITS
              </h2>
              <div className="w-24 h-[2px] mx-auto mt-4" style={{ background: "linear-gradient(90deg, transparent, #f59e0b, transparent)" }} />
              <p className="text-neutral-500 text-sm mt-3">Collections de samples prêtes à l&apos;emploi · ZIP inclus</p>
            </div>

            {loadingKits ? (
              <div className="flex justify-center py-12">
                <Loader2 size={32} className="text-[#f59e0b] animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
                {kits.map((kit) => (
                  <KitCard
                    key={kit.id}
                    kit={kit}
                    onBuy={addKitToCart}
                    isInCart={cart.some((i) => i.type === "kit" && i.kit.id === kit.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ===== ABOUT ===== */}
      {theme.show_about && (
        <section id="about" className="py-24 px-4 border-t border-[#1a1a1a]">
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-xs font-mono tracking-[0.4em] uppercase mb-3" style={{ color: theme.color_accent2 }}>◆ QUI SUIS-JE ◆</p>
              <h2 className="text-4xl font-black text-white mb-6">{theme.site_name || "TOXIC"}</h2>
              {bioText ? (
                <p className="text-neutral-400 leading-relaxed whitespace-pre-line">{bioText}</p>
              ) : (
                <>
                  <p className="text-neutral-400 leading-relaxed mb-4">
                    Beatmaker passionné, je produis des instrumentales sombres et percutantes pensées pour les rappeurs, chanteurs et artistes en quête d'un son unique.
                  </p>
                  <p className="text-neutral-500 leading-relaxed text-sm">
                    Chaque beat est produit et mixé entièrement dans mon studio. Je travaille sur les ambiances les plus dark, les 808 les plus lourds et les mélodies les plus envoûtantes.
                  </p>
                </>
              )}
            </div>
            <div className="relative">
              <div
                className="aspect-square rounded-2xl bg-[#111] border border-[#2a2a2a] overflow-hidden flex items-center justify-center"
                style={{ boxShadow: `0 0 60px ${theme.color_accent}1a` }}
              >
                {bioImageUrl ? (
                  <img src={bioImageUrl} alt={theme.site_name || "TOXIC"} className="w-full h-full object-cover" />
                ) : (
                  <>
                    <span className="text-[8rem] font-black opacity-20 select-none" style={{ color: theme.color_accent }}>
                      {(theme.site_name || "T")[0]}
                    </span>
                    <div className="absolute inset-0" style={{ background: `radial-gradient(circle at center, ${theme.color_accent}0d 0%, transparent 70%)` }} />
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== CONTACT ===== */}
      {theme.show_contact && (
        <section id="contact" className="py-24 px-4 border-t border-[#1a1a1a]">
          <div className="max-w-2xl mx-auto text-center">
            <p className="text-xs font-mono tracking-[0.4em] uppercase mb-3" style={{ color: theme.color_accent }}>◆ ME CONTACTER ◆</p>
            <h2 className="text-4xl font-black text-white mb-4">TRAVAILLONS ENSEMBLE</h2>
            <p className="text-neutral-500 mb-10">
              Pour une collaboration, une licence exclusive ou une question sur un beat — écris-moi.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-10">
              <a
                href={`mailto:${contactEmail}`}
                className="flex items-center gap-3 px-6 py-4 rounded-xl bg-[#111] border border-[#2a2a2a] transition-all group"
              >
                <Mail size={20} style={{ color: theme.color_accent }} />
                <span className="text-neutral-300 group-hover:text-white transition-colors">{contactEmail}</span>
              </a>
            </div>

            {/* Réseaux sociaux dynamiques */}
            {socials && (() => {
              const activePredefined = socials.predefined.filter(n => n.active && n.url);
              const activeCustom = socials.custom.filter(n => n.active && n.url && n.icon_url);
              const all = [...activePredefined, ...activeCustom];
              if (all.length === 0) return null;
              return (
                <div className="flex flex-wrap justify-center gap-3">
                  {activePredefined.map(net => (
                    <a key={net.id} href={net.url} target="_blank" rel="noopener noreferrer"
                      className="w-12 h-12 rounded-xl bg-[#111] border border-[#2a2a2a] flex items-center justify-center text-neutral-500 transition-all"
                      style={{ ["--hover-color" as string]: theme.color_accent }}>
                      <SocialIcon id={net.id} size={20} />
                    </a>
                  ))}
                  {activeCustom.map(net => (
                    <a key={net.id} href={net.url} target="_blank" rel="noopener noreferrer"
                      title={net.name}
                      className="w-12 h-12 rounded-xl bg-[#111] border border-[#2a2a2a] flex items-center justify-center transition-all overflow-hidden">
                      <img src={net.icon_url} alt={net.name} className="w-5 h-5 object-contain opacity-60 hover:opacity-100 transition-opacity" />
                    </a>
                  ))}
                </div>
              );
            })()}
          </div>
        </section>
      )}

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-[#1a1a1a] py-8 px-4 text-center">
        <p className="text-neutral-700 text-sm font-mono">
          © {new Date().getFullYear()} TOXIC — Tous droits réservés
        </p>
      </footer>

      </> /* fin du bloc conditionnel contenu */}

      {/* ===== NOTIFICATION PANIER ===== */}
      {cartNotif && (
        <CartNotification
          beat={cartNotif.beat}
          price={cartNotif.price}
          licenseType={cartNotif.licenseType}
          cartCount={cart.length}
          onViewCart={() => { setCartNotif(null); setShowCart(true); }}
          onContinue={() => setCartNotif(null)}
        />
      )}

      {/* ===== MODAL PANIER ===== */}
      {showCart && (
        <CartModal
          cart={cart}
          onRemove={removeFromCart}
          onClose={() => setShowCart(false)}
          onClearCart={() => setCart([])}
        />
      )}

      {/* ===== RETOUR EN HAUT ===== */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Retour en haut"
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          background: "linear-gradient(135deg, #b400ff, #9000cc)",
          boxShadow: "0 0 20px rgba(180,0,255,0.5)",
          opacity: showBackTop ? 1 : 0,
          pointerEvents: showBackTop ? "auto" : "none",
          transform: showBackTop ? "translateY(0)" : "translateY(16px)",
        }}
      >
        <ChevronUp size={20} className="text-white" />
      </button>
    </div>
  );
}
