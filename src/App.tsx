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
      <div className="w-full max-w-[430px] mx-auto min-h-screen relative pb-28">
        <AnimatePresence mode="wait">
          {renderPage()}
        </AnimatePresence>
        {showBottomNav && <MobileBottomNav currentHash={currentHash} />}
      </div>
    </div>
  );
}
