import type { VercelRequest, VercelResponse } from "@vercel/node";

// ─── Upstash Redis (inline — Vercel tidak support import dari luar /api/) ────
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const isRedisConfigured = !!REDIS_URL && !!REDIS_TOKEN;

const memoryCache = new Map<string, { value: string; expires: number }>();

function memGet(key: string): string | null {
  const e = memoryCache.get(key);
  if (!e) return null;
  if (Date.now() > e.expires) { memoryCache.delete(key); return null; }
  return e.value;
}
function memSet(key: string, value: string, ttlSeconds: number) {
  memoryCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}
async function redisRequest(command: string[]): Promise<any> {
  const res = await fetch(`${REDIS_URL}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  return (await res.json()).result;
}
async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    if (!isRedisConfigured) {
      const v = memGet(key);
      return v ? (JSON.parse(v) as T) : null;
    }
    const result = await redisRequest(["GET", key]);
    if (!result) return null;
    return JSON.parse(result) as T;
  } catch { return null; }
}
async function cacheSet(key: string, data: any, ttlSeconds: number): Promise<void> {
  try {
    const value = JSON.stringify(data);
    if (!isRedisConfigured) { memSet(key, value, ttlSeconds); return; }
    await redisRequest(["SET", key, value, "EX", String(ttlSeconds)]);
  } catch {}
}
async function fetchWithCache<T = any>(cacheKey: string, fetcher: () => Promise<T>, ttlSeconds: number): Promise<T> {
  const cached = await cacheGet<T>(cacheKey);
  if (cached !== null) return cached;
  const data = await fetcher();
  await cacheSet(cacheKey, data, ttlSeconds);
  return data;
}
// ─────────────────────────────────────────────────────────────────────────────

const ANIME_BASE_URL = "https://www.sankavollerei.com/anime/";
const ANIME_API_KEY = "planaai";
const SUPABASE_URL = "https://uczxaiyibnwgycodtcvm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjenhhaXlpYm53Z3ljb2R0Y3ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzYxNzAsImV4cCI6MjA5NjQxMjE3MH0.UUPfyZ4GJO6y8I5467p_piCxtyuyM5oYGX_-jPeiZRw";

const TTL = {
  featured:  5 * 60,
  home:      5 * 60,
  schedule:  10 * 60,
  genres:    30 * 60,
  explore:   3 * 60,
  detail:    10 * 60,
  blacklist: 5 * 60,
};

function supabaseHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

async function getBlacklistedSlugs(): Promise<Set<string>> {
  return fetchWithCache(
    "blacklist:slugs",
    async () => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/blacklisted_anime?select=anime_slug`, { headers: supabaseHeaders() });
      const data = (await res.json()) as { anime_slug: string }[];
      return data.map((i) => i.anime_slug?.toLowerCase().trim());
    },
    TTL.blacklist
  ).then((arr) => new Set(arr));
}

const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function extractFiledonStream(embedUrl: string): Promise<{ url: string; isHls: boolean } | null> {
  try {
    const res = await fetch(embedUrl, { headers: { "User-Agent": DESKTOP_UA, Referer: embedUrl } });
    if (!res.ok) return null;
    const html = await res.text();
    const match = html.match(/data-page="([^"]*)"/);
    if (!match) return null;
    const decoded = match[1].replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
    const data = JSON.parse(decoded);
    const props = data?.props || {};
    const hlsUrl: string | undefined = props?.media?.hls_url;
    const directUrl: string | undefined = props?.url;
    const url = (hlsUrl && hlsUrl !== "null" ? hlsUrl : null) || (directUrl && directUrl !== "null" ? directUrl : null);
    if (!url) return null;
    return { url, isHls: url.includes(".m3u8") };
  } catch { return null; }
}

function normalizeAnimasu(item: any, forceType?: string) {
  if (!item) return null;
  // Animasu di tab Movies ngirim rating di field "type" (contoh: "★ 8")
  // Deteksi: kalau type mengandung "★" atau angka, itu rating bukan type
  const rawType = item.type || "";
  const isRatingInType = rawType.includes("★") || /^\d/.test(rawType);
  const actualType = forceType || (isRatingInType ? "Movie" : rawType) || null;
  const actualScore = isRatingInType ? rawType.replace("★", "").trim() : (item.score || item.rating || null);

  return {
    title: item.title || "Unknown",
    slug: (item.slug || "").trim(),
    poster: item.poster || item.image || "",
    episode: item.episode || null,
    type: actualType,
    score: actualScore,
    status: item.status || null,
    release: item.release || null,
    genres: item.genres ? item.genres.map((g: any) => typeof g === "string" ? g : g.name || g.title) : [],
    estimation: item.estimation || null,
  };
}

