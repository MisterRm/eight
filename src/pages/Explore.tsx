import { useEffect, useState, useRef } from "react";
import { Compass, Filter, ChevronLeft, ChevronRight, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AnimeRaw, DataSource, ActiveTab, GridLayout, FilterOption } from "../types";
import AnimeCard from "../components/AnimeCard";
import ShimmerCard from "../components/ShimmerCard";
import Footer from "../components/Footer";

interface ExploreProps {
  dataSource: DataSource;
  gridLayout: GridLayout;
}

interface GenreData { title: string; slug: string; }
interface Pagination { currentPage: number; hasNext: boolean; hasPrev: boolean; }

interface FilterOptions {
  seasons: FilterOption[];
  studios: FilterOption[];
  types: FilterOption[];
  orders: FilterOption[];
  statuses: FilterOption[];
}

interface ActiveFilters {
  genre: string;
  studio: string;
  season: string;
  type: string;
  status: string;
  order: string;
}

const EMPTY_FILTERS: ActiveFilters = { genre: "", studio: "", season: "", type: "", status: "", order: "update" };

export default function Explore({ dataSource, gridLayout }: ExploreProps) {
  const isV3 = dataSource === "Dayynime-v3";

  const baseTabs: ActiveTab[] = ["Popular", "Movies", "Ongoing", "Completed", "Latest", "Genres"];
  const v3ExtraTabs: ActiveTab[] = ["Donghua", "LiveAction", "Tokusatsu"];
  const tabs: ActiveTab[] = isV3 ? [...baseTabs, ...v3ExtraTabs] : baseTabs;

  const tabLabels: Record<string, string> = {
    Popular: "Popular", Movies: "Movies", Ongoing: "Ongoing", Completed: "Completed",
    Latest: "Terbaru", Genres: "Genres", Donghua: "Donghua", LiveAction: "Live Action", Tokusatsu: "Tokusatsu",
  };

  const [activeTab, setActiveTab] = useState<ActiveTab>("Popular");
  const [animes, setAnimes] = useState<AnimeRaw[]>([]);
  const [genres, setGenres] = useState<GenreData[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({ currentPage: 1, hasNext: false, hasPrev: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slideDir, setSlideDir] = useState<number>(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // V3 Advanced Filter
  const [showFilter, setShowFilter] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [pendingFilters, setPendingFilters] = useState<ActiveFilters>(EMPTY_FILTERS);
  const [filterMode, setFilterMode] = useState(false); // true = pakai /filter, false = pakai /explore

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

  // Fetch genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await fetch(`/api/proxy?route=genres&source=${dataSource}`);
        if (res.ok) setGenres(await res.json());
      } catch {}
    };
    fetchGenres();
  }, [dataSource]);

  // Fetch filter options (V3 only)
  useEffect(() => {
    if (!isV3) return;
    const fetchFilterOptions = async () => {
      try {
        const res = await fetch(`/api/proxy?route=filter_options&source=${dataSource}`);
        if (res.ok) setFilterOptions(await res.json());
      } catch {}
    };
    fetchFilterOptions();
  }, [dataSource]);

  const fetchExploreData = async (tab: ActiveTab, page: number, genre: string | null) => {
    setLoading(true);
    setError(null);
    setAnimes([]);
    try {
      let url = `/api/proxy?route=explore&tab=${tab}&page=${page}&source=${dataSource}`;
      if (tab === "Genres" && genre) url += `&genreSlug=${genre}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Gagal mengambil data");
      const data = await res.json();
      setAnimes(data.animes || []);
      setPagination({
        currentPage: data.pagination?.currentPage || page,
        hasNext: !!data.pagination?.hasNext,
        hasPrev: !!data.pagination?.hasPrev,
      });
    } catch (err: any) {
      setError(err?.message || "Gagal memuat anime.");
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterData = async (filters: ActiveFilters, page: number) => {
    setLoading(true);
    setError(null);
    setAnimes([]);
    try {
      const params = new URLSearchParams({ route: "filter", source: dataSource, page: String(page) });
      if (filters.genre) params.append("genre", filters.genre);
      if (filters.studio) params.append("studio", filters.studio);
      if (filters.season) params.append("season", filters.season);
      if (filters.type) params.append("type", filters.type);
      if (filters.status) params.append("status", filters.status);
      if (filters.order) params.append("order", filters.order);
      const res = await fetch(`/api/proxy?${params}`);
      if (!res.ok) throw new Error("Gagal mengambil data filter");
      const data = await res.json();
      setAnimes(data.animes || []);
      setPagination({
        currentPage: data.pagination?.currentPage || page,
        hasNext: !!data.pagination?.hasNext,
        hasPrev: !!data.pagination?.hasPrev,
      });
    } catch (err: any) {
      setError(err?.message || "Gagal memuat anime.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (filterMode) { fetchFilterData(activeFilters, 1); return; }
    if (activeTab === "Genres" && !selectedGenre) { setAnimes([]); return; }
    fetchExploreData(activeTab, 1, selectedGenre);
  }, [activeTab, selectedGenre, dataSource, filterMode, activeFilters]);

  const handleTabChange = (tab: ActiveTab) => {
    setSlideDir(tabs.indexOf(tab) > tabs.indexOf(activeTab) ? -1 : 1);
    setActiveTab(tab);
    if (tab !== "Genres") setSelectedGenre(null);
    setFilterMode(false);
    setPagination({ currentPage: 1, hasNext: false, hasPrev: false });
    window.location.hash = "#/explore";
  };

  const handleApplyFilter = () => {
    setActiveFilters(pendingFilters);
    setFilterMode(true);
    setShowFilter(false);
    setPagination({ currentPage: 1, hasNext: false, hasPrev: false });
  };

  const handleResetFilter = () => {
    setPendingFilters(EMPTY_FILTERS);
    setActiveFilters(EMPTY_FILTERS);
    setFilterMode(false);
    setShowFilter(false);
  };

  const hasActiveFilters = Object.entries(activeFilters).some(([k, v]) => k !== "order" && v !== "");

  const handlePrev = () => {
    const newPage = Math.max(1, pagination.currentPage - 1);
    setPagination(p => ({ ...p, currentPage: newPage }));
    if (filterMode) fetchFilterData(activeFilters, newPage);
    else fetchExploreData(activeTab, newPage, selectedGenre);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleNext = () => {
    const newPage = pagination.currentPage + 1;
    setPagination(p => ({ ...p, currentPage: newPage }));
    if (filterMode) fetchFilterData(activeFilters, newPage);
    else fetchExploreData(activeTab, newPage, selectedGenre);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) < 50 || dy > 60) return;
    const currentIdx = tabs.indexOf(activeTab);
    if (dx < 0 && currentIdx < tabs.length - 1) handleTabChange(tabs[currentIdx + 1]);
    else if (dx > 0 && currentIdx > 0) handleTabChange(tabs[currentIdx - 1]);
  };

  const gridClasses =
    gridLayout === "cols-2" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
    : gridLayout === "cols-3" ? "grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5"
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
      <div className="px-5 mb-5 pt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="w-5 h-5 text-white stroke-[2]" />
          <h1 className="text-lg font-bold text-white font-sans">Eksplorasi</h1>
        </div>
        {/* Filter button - V3 only */}
        {isV3 && (
          <button
            onClick={() => { setShowFilter(true); setPendingFilters(activeFilters); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
              hasActiveFilters
                ? "bg-white text-[#0e1015] border-white"
                : "bg-[#121319] border-white/5 text-[#a0a5b5] hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filter
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-[#0e1015] ml-0.5" />}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/5 overflow-x-auto px-5 mb-5 scrollbar-none">
        {tabs.map((tab) => {
          const active = activeTab === tab && !filterMode;
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`relative pb-3 text-sm font-medium tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
                active ? "text-white font-semibold" : "text-[#535766] hover:text-[#a0a5b5]"
              }`}
            >
              {tabLabels[tab] || tab}
              {active && (
                <motion.div layoutId="activeExploreTabIndicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" transition={{ duration: 0.2 }} />
              )}
            </button>
          );
        })}
        {filterMode && (
          <button className="relative pb-3 text-sm font-semibold text-white whitespace-nowrap">
            Hasil Filter
            <motion.div layoutId="activeExploreTabIndicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" transition={{ duration: 0.2 }} />
          </button>
        )}
      </div>

      {/* Swipeable content */}
      <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} className="overflow-hidden">
        <motion.div key={filterMode ? "filter" : activeTab} initial={{ x: slideDir * -60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.25, ease: "easeOut" }}>

          {/* Genre Chips */}
          {activeTab === "Genres" && !filterMode && (
            <div className="px-5 mb-6">
              <h2 className="text-xs font-semibold text-[#535766] uppercase tracking-wider mb-3">Pilih Genre Anime</h2>
              {genres.length === 0 ? (
                <div className="flex gap-2 flex-wrap">{[1,2,3,4,5].map(i => <div key={i} className="bg-[#121319] w-20 h-8 rounded-xl animate-pulse" />)}</div>
              ) : (
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
                  {genres.map((genre) => {
                    const active = selectedGenre === genre.slug;
                    return (
                      <button key={genre.slug} onClick={() => setSelectedGenre(genre.slug)}
                        className={`text-xs px-3.5 py-2 rounded-2xl border transition-all cursor-pointer ${active ? "bg-white text-[#0e1015] border-white font-semibold" : "bg-[#121319]/80 border-white/5 text-[#a0a5b5] hover:text-white"}`}>
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
            {activeTab === "Genres" && !selectedGenre && !filterMode && (
              <div className="flex flex-col items-center justify-center py-16 text-center select-none">
                <Filter className="w-10 h-10 text-[#535766] mb-3 stroke-[1.5]" />
                <h3 className="text-white text-sm font-semibold mb-1">Pilih Kategori</h3>
                <span className="text-xs text-[#535766] max-w-xs font-medium">Silakan pilih salah satu genre di atas untuk memuat daftar anime.</span>
              </div>
            )}

            {loading && <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">{[...Array(10)].map((_, i) => <ShimmerCard key={i} />)}</div>}
            {error && !loading && <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 text-center text-red-400 text-xs font-medium">{error}</div>}

            {!loading && animes.length > 0 && (
              <>
                <div className={gridClasses}>
                  {animes.map((anime) => {
                    if (gridLayout === "list") {
                      return (
                        <div key={anime.slug} onClick={() => (window.location.hash = `#/detail/${anime.slug}`)}
                          className="flex gap-4 p-3 bg-[#121319] hover:bg-[#1a1c24] border border-white/5 rounded-2xl cursor-pointer transition-colors">
                          <img src={anime.poster} alt={anime.title} referrerPolicy="no-referrer" loading="lazy" className="w-16 h-22 object-cover rounded-xl bg-[#121319] flex-shrink-0" />
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <h4 className="text-sm font-semibold text-white truncate">{anime.title}</h4>
                            <span className="text-xs text-[#535766] mt-1">{anime.type || "TV"} · {anime.episode ? `Episode ${anime.episode}` : anime.status || "Ongoing"}</span>
                            {anime.score && anime.score !== "0" && <span className="text-[10px] font-bold text-amber-500 font-mono mt-1">★ {anime.score}</span>}
                          </div>
                        </div>
                      );
                    }
                    return <AnimeCard key={anime.slug} anime={anime} dataSource={dataSource} tooltipId={anime.tooltip_id} />;
                  })}
                </div>
                {(pagination.hasNext || pagination.hasPrev) && (
                  <div className="flex items-center justify-center gap-4 pt-8 pb-2">
                    <button onClick={handlePrev} disabled={!pagination.hasPrev} className="flex items-center gap-1.5 bg-[#121319] border border-white/5 disabled:opacity-30 hover:bg-[#1a1c24] text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer">
                      <ChevronLeft className="w-4 h-4" /><span>Sebelumnya</span>
                    </button>
                    <span className="text-xs text-[#535766] font-bold font-mono px-2">{pagination.currentPage}</span>
                    <button onClick={handleNext} disabled={!pagination.hasNext} className="flex items-center gap-1.5 bg-[#121319] border border-white/5 disabled:opacity-30 hover:bg-[#1a1c24] text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer">
                      <span>Selanjutnya</span><ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}

            {!loading && animes.length === 0 && (activeTab !== "Genres" || selectedGenre || filterMode) && (
              <div className="text-center py-20 text-[#535766] text-xs font-mono">Tidak ada anime yang ditemukan.</div>
            )}
          </div>
        </motion.div>
      </div>

      {/* V3 Advanced Filter Sheet */}
      <AnimatePresence>
        {showFilter && isV3 && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" onClick={() => setShowFilter(false)} />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[#0e1015] border-t border-white/5 rounded-t-3xl max-h-[85vh] overflow-y-auto"
            >
              {/* Sheet Header */}
              <div className="sticky top-0 bg-[#0e1015] border-b border-white/5 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-white" />
                  <span className="text-white font-bold text-sm">Filter Lanjutan</span>
                </div>
                <button onClick={() => setShowFilter(false)} className="p-1.5 rounded-full hover:bg-white/5 text-[#a0a5b5] cursor-pointer"><X className="w-4 h-4" /></button>
              </div>

              <div className="px-5 py-4 flex flex-col gap-5">
                {/* Order */}
                <FilterSelect label="Urutan" value={pendingFilters.order} onChange={v => setPendingFilters(p => ({ ...p, order: v }))}
                  options={filterOptions?.orders || [{ name: "Update", value: "update" }, { name: "Popular", value: "popular" }, { name: "A-Z", value: "title" }]} />
                {/* Genre */}
                <FilterSelect label="Genre" value={pendingFilters.genre} onChange={v => setPendingFilters(p => ({ ...p, genre: v }))}
                  options={genres.map(g => ({ name: g.title, value: g.slug }))} placeholder="Semua Genre" />
                {/* Status */}
                <FilterSelect label="Status" value={pendingFilters.status} onChange={v => setPendingFilters(p => ({ ...p, status: v }))}
                  options={filterOptions?.statuses || [{ name: "Ongoing", value: "ongoing" }, { name: "Completed", value: "completed" }]} placeholder="Semua Status" />
                {/* Type */}
                <FilterSelect label="Tipe" value={pendingFilters.type} onChange={v => setPendingFilters(p => ({ ...p, type: v }))}
                  options={filterOptions?.types || []} placeholder="Semua Tipe" />
                {/* Season */}
                <FilterSelect label="Season" value={pendingFilters.season} onChange={v => setPendingFilters(p => ({ ...p, season: v }))}
                  options={filterOptions?.seasons || []} placeholder="Semua Season" />
                {/* Studio */}
                <FilterSelect label="Studio" value={pendingFilters.studio} onChange={v => setPendingFilters(p => ({ ...p, studio: v }))}
                  options={filterOptions?.studios || []} placeholder="Semua Studio" />
              </div>

              {/* Sheet Actions */}
              <div className="sticky bottom-0 bg-[#0e1015] border-t border-white/5 px-5 py-4 flex gap-3">
                <button onClick={handleResetFilter} className="flex-1 py-3 rounded-2xl bg-[#121319] border border-white/5 text-[#a0a5b5] text-sm font-semibold cursor-pointer hover:text-white transition-colors">Reset</button>
                <button onClick={handleApplyFilter} className="flex-1 py-3 rounded-2xl bg-white text-[#0e1015] text-sm font-bold cursor-pointer hover:bg-white/90 transition-colors">Terapkan</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <Footer />
    </motion.div>
  );
}

// Reusable select component for filter sheet
function FilterSelect({ label, value, onChange, options, placeholder = "Semua" }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: FilterOption[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-[#535766] uppercase tracking-wider block mb-2">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-[#121319] border border-white/5 rounded-xl px-4 py-3 text-sm text-white appearance-none focus:outline-none focus:border-white/10 cursor-pointer pr-10"
        >
          <option value="">{placeholder}</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.name}</option>
          ))}
        </select>
        <ChevronDown className="w-4 h-4 text-[#535766] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>
    </div>
  );
}
