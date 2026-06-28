import { useState } from "react";
import { Film, Star } from "lucide-react";
import { motion } from "motion/react";
import { AnimeRaw } from "../types";

interface AnimeCardProps {
  anime: AnimeRaw;
  key?: string | number;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    window.location.hash = `#/detail/${anime.slug}`;
  };

  return (
    <motion.div
      onClick={handleClick}
      className="group cursor-pointer select-none flex flex-col w-full"
      whileHover={{ scale: 1.03 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      id={`anime-card-${anime.slug}`}
    >
      {/* Poster Container */}
      <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-[#121319] border border-white/5">
        {imageError ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-[#535766] gap-2">
            <Film className="w-8 h-8 stroke-[1.5]" />
            <span className="text-[10px] font-medium font-sans">No Image</span>
          </div>
        ) : (
          <img
            src={anime.poster}
            alt={anime.title}
            referrerPolicy="no-referrer"
            loading="lazy"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        {/* Score Badge */}
        {anime.score && anime.score !== "N/A" && anime.score !== "0" && anime.score !== "0.0" && (
          <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs rounded-lg px-1.5 py-0.5 flex items-center gap-1">
            <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
            <span className="text-white text-[10px] font-medium font-sans">{anime.score}</span>
          </div>
        )}

        {/* Episode Badge */}
        {anime.episode && (
          <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs rounded-md px-1.5 py-0.5">
            <span className="text-white text-[10px] font-medium font-sans">
              {anime.episode.includes("Ep") ? anime.episode : `Ep ${anime.episode}`}
            </span>
          </div>
        )}
      </div>

      {/* Info Container */}
      <div className="mt-2 flex flex-col">
        <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight group-hover:text-white/90 transition-colors">
          {anime.title}
        </h3>
        <span className="text-xs text-[#535766] mt-0.5 font-medium tracking-wide">
          {anime.type || "TV"} {anime.status ? `· ${anime.status}` : ""}
        </span>
      </div>
    </motion.div>
  );
}