function normalizeSamehadaku(item: any) {
  if (!item) return null;
  return {
    title: item.title || "Unknown",
    slug: (item.animeId || item.slug || "").trim(),
    poster: item.poster || item.image || "",
    episode: item.episodes || item.episode || null,
    type: item.type || null,
    score: typeof item.score === "object" ? item.score?.value : item.score || null,
    status: item.status || null,
    release: item.releaseDate || item.releasedOn || null,
    genres: item.genreList ? item.genreList.map((g: any) => g.title || g.name) : [],
    estimation: item.estimation || null,
  };
}

function filterBlacklist(list: any[], blacklist: Set<string>) {
  return list.filter((item) => item && !blacklist.has((item.slug || "").toLowerCase()));
}

async function upstream(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Upstream error ${res.status}: ${url}`);
  return res.json();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { route, source = "Dayynime-v1", ...params } = req.query as Record<string, string>;
  const isV2 = source === "Dayynime-v2";
  const src = isV2 ? "v2" : "v1";

  try {
    if (route === "featured_anime") {
      const [featured, blacklist] = await Promise.all([
        fetchWithCache(`featured:${src}`, () => fetch(`${SUPABASE_URL}/rest/v1/featured_anime?select=*&order=order_index.asc`, { headers: supabaseHeaders() }).then(r => r.json()), TTL.featured),
        getBlacklistedSlugs(),
      ]);
      return res.json(featured.filter((i: any) => !blacklist.has((i.anime_slug || "").toLowerCase())));
    }

    if (route === "announcements") {
      const data = await fetchWithCache("announcements", () => fetch(`${SUPABASE_URL}/rest/v1/announcements?is_active=eq.true`, { headers: supabaseHeaders() }).then(r => r.json()), TTL.featured);
      return res.json(data);
    }

    if (route === "home") {
      const blacklist = await getBlacklistedSlugs();
      if (isV2) {
        const data = await fetchWithCache(`home:${src}`, async () => {
          const [dR, dO] = await Promise.all([
            upstream(`${ANIME_BASE_URL}samehadaku/recent?page=1`),
            upstream(`${ANIME_BASE_URL}samehadaku/ongoing?page=1`),
          ]);
          return {
            recent: (dR.data?.animeList || []).map(normalizeSamehadaku).filter(Boolean),
            ongoing: (dO.data?.animeList || []).map(normalizeSamehadaku).filter(Boolean),
          };
        }, TTL.home);
        return res.json({ recent: filterBlacklist(data.recent, blacklist), ongoing: filterBlacklist(data.ongoing, blacklist) });
      } else {
        const data = await fetchWithCache(`home:${src}`, async () => {
          const d = await upstream(`${ANIME_BASE_URL}animasu/home?apikey=${ANIME_API_KEY}`);
          return {
            ongoing: (d.ongoing || []).map(normalizeAnimasu).filter(Boolean),
            recent: (d.recent || []).map(normalizeAnimasu).filter(Boolean),
          };
        }, TTL.home);
        return res.json({ ongoing: filterBlacklist(data.ongoing, blacklist), recent: filterBlacklist(data.recent, blacklist) });
      }
    }

    if (route === "search") {
      const keyword = encodeURIComponent(params.keyword || "");
      const page = params.page || "1";
      if (!keyword) return res.json({ animes: [] });
      const blacklist = await getBlacklistedSlugs();
      if (isV2) {
        const r = await fetch(`${ANIME_BASE_URL}samehadaku/search?q=${keyword}&page=${page}`);
        const d = await r.json();
        return res.json({ animes: filterBlacklist((d.data?.animeList || []).map(normalizeSamehadaku), blacklist), pagination: { hasNext: !!d.pagination?.hasNextPage, hasPrev: !!d.pagination?.hasPrevPage, currentPage: Number(d.pagination?.currentPage || page) } });
      } else {
        const r = await fetch(`${ANIME_BASE_URL}animasu/search/${keyword}?apikey=${ANIME_API_KEY}`);
        const d = await r.json();
        return res.json({ animes: filterBlacklist((d.animes || []).map(normalizeAnimasu), blacklist), pagination: { hasNext: false, hasPrev: false, currentPage: 1 } });
      }
    }

    if (route === "explore") {
      const tab = params.tab || "Ongoing";
      const genreSlug = params.genreSlug || "";
      const page = params.page || "1";
      const cacheKey = `explore:${src}:${tab}:${genreSlug}:${page}`;
      const blacklist = await getBlacklistedSlugs();
      if (isV2) {
        const epMap: Record<string, string> = { Popular:"popular", Movies:"movies", Completed:"completed", Latest:"recent", Genres:`genres/${genreSlug}` };
        const ep = epMap[tab] || "ongoing";
        const data = await fetchWithCache(cacheKey, async () => {
          const d = await upstream(`${ANIME_BASE_URL}samehadaku/${ep}?page=${page}`);
          return { animes: (d.data?.animeList || []).map(normalizeSamehadaku).filter(Boolean), pagination: { hasNext: !!d.pagination?.hasNextPage, hasPrev: !!d.pagination?.hasPrevPage, currentPage: Number(d.pagination?.currentPage || page) } };
        }, TTL.explore);
        return res.json({ animes: filterBlacklist(data.animes, blacklist), pagination: data.pagination });
      } else {
        const epMap: Record<string, string> = { Popular:"popular", Movies:"movies", Completed:"completed", Latest:"latest", All:"animelist", Genres:`genre/${genreSlug}` };
        const ep = epMap[tab] || "ongoing";
        const isMovieTab = tab === "Movies";
        const data = await fetchWithCache(cacheKey, async () => {
          const d = await upstream(`${ANIME_BASE_URL}animasu/${ep}?apikey=${ANIME_API_KEY}&page=${page}`);
          return { animes: (d.animes || []).map((a: any) => normalizeAnimasu(a, isMovieTab ? "Movie" : undefined)).filter(Boolean), pagination: { hasNext: !!d.pagination?.hasNext, hasPrev: !!d.pagination?.hasPrev, currentPage: Number(d.pagination?.currentPage || page) } };
        }, TTL.explore);
        return res.json({ animes: filterBlacklist(data.animes, blacklist), pagination: data.pagination });
      }
    }

    if (route === "genres") {
      if (isV2) {
        const data = await fetchWithCache(`genres:${src}`, async () => {
          const d = await upstream(`${ANIME_BASE_URL}samehadaku/genres`);
          return (d.data?.genreList || []).map((g: any) => ({ title: g.title, slug: g.genreId })).sort((a: any, b: any) => a.title.localeCompare(b.title));
        }, TTL.genres);
        return res.json(data);
      } else {
        const data = await fetchWithCache(`genres:${src}`, async () => {
          const d = await upstream(`${ANIME_BASE_URL}animasu/genres?apikey=${ANIME_API_KEY}`);
          return (d.genres || []).map((g: any) => ({ title: g.name, slug: g.slug })).sort((a: any, b: any) => a.title.localeCompare(b.title));
        }, TTL.genres);
        return res.json(data);
      }
    }

    if (route === "schedule") {
      const blacklist = await getBlacklistedSlugs();
      if (isV2) {
        const data = await fetchWithCache(`schedule:${src}`, async () => {
          const d = await upstream(`${ANIME_BASE_URL}samehadaku/schedule`);
          const dayMap: Record<string, string> = { monday:"senin", tuesday:"selasa", wednesday:"rabu", thursday:"kamis", friday:"jumat", saturday:"sabtu", sunday:"minggu" };
          const result: Record<string, any[]> = {};
          for (const day of d.data?.days || []) {
            const key = dayMap[day.day.toLowerCase()] || day.day.toLowerCase();
            result[key] = (day.animeList || []).map(normalizeSamehadaku).filter(Boolean);
          }
          return result;
        }, TTL.schedule);
        const filtered: Record<string, any[]> = {};
        for (const [day, list] of Object.entries(data)) filtered[day] = filterBlacklist(list, blacklist);
        return res.json(filtered);
      } else {
        const data = await fetchWithCache(`schedule:${src}`, async () => {
          const d = await upstream(`${ANIME_BASE_URL}animasu/schedule?apikey=${ANIME_API_KEY}`);
          const sched = d.schedule || {};
          const result: Record<string, any[]> = {};
          for (const day of ["minggu","senin","selasa","rabu","kamis","jumat","sabtu"]) {
            const list = sched[day] || sched[day === "jumat" ? "jum'at" : day] || [];
            result[day] = list.map(normalizeAnimasu).filter(Boolean);
          }
          return result;
        }, TTL.schedule);
        const filtered: Record<string, any[]> = {};
        for (const [day, list] of Object.entries(data)) filtered[day] = filterBlacklist(list, blacklist);
        return res.json(filtered);
      }
    }

    if (route === "detail") {
      const slug = params.slug || "";
      if (!slug) return res.status(400).json({ error: "slug diperlukan" });
      const blacklist = await getBlacklistedSlugs();
      if (blacklist.has(slug.toLowerCase())) return res.status(403).json({ error: "Anime ini diblokir.", blacklisted: true });
      if (isV2) {
        const data = await fetchWithCache(`detail:${src}:${slug}`, async () => {
          const d = ((await upstream(`${ANIME_BASE_URL}samehadaku/anime/${slug}`)).data) || {};
          return {
            title: d.title||d.english||d.japanese||"Unknown", poster: d.poster||"",
            score: d.score?.value||d.score||"N/A",
            synopsis: d.synopsis?.paragraphs?.join("\n")||d.synopsis||"",
            trailer: d.trailer||null, type: d.type||"N/A", status: d.status||"N/A",
            aired: d.aired||"N/A", duration: d.duration||"N/A", studios: d.studios||"N/A", season: d.season||"N/A",
            genres: (d.genreList||[]).map((g:any)=>({name:String(g.title??g.name??""), slug:g.genreId||g.slug||""})),
            episodes: (d.episodeList||[]).map((ep:any)=>({ name: String(ep.title??ep.name??ep.episode??""), slug: ep.episodeId||ep.slug||ep.id||"" })),
            recommended: (d.recommendedAnimeList||[]).slice(0,6).map(normalizeSamehadaku).filter(Boolean),
          };
        }, TTL.detail);
        return res.json(data);
      } else {
        const data = await fetchWithCache(`detail:${src}:${slug}`, async () => {
          const a = ((await upstream(`${ANIME_BASE_URL}animasu/detail/${slug}?apikey=${ANIME_API_KEY}`)).detail) || {};
          return {
            title: a.title||"Unknown", poster: a.poster||"", score: a.rating||"N/A",
            synopsis: a.synopsis||"", trailer: a.trailer||null, type: a.type||"N/A",
            status: a.status||"N/A", aired: a.aired||"N/A", duration: a.duration||"N/A",
            studios: a.studio||"N/A", season: a.season||"N/A",
            genres: (a.genres||[]).map((g:any)=>({name:String(g.name??g.title??""), slug:g.slug||g.genreId||""})),
            episodes: (a.episodes||[]).map((ep:any)=>({ name: String(ep.name??ep.title??ep.episode??""), slug: ep.slug||ep.episodeId||ep.id||"" })),
            recommended: [],
          };
        }, TTL.detail);
        return res.json(data);
      }
    }

    if (route === "episode") {
      const slug = params.slug || "";
      if (!slug) return res.status(400).json({ error: "slug diperlukan" });
      if (isV2) {
        const r = await fetch(`${ANIME_BASE_URL}samehadaku/episode/${slug}`);
        const s = ((await r.json()).data) || {};
        return res.json({
          title: s.title||"Nonton Anime", animeId: s.animeId||"", poster: s.poster||"",
          defaultStreamingUrl: s.defaultStreamingUrl||"",
          hasPrev: !!s.hasPrevEpisode, prevSlug: s.prevEpisode?.episodeId||null, prevTitle: s.prevEpisode?.title||"",
          hasNext: !!s.hasNextEpisode, nextSlug: s.nextEpisode?.episodeId||null, nextTitle: s.nextEpisode?.title||"",
          qualities: s.server?.qualities||[],
        });
      } else {
        const r = await fetch(`${ANIME_BASE_URL}animasu/episode/${slug}?apikey=${ANIME_API_KEY}`);
        const d = await r.json();
        let hasPrev = false, hasNext = false, prevSlug: string | null = null, nextSlug: string | null = null, prevTitle = "", nextTitle = "";
        try {
          const epMatch = slug.match(/^(.+)-episode-(\d+(?:-\d+)?)$/);
          if (epMatch) {
            const animeSlug = epMatch[1];
            const cached = await fetchWithCache(`detail:${src}:${animeSlug}`, async () => {
              const dr = await fetch(`${ANIME_BASE_URL}animasu/detail/${animeSlug}?apikey=${ANIME_API_KEY}`);
              if (!dr.ok) return { episodes: [] };
              const dd = await dr.json();
              return { episodes: (dd.detail?.episodes || []) };
            }, TTL.detail);
            const episodes: {name:string,slug:string}[] = cached.episodes || [];
            const currentIdx = episodes.findIndex(ep => ep.slug === slug);
            if (currentIdx !== -1) {
              if (currentIdx > 0) { hasNext = true; nextSlug = episodes[currentIdx-1].slug; nextTitle = episodes[currentIdx-1].name; }
              if (currentIdx < episodes.length-1) { hasPrev = true; prevSlug = episodes[currentIdx+1].slug; prevTitle = episodes[currentIdx+1].name; }
            }
          }
        } catch {}
        return res.json({ title: d.title||"Nonton Anime", streams: d.streams||[], hasPrev, prevSlug, prevTitle, hasNext, nextSlug, nextTitle });
      }
    }

    if (route === "server") {
      const serverId = params.serverId || "";
      if (!serverId) return res.status(400).json({ error: "serverId diperlukan" });
      const r = await fetch(`${ANIME_BASE_URL}samehadaku/server/${serverId}`);
      const d = await r.json();
      const result = d.data || { url: "" };
      if (result.url && /filedon/i.test(result.url)) {
        const resolved = await extractFiledonStream(result.url);
        if (resolved) return res.json({ url: resolved.url, isDirect: true, isHls: resolved.isHls });
      }
      return res.json(result);
    }

    return res.status(404).json({ error: "Route tidak ditemukan" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
