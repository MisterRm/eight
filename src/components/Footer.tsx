import { Heart, Sparkles, Coffee, Gift, Wallet } from "lucide-react";
import { motion } from "motion/react";

const navLinks = [
  { label: "Home", hash: "#/" },
  { label: "Explore", hash: "#/explore" },
  { label: "Schedule", hash: "#/schedule" },
  { label: "Settings", hash: "#/settings" },
];

const supportLinks = [
  { label: "Trakteer", href: "https://trakteer.id/dayynime", icon: Coffee },
  { label: "Saweria", href: "https://saweria.co/dayynime", icon: Gift },
  { label: "Socialbuzz", href: "https://socialbuzz.id/dayynime", icon: Wallet },
];

export default function Footer() {
  return (
    <footer className="relative mt-10 px-5 pt-8 pb-6 overflow-hidden">
      {/* faint glowing accent blob, anime-style ambience */}
      <div
        className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-64 h-32 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--accent, #2196F3)" }}
      />

      <div className="relative border-t border-white/10 pt-6">
        {/* Brand */}
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4" style={{ color: "var(--accent, #2196F3)" }} />
          <span className="text-base font-bold text-white tracking-wide">Eight</span>
        </div>
        <p className="text-xs text-[#7a7f8e] leading-relaxed mb-5 max-w-[280px]">
          Nonton anime favoritmu, kapan aja, di mana aja. Tetep semangat ngejar episode terbaru~
        </p>

        {/* Nav shortcuts */}
        <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6">
          {navLinks.map((link) => (
            <button
              key={link.hash}
              onClick={() => (window.location.hash = link.hash)}
              className="text-xs text-[#a0a5b5] hover:text-white transition-colors cursor-pointer"
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Support / donation links */}
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-wider text-[#535766] mb-2.5">
            Dukung Dayynime
          </p>
          <div className="flex flex-wrap gap-2">
            {supportLinks.map(({ label, href, icon: Icon }) => (
              <motion.a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                whileTap={{ scale: 0.95 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-[#d0d3da] bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
              >
                <Icon className="w-3.5 h-3.5" style={{ color: "var(--accent, #2196F3)" }} />
                {label}
              </motion.a>
            ))}
          </div>
        </div>

        {/* Bottom line */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-4 border-t border-white/5">
          <p className="text-[11px] text-[#535766]">
            © {new Date().getFullYear()} Eight by Dayynime
          </p>
          <p className="flex items-center gap-1 text-[11px] text-[#535766]">
            Made with <Heart className="w-3 h-3 fill-current" style={{ color: "var(--accent, #2196F3)" }} /> in Indonesia
          </p>
        </div>
      </div>
    </footer>
  );
}
