import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Configurations
const ANIME_BASE_URL = "https://www.sankavollerei.com/anime/";
const ANIME_API_KEY  = "planaai";
const SUPABASE_URL   = "https://uczxaiyibnwgycodtcvm.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjenhhaXlpYm53Z3ljb2R0Y3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzYxNzAsImV4cCI6MjA5NjQxMjE3MH0.UUPfyZ4GJO6y8I5467p_piCxtyuyM5oYGX_-jPeiZRw";

// Simple TTL In-Memory Cache
class TTLMemoryCache {
  private cache = new Map<string, { value: any; expiresAt: number }>();

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: any, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const cache = new TTLMemoryCache();
const CACHE_TTL_ONEDAY = 24 * 60 * 60 * 1000;
const CACHE_TTL_ONEHOUR = 60 * 60 * 1000;
const CACHE_TTL_TENMINUTES = 10 * 60 * 1000;

// Headers for Supabase
function getSupabaseHeaders() {
  return {
    "apikey": SUPABASE_ANON_KEY,
    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json"
  };
}

// Fetch Blacklist helper (storing only and caching for 10 minutes)
async function getBlacklistedSlugs(): Promise<Set<string>> {
  const cacheKey = "supabase_blacklist";
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/blacklisted_anime?select=anime_slug`;
    const response = await fetch(url, { headers: getSupabaseHeaders() });
    if (!response.ok) throw new Error("Gagal mengambil data blacklist");
    const data = await response.json() as { anime_slug: string }[];
    const blacklistSet = new Set(data.map(item => item.anime_slug?.toLowerCase().trim()));
    cache.set(cacheKey, blacklistSet, CACHE_TTL_TENMINUTES);
    return blacklistSet;
  } catch (error) {
    console.error("Kesalahan fetch blacklist:", error);
    return new Set<string>(); // Return empty set if failed to prevent complete app crash
  }
}

// Normalizer utilities
function normalizeAnimasuItem(item: any): any {
  if (!item) return null;
  return {
    title: item.title || "Unknown Title",
    slug: (item.slug || "").trim(),
    poster: item.poster || item.image || "",
    episode: item.episode || null,
    type: item.type || null,
    score: item.score || item.rating || null,
    status: item.status || null,
    release: item.release || null,
    genres: item.genres ? item.genres.map((g: any) => typeof g === 'string' ? g : (g.name || g.title)) : [],
    estimation: item.estimation || null
  };
}

function normalizeSamehadakuItem(item: any): any {
  if (!item) return null;
  return {
    title: item.title || "Unknown Title",
    slug: (item.animeId || item.slug || "").trim(),
    poster: item.poster || item.image || "",
    episode: item.episodes || item.episode || null,
    type: item.type || null,
    score: typeof item.score === 'object' ? item.score?.value : (item.score || null),
    status: item.status || null,
    release: item.releaseDate || item.releasedOn || null,
    genres: item.genreList ? item.genreList.map((g: any) => g.title || g.name) : [],
    estimation: item.estimation || null
  };
}

function normalizeItem(item: any, source: string): any {
  return source === "Dayynime-v2" ? normalizeSamehadakuItem(item) : normalizeAnimasuItem(item);
}

// Express JSON middleware
app.use(express.json());

// API: Featured Anime (from Supabase)
app.get("/api/featured_anime", async (req, res) => {
  const cacheKey = "supabase_featured";
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/featured_anime?select=*&order=order_index.asc`;
    const response = await fetch(url, { headers: getSupabaseHeaders() });
    if (!response.ok) throw new Error("Gagal fetch featured_anime");
    const data = await response.json();
    
    // Filter out blacklisted ones
    const blacklist = await getBlacklistedSlugs();
    const filtered = data.filter((item: any) => !blacklist.has((item.anime_slug || "").toLowerCase().trim()));
    
    cache.set(cacheKey, filtered, CACHE_TTL_ONEHOUR);
    return res.json(filtered);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// API: Announcements (from Supabase)
app.get("/api/announcements", async (req, res) => {
  const cacheKey = "supabase_announcements";
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const url = `${SUPABASE_URL}/rest/v1/announcements?is_active=eq.true`;
    const response = await fetch(url, { headers: getSupabaseHeaders() });
    if (!response.ok) throw new Error("Gagal fetch announcements");
    const data = await response.json();
    cache.set(cacheKey, data, CACHE_TTL_TENMINUTES);
    return res.json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// API: Anime Homepage (Consolidator endpoint)
app.get("/api/home", async (req, res) => {
  const source = (req.query.source || "Dayynime-v1") as string;
  const cacheKey = `home_${source}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const blacklist = await getBlacklistedSlugs();
    let ongoing: any[] = [];
    let recent: any[] = [];

    if (source === "Dayynime-v2") {
      // Samehadaku
      // Fetch recent episodes
      const recentUrl = `${ANIME_BASE_URL}samehadaku/recent?page=1`;
      const resRecent = await fetch(recentUrl);
      if (!resRecent.ok) throw new Error("Gagal ambil Samehadaku recent di server");
      const dataRecent = await resRecent.json();
      const listRecent = dataRecent.data?.animeList || [];
      recent = listRecent
        .map((item: any) => normalizeSamehadakuItem(item))
        .filter((item: any) => item && !blacklist.has(item.slug.toLowerCase()));

      // Fetch ongoing
      const ongoingUrl = `${ANIME_BASE_URL}samehadaku/ongoing?page=1`;
      const resOngoing = await fetch(ongoingUrl);
      if (resOngoing.ok) {
        const dataOngoing = await resOngoing.json();
        const listOngoing = dataOngoing.data?.animeList || [];
        ongoing = listOngoing
          .map((item: any) => normalizeSamehadakuItem(item))
          .filter((item: any) => item && !blacklist.has(item.slug.toLowerCase()));
      }
    } else {
      // Animasu (Dayynime-v1)
      const homeUrl = `${ANIME_BASE_URL}animasu/home?apikey=${ANIME_API_KEY}`;
      const response = await fetch(homeUrl);
      if (!response.ok) throw new Error("Gagal ambil Animasu home di server");
      const data = await response.json();
      
      const rawOngoing = data.ongoing || [];
      const rawRecent = data.recent || [];

      ongoing = rawOngoing
        .map((item: any) => normalizeAnimasuItem(item))
        .filter((item: any) => item && !blacklist.has(item.slug.toLowerCase()));

      recent = rawRecent
        .map((item: any) => normalizeAnimasuItem(item))
        .filter((item: any) => item && !blacklist.has(item.slug.toLowerCase()));
    }

    const payload = { ongoing, recent };
    cache.set(cacheKey, payload, CACHE_TTL_ONEHOUR);
    return res.json(payload);
  } catch (error: any) {
    console.error("Umpan balik ralat Home:", error);
    return res.status(500).json({ error: error.message });
  }
});

// API: Search Endpoint (Debounce on client, proxy on server)
app.get("/api/search", async (req, res) => {
  const source = (req.query.source || "Dayynime-v1") as string;
  const keyword = encodeURIComponent((req.query.keyword || "") as string);
  const page = req.query.page || "1";

  if (!keyword) {
    return res.json({ animes: [] });
  }

  const cacheKey = `search_${source}_${keyword}_${page}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const blacklist = await getBlacklistedSlugs();
    let normalizedList: any[] = [];
    let pagination = { hasNext: false, hasPrev: false, currentPage: 1 };

    if (source === "Dayynime-v2") {
      const searchUrl = `${ANIME_BASE_URL}samehadaku/search?q=${keyword}&page=${page}`;
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error("Gagal melakukan pencarian di Samehadaku");
      const data = await response.json();
      const list = data.data?.animeList || [];
      normalizedList = list
        .map((item: any) => normalizeSamehadakuItem(item))
        .filter((item: any) => item && !blacklist.has(item.slug.toLowerCase()));
        
      pagination = {
        hasNext: !!data.pagination?.hasNextPage,
        hasPrev: !!data.pagination?.hasPrevPage,
        currentPage: Number(data.pagination?.currentPage || page)
      };
    } else {
      const searchUrl = `${ANIME_BASE_URL}animasu/search/${keyword}?apikey=${ANIME_API_KEY}`;
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error("Gagal melakukan pencarian di Animasu");
      const data = await response.json();
      const list = data.animes || [];
      normalizedList = list
        .map((item: any) => normalizeAnimasuItem(item))
        .filter((item: any) => item && !blacklist.has(item.slug.toLowerCase()));
      // Animasu search has no pagination in the provided endpoint
      pagination = { hasNext: false, hasPrev: false, currentPage: 1 };
    }

    const payload = { animes: normalizedList, pagination };
    cache.set(cacheKey, payload, CACHE_TTL_ONEHOUR);
    return res.json(payload);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// API: Explore (Dynamic Tabs + Genres List + Genre Details + Pagination)
app.get("/api/explore", async (req, res) => {
  const source = (req.query.source || "Dayynime-v1") as string;
  const tab = req.query.tab || "Ongoing"; // Popular, Movies, Ongoing, Completed, Latest, Genres, All
  const genreSlug = req.query.genreSlug || "";
  const page = req.query.page || "1";

  const cacheKey = `explore_${source}_${tab}_${genreSlug}_${page}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const blacklist = await getBlacklistedSlugs();
    let normalizedList: any[] = [];
    let pagination = { hasNext: false, hasPrev: false, currentPage: Number(page) };

    if (source === "Dayynime-v2") {
      let endpoint = "ongoing";
      switch(tab) {
        case "Popular": endpoint = "popular"; break;
        case "Movies": endpoint = "movies"; break;
        case "Completed": endpoint = "completed"; break;
        case "Latest": endpoint = "recent"; break;
        case "Genres": endpoint = `genres/${genreSlug}`; break;
        default: endpoint = "ongoing"; break;
      }

      const url = `${ANIME_BASE_URL}samehadaku/${endpoint}?page=${page}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Gagal fetch explore tab ${tab} di Samehadaku`);
      const data = await response.json();
      const list = data.data?.animeList || [];
      normalizedList = list
        .map((item: any) => normalizeSamehadakuItem(item))
        .filter((item: any) => item && !blacklist.has(item.slug.toLowerCase()));

      pagination = {
        hasNext: !!data.pagination?.hasNextPage,
        hasPrev: !!data.pagination?.hasPrevPage,
        currentPage: Number(data.pagination?.currentPage || page)
      };
    } else {
      let endpoint = "ongoing";
      switch(tab) {
        case "Popular": endpoint = "popular"; break;
        case "Movies": endpoint = "movies"; break;
        case "Completed": endpoint = "completed"; break;
        case "Latest": endpoint = "latest"; break;
        case "All": endpoint = "animelist"; break;
        case "Genres": endpoint = `genre/${genreSlug}`; break;
        default: endpoint = "ongoing"; break;
      }

      const url = `${ANIME_BASE_URL}animasu/${endpoint}?apikey=${ANIME_API_KEY}&page=${page}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Gagal fetch explore tab ${tab} di Animasu`);
      const data = await response.json();
      const list = data.animes || [];
      normalizedList = list
        .map((item: any) => normalizeAnimasuItem(item))
        .filter((item: any) => item && !blacklist.has(item.slug.toLowerCase()));

      pagination = {
        hasNext: !!data.pagination?.hasNext,
        hasPrev: !!data.pagination?.hasPrev,
        currentPage: Number(data.pagination?.currentPage || page)
      };
    }

    const payload = { animes: normalizedList, pagination };
    cache.set(cacheKey, payload, CACHE_TTL_ONEHOUR);
    return res.json(payload);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// API: Genres List
app.get("/api/genres", async (req, res) => {
  const source = (req.query.source || "Dayynime-v1") as string;
  const cacheKey = `genres_${source}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    let genres: { title: string; slug: string }[] = [];
    if (source === "Dayynime-v2") {
      const url = `${ANIME_BASE_URL}samehadaku/genres`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal mengambil daftar genre Samehadaku");
      const data = await response.json();
      const list = data.data?.genreList || [];
      genres = list.map((g: any) => ({
        title: g.title,
        slug: g.genreId
      }));
    } else {
      const url = `${ANIME_BASE_URL}animasu/genres?apikey=${ANIME_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal mengambil daftar genre Animasu");
      const data = await response.json();
      const list = data.genres || [];
      genres = list.map((g: any) => ({
        title: g.name,
        slug: g.slug
      }));
    }

    // Sort alphabetically
    genres.sort((a, b) => a.title.localeCompare(b.title));
    cache.set(cacheKey, genres, CACHE_TTL_ONEDAY);
    return res.json(genres);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// API: Schedule
app.get("/api/schedule", async (req, res) => {
  const source = (req.query.source || "Dayynime-v1") as string;
  const cacheKey = `schedule_${source}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const blacklist = await getBlacklistedSlugs();
    let scheduleData: any = {};

    if (source === "Dayynime-v2") {
      const url = `${ANIME_BASE_URL}samehadaku/schedule`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal ambil jadwal Samehadaku");
      const data = await response.json();
      const days = data.data?.days || [];
      
      // Transform Samehadaku array-of-days to structured day keys
      days.forEach((d: any) => {
        const dayName = d.day.toLowerCase().trim();
        const filteredList = (d.animeList || [])
          .map((item: any) => normalizeSamehadakuItem(item))
          .filter((item: any) => item && !blacklist.has(item.slug.toLowerCase()));
        scheduleData[dayName] = filteredList;
      });
    } else {
      const url = `${ANIME_BASE_URL}animasu/schedule?apikey=${ANIME_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal ambil jadwal Animasu");
      const data = await response.json();
      const sched = data.schedule || {};

      const days = ["minggu", "senin", "selasa", "rabu", "kamis", "jum'at", "sabtu"];
      days.forEach((dayKey) => {
        const list = sched[dayKey] || [];
        scheduleData[dayKey] = list
          .map((item: any) => normalizeAnimasuItem(item))
          .filter((item: any) => item && !blacklist.has(item.slug.toLowerCase()));
      });
    }

    cache.set(cacheKey, scheduleData, CACHE_TTL_ONEHOUR);
    return res.json(scheduleData);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// API: Anime Detail
app.get("/api/detail", async (req, res) => {
  const source = (req.query.source || "Dayynime-v1") as string;
  const slug = (req.query.slug || "") as string;

  if (!slug) {
    return res.status(400).json({ error: "Parameter slug diperlukan" });
  }

  // Check blacklist first
  const blacklist = await getBlacklistedSlugs();
  if (blacklist.has(slug.toLowerCase().trim())) {
    return res.status(403).json({ error: "Anime ini telah diblokir di web. Silakan dapatkan fitur lengkap di aplikasi Android.", blacklisted: true });
  }

  const cacheKey = `detail_${source}_${slug}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    let detailPayload: any = null;

    if (source === "Dayynime-v2") {
      const url = `${ANIME_BASE_URL}samehadaku/anime/${slug}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal fetch detail anime di Samehadaku");
      const rootData = await response.json();
      const s = rootData.data || {};

      detailPayload = {
        title: s.title || "Unknown",
        poster: s.poster || "",
        score: s.score?.value || s.score || "N/A",
        synopsis: s.synopsis?.paragraphs ? s.synopsis.paragraphs.join("\n") : (s.synopsis || ""),
        trailer: s.trailer || null,
        type: s.type || "N/A",
        status: s.status || "N/A",
        aired: s.aired || "N/A",
        duration: s.duration || "N/A",
        studios: s.studios ? s.studios : "N/A",
        season: s.season || "N/A",
        genres: s.genreList ? s.genreList.map((g: any) => ({ name: g.title, slug: g.genreId })) : [],
        episodes: s.episodeList ? s.episodeList.map((ep: any) => ({
          name: ep.title,
          slug: ep.episodeId
        })) : [],
        recommended: s.recommendedAnimeList ? s.recommendedAnimeList.map((item: any) => normalizeSamehadakuItem(item)).slice(0, 6) : []
      };
    } else {
      const url = `${ANIME_BASE_URL}animasu/detail/${slug}?apikey=${ANIME_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal fetch detail anime di Animasu");
      const rootData = await response.json();
      const a = rootData.detail || {};

      detailPayload = {
        title: a.title || "Unknown",
        poster: a.poster || "",
        score: a.rating || "N/A",
        synopsis: a.synopsis || "",
        trailer: a.trailer || null,
        type: a.type || "N/A",
        status: a.status || "N/A",
        aired: a.aired || "N/A",
        duration: a.duration || "N/A",
        studios: a.studio || "N/A",
        season: a.season || "N/A",
        genres: a.genres ? a.genres.map((g: any) => ({ name: g.name, slug: g.slug })) : [],
        episodes: a.episodes ? a.episodes.map((ep: any) => ({
          name: ep.name,
          slug: ep.slug
        })) : [],
        recommended: [] // Animasu detail doesn't return raw recommendations
      };
    }

    cache.set(cacheKey, detailPayload, CACHE_TTL_ONEHOUR);
    return res.json(detailPayload);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// API: Episode Detail for player (streams resolution)
app.get("/api/episode", async (req, res) => {
  const source = (req.query.source || "Dayynime-v1") as string;
  const slug = req.query.slug as string; // slug for animasu, episodeId for samehadaku

  if (!slug) {
    return res.status(400).json({ error: "Parameter slug/episodeId diperlukan" });
  }

  const cacheKey = `episode_${source}_${slug}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    let episodePayload: any = null;

    if (source === "Dayynime-v2") {
      const url = `${ANIME_BASE_URL}samehadaku/episode/${slug}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal fetch episode Samehadaku");
      const rootData = await response.json();
      const s = rootData.data || {};

      episodePayload = {
        title: s.title || "Nonton Anime",
        animeId: s.animeId || "",
        poster: s.poster || "",
        defaultStreamingUrl: s.defaultStreamingUrl || "",
        hasPrev: !!s.hasPrevEpisode,
        prevSlug: s.prevEpisode?.episodeId || null,
        prevTitle: s.prevEpisode?.title || "",
        hasNext: !!s.hasNextEpisode,
        nextSlug: s.nextEpisode?.episodeId || null,
        nextTitle: s.nextEpisode?.title || "",
        qualities: s.server?.qualities || []
      };
    } else {
      const url = `${ANIME_BASE_URL}animasu/episode/${slug}?apikey=${ANIME_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal fetch episode Animasu");
      const rootData = await response.json();
      
      episodePayload = {
        title: rootData.title || "Nonton Anime",
        streams: rootData.streams || [],
        hasPrev: false, // Animasu episode endpoints don't have built-in next/prev pointers, client resolves it
        hasNext: false
      };
    }

    cache.set(cacheKey, episodePayload, CACHE_TTL_ONEHOUR);
    return res.json(episodePayload);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Samehadaku iframe resolver
app.get("/api/samehadaku/server/:serverId", async (req, res) => {
  const { serverId } = req.params;
  const cacheKey = `server_resolve_${serverId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json(cached);
  }

  try {
    const url = `${ANIME_BASE_URL}samehadaku/server/${serverId}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Gagal mengekstrak streaming server Samehadaku");
    const data = await response.json();
    const payload = data.data || { url: "" };
    cache.set(cacheKey, payload, CACHE_TTL_ONEHOUR);
    return res.json(payload);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Vite Middleware & Static Fallback Asset handler
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server Aniku berjalan di port http://localhost:${PORT}`);
  });
}

startServer();
