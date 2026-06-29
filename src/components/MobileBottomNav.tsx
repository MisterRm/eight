import { useEffect, useRef } from "react";
import { Home, Search, Compass, CalendarDays, User } from "lucide-react";
import { Profile } from "../lib/supabaseClient";

interface MobileBottomNavProps {
  currentHash: string;
  user?: any | null;
  profile?: Profile | null;
}

const tabs = [
  { id: "home", label: "Home", hash: "#/", icon: Home },
  { id: "search", label: "Search", hash: "#/search", icon: Search },
  { id: "explore", label: "Explore", hash: "#/explore", icon: Compass },
  { id: "schedule", label: "Schedule", hash: "#/schedule", icon: CalendarDays },
  { id: "profile", label: "Profil", hash: "#/profile", icon: User },
];

export default function MobileBottomNav({ currentHash, user, profile }: MobileBottomNavProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const publishHeight = () => {
      document.documentElement.style.setProperty("--bottom-nav-clearance", `${el.offsetHeight}px`);
    };
    publishHeight();
    const observer = new ResizeObserver(publishHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [currentHash]);

  const isTabActive = (tabHash: string) => {
    if (tabHash === "#/") return currentHash === "#/" || currentHash === "" || !currentHash;
    return currentHash.startsWith(tabHash);
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] sm:max-w-[600px] md:max-w-[860px] lg:max-w-[1100px] z-50">
      <div
        ref={barRef}
        className="border-t border-white/5 rounded-t-[28px] pt-3 px-2 flex items-stretch justify-center"
        style={{
          backgroundColor: "rgba(14, 16, 21, 0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          paddingBottom: "max(14px, env(safe-area-inset-bottom))",
          boxShadow: "0 -8px 30px rgba(0,0,0,0.35)",
        }}
      >
        <div className="flex items-stretch justify-between w-full max-w-[420px]">
          {tabs.map((tab) => {
            const active = isTabActive(tab.hash);
            const IconComponent = tab.icon;
            const isProfileTab = tab.id === "profile";
            const hasAvatar = isProfileTab && user && profile?.avatar_url;

            return (
              <button
                key={tab.id}
                onClick={() => (window.location.hash = tab.hash)}
                className="relative flex flex-col items-center justify-start flex-1 gap-1.5 cursor-pointer"
              >
                <div className="flex items-center justify-center w-11 h-9">
                  {hasAvatar ? (
                    <img
                      src={profile!.avatar_url!}
                      alt="avatar"
                      className={`w-6 h-6 rounded-full object-cover border-2 transition-all ${active ? "border-white" : "border-white/20"}`}
                    />
                  ) : isProfileTab && user ? (
                    // Logged in tapi no avatar — initial circle
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${active ? "bg-white text-[#0e1015] border-white" : "bg-[#1a1c24] text-[#a0a5b5] border-white/20"}`}>
                      {(profile?.username || "U")[0].toUpperCase()}
                    </div>
                  ) : (
                    <IconComponent
                      className="w-[19px] h-[19px] transition-colors duration-300"
                      strokeWidth={active ? 2 : 1.7}
                      style={{ color: active ? "#ffffff" : "#6b7080" }}
                    />
                  )}
                </div>
                <span className="text-[11px] font-medium tracking-wide transition-colors duration-300"
                  style={{ color: active ? "#ffffff" : "#6b7080" }}>
                  {tab.label}
                </span>
                {/* Dot indicator jika sudah login */}
                {isProfileTab && user && !active && (
                  <span className="absolute top-1 right-3 w-1.5 h-1.5 rounded-full bg-green-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
