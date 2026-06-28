import { useEffect, useState } from "react";
import { Menu, Bell, Search, SlidersHorizontal, ChevronRight, Radio, CheckCircle } from "lucide-react";
import { motion } from "motion/react";
import { AnimeRaw, FeaturedAnime, DataSource } from "../types";
import HeroCarousel from "../components/HeroCarousel";
import AnimeCard from "../components/AnimeCard";
import ShimmerCard from "../components/ShimmerCard";

interface HomeProps {
  dataSource: DataSource;
}

// Ranked list card — persis kek aniku
function RankedCard({ anime, rank }: { anime: AnimeRaw; rank: number }) {
  return (
    <div
      onClick={() => (window.location.hash = `#/detail/${anime.slug}`)}
      className="group relative flex items-center gap-3 rounded-2xl overflow-hidden cursor-pointer border border-white/5 bg-[#121319] hover:bg-[#1a1c24] transition-colors"
      style={{ minHeight: 80 }}
    >
      {/* Grayscale background like aniku */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={anime.poster}
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover scale-105 filter grayscale opacity-40 group-hover:opacity-50 group-hover:grayscale-0 transition-all duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/95 via-black/70 to-black/30" />
      </div>

      {/* Poster */}
      <div className="relative flex-shrink-0">
        <img
          src={anime.poster}
          alt={anime.title}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-16 h-[88px] object-cover"
          style={{ borderRadius: "12px 0 0 12px" }}
        />
        {/* Rank badge */}
        <div className="absolute bottom-1 left-1 w-6 h-6 bg-black/80 rounded-md flex items-center justify-center">
          <span className="text-[10px] font-black text-white font-mono">#{rank}</span>
        </div>
      </div>

      {/* Info */}
      <div className="relative flex-1 min-w-0 py-3 pr-3">
        {/* Status dot + label */}
        <div className="flex items-center gap-1.5 mb-1">
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ background: anime.status?.toLowerCase().includes("comp") ? "#2196F3" : "#4CAF50" }}
          />
          <span
            className="text-[9px] font-bold uppercase tracking-widest"
            style={{ color: anime.status?.toLowerCase().includes("comp") ? "#2196F3" : "#4CAF50" }}
          >
            {anime.status || "Ongoing"}
          </span>
        </div>

        <h4 className="text-sm font-bold text-white leading-tight line-clamp-2 mb-1.5">
          {anime.title}
        </h4>

        <div className="flex items-center gap-2">
          {anime.type && (
            <span className="text-[10px] font-bold text-white bg-[#f04438] px-2 py-0.5 rounded-full">
              {anime.type}
            </span>
          )}
          {anime.score && anime.score !== "0" && (
            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5">
              ★ {anime.score}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="relative w-4 h-4 text-[#535766] flex-shrink-0 mr-3" />
    </div>
  );
}

// Shimmer untuk ranked card
function RankedShimmer() {
  return (
    <div className="flex items-center gap-3 rounded-2xl overflow-hidden border border-white/5 bg-[#121319] animate-pulse" style={{ minHeight: 80 }}>
      <div className="w-16 h-[88px] bg-white/5 flex-shrink-0" style={{ borderRadius: "12px 0 0 12px" }} />
      <div className="flex-1 py-3 pr-3 space-y-2">
        <div className="w-16 h-2.5 bg-white/5 rounded" />
        <div className="w-3/4 h-3.5 bg-white/5 rounded" />
        <div className="w-1/3 h-2.5 bg-white/5 rounded" />
      </div>
    </div>
  );
}

export default function Home({ dataSource }: HomeProps) {
  const [featured, setFeatured] = useState<FeaturedAnime[]>([]);
  const [recent, setRecent] = useState<AnimeRaw[]>([]);
  const [ongoing, setOngoing] = useState<AnimeRaw[]>([]);
  const [completed, setCompleted] = useState<AnimeRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCompleted, setLoadingCompleted] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchHomeData = async () => {
      setLoading(true);
      setError(null);
      try {
        const featuredRes = await fetch(`/api/proxy?route=featured_anime&source=${dataSource}`);
        let featuredData: FeaturedAnime[] = [];
        if (featuredRes.ok) featuredData = await featuredRes.json();

        const homeRes = await fetch(`/api/proxy?route=home&source=${dataSource}`);
        if (!homeRes.ok) throw new Error("Gagal mengambil data beranda");
        const homeData = await homeRes.json();

        const ongoingList: AnimeRaw[] = homeData.ongoing || [];
        const recentList: AnimeRaw[] = homeData.recent || homeData.recents || [];

        if (featuredData.length === 0 && ongoingList.length > 0) {
          featuredData = ongoingList.slice(0, 5).map((a, i) => ({
            id: i + 1,
            anime_slug: a.slug,
            anime_title: a.title,
            anime_poster: a.poster,
            order_index: i + 1,
          }));
        }

        if (active) {
          setFeatured(featuredData);
          setRecent(recentList);
          setOngoing(ongoingList);
        }
      } catch (err: any) {
        if (active) setError(err?.message || "Terjadi kesalahan saat memuat data.");
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchHomeData();
    return () => { active = false; };
  }, [dataSource]);

  // Fetch completed separately
  useEffect(() => {
    let active = true;
    const fetchCompleted = async () => {
      setLoadingCompleted(true);
      try {
        const res = await fetch(`/api/proxy?route=explore&tab=Completed&page=1&source=${dataSource}`);
        if (!res.ok) return;
        const data = await res.json();
        if (active) setCompleted((data.animes || []).slice(0, 8));
      } catch { } finally {
        if (active) setLoadingCompleted(false);
      }
    };
    fetchCompleted();
    return () => { active = false; };
  }, [dataSource]);

  const handleChipClick = (tabName: string, genreSlug?: string) => {
    if (genreSlug) window.location.hash = `#/explore?tab=Genres&genre=${genreSlug}`;
    else window.location.hash = `#/explore?tab=${tabName}`;
  };

  const handleSeeAll = (tabName: string) => {
    window.location.hash = `#/explore?tab=${tabName}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pb-24 pt-4"
      id="home-page"
    >
      {/* TOP BAR */}
      <div className="flex justify-between items-center pt-2 pb-5 px-5">
        <div className="flex items-center gap-3">
          <button className="text-[#a0a5b5] hover:text-white cursor-pointer">
            <Menu className="w-6 h-6 stroke-[2.2]" />
          </button>
          <div className="flex items-center gap-1.5 select-none">
            <span className="font-bold text-xl tracking-tight text-white">Eight</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-[#f04438]/15 text-[#f04438] text-[9px] font-bold tracking-wider uppercase">20 New</span>
          </div>
        </div>
        <button className="p-2 bg-[#1a1c24] hover:bg-white/5 rounded-full relative cursor-pointer transition-colors">
          <Bell className="w-4.5 h-4.5 text-[#a0a5b5]" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-[#f04438] rounded-full" />
        </button>
      </div>

      {/* SEARCH BAR */}
      <div className="px-5 mb-5">
        <div
          onClick={() => window.location.hash = "#/search"}
          className="relative bg-[#121319]/80 border border-white/5 rounded-2xl py-3.5 pl-11 pr-12 cursor-pointer transition-colors hover:bg-[#1a1c24]/80 flex items-center"
        >
          <Search className="w-4.5 h-4.5 text-[#535766] absolute left-4" />
          <span className="text-[#535766] text-sm font-sans select-none">Cari anime favoritmu...</span>
          <button
            onClick={(e) => { e.stopPropagation(); window.location.hash = "#/explore"; }}
            className="absolute right-3 p-1.5 bg-[#1a1c24]/80 rounded-lg hover:bg-white/10 text-[#a0a5b5] cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FILTER CHIPS — single horizontal scroll */}
      <div className="mb-5">
        <div className="flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
          {[
            { label: "Semua", tab: "All" },
            { label: "Terpopuler", tab: "Popular" },
            { label: "Rating Tinggi", tab: "Popular" },
            { label: "Movies", tab: "Movies" },
            { label: "Action", tab: "Genres", genre: "action" },
            { label: "Fantasy", tab: "Genres", genre: "fantasy" },
            { label: "Comedy", tab: "Genres", genre: "comedy" },
            { label: "Romance", tab: "Genres", genre: "romance" },
            { label: "Sci-Fi", tab: "Genres", genre: "sci-fi" },
            { label: "Horror", tab: "Genres", genre: "horror" },
          ].map((chip) => (
            <button
              key={chip.label}
              onClick={() => handleChipClick(chip.tab, (chip as any).genre)}
              className="bg-[#121319]/80 border border-white/5 text-[#a0a5b5] hover:text-white hover:border-white/15 rounded-2xl text-xs px-4 py-2 flex-shrink-0 cursor-pointer transition-colors whitespace-nowrap"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* HERO CAROUSEL */}
      <div className="px-5 mb-6">
        {loading ? (
          <div className="w-full h-[280px] bg-[#121319] rounded-3xl animate-pulse border border-white/5" />
        ) : (
          <HeroCarousel featured={featured} />
        )}
      </div>

      {error && !loading && (
        <div className="px-5 mb-6">
          <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 text-center text-red-400 text-xs font-medium">{error}</div>
        </div>
      )}

      {/* NEW RELEASES — horizontal scroll */}
      <div className="mb-6">
        <div className="flex justify-between items-center px-5 mb-3">
          <h2 className="text-base font-semibold text-white font-sans">New Releases</h2>
          <button onClick={() => handleSeeAll("Latest")} className="flex items-center text-xs text-[#535766] hover:text-[#a0a5b5] cursor-pointer">
            See all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
        {loading ? (
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
            {[1,2,3,4].map(i => <div key={i} className="w-32 flex-shrink-0"><ShimmerCard /></div>)}
          </div>
        ) : recent.length === 0 ? (
          <div className="px-5 text-xs text-[#535766] font-mono">Tidak ada rilis baru.</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
            {recent.map(anime => <div key={anime.slug} className="w-32 flex-shrink-0"><AnimeCard anime={anime} /></div>)}
          </div>
        )}
      </div>

      {/* TOP ONGOING — ranked list */}
      <div className="mb-6 px-5">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#f04438]/15 flex items-center justify-center">
              <Radio className="w-4 h-4 text-[#f04438]" />
            </div>
            <h2 className="text-base font-bold text-white uppercase tracking-wide">Top Ongoing</h2>
          </div>
          <button onClick={() => handleSeeAll("Ongoing")} className="flex items-center text-xs text-[#f04438] hover:text-[#f04438]/80 cursor-pointer font-semibold">
            Lihat Semua <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {loading
            ? [1,2,3,4,5].map(i => <RankedShimmer key={i} />)
            : ongoing.slice(0, 8).map((anime, i) => (
                <RankedCard key={anime.slug} anime={anime} rank={i + 1} />
              ))
          }
        </div>
      </div>

      {/* ONGOING SERIES — horizontal scroll */}
      <div className="mb-6">
        <div className="flex justify-between items-center px-5 mb-3">
          <h2 className="text-base font-semibold text-white font-sans">Ongoing Series</h2>
          <button onClick={() => handleSeeAll("Ongoing")} className="flex items-center text-xs text-[#535766] hover:text-[#a0a5b5] cursor-pointer">
            See all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
        {loading ? (
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
            {[1,2,3,4].map(i => <div key={i} className="w-32 flex-shrink-0"><ShimmerCard /></div>)}
          </div>
        ) : ongoing.length === 0 ? (
          <div className="px-5 text-xs text-[#535766] font-mono">Tidak ada anime ongoing.</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
            {ongoing.map(anime => <div key={anime.slug} className="w-32 flex-shrink-0"><AnimeCard anime={anime} /></div>)}
          </div>
        )}
      </div>

      {/* BARU TAMAT — ranked list */}
      <div className="mb-6 px-5">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#2196F3]/15 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-[#2196F3]" />
            </div>
            <h2 className="text-base font-bold text-white uppercase tracking-wide">Baru Tamat</h2>
          </div>
          <button onClick={() => handleSeeAll("Completed")} className="flex items-center text-xs text-[#f04438] hover:text-[#f04438]/80 cursor-pointer font-semibold">
            Lihat Semua <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
        <div className="flex flex-col gap-2.5">
          {loadingCompleted
            ? [1,2,3,4,5].map(i => <RankedShimmer key={i} />)
            : completed.slice(0, 8).map((anime, i) => (
                <RankedCard key={anime.slug} anime={anime} rank={i + 1} />
              ))
          }
        </div>
      </div>

    </motion.div>
  );
}
