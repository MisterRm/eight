import { useState, useRef, useCallback } from "react";
import { Film, Star, X, Clock, Tv2, Building2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AnimeRaw, TooltipData } from "../types";

interface AnimeCardProps {
  anime: AnimeRaw;
  key?: string | number;
  dataSource?: string;
  tooltipId?: string;
}

export default function AnimeCard({ anime, dataSource, tooltipId }: AnimeCardProps) {
  const [imageError, setImageError] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipLoading, setTooltipLoading] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isV3 = dataSource === "Dayynime-v3";

  const handleClick = () => {
    if (showTooltip) return;
    window.location.hash = `#/detail/${anime.slug}`;
  };

  // Long press handlers (V3 tooltip)
  const handlePressStart = useCallback(() => {
    if (!isV3 || !tooltipId) return;
    longPressTimer.current = setTimeout(async () => {
      if (!tooltip) {
        setTooltipLoading(true);
        try {
          const res = await fetch(`/api/proxy?route=tooltip&tooltipId=${tooltipId}&source=Dayynime-v3`);
          if (res.ok) setTooltip(await res.json());
        } catch {}
        setTooltipLoading(false);
      }
      setShowTooltip(true);
    }, 500);
  }, [isV3, tooltipId, tooltip]);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  return (
    <>
      <motion.div
        onClick={handleClick}
        onTouchStart={handlePressStart}
        onTouchEnd={handlePressEnd}
        onMouseDown={handlePressStart}
        onMouseUp={handlePressEnd}
        onMouseLeave={handlePressEnd}
        className="group cursor-pointer select-none flex flex-col w-full"
        whileHover={{ scale: 1.03 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        id={`anime-card-${anime.slug}`}
      >
        {/* Poster */}
        <div className="relative aspect-[3/4] w-full rounded-xl overflow-hidden bg-[#121319] border border-white/5">
          {imageError ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-[#535766] gap-2">
              <Film className="w-8 h-8 stroke-[1.5]" />
              <span className="text-[10px] font-medium font-sans">No Image</span>
            </div>
          ) : (
            <img src={anime.poster} alt={anime.title} referrerPolicy="no-referrer" loading="lazy"
              onError={() => setImageError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
          )}
          {anime.score && anime.score !== "N/A" && anime.score !== "0" && anime.score !== "0.0" && (
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-xs rounded-lg px-1.5 py-0.5 flex items-center gap-1">
              <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              <span className="text-white text-[10px] font-medium font-sans">{anime.score}</span>
            </div>
          )}
          {anime.episode && (
            <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs rounded-md px-1.5 py-0.5">
              <span className="text-white text-[10px] font-medium font-sans">
                {anime.episode.includes("Ep") ? anime.episode : `Ep ${anime.episode}`}
              </span>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-col">
          <h3 className="text-sm font-semibold text-white line-clamp-2 leading-tight group-hover:text-white/90 transition-colors">{anime.title}</h3>
          <span className="text-xs text-[#535766] mt-0.5 font-medium tracking-wide">{anime.type || "TV"} {anime.status ? `· ${anime.status}` : ""}</span>
        </div>
      </motion.div>

      {/* Tooltip Modal (V3 long press) */}
      <AnimatePresence>
        {showTooltip && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
              onClick={() => setShowTooltip(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: "spring", damping: 25, stiffness: 320 }}
              className="fixed inset-x-5 top-1/2 -translate-y-1/2 z-50 bg-[#121319] border border-white/10 rounded-3xl overflow-hidden shadow-2xl max-w-sm mx-auto"
            >
              {tooltipLoading ? (
                <div className="p-8 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              ) : tooltip ? (
                <>
                  {/* Poster + basic info */}
                  <div className="flex gap-4 p-4 border-b border-white/5">
                    <img src={anime.poster} alt={tooltip.title} referrerPolicy="no-referrer"
                      className="w-16 h-22 object-cover rounded-xl bg-[#1a1c24] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-bold text-sm leading-tight mb-2">{tooltip.title}</h3>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <span className="text-amber-400 text-xs font-bold">{tooltip.rating}</span>
                        <span className="text-[#535766] text-xs">· {tooltip.quality}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#535766] text-xs mb-1">
                        <Clock className="w-3 h-3" /><span>{tooltip.duration}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#535766] text-xs mb-1">
                        <Tv2 className="w-3 h-3" /><span>{tooltip.status}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#535766] text-xs">
                        <Building2 className="w-3 h-3" /><span className="truncate">{tooltip.studio}</span>
                      </div>
                    </div>
                    <button onClick={() => setShowTooltip(false)} className="self-start p-1 rounded-full hover:bg-white/5 text-[#535766] cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {/* Synopsis */}
                  {tooltip.synopsis && (
                    <div className="px-4 pt-3 pb-2">
                      <p className="text-xs text-[#a0a5b5] leading-relaxed line-clamp-4">{tooltip.synopsis}</p>
                    </div>
                  )}
                  {/* Genres */}
                  {tooltip.genres?.length > 0 && (
                    <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                      {tooltip.genres.slice(0, 5).map(g => (
                        <span key={g} className="text-[10px] px-2 py-0.5 rounded-lg bg-white/5 text-[#a0a5b5] border border-white/5">{g}</span>
                      ))}
                    </div>
                  )}
                  {/* CTA */}
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => { setShowTooltip(false); window.location.hash = `#/detail/${tooltip.detail_id}`; }}
                      className="w-full py-2.5 rounded-2xl bg-white text-[#0e1015] text-sm font-bold cursor-pointer hover:bg-white/90 transition-colors"
                    >
                      Lihat Detail
                    </button>
                  </div>
                </>
              ) : null}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
