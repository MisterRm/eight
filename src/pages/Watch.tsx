import { useEffect, useRef, useState } from "react";
import { 
  ArrowLeft, ChevronLeft, ChevronRight, Monitor, Settings, HardDrive, 
  RefreshCw, AlertCircle, PlayCircle
} from "lucide-react";
import { motion } from "motion/react";
import Hls from "hls.js";
import { EpisodePayload, DataSource } from "../types";

interface WatchProps {
  slug: string;
  dataSource: DataSource;
}

// Beberapa host (seperti VIP Streaming) sering nge-block embed dari domain luar.
// Prioritaskan host yang biasanya tidak punya restriction seperti ini.
const PREFERRED_SERVER_KEYWORDS = ["blogspot", "blogger", "mega", "nakama"];

function pickPreferredServer(serverList: { title: string; serverId: string }[]) {
  if (!serverList || serverList.length === 0) return null;
  for (const keyword of PREFERRED_SERVER_KEYWORDS) {
    const found = serverList.find((s) => s.title?.toLowerCase().includes(keyword));
    if (found) return found;
  }
  return serverList[0];
}

export default function Watch({ slug, dataSource }: WatchProps) {
  const [episode, setEpisode] = useState<EpisodePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingServer, setLoadingServer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeUrl, setActiveUrl] = useState<string>("");
  const [isDirectVideo, setIsDirectVideo] = useState(false);
  const [isHlsVideo, setIsHlsVideo] = useState(false);
  
  // V1 stream index
  const [selectedStreamIdx, setSelectedStreamIdx] = useState(0);

  // V2 Quality & Server states
  const [selectedQualityIdx, setSelectedQualityIdx] = useState(0);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Attach hls.js kalau direct video URL-nya format HLS (.m3u8) dan browser
  // gak native-support HLS (cuma Safari yang native; Chrome/Android butuh hls.js).
  useEffect(() => {
    if (!isDirectVideo || !isHlsVideo || !activeUrl) return;
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari: native HLS support, langsung set src
      video.src = activeUrl;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(activeUrl);
      hls.attachMedia(video);
      return () => {
        hls.destroy();
      };
    }
  }, [activeUrl, isDirectVideo, isHlsVideo]);

  // Back to previous slug
  const handleBack = () => {
    // If we have an animeId or we can parse slug to get parent anime slug
    // Standard: Dayynime-v1 episode slugs usually end with episode details, let's look for a back route
    // We can go back using history
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.hash = "#/";
    }
  };

  // Fetch episode data
  useEffect(() => {
    let active = true;
    const fetchEpisode = async () => {
      setLoading(true);
      setError(null);
      setActiveUrl("");
      setIsDirectVideo(false);
      setIsHlsVideo(false);
      setSelectedStreamIdx(0);
      setSelectedQualityIdx(0);
      setSelectedServerId(null);

      try {
        const res = await fetch(`/api/proxy?route=episode&slug=${slug}&source=${dataSource}`);
        if (!res.ok) {
          throw new Error("Gagal mengambil data pemutaran episode");
        }
        const data: EpisodePayload = await res.json();
        
        if (active) {
          setEpisode(data);

          // Determine initial stream url
          if (dataSource === "Dayynime-v1") {
            if (data.streams && data.streams.length > 0) {
              setActiveUrl(data.streams[0].url);
            } else if (data.defaultStreamingUrl) {
              setActiveUrl(data.defaultStreamingUrl);
            }
          } else {
            // Dayynime-v2 Quality & Server loading
            if (data.qualities && data.qualities.length > 0) {
              const firstQuality = data.qualities[0];
              if (firstQuality.serverList && firstQuality.serverList.length > 0) {
                const firstServer = pickPreferredServer(firstQuality.serverList);
                if (firstServer) {
                  setSelectedServerId(firstServer.serverId);
                  // Fetch streaming url for this server
                  await fetchServerUrl(firstServer.serverId);
                }
              } else if (data.defaultStreamingUrl) {
                setActiveUrl(data.defaultStreamingUrl);
              }
            } else if (data.defaultStreamingUrl) {
              setActiveUrl(data.defaultStreamingUrl);
            } else if (data.streams && data.streams.length > 0) {
              setActiveUrl(data.streams[0].url);
            }
          }
        }
      } catch (err: any) {
        console.error("Watch fetch error:", err);
        if (active) {
          setError(err?.message || "Terjadi kesalahan saat memuat episode.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchEpisode();
    return () => {
      active = false;
    };
  }, [slug, dataSource]);

  // Fetch server URL (V2 only)
  const fetchServerUrl = async (serverId: string) => {
    setLoadingServer(true);
    try {
      const res = await fetch(`/api/proxy?route=server&serverId=${serverId}&source=${dataSource}`);
      if (!res.ok) {
        throw new Error("Gagal memuat url streaming dari server");
      }
      const serverData = await res.json();
      if (serverData && serverData.url) {
        setActiveUrl(serverData.url);
        setIsDirectVideo(!!serverData.isDirect);
        setIsHlsVideo(!!serverData.isHls);
      } else {
        throw new Error("Server tidak mengembalikan url pemutar.");
      }
    } catch (err: any) {
      console.error("Server fetch error:", err);
      // Fallback to default streaming if possible
      if (episode?.defaultStreamingUrl) {
        setActiveUrl(episode.defaultStreamingUrl);
        setIsDirectVideo(false);
        setIsHlsVideo(false);
      } else {
        setError("Gagal memuat streaming dari server terpilih.");
      }
    } finally {
      setLoadingServer(false);
    }
  };

  // Change Stream (V1)
  const handleV1StreamChange = (idx: number, url: string) => {
    setSelectedStreamIdx(idx);
    setActiveUrl(url);
  };

  // Change Server (V2)
  const handleV2ServerChange = async (serverId: string) => {
    setSelectedServerId(serverId);
    await fetchServerUrl(serverId);
  };

  // Navigate to neighbor episodes
  const handleNavigateEpisode = (targetSlug: string | null) => {
    if (targetSlug) {
      window.location.hash = `#/watch/${targetSlug}`;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e1015] flex flex-col items-center justify-center pt-10 text-center px-5">
        <div className="w-10 h-10 border-2 border-white/5 border-t-white rounded-full animate-spin mb-4" />
        <span className="text-xs text-[#a0a5b5] font-mono">Memuat pemutar video...</span>
      </div>
    );
  }

  if (error || !episode) {
    return (
      <div className="min-h-screen bg-[#0e1015] flex flex-col items-center justify-center px-5 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-white text-base font-semibold mb-2">Gagal Memutar Video</h2>
        <p className="text-xs text-[#535766] max-w-sm mb-6 leading-relaxed">
          {error || "Episode tidak dapat diputar karena kesalahan tautan."}
        </p>
        <button
          onClick={handleBack}
          className="px-5 py-2.5 bg-[#1a1c24] border border-white/5 rounded-xl text-xs font-semibold text-white cursor-pointer"
        >
          Kembali
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="pb-28 bg-[#0e1015] min-h-screen px-5 pt-4"
      id="watch-page"
    >
      {/* Top Header Bar */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={handleBack}
          className="p-2.5 bg-[#121319] hover:bg-[#1a1c24] rounded-full border border-white/5 text-[#a0a5b5] hover:text-white transition-colors cursor-pointer"
          aria-label="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] uppercase font-bold text-[#f04438] tracking-wider block">
            Streaming Player
          </span>
          <h1 className="text-sm font-semibold text-white truncate font-sans">
            {episode.title}
          </h1>
        </div>
      </div>

      {/* 16:9 Video Player Box */}
      <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-white/5 shadow-2xl mb-5">
        {loadingServer ? (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center z-10 gap-2">
            <RefreshCw className="w-6 h-6 text-white animate-spin" />
            <span className="text-[10px] font-mono text-[#a0a5b5]">Menghubungkan ke server...</span>
          </div>
        ) : null}

        {activeUrl ? (
          isDirectVideo ? (
            isHlsVideo ? (
              <video
                ref={videoRef}
                className="w-full h-full"
                controls
                playsInline
                autoPlay
              />
            ) : (
              <video
                ref={videoRef}
                src={activeUrl}
                className="w-full h-full"
                controls
                playsInline
                autoPlay
              />
            )
          ) : (
            <iframe
              src={activeUrl}
              className="w-full h-full border-0"
              allowFullScreen
              scrolling="no"
              referrerPolicy="no-referrer"
              title={episode.title}
            />
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#535766]">
            <PlayCircle className="w-10 h-10 stroke-[1.2]" />
            <span className="text-xs">Tidak ada tautan video tersedia</span>
          </div>
        )}
      </div>

      {/* Prev & Next Controls Row */}
      <div className="flex items-center justify-between mb-6 gap-3">
        <button
          disabled={!episode.hasPrev || !episode.prevSlug}
          onClick={() => handleNavigateEpisode(episode.prevSlug)}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#1a1c24] border border-white/5 rounded-2xl text-xs font-semibold text-[#a0a5b5] hover:text-white disabled:opacity-30 disabled:hover:text-[#a0a5b5] cursor-pointer transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Eps Sebelumnya</span>
        </button>

        <button
          disabled={!episode.hasNext || !episode.nextSlug}
          onClick={() => handleNavigateEpisode(episode.nextSlug)}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-[#1a1c24] border border-white/5 rounded-2xl text-xs font-semibold text-[#a0a5b5] hover:text-white disabled:opacity-30 disabled:hover:text-[#a0a5b5] cursor-pointer transition-colors"
        >
          <span>Eps Selanjutnya</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Stream Selector Controls */}
      {/* V1 STREAMS DROPDOWN */}
      {dataSource === "Dayynime-v1" && episode.streams && episode.streams.length > 0 && (
        <div className="mb-6 p-4 bg-[#121319] border border-white/5 rounded-2xl select-none">
          <label className="text-xs font-semibold text-[#535766] uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5" />
            Pilih Sumber Video
          </label>
          <div className="relative">
            <select
              value={selectedStreamIdx}
              onChange={(e) => {
                const idx = Number(e.target.value);
                const targetStream = episode.streams![idx];
                handleV1StreamChange(idx, targetStream.url);
              }}
              className="w-full bg-[#1a1c24] border border-white/5 text-xs text-white rounded-xl py-3 px-3.5 focus:outline-none cursor-pointer appearance-none"
            >
              {episode.streams.map((stream, idx) => (
                <option key={stream.name} value={idx}>
                  {stream.name || `Server ${idx + 1}`}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-[#a0a5b5]">
              <Settings className="w-3.5 h-3.5 animate-spin-slow" />
            </div>
          </div>
        </div>
      )}

      {/* V2 QUALITY AND SERVERS BUTTONS */}
      {dataSource === "Dayynime-v2" && episode.qualities && episode.qualities.length > 0 && (
        <div className="mb-6 p-4 bg-[#121319] border border-white/5 rounded-2xl select-none">
          {/* Quality tabs selector */}
          <div className="mb-3.5">
            <span className="text-xs font-semibold text-[#535766] uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5" />
              Resolusi Kualitas
            </span>
            <div className="flex flex-wrap gap-2">
              {episode.qualities.map((qual, idx) => {
                const isSelected = selectedQualityIdx === idx;
                return (
                  <button
                    key={qual.title}
                    onClick={() => {
                      setSelectedQualityIdx(idx);
                      // Auto pick server yang biasanya tidak ke-restrict embed-nya
                      if (qual.serverList && qual.serverList.length > 0) {
                        const firstServer = pickPreferredServer(qual.serverList);
                        if (firstServer) handleV2ServerChange(firstServer.serverId);
                      }
                    }}
                    className={`text-xs px-3.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-white text-[#0e1015] border-white font-bold"
                        : "bg-[#1a1c24] border-white/5 text-[#a0a5b5] hover:text-white"
                    }`}
                  >
                    {qual.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Servers list buttons */}
          <div>
            <span className="text-xs font-semibold text-[#535766] uppercase tracking-wider block mb-2.5">
              Pilihan Server
            </span>
            <div className="grid grid-cols-2 gap-2">
              {episode.qualities[selectedQualityIdx]?.serverList?.map((server) => {
                const isActive = selectedServerId === server.serverId;
                return (
                  <button
                    key={server.serverId}
                    onClick={() => handleV2ServerChange(server.serverId)}
                    className={`text-xs p-3 rounded-xl border text-center font-medium truncate cursor-pointer transition-all ${
                      isActive
                        ? "bg-white/10 text-white border-white/20 font-semibold"
                        : "bg-[#1a1c24] border-white/5 text-[#a0a5b5] hover:text-white"
                    }`}
                  >
                    {server.title}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Episode Descriptions Meta */}
      <div className="p-4 bg-[#121319] border border-white/5 rounded-2xl">
        <h3 className="text-xs font-semibold text-[#535766] uppercase tracking-wider mb-2 select-none">
          Detail Pemutaran
        </h3>
        <p className="text-xs text-[#a0a5b5] leading-relaxed font-sans">
          Anda sedang menyaksikan <strong className="text-white font-semibold">{episode.title}</strong>. Kami menyarankan untuk mengganti resolusi atau server di atas apabila video terasa lambat, mengalami buffer, atau tidak berputar sama sekali.
        </p>
      </div>
    </motion.div>
  );
}
