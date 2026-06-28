import { useEffect, useState, MouseEvent } from "react";
import { Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { FeaturedAnime } from "../types";

interface HeroCarouselProps {
  featured: FeaturedAnime[];
}

export default function HeroCarousel({ featured }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto rotate every 4000ms
  useEffect(() => {
    if (featured.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [featured]);

  if (!featured || featured.length === 0) {
    return (
      <div className="w-full h-[280px] bg-[#121319] rounded-3xl animate-pulse flex items-center justify-center border border-white/5">
        <span className="text-xs text-[#535766] font-medium font-mono">No featured anime available</span>
      </div>
    );
  }

  const current = featured[currentIndex];

  const handleWatchNow = (e: MouseEvent, slug: string) => {
    e.stopPropagation();
    // Navigate to details page or first episode
    window.location.hash = `#/detail/${slug}`;
  };

  const handleDetails = (e: MouseEvent, slug: string) => {
    e.stopPropagation();
    window.location.hash = `#/detail/${slug}`;
  };

  return (
    <div 
      className="w-full h-[280px] rounded-3xl overflow-hidden relative cursor-pointer group select-none border border-white/5"
      onClick={() => window.location.hash = `#/detail/${current.anime_slug}`}
      id="hero-carousel"
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          className="absolute inset-0 w-full h-full"
        >
          {/* Background Image */}
          <img
            src={current.anime_poster}
            alt={current.anime_title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          {/* Dark Overlay Gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1015] via-[#0e1015]/40 to-transparent" />
        </motion.div>
      </AnimatePresence>

      {/* Content Overlay */}
      <div className="absolute bottom-5 left-5 right-5 z-20 pointer-events-none">
        <div className="pointer-events-auto flex flex-col items-start">
          {/* Genre Tags / Pill */}
          <span className="bg-white/10 backdrop-blur-xs text-white text-[10px] rounded-full px-2.5 py-0.5 font-bold uppercase tracking-wider">
            ★ Featured
          </span>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white leading-tight mt-2 line-clamp-1 font-sans">
            {current.anime_title}
          </h2>

          {/* Description */}
          <p className="text-xs text-[#a0a5b5] mt-1 line-clamp-2 max-w-sm leading-relaxed">
            Saksikan episode terbaru dari anime terpopuler season ini. Nikmati pengalaman streaming berkualitas tinggi hanya di Eight.
          </p>

          {/* Action Row */}
          <div className="flex items-center gap-2.5 mt-4">
            <button
              onClick={(e) => handleWatchNow(e, current.anime_slug)}
              className="bg-white hover:bg-white/95 text-[#0e1015] font-bold text-xs rounded-xl px-4 py-2.5 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Watch Now
            </button>
            <button
              onClick={(e) => handleDetails(e, current.anime_slug)}
              className="bg-white/10 hover:bg-white/15 text-white font-medium text-xs rounded-xl px-4 py-2.5 border border-white/10 backdrop-blur-xs transition-all cursor-pointer"
            >
              Details
            </button>
          </div>
        </div>
      </div>

      {/* Dot Indicators */}
      <div className="absolute bottom-3 right-5 z-20 flex items-center gap-1.5">
        {featured.map((_, index) => (
          <button
            key={index}
            onClick={(e) => {
              e.stopPropagation();
              setCurrentIndex(index);
            }}
            className={`transition-all duration-300 cursor-pointer ${
              index === currentIndex
                ? "w-4 h-1.5 bg-white rounded-full"
                : "w-1.5 h-1.5 bg-white/30 hover:bg-white/50 rounded-full"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
