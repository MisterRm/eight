import { useEffect, useState, useRef } from "react";
import { AnimatePresence } from "motion/react";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Explore from "./pages/Explore";
import Detail from "./pages/Detail";
import Watch from "./pages/Watch";
import Schedule from "./pages/Schedule";
import SettingsPage from "./pages/Settings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProfileUser from "./pages/ProfileUser";
import MobileBottomNav from "./components/MobileBottomNav";
import { getSettings, AppSettings } from "./lib/settings";
import { AnimeRaw, FeaturedAnime } from "./types";
import { useAuth } from "./hooks/useAuth";

// ─── Global Home Cache ────────────────────────────────────────────────────────
// Disimpan di luar component supaya tidak hilang saat Home di-unmount.
// TTL 5 menit: cukup segar untuk data anime, cukup panjang untuk UX instan.
interface HomeCache {
  featured: FeaturedAnime[];
  recent: AnimeRaw[];
  ongoing: AnimeRaw[];
  completed: AnimeRaw[];
  dataSource: string;
  fetchedAt: number;
}
let _homeCache: HomeCache | null = null;
const HOME_CACHE_TTL = 5 * 60 * 1000; // 5 menit

export function getHomeCache(dataSource: string): HomeCache | null {
  if (!_homeCache) return null;
  if (_homeCache.dataSource !== dataSource) return null;
  if (Date.now() - _homeCache.fetchedAt > HOME_CACHE_TTL) return null;
  return _homeCache;
}
export function setHomeCache(data: Omit<HomeCache, "fetchedAt"> & { dataSource: string }) {
  _homeCache = { ...data, fetchedAt: Date.now() };
}
// ─────────────────────────────────────────────────────────────────────────────

export default function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash || "#/");
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const { user, profile, loading: authLoading, signOut, refreshProfile } = useAuth();

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || "#/");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);


  // Histats — inject sekali saat mount
  useEffect(() => {
    (window as any)._Hasync = (window as any)._Hasync || [];
    (window as any)._Hasync.push(['Histats.start', '1,5036251,4,604,110,55,00011001']);
    (window as any)._Hasync.push(['Histats.fasi', '1']);
    (window as any)._Hasync.push(['Histats.track_hits', '']);
    (window as any)._Hasync.push(['Histats.framed_page', '']);
    const hs = document.createElement('script');
    hs.type = 'text/javascript';
    hs.async = true;
    hs.src = '//s10.histats.com/js15_as.js';
    document.head.appendChild(hs);
  }, []);

  useEffect(() => {
    const handleSettingsChange = () => {
      setSettings(getSettings());
    };
    window.addEventListener("eight_settings_changed", handleSettingsChange);
    return () => window.removeEventListener("eight_settings_changed", handleSettingsChange);
  }, []);

  // Apply accent color CSS variable + text size class to root
  useEffect(() => {
    const accentMap: Record<string, string> = {
      white: "#ffffff",
      blue: "#2196F3",
      purple: "#9C27B0",
      green: "#4CAF50",
      orange: "#FF9800",
    };
    const root = document.documentElement;
    root.style.setProperty("--accent", accentMap[settings.colorAccent] || "#ffffff");

    const sizeMap: Record<string, string> = {
      kecil: "13px",
      sedang: "15px",
      besar: "17px",
    };
    root.style.fontSize = sizeMap[settings.textSize] || "15px";
  }, [settings.colorAccent, settings.textSize]);

  const renderPage = () => {
    const hash = currentHash;

    if (hash === "#/" || hash === "" || !hash) {
      return <Home dataSource={settings.dataSource} />;
    }
    if (hash.startsWith("#/search")) {
      return <Search dataSource={settings.dataSource} />;
    }
    if (hash.startsWith("#/explore")) {
      return <Explore dataSource={settings.dataSource} gridLayout={settings.gridLayout} />;
    }
    if (hash.startsWith("#/schedule")) {
      return <Schedule dataSource={settings.dataSource} />;
    }
    if (hash.startsWith("#/settings")) {
      return <SettingsPage />;
    }
    if (hash.startsWith("#/login")) {
      return <Login onSuccess={() => { window.location.hash = "#/profile"; }} onNavigateRegister={() => { window.location.hash = "#/register"; }} />;
    }
    if (hash.startsWith("#/register")) {
      return <Register onSuccess={() => { window.location.hash = "#/login"; }} onNavigateLogin={() => { window.location.hash = "#/login"; }} />;
    }
    if (hash.startsWith("#/profile")) {
      if (authLoading) return <div className="min-h-screen bg-[#0e1015] flex items-center justify-center"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>;
      if (!user) return <Login onSuccess={() => { window.location.hash = "#/profile"; }} onNavigateRegister={() => { window.location.hash = "#/register"; }} />;
      if (!profile) return <div className="min-h-screen bg-[#0e1015] flex items-center justify-center"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>;
      return <ProfileUser user={user} profile={profile} onSignOut={async () => { await signOut(); window.location.hash = "#/"; }} onProfileUpdate={refreshProfile} />;
    }
    if (hash.startsWith("#/detail/")) {
      const slug = hash.substring("#/detail/".length).split("?")[0];
      return <Detail slug={slug} dataSource={settings.dataSource} />;
    }
    if (hash.startsWith("#/watch/")) {
      const slug = hash.substring("#/watch/".length).split("?")[0];
      return <Watch slug={slug} dataSource={settings.dataSource} />;
    }
    return <Home dataSource={settings.dataSource} />;
  };

  const showBottomNav =
    currentHash === "#/" ||
    currentHash === "" ||
    currentHash.startsWith("#/search") ||
    currentHash.startsWith("#/explore") ||
    currentHash.startsWith("#/schedule") ||
    currentHash.startsWith("#/settings") ||
    currentHash.startsWith("#/profile");

  return (
    <div className="w-full min-h-screen bg-[#0e1015] relative">
      <div
        className="w-full max-w-[430px] sm:max-w-[600px] md:max-w-[860px] lg:max-w-[1100px] mx-auto min-h-screen relative"
        style={
          showBottomNav
            ? { paddingBottom: "var(--bottom-nav-clearance, 96px)" }
            : undefined
        }
      >
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
        {showBottomNav && <MobileBottomNav currentHash={currentHash} user={user} profile={profile} />}
      </div>
    </div>
  );
}
