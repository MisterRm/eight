import { useEffect, useRef } from "react";
import { Home, Search, Compass, CalendarDays, User } from "lucide-react";

interface MobileBottomNavProps {
  currentHash: string;
}

const tabs = [
  { id: "home", label: "Home", hash: "#/", icon: Home },
  { id: "search", label: "Search", hash: "#/search", icon: Search },
  { id: "explore", label: "Explore", hash: "#/explore", icon: Compass },
  { id: "schedule", label: "Schedule", hash: "#/schedule", icon: CalendarDays },
  { id: "settings", label: "Profile", hash: "#/settings", icon: User },
];

export default function MobileBottomNav({ currentHash }: MobileBottomNavProps) {
  const barRef = useRef<HTMLDivElement>(null);

  // Measure the real rendered height of the bar (including the safe-area
  // padding) and publish it as a CSS variable so pages can reserve the
  // *exact* amount of bottom padding — no magic numbers.
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;

    const publishHeight = () => {
      document.documentElement.style.setProperty(
        "--bottom-nav-clearance",
        `${el.offsetHeight}px`
      );
    };

    publishHeight();

    const observer = new ResizeObserver(publishHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [currentHash]);

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
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50">
      <div
        ref={barRef}
        className="bg-[#15171d] border-t border-white/5 rounded-t-[28px] pt-3 px-2 flex items-stretch justify-between"
        style={{
          paddingBottom: "max(14px, env(safe-area-inset-bottom))",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.35)",
        }}
      >
        {tabs.map((tab) => {
          const active = isTabActive(tab.hash);
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.hash)}
              className="relative flex flex-col items-center justify-start flex-1 gap-1.5 cursor-pointer"
            >
              <div
                className="flex items-center justify-center w-11 h-9 rounded-2xl transition-all duration-300"
                style={
                  active
                    ? {
                        backgroundColor: "#ffffff",
                        boxShadow: "0 0 16px 2px rgba(255,255,255,0.35)",
                      }
                    : undefined
                }
              >
                <IconComponent
                  className="w-[19px] h-[19px] transition-colors duration-300"
                  strokeWidth={active ? 2 : 1.7}
                  style={{ color: active ? "#0e1015" : "#6b7080" }}
                />
              </div>
              <span
                className="text-[11px] font-medium tracking-wide transition-colors duration-300"
                style={{ color: active ? "#ffffff" : "#6b7080" }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
