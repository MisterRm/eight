import { useEffect, useState , useRef } from "react";
import { 
  ChevronLeft, Tv, Share2, Clock, PlayCircle, Heart, Star, ChevronDown, 
  BookOpen, Play, Calendar, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { DetailPayload, DataSource, AnimeRaw } from "../types";
import AnimeCard from "../components/AnimeCard";

interface DetailProps {
  slug: string;
  dataSource: DataSource;
}

export default function Detail({ slug, dataSource }: DetailProps) {
  const [detail, setDetail] = useState<DetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"about" | "episodes">("about");
  const [slideDir, setSlideDir] = useState<number>(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const detailTabs = ["about", "episodes"] as const;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) < 50 || dy > 60) return;
    const currentIdx = detailTabs.indexOf(activeTab);
    if (dx < 0 && currentIdx < detailTabs.length - 1) {
      setSlideDir(-1);
      setActiveTab(detailTabs[currentIdx + 1]);
    } else if (dx > 0 && currentIdx > 0) {
      setSlideDir(1);
      setActiveTab(detailTabs[currentIdx - 1]);
    }
  };
  const [isFavorited, setIsFavorited] = useState(false);

  // Load favorite status
  useEffect(() => {
    try {
      const favs = JSON.parse(localStorage.getItem("eight_favorites") || "[]");
      setIsFavorited(favs.some((f: any) => f.slug === slug));
    } catch (e) {
      console.error(e);
    }
  }, [slug]);

  // Fetch anime detail
  useEffect(() => {
    let active = true;
    const fetchDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/proxy?route=detail&slug=${slug}&source=${dataSource}`);
        if (!res.ok) {
          throw new Error("Gagal mengambil rincian anime");
        }
        const data = await res.json();
        if (active) {
          setDetail(data);
        }
      } catch (err: any) {
        console.error("Detail fetch error:", err);
        if (active) {
          setError(err?.message || "Terjadi kesalahan.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDetail();
    return () => {
      active = false;
    };
  }, [slug, dataSource]);

  const handleBack = () => {
    // Navigate back to home or previous state
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = "#/";
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: detail?.title || "Eight Anime",
        text: `Tonton ${detail?.title || "anime ini"} secara gratis di Eight!`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link disalin ke papan klip!");
    }
  };

  const toggleFavorite = () => {
    try {
      const favs = JSON.parse(localStorage.getItem("eight_favorites") || "[]");
      let updatedFavs = [...favs];

      if (isFavorited) {
        updatedFavs = updatedFavs.filter((f: any) => f.slug !== slug);
        setIsFavorited(false);
      } else if (detail) {
        const item = {
          slug: slug,
          title: detail.title,
          poster: detail.poster,
          score: detail.score,
          type: detail.type || "TV",
        };
        updatedFavs.push(item);
        setIsFavorited(true);
      }

      localStorage.setItem("eight_favorites", JSON.stringify(updatedFavs));
    } catch (e) {
      console.error(e);
    }
  };

  const handlePlayAll = () => {
    if (detail?.episodes && detail.episodes.length > 0) {
      // Play first episode in list (which is usually the first or last episode depending on ordering)
      // Standard: Play the oldest/first chronological episode (usually at the end of the array, or index 0)
      const targetEp = detail.episodes[detail.episodes.length - 1] || detail.episodes[0];
      window.location.hash = `#/watch/${targetEp.slug}`;
    }
  };

  const handleWatchEpisode = (epSlug: string) => {
    window.location.hash = `#/watch/${epSlug}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1015] flex flex-col items-center justify-center pt-10 text-center px-5">
        <div className="w-10 h-10 border-2 border-white/5 border-t-white rounded-full animate-spin mb-4" />
        <span className="text-xs text-[#a0a5b5] font-mono">Memuat detail anime...</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="min-h-screen bg-[#0e1015] flex flex-col items-center justify-center px-5 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-white text-base font-semibold mb-2">Gagal Memuat Detail</h2>
        <p className="text-xs text-[#535766] max-w-sm mb-6 leading-relaxed">
          {error || "Rincian anime tidak tersedia atau terputus."}
        </p>
        <button
          onClick={handleBack}
          className="px-5 py-2.5 bg-[#1a1c24] border border-white/5 rounded-xl text-xs font-semibold text-white cursor-pointer"
        >
          Kembali ke Beranda
        </button>
      </div>
    );
  }

  // Format tags
  const genresList = detail.genres ? detail.genres.map((g) => g.name || g.title).slice(0, 3) : [];
  const yearText = detail.aired ? detail.aired.split(",").pop()?.trim() || "" : "";
  const tagItems = [...genresList, yearText].filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="pb-28 bg-[#0e1015] min-h-screen"
      id="detail-page"
    >
      {/* 1. HERO BANNER — portrait style dengan overlay info */}
      <div className="relative w-full bg-[#121319]" style={{ minHeight: "min(72vw, 440px)", maxHeight: "min(90vw, 520px)" }}>
        {/* Poster full bleed */}
        <img
          src={detail.poster}
          alt={detail.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover absolute inset-0"
          style={{ minHeight: "min(72vw, 440px)", maxHeight: "min(90vw, 520px)", objectPosition: "top center" }}
        />
        {/* Dark gradient bottom-heavy */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0e1015] via-[#0e1015]/60 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent z-10" />

        {/* Top Nav */}
        <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white cursor-pointer"
            aria-label="Kembali"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2.5">
            <button
              onClick={handlePlayAll}
              className="p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white cursor-pointer"
              aria-label="Cast"
            >
              <Tv className="w-4 h-4" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 bg-black/50 backdrop-blur-md rounded-full border border-white/10 text-white cursor-pointer"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Info overlay di bawah hero */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-5">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-3 select-none">
            <span className="px-2.5 py-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg text-[10px] font-bold text-white uppercase tracking-wide">
              {detail.type || "TV"}
            </span>
            <span className="px-2.5 py-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg text-[10px] font-medium text-white flex items-center gap-1">
              <Clock className="w-3 h-3 text-white/70" />
              {detail.duration || "24m"}
            </span>
            {detail.score && detail.score !== "0" && detail.score !== "N/A" && (
              <span className="px-2.5 py-1 bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg text-[10px] font-bold text-amber-400 flex items-center gap-1">
                <Star className="w-3 h-3 fill-current" />
                {detail.score}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-bold text-[22px] tracking-tight leading-tight text-white font-sans mb-2">
            {detail.title}
          </h1>

          {/* Tags */}
          <div className="flex items-center flex-wrap gap-y-1 text-xs text-white/50 font-medium tracking-wide select-none">
            {tagItems.map((tag, idx) => (
              <div key={tag} className="flex items-center">
                <span>{tag}</span>
                {idx < tagItems.length - 1 && (
                  <span className="mx-2 w-px h-3 bg-white/20 inline-block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. ACTION ROW */}
      <div className="flex gap-3 mt-5 px-5">
        <button
          onClick={handlePlayAll}
          disabled={!detail.episodes || detail.episodes.length === 0}
          className="flex-1 flex items-center justify-center gap-2 bg-white/8 border border-white/8 hover:bg-white/12 rounded-2xl py-3.5 text-sm font-semibold text-white cursor-pointer transition-colors disabled:opacity-40"
        >
          <PlayCircle className="w-5 h-5" />
          <span>Play all episodes</span>
        </button>
        <button
          onClick={toggleFavorite}
          className="p-3.5 bg-white/8 border border-white/8 hover:bg-white/12 rounded-2xl transition-colors cursor-pointer flex items-center justify-center"
          aria-label="Favorit"
        >
          <Heart
            className={`w-5 h-5 transition-transform active:scale-125 ${
              isFavorited ? "text-[#f04438] fill-[#f04438]" : "text-[#a0a5b5]"
            }`}
          />
        </button>
      </div>

      {/* 4. TABS ROW */}
      <div className="flex mt-6 border-b border-white/5 px-5 gap-6 select-none">
        <button
          onClick={() => setActiveTab("about")}
          className={`relative pb-3 text-sm font-semibold tracking-wide transition-colors cursor-pointer ${
            activeTab === "about" ? "text-white" : "text-[#535766]"
          }`}
        >
          About
          {activeTab === "about" && (
            <motion.div
              layoutId="detailActiveTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"
              transition={{ duration: 0.2 }}
            />
          )}
        </button>

        <button
          onClick={() => setActiveTab("episodes")}
          className={`relative pb-3 text-sm font-semibold tracking-wide transition-colors cursor-pointer ${
            activeTab === "episodes" ? "text-white" : "text-[#535766]"
          }`}
        >
          Episodes
          {activeTab === "episodes" && (
            <motion.div
              layoutId="detailActiveTabIndicator"
              className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"
              transition={{ duration: 0.2 }}
            />
          )}
        </button>
      </div>

      {/* 5. TAB CONTENT */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={activeTab}
        initial={{ x: slideDir * -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: slideDir * 60, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
      {activeTab === "about" && (
        <div className="px-5 pt-5">
          <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl flex flex-col gap-3 mb-5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#535766] font-medium uppercase tracking-wider">Studios</span>
              <span className="text-white font-semibold">{detail.studios || "-"}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#535766] font-medium uppercase tracking-wider">Status</span>
              <span className="text-white font-semibold">{detail.status || "Completed"}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#535766] font-medium uppercase tracking-wider">Season</span>
              <span className="text-white font-semibold">{detail.season || "-"}</span>
            </div>
          </div>

          {/* Trailer — hanya animasu (v1) */}
          {dataSource === "Dayynime-v1" && detail.trailer && (
            <div className="mb-5">
              <h3 className="text-base font-semibold text-white mb-3 font-sans flex items-center gap-2">
                <Play className="w-4.5 h-4.5 text-[#a0a5b5]" />
                Trailer
              </h3>
              <div className="relative w-full rounded-2xl overflow-hidden bg-[#121319] border border-white/5" style={{paddingBottom: "56.25%"}}>
                <iframe
                  src={detail.trailer}
                  title="Trailer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 w-full h-full"
                  style={{border: "none"}}
                />
              </div>
            </div>
          )}

          <h3 className="text-base font-semibold text-white mb-3 font-sans flex items-center gap-2">
            <BookOpen className="w-4.5 h-4.5 text-[#a0a5b5]" />
            Synopsis
          </h3>
          <p className="text-sm text-[#a0a5b5] leading-relaxed font-sans whitespace-pre-line">
            {detail.synopsis || "Tidak ada sinopsis yang tersedia."}
          </p>
        </div>
      )}

      {/* 6. TAB CONTENT: EPISODES */}
      {activeTab === "episodes" && (
        <div className="px-5 pt-5">
          <div className="flex justify-between items-center mb-4 select-none">
            <h3 className="text-base font-semibold text-white font-sans">
              Episodes
            </h3>
            <div className="px-3 py-1.5 bg-[#1a1c24] border border-white/5 rounded-xl text-xs text-white flex items-center gap-1.5 font-sans font-medium">
              <span>{detail.season || "Season 1"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#a0a5b5]" />
            </div>
          </div>

          {!detail.episodes || detail.episodes.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#535766] font-mono">
              Tidak ada episode yang tersedia.
            </div>
          ) : (
            <div className="flex flex-col">
              {detail.episodes.map((ep, idx) => {
                // Reverse indexing so chronologically older eps are labeled correctly, 
                // or standard list order as displayed by API
                // Usually the API returns newer episodes first. Let's make label look like "E1", "E2" etc.
                const totalEps = detail.episodes.length;
                const epIndexLabel = totalEps - idx;

                return (
                  <div
                    key={ep.slug}
                    onClick={() => handleWatchEpisode(ep.slug)}
                    className="flex items-center gap-3 py-3 border-b border-white/5 hover:bg-white/2 cursor-pointer transition-colors"
                  >
                    {/* Thumbnail Fallback */}
                    <div className="w-16 h-12 rounded-xl overflow-hidden bg-[#121319] border border-white/5 flex-shrink-0 relative group-hover:border-white/10">
                      <img
                        src={detail.poster}
                        alt={ep.name || detail.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover filter brightness-[0.7] transform transition-transform group-hover:scale-105"
                      />
                      <Play className="w-3 h-3 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 fill-current opacity-80" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white truncate font-sans">
                        E{epIndexLabel} · {String(ep.name || `Episode ${epIndexLabel}`).replace(/episode/gi, "").trim()}
                      </h4>
                      <p className="text-xs text-[#535766] line-clamp-1 mt-0.5">
                        Tonton episode {epIndexLabel} dari {detail.title} secara gratis di Eight.
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 select-none text-[#a0a5b5] text-[10px] font-sans font-medium">
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {detail.score || "8.5"}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="w-3 h-3 text-[#535766]" />
                          {detail.duration || "24 min"}
                        </span>
                      </div>
                    </div>

                    {/* Play button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleWatchEpisode(ep.slug);
                      }}
                      className="p-1 hover:text-white transition-colors cursor-pointer text-[#535766] hover:bg-[#1a1c24] rounded-full"
                      aria-label="Putar"
                    >
                      <PlayCircle className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recommended list */}
      {detail.recommended && detail.recommended.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/5">
          <h3 className="text-base font-semibold text-white px-5 mb-4 font-sans">
            Recommended For You
          </h3>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
            {detail.recommended.slice(0, 8).map((anime) => (
              <div key={anime.slug} className="w-32 flex-shrink-0">
                <AnimeCard anime={anime} />
              </div>
            ))}
          </div>
        </div>
      )}
      </motion.div>
      </AnimatePresence>
      </div>
    </motion.div>
  );
}