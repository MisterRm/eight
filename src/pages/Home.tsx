import { useEffect, useState } from "react";
import { Menu, Bell, Search, SlidersHorizontal, ChevronRight, Flame } from "lucide-react";
import { motion } from "motion/react";
import { AnimeRaw, FeaturedAnime, DataSource } from "../types";
import HeroCarousel from "../components/HeroCarousel";
import AnimeCard from "../components/AnimeCard";
import ShimmerCard from "../components/ShimmerCard";

interface HomeProps {
  dataSource: DataSource;
}

export default function Home({ dataSource }: HomeProps) {
  const [featured, setFeatured] = useState<FeaturedAnime[]>([]);
  const [recent, setRecent] = useState<AnimeRaw[]>([]);
  const [ongoing, setOngoing] = useState<AnimeRaw[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchHomeData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch featured_anime from Supabase
        const featuredRes = await fetch(`/api/proxy?route=featured_anime&source=${dataSource}`);
        let featuredData: FeaturedAnime[] = [];
        if (featuredRes.ok) {
          featuredData = await featuredRes.json();
        }

        // Fetch home lists (ongoing + recent)
        const homeRes = await fetch(`/api/proxy?route=home&source=${dataSource}`);
        if (!homeRes.ok) throw new Error("Gagal mengambil data beranda");
        const homeData = await homeRes.json();

        const ongoingList: AnimeRaw[] = homeData.ongoing || [];
        const recentList: AnimeRaw[] = homeData.recent || homeData.recents || [];

        // Fallback: jika featured kosong, pakai 5 anime pertama dari ongoing
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
        console.error("Home fetch error:", err);
        if (active) setError(err?.message || "Terjadi kesalahan saat memuat data.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchHomeData();
    return () => { active = false; };
  }, [dataSource]);

  const handleChipClick = (tabName: string, genreSlug?: string) => {
    if (genreSlug) {
      window.location.hash = `#/explore?tab=Genres&genre=${genreSlug}`;
    } else {
      window.location.hash = `#/explore?tab=${tabName}`;
    }
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
          <button className="text-[#a0a5b5] hover:text-white cursor-pointer" aria-label="Menu">
            <Menu className="w-6 h-6 stroke-[2.2]" />
          </button>
          <div className="flex items-center gap-1.5 select-none">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#f04438] to-[#ff7a00] font-black text-xs text-white flex items-center justify-center">
              8
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Eight</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-[#f04438]/15 text-[#f04438] text-[9px] font-bold tracking-wider uppercase">
              20 New
            </span>
          </div>
        </div>
        <button className="p-2 bg-[#1a1c24] hover:bg-white/5 rounded-full relative cursor-pointer transition-colors" aria-label="Notifikasi">
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

      {/* FILTER CHIPS */}
      <div className="mb-5 overflow-hidden">
        <div className="flex gap-2 overflow-x-auto px-5 pb-2 scrollbar-none">
          <button onClick={() => handleChipClick("All")} className="bg-[#121319]/80 border border-white/5 text-[#a0a5b5] hover:text-white rounded-2xl text-xs px-4 py-2 flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
            <span>All</span>
          </button>
          <button onClick={() => handleChipClick("Popular")} className="bg-[#121319]/80 border border-white/5 text-[#a0a5b5] hover:text-white rounded-2xl text-xs px-4 py-2 flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
            <Flame className="w-3.5 h-3.5 text-amber-500" />
            <span>Popular ♥</span>
          </button>
          <button onClick={() => handleChipClick("Popular")} className="bg-[#121319]/80 border border-white/5 text-[#a0a5b5] hover:text-white rounded-2xl text-xs px-4 py-2 flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
            <span>User ratings ★</span>
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto px-5 scrollbar-none">
          <button onClick={() => handleChipClick("Genres", "action")} className="bg-[#121319]/80 border border-white/5 text-[#a0a5b5] hover:text-white rounded-2xl text-xs px-4 py-2 flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
            <span>⚡ Action</span>
          </button>
          <button onClick={() => handleChipClick("Genres", "sci-fi")} className="bg-[#121319]/80 border border-white/5 text-[#a0a5b5] hover:text-white rounded-2xl text-xs px-4 py-2 flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
            <span>🚀 Futuristic</span>
          </button>
          <button onClick={() => handleChipClick("Genres", "comedy")} className="bg-[#121319]/80 border border-white/5 text-[#a0a5b5] hover:text-white rounded-2xl text-xs px-4 py-2 flex items-center gap-1.5 flex-shrink-0 cursor-pointer">
            <span>😊 Comedy</span>
          </button>
        </div>
      </div>

      {/* HERO CAROUSEL */}
      <div className="px-5 mb-6">
        {loading ? (
          <div className="w-full h-[280px] bg-[#121319] rounded-3xl animate-pulse flex items-center justify-center border border-white/5" />
        ) : (
          <HeroCarousel featured={featured} />
        )}
      </div>

      {error && !loading && (
        <div className="px-5 mb-6">
          <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-4 text-center text-red-400 text-xs font-medium">
            {error}. Menggunakan mode offline fallback.
          </div>
        </div>
      )}

      {/* New Releases */}
      <div className="mb-6">
        <div className="flex justify-between items-center px-5 mb-3">
          <h2 className="text-base font-semibold text-white font-sans">New Releases</h2>
          <button onClick={() => handleSeeAll("Latest")} className="flex items-center text-xs text-[#535766] hover:text-[#a0a5b5] cursor-pointer font-sans">
            See all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
        {loading ? (
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
            {[1, 2, 3, 4].map((i) => <div key={i} className="w-32 flex-shrink-0"><ShimmerCard /></div>)}
          </div>
        ) : recent.length === 0 ? (
          <div className="px-5 text-xs text-[#535766] font-mono">Tidak ada rilis baru.</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
            {recent.map((anime) => <div key={anime.slug} className="w-32 flex-shrink-0"><AnimeCard anime={anime} /></div>)}
          </div>
        )}
      </div>

      {/* Ongoing */}
      <div className="mb-6">
        <div className="flex justify-between items-center px-5 mb-3">
          <h2 className="text-base font-semibold text-white font-sans">Ongoing Series</h2>
          <button onClick={() => handleSeeAll("Ongoing")} className="flex items-center text-xs text-[#535766] hover:text-[#a0a5b5] cursor-pointer font-sans">
            See all <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
        {loading ? (
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
            {[1, 2, 3, 4].map((i) => <div key={i} className="w-32 flex-shrink-0"><ShimmerCard /></div>)}
          </div>
        ) : ongoing.length === 0 ? (
          <div className="px-5 text-xs text-[#535766] font-mono">Tidak ada anime ongoing.</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none">
            {ongoing.map((anime) => <div key={anime.slug} className="w-32 flex-shrink-0"><AnimeCard anime={anime} /></div>)}
          </div>
        )}
      </div>
    </motion.div>
  );
}
