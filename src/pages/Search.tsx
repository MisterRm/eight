import { useEffect, useState, useRef, FormEvent } from "react";
import { Search as SearchIcon, ArrowLeft, X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AnimeRaw, DataSource, SuggestItem } from "../types";
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
  // Suggest (V3 only)
  const [suggests, setSuggests] = useState<SuggestItem[]>([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const suggestTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const isV3 = dataSource === "Dayynime-v3";

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  // Suggest debounce (V3 only)
  useEffect(() => {
    if (!isV3 || !keyword.trim() || keyword.length < 2) {
      setSuggests([]);
      setShowSuggest(false);
      return;
    }
    if (suggestTimer.current) clearTimeout(suggestTimer.current);
    suggestTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/proxy?route=suggest&keyword=${encodeURIComponent(keyword)}&source=${dataSource}`);
        if (res.ok) {
          const data = await res.json();
          setSuggests(data.slice(0, 6));
          setShowSuggest(data.length > 0);
        }
      } catch {}
    }, 350);
    return () => { if (suggestTimer.current) clearTimeout(suggestTimer.current); };
  }, [keyword, dataSource]);

  const performSearch = async (currentKeyword: string, currentPage: number) => {
    if (!currentKeyword.trim()) { setResults([]); setHasNextPage(false); return; }
    setLoading(true);
    setError(null);
    setShowSuggest(false);
    try {
      const res = await fetch(`/api/proxy?route=search&keyword=${encodeURIComponent(currentKeyword)}&page=${currentPage}&source=${dataSource}`);
      if (!res.ok) throw new Error("Gagal melakukan pencarian");
      const data = await res.json();
      const animes = data.animes || data.results || [];
      setResults(animes);
      if (data.pagination) {
        setHasNextPage(!!data.pagination.hasNext || !!data.pagination.hasNextPage);
      } else {
        setHasNextPage(animes.length >= 10);
      }
    } catch (err: any) {
      setError(err?.message || "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    performSearch(keyword, 1);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    performSearch(keyword, newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleClear = () => {
    setKeyword("");
    setResults([]);
    setHasNextPage(false);
    setSuggests([]);
    setShowSuggest(false);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSuggestClick = (item: SuggestItem) => {
    setShowSuggest(false);
    window.location.hash = `#/detail/${item.slug}`;
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

        <div className="flex-1 relative">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              ref={inputRef}
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onFocus={() => suggests.length > 0 && setShowSuggest(true)}
              onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
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

          {/* Autocomplete Suggest Dropdown (V3 only) */}
          <AnimatePresence>
            {isV3 && showSuggest && suggests.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#121319] border border-white/10 rounded-2xl overflow-hidden z-50 shadow-xl"
              >
                {suggests.map((item) => (
                  <button
                    key={item.slug}
                    onMouseDown={() => handleSuggestClick(item)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1c24] transition-colors text-left border-b border-white/5 last:border-0 cursor-pointer"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-9 h-12 object-cover rounded-lg flex-shrink-0 bg-[#1a1c24]"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-semibold truncate">{item.title}</p>
                      <p className="text-[#535766] text-[10px] mt-0.5">{item.type} · {item.status}</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Results Content */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (<ShimmerCard key={i} />))}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-[#a0a5b5] text-sm flex flex-col items-center gap-2">
          <HelpCircle className="w-12 h-12 text-[#535766]" />
          <span>Terjadi kesalahan saat memuat hasil pencarian.</span>
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {results.map((anime) => (<AnimeCard key={anime.slug} anime={anime} dataSource={dataSource} tooltipId={anime.tooltip_id} />))}
          </div>
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-white/5">
            <button
              disabled={page <= 1}
              onClick={() => handlePageChange(page - 1)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-[#121319] border border-white/5 rounded-xl text-xs font-semibold text-[#a0a5b5] hover:text-white disabled:opacity-40 disabled:hover:text-[#a0a5b5] cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Prev
            </button>
            <span className="text-xs text-[#535766] font-medium font-mono">Halaman {page}</span>
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
