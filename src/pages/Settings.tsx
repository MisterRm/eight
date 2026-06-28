import { useEffect, useState, MouseEvent } from "react";
import { 
  Settings, Database, Palette, Grid, Type, Info, Heart, Trash2, Check,
  ChevronRight
} from "lucide-react";
import { motion } from "motion/react";
import { DataSource, AccentColor, GridLayout, TextSize } from "../types";
import { getSettings, saveSetting, AppSettings } from "../lib/settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [favorites, setFavorites] = useState<any[]>([]);

  // Reload settings
  const reload = () => {
    setSettings(getSettings());
  };

  useEffect(() => {
    // Read favorites list
    try {
      const favs = JSON.parse(localStorage.getItem("eight_favorites") || "[]");
      setFavorites(favs);
    } catch (e) {
      console.error(e);
    }

    window.addEventListener("eight_settings_changed", reload);
    return () => window.removeEventListener("eight_settings_changed", reload);
  }, []);

  const handleUpdateSource = (val: DataSource) => {
    saveSetting("dataSource", val);
  };

  const handleUpdateAccent = (val: AccentColor) => {
    saveSetting("colorAccent", val);
  };

  const handleUpdateLayout = (val: GridLayout) => {
    saveSetting("gridLayout", val);
  };

  const handleUpdateTextSize = (val: TextSize) => {
    saveSetting("textSize", val);
  };

  const handleClearFavorites = () => {
    if (confirm("Hapus semua bookmark favorit Anda?")) {
      localStorage.setItem("eight_favorites", "[]");
      setFavorites([]);
    }
  };

  const handleRemoveFavorite = (e: MouseEvent, slug: string) => {
    e.stopPropagation();
    const updated = favorites.filter((f) => f.slug !== slug);
    localStorage.setItem("eight_favorites", JSON.stringify(updated));
    setFavorites(updated);
  };

  const handleAnimeClick = (slug: string) => {
    window.location.hash = `#/detail/${slug}`;
  };

  // Accent color dots configuration
  const accents: { id: AccentColor; class: string; label: string }[] = [
    { id: "white", class: "bg-white border-white/20", label: "White" },
    { id: "blue", class: "bg-[#2196F3] border-[#2196F3]/20", label: "Blue" },
    { id: "purple", class: "bg-[#9C27B0] border-[#9C27B0]/20", label: "Purple" },
    { id: "green", class: "bg-[#4CAF50] border-[#4CAF50]/20", label: "Green" },
    { id: "orange", class: "bg-[#FF9800] border-[#FF9800]/20", label: "Orange" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pb-32 pt-4 px-5 min-h-screen"
      id="settings-page"
    >
      {/* Title Header */}
      <div className="pt-2 mb-6 flex items-center gap-2 select-none">
        <Settings className="w-5 h-5 text-white stroke-[2]" />
        <h1 className="text-lg font-bold text-white font-sans">Profile & Settings</h1>
      </div>

      {/* Bookmarked / Saved Library */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4 select-none">
          <h2 className="text-sm font-semibold text-[#535766] uppercase tracking-wider flex items-center gap-2">
            <Heart className="w-4 h-4 text-[#f04438] fill-[#f04438]" />
            Daftar Favorit ({favorites.length})
          </h2>
          {favorites.length > 0 && (
            <button
              onClick={handleClearFavorites}
              className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>

        {favorites.length === 0 ? (
          <div className="p-6 bg-[#121319]/50 border border-white/5 rounded-2xl text-center">
            <span className="text-xs text-[#535766] leading-relaxed font-sans block">
              Belum ada anime yang disimpan sebagai favorit. Klik ikon hati pada halaman detail anime untuk menambahkannya.
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {favorites.map((anime) => (
              <div
                key={anime.slug}
                onClick={() => handleAnimeClick(anime.slug)}
                className="group flex gap-3 p-2.5 bg-[#121319] hover:bg-[#1a1c24] border border-white/5 rounded-2xl cursor-pointer transition-colors items-center"
              >
                <img
                  src={anime.poster}
                  alt={anime.title}
                  referrerPolicy="no-referrer"
                  className="w-10 h-14 object-cover rounded-xl bg-[#121319] flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-white truncate font-sans group-hover:text-white/90">
                    {anime.title}
                  </h4>
                  <span className="text-[10px] text-[#535766] block mt-0.5 font-medium uppercase font-mono">
                    {anime.type || "TV"} {anime.score ? `· Score: ${anime.score}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleRemoveFavorite(e, anime.slug)}
                    className="p-2 hover:bg-[#121319] text-[#535766] hover:text-red-400 rounded-full transition-colors cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronRight className="w-4 h-4 text-[#535766]" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings Options Block */}
      <div className="flex flex-col gap-6">
        
        {/* 1. DATA SOURCE OPTION */}
        <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl select-none">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-3 font-sans">
            <Database className="w-4 h-4 text-[#a0a5b5]" />
            Sumber Data (Stream Provider)
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleUpdateSource("Dayynime-v1")}
              className={`text-xs p-3 rounded-xl border font-medium cursor-pointer transition-all ${
                settings.dataSource === "Dayynime-v1"
                  ? "bg-white/10 text-white border-white/20 font-semibold"
                  : "bg-[#1a1c24] border-white/5 text-[#a0a5b5]"
              }`}
            >
              Dayynime-v1 (Animasu)
            </button>
            <button
              onClick={() => handleUpdateSource("Dayynime-v2")}
              className={`text-xs p-3 rounded-xl border font-medium cursor-pointer transition-all ${
                settings.dataSource === "Dayynime-v2"
                  ? "bg-white/10 text-white border-white/20 font-semibold"
                  : "bg-[#1a1c24] border-white/5 text-[#a0a5b5]"
              }`}
            >
              Dayynime-v2 (Samehadaku)
            </button>
          </div>
        </div>

        {/* 2. ACCENT COLOR OPTION */}
        <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl select-none">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-3 font-sans">
            <Palette className="w-4 h-4 text-[#a0a5b5]" />
            Warna Aksen UI
          </div>
          <div className="flex gap-3">
            {accents.map((acc) => {
              const active = settings.colorAccent === acc.id;
              return (
                <button
                  key={acc.id}
                  onClick={() => handleUpdateAccent(acc.id)}
                  className={`w-8 h-8 rounded-full border-2 cursor-pointer flex items-center justify-center transition-transform ${acc.class} ${
                    active ? "scale-110 border-white" : "border-transparent"
                  }`}
                  title={acc.label}
                >
                  {active && <Check className="w-3.5 h-3.5 text-[#0e1015]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. GRID LAYOUT OPTION */}
        <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl select-none">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-3 font-sans">
            <Grid className="w-4 h-4 text-[#a0a5b5]" />
            Tampilan Grid
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleUpdateLayout("cols-2")}
              className={`text-xs py-2.5 rounded-xl border font-medium cursor-pointer transition-all ${
                settings.gridLayout === "cols-2"
                  ? "bg-white/10 text-white border-white/20 font-semibold"
                  : "bg-[#1a1c24] border-white/5 text-[#a0a5b5]"
              }`}
            >
              2 Kolom
            </button>
            <button
              onClick={() => handleUpdateLayout("cols-3")}
              className={`text-xs py-2.5 rounded-xl border font-medium cursor-pointer transition-all ${
                settings.gridLayout === "cols-3"
                  ? "bg-white/10 text-white border-white/20 font-semibold"
                  : "bg-[#1a1c24] border-white/5 text-[#a0a5b5]"
              }`}
            >
              3 Kolom
            </button>
            <button
              onClick={() => handleUpdateLayout("list")}
              className={`text-xs py-2.5 rounded-xl border font-medium cursor-pointer transition-all ${
                settings.gridLayout === "list"
                  ? "bg-white/10 text-white border-white/20 font-semibold"
                  : "bg-[#1a1c24] border-white/5 text-[#a0a5b5]"
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* 4. TEXT SIZE OPTION */}
        <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl select-none">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-3 font-sans">
            <Type className="w-4 h-4 text-[#a0a5b5]" />
            Ukuran Teks
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleUpdateTextSize("kecil")}
              className={`text-xs py-2.5 rounded-xl border font-medium cursor-pointer transition-all ${
                settings.textSize === "kecil"
                  ? "bg-white/10 text-white border-white/20 font-semibold"
                  : "bg-[#1a1c24] border-white/5 text-[#a0a5b5]"
              }`}
            >
              Kecil
            </button>
            <button
              onClick={() => handleUpdateTextSize("sedang")}
              className={`text-xs py-2.5 rounded-xl border font-medium cursor-pointer transition-all ${
                settings.textSize === "sedang"
                  ? "bg-white/10 text-white border-white/20 font-semibold"
                  : "bg-[#1a1c24] border-white/5 text-[#a0a5b5]"
              }`}
            >
              Sedang
            </button>
            <button
              onClick={() => handleUpdateTextSize("besar")}
              className={`text-xs py-2.5 rounded-xl border font-medium cursor-pointer transition-all ${
                settings.textSize === "besar"
                  ? "bg-white/10 text-white border-white/20 font-semibold"
                  : "bg-[#1a1c24] border-white/5 text-[#a0a5b5]"
              }`}
            >
              Besar
            </button>
          </div>
        </div>

        {/* 5. ABOUT INFO */}
        <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl select-none flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm font-sans">
            <Info className="w-4 h-4 text-[#a0a5b5]" />
            Tentang Aplikasi
          </div>
          <span className="text-xs text-[#535766] font-bold font-mono">Eight v1.0.0</span>
        </div>

      </div>
    </motion.div>
  );
}
