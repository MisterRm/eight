import { useEffect, useState } from "react";
import { AnimatePresence } from "motion/react";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Explore from "./pages/Explore";
import Detail from "./pages/Detail";
import Watch from "./pages/Watch";
import Schedule from "./pages/Schedule";
import SettingsPage from "./pages/Settings";
import MobileBottomNav from "./components/MobileBottomNav";
import { getSettings, AppSettings } from "./lib/settings";

export default function App() {
  const [currentHash, setCurrentHash] = useState(window.location.hash || "#/");
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || "#/");
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
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
    currentHash.startsWith("#/settings");

  return (
    <div className="w-full min-h-screen bg-[#0e1015] relative">
      <div
        className="w-full max-w-[430px] mx-auto min-h-screen relative"
        style={
          showBottomNav
            ? { paddingBottom: "var(--bottom-nav-clearance, 96px)" }
            : undefined
        }
      >
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
        {showBottomNav && <MobileBottomNav currentHash={currentHash} />}
      </div>
    </div>
  );
}
