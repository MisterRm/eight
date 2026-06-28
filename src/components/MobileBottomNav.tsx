import { Home, Search, Compass, CalendarDays, User } from "lucide-react";

interface MobileBottomNavProps {
  currentHash: string;
}

export default function MobileBottomNav({ currentHash }: MobileBottomNavProps) {
  // Map our app hash routes to the 5 bottom nav tabs
  const tabs = [
    { id: "home", label: "Home", hash: "#/", icon: Home },
    { id: "search", label: "Search", hash: "#/search", icon: Search },
    { id: "explore", label: "Explore", hash: "#/explore", icon: Compass },
    { id: "schedule", label: "Schedule", hash: "#/schedule", icon: CalendarDays },
    { id: "settings", label: "Profile", hash: "#/settings", icon: User },
  ];

  // Helper to check if a tab is active
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
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-[420px] z-50">
      <div className="bg-[#121319]/95 backdrop-blur-md border border-white/5 rounded-3xl py-3 px-4 flex items-center justify-between floating-pill-shadow">
        {tabs.map((tab) => {
          const active = isTabActive(tab.hash);
          const IconComponent = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.hash)}
              className="relative flex flex-col items-center justify-center flex-1 cursor-pointer transition-all duration-300"
              id={`nav-tab-${tab.id}`}
            >
              <div className="flex flex-col items-center gap-1">
                <IconComponent
                  className={`w-5 h-5 stroke-[1.8] transition-all duration-300 ${
                    active ? "text-white scale-110" : "text-[#535766] hover:text-[#a0a5b5]"
                  }`}
                />
                {active && (
                  <span className="text-[10px] font-medium tracking-wide text-white transition-all duration-300">
                    {tab.label}
                  </span>
                )}
              </div>
              {active && (
                <div className="absolute -bottom-2 w-5 h-[2px] bg-white rounded-full transition-all duration-300" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
