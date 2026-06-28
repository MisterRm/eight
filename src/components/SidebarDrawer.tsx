import { motion, AnimatePresence } from "motion/react";
import { X, Home, Search, Compass, CalendarDays, User, Heart, Settings, ExternalLink } from "lucide-react";

interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentHash: string;
}

const navItems = [
  { label: "Home", icon: Home, hash: "#/" },
  { label: "Search", icon: Search, hash: "#/search" },
  { label: "Explore", icon: Compass, hash: "#/explore" },
  { label: "Schedule", icon: CalendarDays, hash: "#/schedule" },
  { label: "Profile", icon: User, hash: "#/settings" },
];

export default function SidebarDrawer({ isOpen, onClose, currentHash }: SidebarDrawerProps) {
  const navigate = (hash: string) => {
    window.location.hash = hash;
    onClose();
  };

  const isActive = (hash: string) => {
    if (hash === "#/") return currentHash === "#/" || currentHash === "" || !currentHash;
    return currentHash.startsWith(hash);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            className="fixed top-0 left-0 h-full w-[75%] max-w-[300px] bg-[#0e1015] border-r border-white/5 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-12 pb-6 border-b border-white/5">
              <div className="flex items-center gap-2 select-none">
                <img src="/logo.png" alt="Eight" className="h-8 w-auto object-contain" />
                <span className="px-2 py-0.5 rounded-full bg-[#f04438]/15 text-[#f04438] text-[9px] font-bold tracking-wider uppercase">Anime</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full text-[#535766] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-3 pt-4 overflow-y-auto">
              <p className="text-[10px] font-bold text-[#535766] uppercase tracking-wider px-3 mb-2">Menu</p>
              {navItems.map((item) => {
                const active = isActive(item.hash);
                const Icon = item.icon;
                return (
                  <button
                    key={item.hash}
                    onClick={() => navigate(item.hash)}
                    className={`w-full flex items-center gap-3.5 px-3 py-3 rounded-xl mb-1 text-sm font-medium transition-colors cursor-pointer text-left ${
                      active
                        ? "bg-white/8 text-white"
                        : "text-[#535766] hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 ${active ? "text-white" : "text-[#535766]"}`} />
                    {item.label}
                    {active && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </button>
                );
              })}

              <div className="mt-4 mb-2">
                <p className="text-[10px] font-bold text-[#535766] uppercase tracking-wider px-3 mb-2">Lainnya</p>
                <button
                  onClick={() => navigate("#/settings")}
                  className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl mb-1 text-sm font-medium text-[#535766] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Settings className="w-4.5 h-4.5" />
                  Settings
                </button>
                <a
                  href="https://t.me/Dayynime"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3.5 px-3 py-3 rounded-xl mb-1 text-sm font-medium text-[#535766] hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  onClick={onClose}
                >
                  <ExternalLink className="w-4.5 h-4.5" />
                  Telegram
                </a>
              </div>
            </nav>

            {/* Footer */}
            <div className="px-5 py-5 border-t border-white/5">
              <p className="text-[10px] text-[#535766] font-mono">Eight v1.0.0 · Powered by Dayynime</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
