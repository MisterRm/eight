import { useEffect, useState, useRef, FormEvent } from "react";
import { Search as SearchIcon, ArrowLeft, X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { motion } from "motion/react";
import { AnimeRaw, DataSource } from "../types";
import AnimeCard from "../components/AnimeCard";
import ShimmerCard from "../components/ShimmerCard";

interface SearchProps {
  dataSource: DataSource;
}

export default function Search({ dataSource }: SearchProps) {
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<AnimeRaw[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus the input on load
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle Search Fetching
  const performSearch = async (currentKeyword: string, currentPage: number) => {
    if (!currentKeyword.trim()) {
      setResults([]);
      setHasNextPage(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/proxy?route=search&keyword=${encodeURIComponent(currentKeyword)}&page=${currentPage}&source=${dataSource}`
      );
      if (!res.ok) {
        throw new Error("Gagal melakukan pencarian");
      }
      const data = await res.json();
      
      const animes = data.animes || data.results || [];
      setResults(animes);
      
      // Determine if there is a next page from pagination object
      if (data.pagination) {
        setHasNextPage(!!data.pagination.hasNextPage || !!data.pagination.nextPage);
      } else {
        // Fallback guess: if we got a full page of results (usually 10-20), assume there might be a next page
        setHasNextPage(animes.length >= 10);
      }
    } catch (err: any) {
      console.error("Search error:", err);
      setError(err?.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  // Trigger search on submit
  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    performSearch(keyword, 1);
  };

  // Trigger search when page changes
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    performSearch(keyword, newPage);
    // Scroll to top of results
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClear = () => {
    setKeyword("");
    setResults([]);
    setHasNextPage(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pb-24 pt-4 px-5 min-h-screen"
      id="search-page"
    >
      {/* Search Header Bar */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => (window.location.hash = "#/")}
          className="p-2.5 bg-[#121319] hover:bg-[#1a1c24] rounded-full border border-white/5 text-[#a0a5b5] hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari anime favoritmu..."
            className="w-full bg-[#121319] border border-white/5 rounded-2xl py-3.5 pl-11 pr-11 text-white placeholder-[#535766] text-sm focus:outline-none focus:border-white/10"
          />
          <SearchIcon className="w-4.5 h-4.5 text-[#535766] absolute left-4 top-1/2 -translate-y-1/2" />
          {keyword && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#535766] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>

      {/* Results Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ShimmerCard key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-[#a0a5b5] text-sm flex flex-col items-center gap-2">
          <HelpCircle className="w-12 h-12 text-[#535766]" />
          <span>Terjadi kesalahan saat memuat hasil pencarian.</span>
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {results.map((anime) => (
              <AnimeCard key={anime.slug} anime={anime} />
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/5">
            <button
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#121319] border border-white/5 rounded-xl text-xs font-semibold text-[#a0a5b5] hover:text-white disabled:opacity-40 disabled:hover:text-[#a0a5b5] cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <span className="text-xs text-[#535766] font-medium font-mono">
              Halaman {page}
            </span>
            <button
              disabled={!hasNextPage}
              onClick={() => handlePageChange(page + 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#121319] border border-white/5 rounded-xl text-xs font-semibold text-[#a0a5b5] hover:text-white disabled:opacity-40 disabled:hover:text-[#a0a5b5] cursor-pointer transition-colors"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center select-none">
          <div className="p-4 bg-[#121319] rounded-full border border-white/5 mb-4">
            <SearchIcon className="w-10 h-10 text-[#535766] stroke-[1.5]" />
          </div>
          <h3 className="text-white text-base font-semibold mb-1">Cari Anime</h3>
          <p className="text-xs text-[#535766] max-w-xs leading-relaxed font-medium">
            Ketik judul anime Jepang terpopuler, film anime, atau seri ongoing lainnya di atas lalu tekan enter.
          </p>
        </div>
      )}
    </motion.div>
  );
}
