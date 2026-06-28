import { useEffect, useState , useRef } from "react";
import { Compass, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { AnimeRaw, DataSource, ActiveTab, GridLayout } from "../types";
import AnimeCard from "../components/AnimeCard";
import ShimmerCard from "../components/ShimmerCard";
import Footer from "../components/Footer";

interface ExploreProps {
  dataSource: DataSource;
  gridLayout: GridLayout;
}

interface GenreData {
  title: string;
  slug: string;
}

interface Pagination {
  currentPage: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export default function Explore({ dataSource, gridLayout }: ExploreProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("Popular");
  const [animes, setAnimes] = useState<AnimeRaw[]>([]);
  const [genres, setGenres] = useState<GenreData[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ currentPage: 1, hasNext: false, hasPrev: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs: ActiveTab[] = ["Popular", "Movies", "Ongoing", "Completed", "Latest", "Genres"];

  // Parse URL params
  useEffect(() => {
    const handleUrlParams = () => {
      const hash = window.location.hash;
      if (hash.includes("?")) {
        const queryStr = hash.split("?")[1];
        const params = new URLSearchParams(queryStr);
        const tabParam = params.get("tab") as ActiveTab;
        const genreParam = params.get("genre");
        if (tabParam && tabs.includes(tabParam)) {
          setActiveTab(tabParam);
          if (tabParam === "Genres" && genreParam) setSelectedGenre(genreParam);
        }
      }
    };
    handleUrlParams();
    window.addEventListener("hashchange", handleUrlParams);
    return () => window.removeEventListener("hashchange", handleUrlParams);
  }, []);

  // Fetch genres once
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await fetch(`/api/proxy?route=genres&source=${dataSource}`);
        if (res.ok) setGenres(await res.json());
      } catch (err) {
        console.error("Gagal mengambil daftar genre:", err);
      }
    };
    fetchGenres();
  }, [dataSource]);

  // Fetch anime list
  // Swipe
  const tabs_list = ["Popular", "Movies", "Ongoing", "Completed", "Latest", "Genres"] as const;
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const [slideDir, setSlideDir] = useState<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) < 50 || dy > 60) return;
    const currentIdx = tabs.indexOf(activeTab as any);
    if (dx < 0 && currentIdx < tabs.length - 1) {
      setSlideDir(-1);
      handleTabChange(tabs[currentIdx + 1]);
    } else if (dx > 0 && currentIdx > 0) {
      setSlideDir(1);
      handleTabChange(tabs[currentIdx - 1]);
    }
  };

  const fetchExploreData = async (tab: ActiveTab, page: number, genre: string | null) => {
    setLoading(true);
    setError(null);
    setAnimes([]);
    try {
      let url = `/api/proxy?route=explore&tab=${tab}&page=${page}&source=${dataSource}`;
      if (tab === "Genres" && genre) url += `&genreSlug=${genre}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data eksplorasi");
      const data = await res.json();
      const list = data.animes || data.results || [];
      setAnimes(list);
      setPagination({
        currentPage: data.pagination?.currentPage || page,
        hasNext: !!data.pagination?.hasNext || !!data.pagination?.hasNextPage,
        hasPrev: !!data.pagination?.hasPrev || !!data.pagination?.hasPrevPage,
      });
    } catch (err: any) {
      setError(err?.message || "Gagal memuat anime.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "Genres" && !selectedGenre) {
      setAnimes([]);
      setPagination({ currentPage: 1, hasNext: false, hasPrev: false });
      return;
    }
    fetchExploreData(activeTab, 1, selectedGenre);
  }, [activeTab, selectedGenre, dataSource]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab !== "Genres") setSelectedGenre(null);
    setPagination({ currentPage: 1, hasNext: false, hasPrev: false });
    window.location.hash = "#/explore";
  };

  const handleGenreClick = (slug: string) => {
    setSelectedGenre(slug);
    setPagination({ currentPage: 1, hasNext: false, hasPrev: false });
  };

  const handlePrev = () => {
    const newPage = Math.max(1, pagination.currentPage - 1);
    setPagination(p => ({ ...p, currentPage: newPage }));
    fetchExploreData(activeTab, newPage, selectedGenre);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => {
    const newPage = pagination.currentPage + 1;
    setPagination(p => ({ ...p, currentPage: newPage }));
    fetchExploreData(activeTab, newPage, selectedGenre);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const gridClasses =
    gridLayout === "cols-2"
      ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
      : gridLayout === "cols-3"
      ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5"
      : "flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pb-24 pt-4 min-h-screen"
      id="explore-page"
    >
      {/* Header */}
      <div className="px-5 mb-5 pt-2 flex items-center gap-2">
        <Compass className="w-5 h-5 text-white stroke-[2]" />
        <h1 className="text-lg font-bold text-white font-sans">Eksplorasi</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5 overflow-x-auto px-5 mb-5 scrollbar-none">
        {tabs.map((tab) => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`relative pb-3 text-sm font-medium tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
                active ? "text-white font-semibold" : "text-[#535766] hover:text-[#a0a5b5]"
              }`}
            >
              {tab}
              {active && (
                <motion.div
                  layoutId="activeExploreTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Swipeable content */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="overflow-hidden">
      <motion.div
        key={activeTab}
        initial={{ x: slideDir * -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: slideDir * 60, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
      {/* Genre Chips */}
      {activeTab === "Genres" && (
        <div className="px-5 mb-6">
          <h2 className="text-xs font-semibold text-[#535766] uppercase tracking-wider mb-3">Pilih Genre Anime</h2>
          {genres.length === 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[1, 2, 3, 4, 5].map((i) => <div key={i} className="bg-[#121319] w-20 h-8 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
              {genres.map((genre) => {
                const active = selectedGenre === genre.slug;
                return (
                  <button
                    key={genre.slug}
                    onClick={() => handleGenreClick(genre.slug)}
                    className={`text-xs px-3.5 py-2 rounded-2xl border transition-all cursor-pointer ${
                      active
                        ? "bg-white text-[#0e1015] border-white font-semibold"
                        : "bg-[#121319]/80 border-white/5 text-[#a0a5b5] hover:text-white"
                    }`}
                  >
                    {genre.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="px-5">
        {activeTab === "Genres" && !selectedGenre && (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none">
            <Filter className="w-10 h-10 text-[#535766] mb-3 stroke-[1.5]" />
            <h3 className="text-white text-sm font-semibold mb-1">Pilih Kategori</h3>
            <span className="text-xs text-[#535766] max-w-xs font-medium">
              Silakan pilih salah satu genre di atas untuk memuat daftar anime.
            </span>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => <ShimmerCard key={i} />)}
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 text-center text-red-400 text-xs font-medium">
            {error}
          </div>
        )}

        {!loading && animes.length > 0 && (
          <>
            <div className={gridClasses}>
              {animes.map((anime) => {
                if (gridLayout === "list") {
                  return (
                    <div
                      key={anime.slug}
                      onClick={() => (window.location.hash = `#/detail/${anime.slug}`)}
                      className="flex gap-4 p-3 bg-[#121319] hover:bg-[#1a1c24] border border-white/5 rounded-2xl cursor-pointer transition-colors"
                    >
                      <img
                        src={anime.poster}
                        alt={anime.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-16 h-22 object-cover rounded-xl bg-[#121319] flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="text-sm font-semibold text-white truncate">{anime.title}</h4>
                        <span className="text-xs text-[#535766] mt-1">
                          {anime.type || "TV"} · {anime.episode ? `Episode ${anime.episode}` : anime.status || "Ongoing"}
                        </span>
                        {anime.score && anime.score !== "0" && (
                          <span className="text-[10px] font-bold text-amber-500 font-mono mt-1">★ {anime.score}</span>
                        )}
                      </div>
                    </div>
                  );
                }
                return <AnimeCard key={anime.slug} anime={anime} />;
              })}
            </div>

            {/* Pagination */}
            {(pagination.hasNext || pagination.hasPrev) && (
              <div className="flex items-center justify-center gap-4 pt-8 pb-2">
                <button
                  onClick={handlePrev}
                  disabled={!pagination.hasPrev}
                  className="flex items-center gap-1.5 bg-[#121319] border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1a1c24] text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Sebelumnya</span>
                </button>

                <span className="text-xs text-[#535766] font-bold font-mono px-2">
                  {pagination.currentPage}
                </span>

                <button
                  onClick={handleNext}
                  disabled={!pagination.hasNext}
                  className="flex items-center gap-1.5 bg-[#121319] border border-white/5 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#1a1c24] text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  <span>Selanjutnya</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}

        {!loading && animes.length === 0 && (activeTab !== "Genres" || selectedGenre) && (
          <div className="text-center py-20 text-[#535766] text-xs font-mono">
            Tidak ada anime yang ditemukan.
          </div>
        )}
      </div>
      </motion.div>
      </div>

      <Footer />
    </motion.div>
  );
}