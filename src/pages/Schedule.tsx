import { useEffect, useState, useRef } from "react";
import { Calendar, Clock, AlertCircle, ChevronRight } from "lucide-react";
import { motion } from "motion/react";
import { AnimeRaw, DataSource } from "../types";

interface ScheduleProps {
  dataSource: DataSource;
}

interface DayTab {
  id: string;
  label: string;
}

export default function Schedule({ dataSource }: ScheduleProps) {
  const [schedules, setSchedules] = useState<Record<string, AnimeRaw[]>>({});
  const [activeDay, setActiveDay] = useState<string>("senin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dayTabs: DayTab[] = [
    { id: "senin", label: "Senin" },
    { id: "selasa", label: "Selasa" },
    { id: "rabu", label: "Rabu" },
    { id: "kamis", label: "Kamis" },
    { id: "jumat", label: "Jumat" },
    { id: "sabtu", label: "Sabtu" },
    { id: "minggu", label: "Minggu" },
  ];

  // Map JS Date index (0=Sunday, 1=Monday, etc) to Indonesian day id
  const indexToDayId: Record<number, string> = {
    0: "minggu",
    1: "senin",
    2: "selasa",
    3: "rabu",
    4: "kamis",
    5: "jumat",
    6: "sabtu",
  };

  useEffect(() => {
    // Auto highlight today's day
    const todayIndex = new Date().getDay();
    const todayId = indexToDayId[todayIndex] || "senin";
    setActiveDay(todayId);
  }, []);

  // Fetch schedule data
  useEffect(() => {
    let active = true;
    const fetchSchedule = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/proxy?route=schedule&source=${dataSource}`);
        if (!res.ok) {
          throw new Error("Gagal mengambil jadwal rilis anime");
        }
        const data = await res.json();
        if (active) {
          setSchedules(data || {});
        }
      } catch (err: any) {
        console.error("Schedule fetch error:", err);
        if (active) {
          setError(err?.message || "Terjadi kesalahan.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchSchedule();
    return () => {
      active = false;
    };
  }, [dataSource]);

  // Read schedules list for selected day, handle variations like 'senen' vs 'senin'
  const getSchedulesForDay = (dayId: string): AnimeRaw[] => {
    if (!schedules) return [];
    return schedules[dayId] || [];
  };

  // Swipe gesture
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const [slideDir, setSlideDir] = useState<number>(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartY.current);
    if (Math.abs(dx) < 50 || dy > 60) return;
    const currentIdx = dayTabs.findIndex(d => d.id === activeDay);
    if (dx < 0 && currentIdx < dayTabs.length - 1) {
      setSlideDir(-1);
      setActiveDay(dayTabs[currentIdx + 1].id);
    } else if (dx > 0 && currentIdx > 0) {
      setSlideDir(1);
      setActiveDay(dayTabs[currentIdx - 1].id);
    }
  };

  const dayList = getSchedulesForDay(activeDay);

  const handleAnimeClick = (slug: string) => {
    window.location.hash = `#/detail/${slug}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pb-24 pt-4 min-h-screen"
      id="schedule-page"
    >
      {/* Title Header */}
      <div className="px-5 mb-5 pt-2 flex items-center gap-2 select-none">
        <Calendar className="w-5 h-5 text-white stroke-[2]" />
        <h1 className="text-lg font-bold text-white font-sans">Jadwal Rilis</h1>
      </div>

      {/* Days Tabs selector */}
      <div className="flex gap-4 border-b border-white/5 overflow-x-auto px-5 mb-6 scrollbar-none select-none">
        {dayTabs.map((day) => {
          const active = activeDay === day.id;
          return (
            <button
              key={day.id}
              onClick={() => setActiveDay(day.id)}
              className={`relative pb-3 text-sm font-medium tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
                active ? "text-white font-semibold" : "text-[#535766] hover:text-[#a0a5b5]"
              }`}
            >
              {day.label}
              {active && (
                <motion.div
                  layoutId="activeScheduleTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full"
                  transition={{ duration: 0.2 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Schedules Content List */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="overflow-hidden"
      >
      <motion.div
        key={activeDay}
        initial={{ x: slideDir * -60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: slideDir * 60, opacity: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="px-5 flex flex-col gap-3"
      >
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div 
                key={i} 
                className="w-full h-[100px] bg-[#121319] rounded-2xl animate-pulse border border-white/5" 
              />
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <AlertCircle className="w-10 h-10 text-[#535766] mb-3" />
            <span className="text-xs text-[#a0a5b5] font-medium max-w-xs leading-relaxed">
              {error}. Menggunakan mode offline cache.
            </span>
          </div>
        ) : dayList.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16 select-none">
            <Clock className="w-10 h-10 text-[#535766] mb-3 stroke-[1.5]" />
            <h3 className="text-white text-sm font-semibold mb-1">Tidak Ada Jadwal</h3>
            <span className="text-xs text-[#535766] max-w-xs font-medium">
              Tidak ada seri anime yang dijadwalkan rilis untuk hari ini.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {dayList.map((anime) => (
              <div
                key={anime.slug}
                onClick={() => handleAnimeClick(anime.slug)}
                className="group flex gap-3.5 p-3 bg-[#121319] hover:bg-[#1a1c24] border border-white/5 rounded-2xl cursor-pointer transition-colors"
                id={`schedule-item-${anime.slug}`}
              >
                {/* 60x80px Thumbnail Poster */}
                <img
                  src={anime.poster}
                  alt={anime.title}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  className="w-[60px] h-[80px] object-cover rounded-xl bg-[#121319] flex-shrink-0"
                />

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h3 className="text-sm font-semibold text-white truncate font-sans leading-snug group-hover:text-white/90">
                    {anime.title}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-1.5 text-xs text-[#535766] font-medium font-sans">
                    <Clock className="w-3.5 h-3.5 text-[#535766]" />
                    <span>Est. rilis: {anime.release || anime.estimation || "TBA"}</span>
                  </div>
                  {anime.episode && (
                    <span className="mt-1.5 inline-block self-start text-[9px] font-bold uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-md text-[#a0a5b5] font-mono">
                      Episode {anime.episode}
                    </span>
                  )}
                </div>

                {/* Chevron marker */}
                <div className="flex items-center text-[#535766] group-hover:text-white transition-colors pr-1">
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
      </div>
    </motion.div>
  );
}
