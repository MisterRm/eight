import { Home, Search, Compass, CalendarDays, User } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface MobileBottomNavProps {
  currentHash: string;
}

const tabs = [
  { id: "home",     label: "Home",     hash: "#/",         icon: Home },
  { id: "search",   label: "Search",   hash: "#/search",   icon: Search },
  { id: "explore",  label: "Explore",  hash: "#/explore",  icon: Compass },
  { id: "schedule", label: "Schedule", hash: "#/schedule", icon: CalendarDays },
  { id: "profile",  label: "Profile",  hash: "#/settings", icon: User },
];

/** Clip-path that gives the icon container a subtle angular/faceted "blade crystal" shape */
const FACET_CLIP =
  "polygon(8% 0%, 92% 0%, 100% 8%, 100% 92%, 92% 100%, 8% 100%, 0% 92%, 0% 8%)";

export default function MobileBottomNav({ currentHash }: MobileBottomNavProps) {
  const isTabActive = (tabHash: string) => {
    if (tabHash === "#/") {
      return currentHash === "#/" || currentHash === "" || !currentHash;
    }
    return currentHash.startsWith(tabHash);
  };

  const handleTabClick = (hash: string) => {
    window.location.hash = hash;
  };

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] z-50">
      {/* Floating glass pill */}
      <div
        className="relative flex items-center justify-between px-3 py-2.5 rounded-[28px] floating-pill-shadow"
        style={{
          background: "rgba(14, 16, 21, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        {tabs.map((tab) => {
          const active = isTabActive(tab.hash);
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.hash)}
              className="relative flex-1 flex flex-col items-center justify-center cursor-pointer select-none"
              style={{ WebkitTapHighlightColor: "transparent" }}
              aria-label={tab.label}
            >
              {/* ── Diffuse aura bloom behind active icon ── */}
              <AnimatePresence>
                {active && (
                  <motion.span
                    key="aura"
                    layoutId="nav-aura"
                    className="absolute inset-0 pointer-events-none"
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1.5 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ type: "spring", stiffness: 300, damping: 24 }}
                    style={{
                      borderRadius: "50%",
                      background:
                        "radial-gradient(ellipse 80% 70% at 50% 55%, rgba(240,68,56,0.30) 0%, rgba(240,68,56,0.10) 55%, transparent 100%)",
                    }}
                  />
                )}
              </AnimatePresence>

              {/* ── Icon container: morphs round → faceted angular when active ── */}
              <motion.span
                animate={
                  active
                    ? {
                        y: -5,
                        scale: 1.10,
                        clipPath: FACET_CLIP,
                        backgroundColor: "rgba(240,68,56,0.13)",
                      }
                    : {
                        y: 0,
                        scale: 1,
                        clipPath:
                          "polygon(50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%)",
                        backgroundColor: "rgba(255,255,255,0)",
                      }
                }
                transition={{
                  type: "spring",
                  stiffness: 440,
                  damping: 28,
                  mass: 0.75,
                }}
                className="relative flex items-center justify-center w-10 h-10"
              >
                {/* Blade glow overlay (inner red sheen) */}
                <AnimatePresence>
                  {active && (
                    <motion.span
                      key="sheen"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="absolute inset-0"
                      style={{
                        clipPath: FACET_CLIP,
                        background:
                          "linear-gradient(135deg, rgba(240,68,56,0.50) 0%, rgba(240,68,56,0.06) 50%, transparent 100%)",
                        boxShadow: "0 0 14px 3px rgba(240,68,56,0.40)",
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* The icon itself — pop + glow on active */}
                <motion.span
                  whileTap={{ scale: 0.78, transition: { duration: 0.08 } }}
                  className="relative z-10 flex items-center justify-center"
                >
                  <IconComponent
                    className="w-[19px] h-[19px]"
                    style={{
                      strokeWidth: active ? 2.3 : 1.7,
                      color: active ? "#ffffff" : "#a0a5b5",
                      filter: active
                        ? "drop-shadow(0 0 7px rgba(240,68,56,0.80)) drop-shadow(0 0 2px rgba(255,255,255,0.6))"
                        : "none",
                      transition:
                        "color 0.22s ease, filter 0.22s ease, stroke-width 0.22s ease",
                    }}
                  />
                </motion.span>
              </motion.span>

              {/* ── Eyebrow label — only on active tab, red accent ── */}
              <AnimatePresence>
                {active && (
                  <motion.span
                    key="label"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.17, ease: "easeOut" }}
                    className="text-[9px] font-bold tracking-widest uppercase mt-0.5"
                    style={{
                      color: "#f04438",
                      letterSpacing: "0.13em",
                      textShadow: "0 0 10px rgba(240,68,56,0.70)",
                    }}
                  >
                    {tab.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Height placeholder so inactive tabs keep bar height consistent */}
              {!active && <span className="h-[14px]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
