import { useEffect, useState } from "react";
import { Compass, Sparkles, Filter, ChevronRight, Grid, List, Eye } from "lucide-react";
import { motion } from "motion/react";
import { AnimeRaw, DataSource, ActiveTab, GridLayout } from "../types";
import AnimeCard from "../components/AnimeCard";
import ShimmerCard from "../components/ShimmerCard";

interface ExploreProps {
  dataSource: DataSource;
  gridLayout: GridLayout;
}

interface GenreData {
  title: string;
  slug: string;
}

export default function Explore({ dataSource, gridLayout }: ExploreProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("Popular");
  const [animes, setAnimes] = useState<AnimeRaw[]>([]);
  const [genres, setGenres] = useState<GenreData[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs: ActiveTab[] = ["Popular", "Movies", "Ongoing", "Completed", "Latest", "Genres"];

  // Handle parsing query parameters for pre-selected genre/tab
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
          if (tabParam === "Genres" && genreParam) {
            setSelectedGenre(genreParam);
          }
        }
      }
    };

    handleUrlParams();
    window.addEventListener("hashchange", handleUrlParams);
    return () => window.removeEventListener("hashchange", handleUrlParams);
  }, []);

  // Fetch Genres list once
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await fetch(`/api/proxy?route=genres&source=${dataSource}`);
        if (res.ok) {
          const data = await res.json();
          setGenres(data || []);
        }
      } catch (err) {
        console.error("Gagal mengambil daftar genre:", err);
      }
    };
    fetchGenres();
  }, [dataSource]);

  // Fetch Explore lists
  const fetchExploreData = async (currentTab: ActiveTab, currentPage: number, genre: string | null, isLoadMore = false) => {
    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setError(null);
    }

    try {
      let url = `/api/proxy?route=explore&tab=${currentTab}&page=${currentPage}&source=${dataSource}`;
      if (currentTab === "Genres" && genre) {
        url += `&genreSlug=${genre}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Gagal mengambil data eksplorasi");
      }
      const data = await res.json();
      const list = data.animes || data.results || [];

      if (isLoadMore) {
        setAnimes((prev) => [...prev, ...list]);
      } else {
        setAnimes(list);
      }

      // Check if next page exists
      if (data.pagination) {
        setHasNextPage(!!data.pagination.hasNextPage || !!data.pagination.nextPage);
      } else {
        setHasNextPage(list.length >= 10);
      }
    } catch (err: any) {
      console.error("Explore error:", err);
      setError(err?.message || "Gagal memuat anime.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Trigger fetch on tab, page or genre change
  useEffect(() => {
    setPage(1);
    // If Genres tab is selected but no genre is chosen yet, don't fetch anime list immediately, wait for user selection
    if (activeTab === "Genres" && !selectedGenre) {
      setAnimes([]);
      setHasNextPage(false);
    } else {
      fetchExploreData(activeTab, 1, selectedGenre, false);
    }
  }, [activeTab, selectedGenre, dataSource]);

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (tab !== "Genres") {
      setSelectedGenre(null);
    }
    // Clean query parameters from hash
    window.location.hash = `#/explore`;
  };

  const handleGenreClick = (genreSlug: string) => {
    setSelectedGenre(genreSlug);
    setPage(1);
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchExploreData(activeTab, nextPage, selectedGenre, true);
  };

  // Responsive layout determination
  const gridClasses = 
    gridLayout === "cols-2"
      ? "grid grid-cols-2 gap-3"
      : gridLayout === "cols-3"
      ? "grid grid-cols-3 gap-2.5"
      : "flex flex-col gap-4"; // List mode

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pb-24 pt-4 min-h-screen"
      id="explore-page"
    >
      {/* Title Header */}
      <div className="px-5 mb-5 pt-2 flex items-center gap-2">
        <Compass className="w-5 h-5 text-white stroke-[2]" />
        <h1 className="text-lg font-bold text-white font-sans">Eksplorasi</h1>
      </div>

      {/* Tabs Row */}
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

      {/* Genre Chips Container */}
      {activeTab === "Genres" && (
        <div className="px-5 mb-6">
          <h2 className="text-xs font-semibold text-[#535766] uppercase tracking-wider mb-3">
            Pilih Genre Anime
          </h2>
          {genres.length === 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-[#121319] w-20 h-8 rounded-xl animate-pulse" />
              ))}
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
                        ? "bg-white text-[#0e1015] border-white font-semibold shadow-xs"
                        : "bg-[#121319]/80 border-white/5 text-[#a0a5b5] hover:text-white"
                    }`}
                  >
                    {genre.title || genre.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main Grid Lists */}
      <div className="px-5">
        {activeTab === "Genres" && !selectedGenre && (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none">
            <Filter className="w-10 h-10 text-[#535766] mb-3 stroke-[1.5]" />
            <h3 className="text-white text-sm font-semibold mb-1">Pilih Kategori</h3>
            <span className="text-xs text-[#535766] max-w-xs font-medium">
              Silakan pilih salah satu kategori di atas untuk memuat daftar animes.
            </span>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ShimmerCard key={i} />
            ))}
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
                // If list mode, we can show a custom horizontal card for rich display density
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
                        <h4 className="text-sm font-semibold text-white truncate">
                          {anime.title}
                        </h4>
                        <span className="text-xs text-[#535766] mt-1">
                          {anime.type || "TV"} · {anime.episode ? `Episode ${anime.episode}` : anime.status || "Ongoing"}
                        </span>
                        {anime.score && anime.score !== "0" && (
                          <span className="text-[10px] font-bold text-amber-500 font-mono mt-1 flex items-center gap-0.5">
                            ★ {anime.score}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                }

                return <AnimeCard key={anime.slug} anime={anime} />;
              })}
            </div>

            {/* Load More Button */}
            {hasNextPage && (
              <div className="mt-8 flex justify-center">
                <button
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                  className="px-6 py-3 bg-[#1a1c24] hover:bg-white/5 border border-white/5 text-white hover:text-white/90 text-xs font-semibold rounded-xl cursor-pointer transition-colors disabled:opacity-50"
                >
                  {loadingMore ? "Loading..." : "Load More"}
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
  );
}
