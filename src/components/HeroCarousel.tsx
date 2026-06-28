import { useEffect, useState, useRef } from "react";
import { Play, Star, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FeaturedAnime } from "../types";

interface HeroCarouselProps {
  featured: FeaturedAnime[];
}

export default function HeroCarousel({ featured }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1); // 1 = next, -1 = prev
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (featured.length <= 1) return;
    timerRef.current = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 5000);
  };

  useEffect(() => {
    resetTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [featured]);

  const goTo = (index: number) => {
    setDirection(index > currentIndex ? 1 : -1);
    setCurrentIndex(index);
    resetTimer();
  };

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    const prev = (currentIndex - 1 + featured.length) % featured.length;
    setDirection(-1);
    setCurrentIndex(prev);
    resetTimer();
  };

  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = (currentIndex + 1) % featured.length;
    setDirection(1);
    setCurrentIndex(next);
    resetTimer();
  };

  if (!featured || featured.length === 0) {
    return (
      <div className="w-full rounded-3xl bg-[#121319] animate-pulse border border-white/5" style={{ height: "min(72vw, 440px)" }} />
    );
  }

  const current = featured[currentIndex];

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? "100%" : "-100%", opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? "-100%" : "100%", opacity: 0 }),
  };

  return (
    <div
      className="relative w-full rounded-3xl overflow-hidden cursor-pointer select-none"
      style={{ height: "min(72vw, 440px)" }}
      onClick={() => (window.location.hash = `#/detail/${current.anime_slug}`)}
      id="hero-carousel"
    >
      {/* Slides */}
      <AnimatePresence initial={false} custom={direction} mode="sync">
        <motion.div
          key={currentIndex}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Poster — object-top biar muka karakter keliatan */}
          <img
            src={current.anime_poster}
            alt={current.anime_title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-top"
            style={{ imageRendering: "auto" }}
          />

          {/* Gradient overlay — lebih gelap di bawah */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1015] via-[#0e1015]/50 to-[#0e1015]/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0e1015]/60 via-transparent to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Score badge — top right */}
      {current.anime_score && current.anime_score !== "0" && current.anime_score !== "N/A" && (
        <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-xl px-2.5 py-1">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-white text-xs font-bold">{current.anime_score}</span>
        </div>
      )}

      {/* Type badge — top left */}
      {current.anime_type && (
        <div className="absolute top-4 left-4 z-20">
          <span className="text-[10px] font-bold text-white bg-[#f04438]/80 backdrop-blur-sm px-2.5 py-1 rounded-lg uppercase tracking-wider">
            {current.anime_type}
          </span>
        </div>
      )}

      {/* Content — bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-20 p-5">
        {/* Genres */}
        {current.anime_genres && current.anime_genres.length > 0 && (
          <div className="flex gap-1.5 mb-2 flex-wrap">
            {current.anime_genres.slice(0, 3).map((g) => (
              <span key={g} className="text-[10px] font-semibold text-white/80 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-md">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h2 className="text-xl font-bold text-white leading-tight line-clamp-2 mb-3 drop-shadow-lg">
          {current.anime_title}
        </h2>

        {/* Buttons + dots row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); window.location.hash = `#/detail/${current.anime_slug}`; }}
              className="bg-white text-[#0e1015] font-bold text-xs rounded-xl px-4 py-2.5 flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Watch Now
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); window.location.hash = `#/detail/${current.anime_slug}`; }}
              className="bg-white/15 backdrop-blur-sm text-white font-medium text-xs rounded-xl px-4 py-2.5 border border-white/15 cursor-pointer"
            >
              Details
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={(e) => { e.stopPropagation(); goTo(i); }}
                className={`transition-all duration-300 rounded-full cursor-pointer ${
                  i === currentIndex ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/30 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Prev / Next arrows — muncul saat hover */}
      {featured.length > 1 && (
        <>
          <button
            onClick={goPrev}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goNext}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
