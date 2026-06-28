import { useEffect, useState } from "react";
import {
  Sliders, Palette, Layers, Type, Info,
  Heart, Trash2, ChevronRight, Check,
  Send, ExternalLink, Database
} from "lucide-react";
import { motion } from "motion/react";
import { DataSource, AccentColor, GridLayout, TextSize } from "../types";
import { getSettings, saveSetting, AppSettings } from "../lib/settings";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [favorites, setFavorites] = useState<any[]>([]);

  const reload = () => setSettings(getSettings());

  useEffect(() => {
    try {
      setFavorites(JSON.parse(localStorage.getItem("eight_favorites") || "[]"));
    } catch { }
    window.addEventListener("eight_settings_changed", reload);
    return () => window.removeEventListener("eight_settings_changed", reload);
  }, []);

  const handleSource = (val: DataSource) => {
    saveSetting("dataSource", val);
    setTimeout(() => window.location.reload(), 150);
  };
  const handleAccent = (val: AccentColor) => saveSetting("colorAccent", val);
  const handleLayout = (val: GridLayout) => saveSetting("gridLayout", val);
  const handleTextSize = (val: TextSize) => saveSetting("textSize", val);

  const handleClearFavorites = () => {
    if (confirm("Hapus semua favorit?")) {
      localStorage.setItem("eight_favorites", "[]");
      setFavorites([]);
    }
  };
  const handleRemoveFavorite = (e: React.MouseEvent, slug: string) => {
    e.stopPropagation();
    const updated = favorites.filter((f) => f.slug !== slug);
    localStorage.setItem("eight_favorites", JSON.stringify(updated));
    setFavorites(updated);
  };

  const ACCENT_OPTIONS: { id: AccentColor; label: string; dot: string }[] = [
    { id: "white", label: "White", dot: "bg-white" },
    { id: "blue", label: "Blue", dot: "bg-[#2196F3]" },
    { id: "purple", label: "Purple", dot: "bg-[#9C27B0]" },
    { id: "green", label: "Green", dot: "bg-[#4CAF50]" },
    { id: "orange", label: "Orange", dot: "bg-[#FF9800]" },
  ];

  const GRID_OPTIONS: { id: GridLayout; label: string }[] = [
    { id: "cols-2", label: "2 Kolom" },
    { id: "cols-3", label: "3 Kolom" },
    { id: "list", label: "List" },
  ];

  const TEXT_OPTIONS: { id: TextSize; label: string }[] = [
    { id: "kecil", label: "Kecil" },
    { id: "sedang", label: "Sedang" },
    { id: "besar", label: "Besar" },
  ];

  const SOURCE_OPTIONS: { id: DataSource; label: string; desc: string }[] = [
    { id: "Dayynime-v1", label: "Dayynime v1", desc: "Load cepat, streaming responsif, sub Indonesia." },
    { id: "Dayynime-v2", label: "Dayynime v2", desc: "Database lengkap, rilis tercepat, multi-resolusi." },
    { id: "Dayynime-v3", label: "Dayynime v3", desc: "Animekompi: koleksi luas, donghua, live action, link download." },
  ];

  const activeStyle = {
    border: "1px solid var(--accent)",
    boxShadow: "0 0 0 1px var(--accent)",
    background: "rgba(255,255,255,0.07)",
  };
  const activeBtn = "text-white font-semibold";
  const inactiveBtn = "bg-[#121319] border border-white/5 text-[#a0a5b5] hover:text-white";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="pb-32 pt-4 px-5 min-h-screen"
      id="settings-page"
    >
      {/* Header */}
      <div className="pt-2 mb-6 flex items-center gap-2 select-none">
        <Sliders className="w-5 h-5 text-white stroke-[2]" />
        <h1 className="text-lg font-bold text-white font-sans">Profile & Settings</h1>
      </div>

      <div className="flex flex-col gap-5">

        {/* FAVORIT */}
        <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-white flex items-center gap-2">
              <Heart className="w-4 h-4 text-[#f04438] fill-[#f04438]" />
              Favorit ({favorites.length})
            </span>
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
            <p className="text-xs text-[#535766] text-center py-4 leading-relaxed">
              Belum ada favorit. Klik ikon hati di halaman detail anime untuk menambahkan.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {favorites.map((anime) => (
                <div
                  key={anime.slug}
                  onClick={() => (window.location.hash = `#/detail/${anime.slug}`)}
                  className="flex gap-3 p-2.5 bg-[#1a1c24] hover:bg-white/5 border border-white/5 rounded-xl cursor-pointer transition-colors items-center"
                >
                  <img
                    src={anime.poster}
                    alt={anime.title}
                    referrerPolicy="no-referrer"
                    className="w-10 h-14 object-cover rounded-lg flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white truncate">{anime.title}</h4>
                    <span className="text-[10px] text-[#535766] font-mono uppercase mt-0.5 block">
                      {anime.type || "TV"}{anime.score ? ` · ★ ${anime.score}` : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => handleRemoveFavorite(e, anime.slug)}
                      className="p-1.5 text-[#535766] hover:text-red-400 rounded-full transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-[#535766]" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DATA SOURCE */}
        <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-3">
            <Database className="w-4 h-4 text-[#a0a5b5]" />
            Sumber Data
          </div>
          <div className="flex flex-col gap-2">
            {SOURCE_OPTIONS.map((opt) => {
              const active = settings.dataSource === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSource(opt.id)}
                  className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${active ? activeBtn : inactiveBtn}`} style={active ? activeStyle : {}}
                >
                  <div className={`w-4 h-4 rounded-full border border-white/20 mt-0.5 flex-shrink-0 flex items-center justify-center ${active ? "bg-white/90" : ""}`}>
                    {active && <Check className="w-2.5 h-2.5 text-[#0e1015] stroke-[3]" />}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white">{opt.label}</div>
                    <div className="text-[10px] text-[#535766] mt-0.5 leading-relaxed">{opt.desc}</div>
                    {active && (
                      <span className="inline-block mt-1 text-[9px] bg-[#f04438]/15 text-[#f04438] font-bold px-1.5 py-0.5 rounded">
                        Aktif — akan reload
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ACCENT COLOR */}
        <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-3">
            <Palette className="w-4 h-4 text-[#a0a5b5]" />
            Warna Aksen UI
          </div>
          <div className="flex flex-wrap gap-2.5">
            {ACCENT_OPTIONS.map((opt) => {
              const active = settings.colorAccent === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleAccent(opt.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${active ? activeBtn : inactiveBtn}`} style={active ? activeStyle : {}}
                >
                  <span className={`w-3 h-3 rounded-full ${opt.dot} flex-shrink-0`} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* GRID LAYOUT */}
        <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-3">
            <Layers className="w-4 h-4 text-[#a0a5b5]" />
            Tampilan Grid
          </div>
          <div className="flex gap-2">
            {GRID_OPTIONS.map((opt) => {
              const active = settings.gridLayout === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleLayout(opt.id)}
                  className={`flex-1 text-xs py-2.5 rounded-xl transition-all cursor-pointer ${active ? activeBtn : inactiveBtn}`} style={active ? activeStyle : {}}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* TEXT SIZE */}
        <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-3">
            <Type className="w-4 h-4 text-[#a0a5b5]" />
            Ukuran Teks
          </div>
          <div className="flex gap-2">
            {TEXT_OPTIONS.map((opt) => {
              const active = settings.textSize === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => handleTextSize(opt.id)}
                  className={`flex-1 text-xs py-2.5 rounded-xl transition-all cursor-pointer ${active ? activeBtn : inactiveBtn}`} style={active ? activeStyle : {}}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ABOUT */}
        <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2 text-white font-semibold text-sm mb-3">
            <Info className="w-4 h-4 text-[#a0a5b5]" />
            Tentang Aplikasi
          </div>
          <div className="text-xs text-[#535766] mb-4 space-y-1">
            <div>Versi <span className="text-white font-mono font-bold">Eight v1.0.0</span></div>
            <div>Powered by Dayynime API</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a
              href="https://t.me/Dayynime"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1a1c24] border border-white/5 hover:border-white/10 text-[#2196F3] font-semibold text-xs rounded-xl transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              Telegram
              <ExternalLink className="w-3 h-3 text-[#535766]" />
            </a>
            <a
              href="https://saweria.co/Dayynime"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#1a1c24] border border-white/5 hover:border-white/10 text-amber-500 font-semibold text-xs rounded-xl transition-colors"
            >
              <Heart className="w-3.5 h-3.5 fill-red-500 text-red-500" />
              Saweria
              <ExternalLink className="w-3 h-3 text-[#535766]" />
            </a>
          </div>
        </div>

      </div>
    </motion.div>
  );
}
