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
import { Mail, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Loader2, ShoppingCart, User, Package, Music2, BookOpen, Menu, X, Mic2 } from "lucide-react";
import { SocialIcon, type SocialsConfig } from "@/lib/socialIcons";
import { PLATFORMS, PlatformIcon, type PlatformLink } from "@/lib/platforms";

type Credit = {
  id: string; artist_name: string; project_title: string; project_type: string;
  beat_title: string; release_date: string; cover_url: string | null;
  platforms: PlatformLink[]; description: string; visible: boolean;
};


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

    const existingItem = cart.find((i) => i.type === "beat" && i.beat.id === beat.id);

    // Si l'Exclusive est déjà dans le panier, bloquer l'ajout de MP3/WAV
    if (existingItem?.type === "beat" && existingItem.licenseType === "exclusive" && licenseType !== "exclusive") return;

    // Si on ajoute la même licence déjà présente, ne rien faire
    if (existingItem?.type === "beat" && existingItem.licenseType === licenseType) return;

    const price =
      licenseType === "exclusive" ? (beat.exclusive_price ?? beat.price) :
      licenseType === "wav" ? beat.price + (beat.wav_extra ?? 0) :
      beat.price;
    const item: BeatCartItem = { type: "beat", beat, licenseType, price };

    // Remplacer l'ancienne licence par la nouvelle (un seul item par beat)
    setCart((prev) => {
      const filtered = prev.filter((i) => !(i.type === "beat" && i.beat.id === beat.id));
      return [...filtered, item];
    });

    setCartNotif({ beat, price, licenseType });

    // Réservation locale uniquement pour les licences exclusives
    if (licenseType === "exclusive") {
      setBeats((prev) => prev.map((b) => b.id === beat.id ? { ...b, status: "reserved" as const } : b));
    } else if (existingItem?.type === "beat" && existingItem.licenseType === "exclusive") {
      // Si on remplaçait un exclusive par une licence inférieure (ne devrait pas arriver), libérer la réservation
      setBeats((prev) => prev.map((b) => b.id === beat.id ? { ...b, status: "available" as const } : b));
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
      setCart((prev) => prev.filter((i) => !(i.type === "beat" && i.beat.id === beatId)));
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
  const [credits, setCredits] = useState<Credit[]>([]);
  const [showBackTop, setShowBackTop] = useState(false);

  // Formulaire de contact
  const [contactName, setContactName] = useState("");
  const [contactFormEmail, setContactFormEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactHoneypot, setContactHoneypot] = useState(""); // anti-bot, caché
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  const [latestPosts, setLatestPosts] = useState<{ id: string; title: string; slug: string; excerpt: string; cover_url: string | null; published_at: string }[]>([]);

  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterLoading, setNewsletterLoading] = useState(false);
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "success" | "error" | "already">("idle");
  const [newsletterError, setNewsletterError] = useState("");
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
    fetch("/api/beats")
      .then(r => r.json())
      .then(data => { setBeats(Array.isArray(data) ? data : []); setLoadingBeats(false); })
      .catch(() => setLoadingBeats(false));
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
    // Charger les productions / crédits
    fetch("/api/settings/credits")
      .then(r => r.json())
      .then(d => setCredits((d.credits ?? []).filter((c: Credit) => c.visible)))
      .catch(() => {});
    // Charger les derniers articles de blog
    fetch("/api/blog")
      .then(r => r.json())
      .then(d => setLatestPosts((Array.isArray(d) ? d : []).slice(0, 3)))
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
          <Link href="/" className="flex items-center gap-2 group shrink-0">
            <span className="text-xl font-black tracking-widest text-white transition-all"
              style={{ textShadow: `0 0 10px ${theme.color_accent}99` }}>
              {theme.site_name || "TOXIC"}
            </span>
            <span className="text-[10px] font-mono tracking-[0.3em] uppercase mt-0.5 hidden sm:block" style={{ color: theme.color_accent }}>
              {theme.site_tagline || "Beatmaker"}
            </span>
          </Link>

          {/* ── DESKTOP NAV ── */}
          <div className="hidden sm:flex items-center gap-2">
            {(theme.nav_order ?? ["beats", "kits", "about", "contact"]).map((id) => {
              if (id === "beats") return (
                <button key="beats" onClick={() => cart.length > 0 ? setShowCart(true) : window.location.assign("#beats")}
                  className="relative flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111] border border-[#2a2a2a] transition-all group">
                  <ShoppingCart size={16} className="group-hover:scale-110 transition-transform" style={{ color: theme.color_accent }} />
                  <span className="text-xs font-mono tracking-widest text-neutral-400 group-hover:text-white transition-colors uppercase">
                    {cart.length > 0 ? `Panier (${cart.length})` : "Beats"}
                  </span>
                </button>
              );
              if (id === "kits") return (
                <a key="kits" href="#kits" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111] border border-[#2a2a2a] transition-all group">
                  <Package size={16} className="group-hover:scale-110 transition-transform" style={{ color: theme.color_accent2 }} />
                  <span className="text-xs font-mono tracking-widest text-neutral-400 group-hover:text-white transition-colors uppercase">Kits</span>
                </a>
              );
              if (id === "about" && theme.show_about) return (
                <a key="about" href="#about" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111] border border-[#2a2a2a] transition-all group">
                  <User size={16} className="group-hover:scale-110 transition-transform" style={{ color: theme.color_accent2 }} />
                  <span className="text-xs font-mono tracking-widest text-neutral-400 group-hover:text-white transition-colors uppercase">À propos</span>
                </a>
              );
              if (id === "contact" && theme.show_contact) return (
                <a key="contact" href="#contact" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111] border border-[#2a2a2a] transition-all group">
                  <Mail size={16} className="group-hover:scale-110 transition-transform" style={{ color: theme.color_accent3 }} />
                  <span className="text-xs font-mono tracking-widest text-neutral-400 group-hover:text-white transition-colors uppercase">Contact</span>
                </a>
              );
              return null;
            })}
            <Link href="/blog" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111] border border-[#2a2a2a] transition-all group">
              <BookOpen size={16} className="group-hover:scale-110 transition-transform" style={{ color: theme.color_accent }} />
              <span className="text-xs font-mono tracking-widest text-neutral-400 group-hover:text-white transition-colors uppercase">Actus</span>
            </Link>
            <Link href="/mon-compte" className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111] border border-[#2a2a2a] transition-all group">
              <User size={16} className="group-hover:scale-110 transition-transform text-neutral-400 group-hover:text-white" />
              <span className="text-xs font-mono tracking-widest text-neutral-400 group-hover:text-white transition-colors uppercase">Mon compte</span>
            </Link>
          </div>

          {/* ── MOBILE : panier + burger ── */}
          <div className="flex sm:hidden items-center gap-2">
            {/* Panier toujours visible */}
            <button onClick={() => cart.length > 0 ? setShowCart(true) : window.location.assign("#beats")}
              className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-[#111] border border-[#2a2a2a]">
              <ShoppingCart size={16} style={{ color: theme.color_accent }} />
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
                  style={{ background: theme.color_accent, color: "#fff" }}>
                  {cart.length}
                </span>
              )}
            </button>
            {/* Burger */}
            <button onClick={() => setMenuOpen(o => !o)}
              className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#111] border border-[#2a2a2a] text-neutral-400">
              {menuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </div>

      {/* ===== MENU MOBILE ===== */}
      {menuOpen && (
        <div className="sm:hidden fixed inset-0 z-[60] flex flex-col" style={{ background: `${theme.color_bg}f5`, backdropFilter: "blur(12px)" }}>
          {/* Header du menu */}
          <div className="h-14 flex items-center justify-between px-6 border-b border-[#1a1a1a]">
            <span className="text-lg font-black tracking-widest text-white">MENU</span>
            <button onClick={() => setMenuOpen(false)} className="flex items-center justify-center w-9 h-9 rounded-xl bg-[#111] border border-[#2a2a2a] text-neutral-400">
              <X size={18} />
            </button>
          </div>

          {/* Items */}
          <nav className="flex flex-col gap-2 p-6 flex-1 overflow-y-auto">
            {(theme.nav_order ?? ["beats", "kits", "about", "contact"]).map((id) => {
              if (id === "beats") return (
                <button key="beats" onClick={() => { setMenuOpen(false); window.location.assign("#beats"); }}
                  className="flex items-center gap-4 w-full px-5 py-4 rounded-2xl bg-[#111] border border-[#1a1a1a] text-left">
                  <ShoppingCart size={20} style={{ color: theme.color_accent }} />
                  <span className="font-bold text-white tracking-widest uppercase text-sm">Beats</span>
                </button>
              );
              if (id === "kits") return (
                <a key="kits" href="#kits" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#111] border border-[#1a1a1a]">
                  <Package size={20} style={{ color: theme.color_accent2 }} />
                  <span className="font-bold text-white tracking-widest uppercase text-sm">Kits</span>
                </a>
              );
              if (id === "about" && theme.show_about) return (
                <a key="about" href="#about" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#111] border border-[#1a1a1a]">
                  <User size={20} style={{ color: theme.color_accent2 }} />
                  <span className="font-bold text-white tracking-widest uppercase text-sm">À propos</span>
                </a>
              );
              if (id === "contact" && theme.show_contact) return (
                <a key="contact" href="#contact" onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#111] border border-[#1a1a1a]">
                  <Mail size={20} style={{ color: theme.color_accent3 }} />
                  <span className="font-bold text-white tracking-widest uppercase text-sm">Contact</span>
                </a>
              );
              return null;
            })}
            <Link href="/blog" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#111] border border-[#1a1a1a]">
              <BookOpen size={20} style={{ color: theme.color_accent }} />
              <span className="font-bold text-white tracking-widest uppercase text-sm">Actus</span>
            </Link>
            <Link href="/sur-demande" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl border"
              style={{ background: "#1a001a", borderColor: "#b400ff44" }}>
              <Mic2 size={20} style={{ color: theme.color_accent }} />
              <span className="font-bold tracking-widest uppercase text-sm" style={{ color: theme.color_accent }}>Beat sur mesure</span>
            </Link>
            <Link href="/mon-compte" onClick={() => setMenuOpen(false)}
              className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-[#111] border border-[#1a1a1a]">
              <User size={20} className="text-neutral-400" />
              <span className="font-bold text-white tracking-widest uppercase text-sm">Mon compte</span>
            </Link>
          </nav>

          {/* Footer du menu */}
          <div className="px-6 pb-8 pt-4 border-t border-[#1a1a1a] text-center">
            <p className="text-xs font-mono text-neutral-700">© {new Date().getFullYear()} {theme.site_name || "TOXIC"}</p>
          </div>
        </div>
      )}

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

      {/* ===== PRODUCTIONS / CRÉDITS ===== */}
      {credits.length > 0 && (
        <section id="productions" className="py-24 px-4 border-t border-[#1a1a1a]">
          <div className="max-w-6xl mx-auto">
            {/* Titre */}
            <div className="text-center mb-12">
              <p className="text-xs font-mono tracking-[0.3em] uppercase mb-2 flex items-center justify-center gap-2" style={{ color: theme.color_accent }}>
                <span>◆</span> MES PRODUCTIONS <span>◆</span>
              </p>
              <h2 className="text-4xl md:text-5xl font-black text-white">
                ILS ONT UTILISÉ MES BEATS
              </h2>
              <div className="w-16 h-0.5 mx-auto mt-4" style={{ background: `linear-gradient(90deg, transparent, ${theme.color_accent}, transparent)` }} />
            </div>

            {/* Grille */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {credits.map(credit => (
                <div key={credit.id} className="group relative rounded-2xl overflow-hidden bg-[#111] border border-[#2a2a2a] transition-all duration-300 hover:border-[#3a3a3a] hover:scale-[1.02]"
                  style={{ aspectRatio: "1/1" }}>
                  {/* Artwork */}
                  {credit.cover_url ? (
                    <img src={credit.cover_url} alt={`${credit.artist_name} — ${credit.project_title}`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg, ${theme.color_accent}20, ${theme.color_accent2}10)` }}>
                      <Music2 size={40} className="text-neutral-700" />
                    </div>
                  )}

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  {/* Badge type */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded-full tracking-widest uppercase"
                      style={{ background: `${theme.color_accent}cc`, color: "#fff" }}>
                      {credit.project_type}
                    </span>
                  </div>

                  {/* Contenu bas */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <p className="text-white font-black text-sm leading-tight truncate">{credit.artist_name}</p>
                    <p className="text-neutral-300 text-xs truncate mt-0.5">{credit.project_title}</p>
                    {credit.beat_title && (
                      <p className="text-[10px] font-mono mt-1 truncate" style={{ color: theme.color_accent }}>
                        Prod. TOXIC · {credit.beat_title}
                      </p>
                    )}
                    {credit.release_date && (
                      <p className="text-[10px] text-neutral-600 font-mono mt-0.5">
                        {new Date(credit.release_date + "-01").toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                      </p>
                    )}

                    {/* Plateformes */}
                    {credit.platforms.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {credit.platforms.filter(p => p.url).map(p => {
                          const pl = PLATFORMS.find(pl => pl.id === p.id);
                          return (
                            <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
                              onClick={e => e.stopPropagation()}
                              className="flex items-center justify-center w-6 h-6 rounded-full transition-transform hover:scale-110"
                              style={{ background: `${pl?.color ?? "#888"}25`, color: pl?.color ?? "#888" }}
                              title={pl?.label ?? p.id}>
                              <PlatformIcon id={p.id} size={12} />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs font-mono tracking-[0.4em] uppercase mb-3" style={{ color: theme.color_accent }}>◆ ME CONTACTER ◆</p>
              <h2 className="text-4xl font-black text-white mb-4">TRAVAILLONS ENSEMBLE</h2>
              <p className="text-neutral-500">
                Pour une collaboration, une licence exclusive ou une question sur un beat — envoie-moi un message.
              </p>
            </div>

            {contactSuccess ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">✅</div>
                <p className="text-white font-bold text-lg mb-2">Message envoyé !</p>
                <p className="text-neutral-500 text-sm">Je te répondrai dès que possible.</p>
                <button
                  onClick={() => { setContactSuccess(false); setContactName(""); setContactFormEmail(""); setContactMessage(""); setContactHoneypot(""); }}
                  className="mt-6 text-xs font-mono tracking-widest uppercase text-neutral-500 hover:text-white transition-colors"
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setContactLoading(true);
                  setContactError("");
                  try {
                    const res = await fetch("/api/contact", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        name: contactName,
                        email: contactFormEmail,
                        message: contactMessage,
                        honeypot: contactHoneypot,
                      }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                      setContactSuccess(true);
                    } else {
                      setContactError(data.error || "Une erreur est survenue.");
                    }
                  } catch {
                    setContactError("Impossible de contacter le serveur.");
                  } finally {
                    setContactLoading(false);
                  }
                }}
                className="flex flex-col gap-4"
              >
                {/* Honeypot anti-bot — caché aux humains */}
                <div style={{ display: "none" }} aria-hidden="true">
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={contactHoneypot}
                    onChange={e => setContactHoneypot(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: theme.color_accent }}>Ton nom *</label>
                    <input
                      type="text"
                      required
                      value={contactName}
                      onChange={e => setContactName(e.target.value)}
                      placeholder="Artiste / Rappeur"
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors placeholder-neutral-700"
                      style={{ ["--tw-ring-color" as string]: theme.color_accent }}
                      onFocus={e => (e.target.style.borderColor = theme.color_accent + "80")}
                      onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: theme.color_accent }}>Ton email *</label>
                    <input
                      type="email"
                      required
                      value={contactFormEmail}
                      onChange={e => setContactFormEmail(e.target.value)}
                      placeholder="ton@email.com"
                      className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors placeholder-neutral-700"
                      onFocus={e => (e.target.style.borderColor = theme.color_accent + "80")}
                      onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest mb-1.5" style={{ color: theme.color_accent }}>Message *</label>
                  <textarea
                    required
                    rows={5}
                    value={contactMessage}
                    onChange={e => setContactMessage(e.target.value)}
                    placeholder="Parle-moi de ton projet, du beat qui t'intéresse..."
                    className="w-full bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none transition-colors placeholder-neutral-700 resize-none"
                    onFocus={e => (e.target.style.borderColor = theme.color_accent + "80")}
                    onBlur={e => (e.target.style.borderColor = "#2a2a2a")}
                  />
                </div>

                {contactError && (
                  <p className="text-red-400 text-sm text-center">{contactError}</p>
                )}

                <button
                  type="submit"
                  disabled={contactLoading}
                  className="flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm tracking-wider text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: `linear-gradient(135deg, ${theme.color_accent}, ${theme.color_accent}bb)`, boxShadow: `0 0 24px ${theme.color_accent}44` }}
                >
                  {contactLoading
                    ? <><Loader2 size={16} className="animate-spin" /> Envoi en cours…</>
                    : <><Mail size={16} /> Envoyer le message</>
                  }
                </button>
              </form>
            )}

            {/* Réseaux sociaux */}
            {socials && (() => {
              const activePredefined = socials.predefined.filter(n => n.active && n.url);
              const activeCustom = socials.custom.filter(n => n.active && n.url && n.icon_url);
              if ([...activePredefined, ...activeCustom].length === 0) return null;
              return (
                <div className="flex flex-wrap justify-center gap-3 mt-10 pt-10 border-t border-[#1a1a1a]">
                  {activePredefined.map(net => (
                    <a key={net.id} href={net.url} target="_blank" rel="noopener noreferrer"
                      className="w-12 h-12 rounded-xl bg-[#111] border border-[#2a2a2a] flex items-center justify-center text-neutral-500 transition-all hover:border-[#444] hover:text-white">
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

      {/* ===== BEAT SUR MESURE CTA ===== */}
      <section className="py-20 px-4 border-t border-[#1a1a1a]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-xs font-mono tracking-[0.4em] uppercase mb-3" style={{ color: theme.color_accent }}>◆ EXCLUSIF ◆</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4">BEAT SUR MESURE</h2>
          <p className="text-neutral-400 mb-8 leading-relaxed">
            Tu veux un son unique, produit spécialement pour ton projet ?<br className="hidden sm:block" />
            Décris-moi ta vision — je m&apos;occupe du reste.
          </p>
          <Link
            href="/sur-demande"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold tracking-wider text-white transition-all hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${theme.color_accent}, ${theme.color_accent}bb)`, boxShadow: `0 0 40px ${theme.color_accent}44` }}
          >
            <Mic2 size={18} /> Faire une demande
          </Link>
        </div>
      </section>

      {/* ===== BLOG / ACTUS ===== */}
      {latestPosts.length > 0 && (
        <section id="actus" className="py-24 px-4 border-t border-[#1a1a1a]">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="text-xs font-mono tracking-[0.4em] uppercase mb-2" style={{ color: theme.color_accent }}>◆ ACTUALITÉS ◆</p>
                <h2 className="text-4xl font-black text-white">LE BLOG</h2>
              </div>
              <Link href="/blog" className="text-xs font-mono tracking-widest uppercase text-neutral-500 hover:text-white transition-colors flex items-center gap-1">
                Tous les articles <ChevronRight size={13} />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {latestPosts.map(post => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group block rounded-2xl overflow-hidden bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#b400ff44] transition-all duration-300 hover:scale-[1.02]"
                >
                  <div className="aspect-video overflow-hidden bg-[#111] relative">
                    {post.cover_url ? (
                      <img src={post.cover_url} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a001a, #0d0d0d)" }}>
                        <span className="text-3xl font-black opacity-10" style={{ color: theme.color_accent }}>TOXIC</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <p className="text-[10px] font-mono text-neutral-600 mb-2">
                      {new Date(post.published_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                    <h3 className="font-black text-white leading-tight mb-2 group-hover:text-[#b400ff] transition-colors line-clamp-2">{post.title}</h3>
                    {post.excerpt && <p className="text-neutral-500 text-xs leading-relaxed line-clamp-2">{post.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ===== NEWSLETTER ===== */}
      <section id="newsletter" className="py-24 px-4 border-t border-[#1a1a1a]">
        <div className="max-w-xl mx-auto text-center">
          <p className="text-xs font-mono tracking-[0.4em] uppercase mb-3" style={{ color: theme.color_accent }}>◆ NEWSLETTER ◆</p>
          <h2 className="text-3xl md:text-4xl font-black text-white mb-3">RESTE DANS LA BOUCLE</h2>
          <p className="text-neutral-500 text-sm mb-8">
            Nouveaux beats, kits exclusifs et actus en avant-première — directement dans ta boîte mail.
          </p>

          {newsletterStatus === "success" ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-4xl">📧</div>
              <p className="text-white font-bold">Vérifie ta boîte mail !</p>
              <p className="text-neutral-500 text-sm">Un email de confirmation t&apos;a été envoyé. Clique sur le lien pour valider ton inscription.</p>
            </div>
          ) : newsletterStatus === "already" ? (
            <div className="flex flex-col items-center gap-4">
              <div className="text-4xl">✅</div>
              <p className="text-white font-bold">Tu es déjà inscrit(e) !</p>
              <p className="text-neutral-500 text-sm">Cette adresse email est déjà dans notre liste.</p>
            </div>
          ) : (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setNewsletterLoading(true);
                setNewsletterError("");
                try {
                  const res = await fetch("/api/newsletter/subscribe", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: newsletterEmail }),
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setNewsletterStatus("success");
                  } else if (data.code === "already_confirmed") {
                    setNewsletterStatus("already");
                  } else {
                    setNewsletterError(data.error ?? "Une erreur est survenue.");
                    setNewsletterStatus("error");
                  }
                } catch {
                  setNewsletterError("Impossible de contacter le serveur.");
                  setNewsletterStatus("error");
                } finally {
                  setNewsletterLoading(false);
                }
              }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <input
                type="email"
                required
                value={newsletterEmail}
                onChange={e => setNewsletterEmail(e.target.value)}
                placeholder="ton@email.com"
                className="flex-1 bg-[#111] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#b400ff] transition-colors placeholder-neutral-600"
              />
              <button
                type="submit"
                disabled={newsletterLoading}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white transition-all hover:scale-105 disabled:opacity-60 whitespace-nowrap"
                style={{ background: `linear-gradient(135deg, ${theme.color_accent}, ${theme.color_accent}bb)`, boxShadow: `0 0 20px ${theme.color_accent}44` }}
              >
                {newsletterLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Mail size={15} />
                    S&apos;inscrire
                  </>
                )}
              </button>
            </form>
          )}

          {newsletterStatus === "error" && (
            <p className="mt-3 text-red-400 text-sm">{newsletterError}</p>
          )}

          <p className="text-neutral-700 text-xs mt-5 font-mono">
            Pas de spam · Désinscription en un clic · Double opt-in
          </p>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-[#1a1a1a] py-8 px-4 text-center space-y-2">
        <p className="text-neutral-700 text-sm font-mono">
          © {new Date().getFullYear()} TOXIC — Tous droits réservés
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/mentions-legales" className="text-neutral-600 hover:text-neutral-400 text-xs font-mono transition-colors">
            Mentions légales
          </Link>
          <span className="text-neutral-700 text-xs">·</span>
          <Link href="/cgv" className="text-neutral-600 hover:text-neutral-400 text-xs font-mono transition-colors">
            CGV
          </Link>
        </div>
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
