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
const ANIME_BASE_URL_V3 = "https://www.sankavollerei.web.id/anime/animekompi/";
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

// ─── Normalizers ─────────────────────────────────────────────────────────────

function normalizeAnimasu(item: any) {
  if (!item) return null;
  return {
    title: item.title || "Unknown",
    slug: (item.slug || "").trim(),
    poster: item.poster || item.image || "",
    episode: item.episode || null,
    type: item.type || null,
    score: item.score || item.rating || null,
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

// Animekompi: /home dan /search dll mengembalikan episode slug (bukan anime slug)
// Perlu di-extract anime slug dari episode slug
function animeSlugFromEpSlug(epSlug: string): string {
  // Contoh: "one-piece-episode-1168-subtitle-indonesia" → "one-piece"
  // Atau slug batch: "one-piece" → "one-piece" (tidak ada episode-N)
  const match = epSlug.match(/^(.+?)-episode-\d/);
  return match ? match[1] : epSlug.replace(/-subtitle-indonesia$/, "");
}

function normalizeAnimekompi(item: any) {
  if (!item) return null;
  const rawSlug = (item.slug || "").trim();
  const animeSlug = item.detail_slug || animeSlugFromEpSlug(rawSlug);
  return {
    title: item.title || "Unknown",
    slug: animeSlug,
    poster: item.poster || item.image || "",
    episode: item.episode || null,
    type: item.type || null,
    score: item.rating || null,
    status: item.status || null,
    release: item.date || null,
    genres: [],
    estimation: item.time || null,
    tooltip_id: item.tooltip_id || null,
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

// ─── Main Handler ─────────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { route, source = "Dayynime-v1", ...params } = req.query as Record<string, string>;
  const isV2 = source === "Dayynime-v2";
  const isV3 = source === "Dayynime-v3";
  const src = isV3 ? "v3" : isV2 ? "v2" : "v1";

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

    // ── HOME ──────────────────────────────────────────────────────────────────
    if (route === "home") {
      const blacklist = await getBlacklistedSlugs();
      if (isV3) {
        const data = await fetchWithCache(`home:${src}`, async () => {
          const [dR, dT] = await Promise.all([
            upstream(`${ANIME_BASE_URL_V3}home`),
            upstream(`${ANIME_BASE_URL_V3}terbaru?page=1`),
          ]);
          return {
            recent: (dR.data || []).map(normalizeAnimekompi).filter(Boolean),
            ongoing: (dT.data || []).map(normalizeAnimekompi).filter(Boolean),
          };
        }, TTL.home);
        return res.json({ recent: filterBlacklist(data.recent, blacklist), ongoing: filterBlacklist(data.ongoing, blacklist) });
      } else if (isV2) {
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

    // ── SEARCH ────────────────────────────────────────────────────────────────
    if (route === "search") {
      const keyword = encodeURIComponent(params.keyword || "");
      const page = params.page || "1";
      if (!keyword) return res.json({ animes: [] });
      const blacklist = await getBlacklistedSlugs();
      if (isV3) {
        const r = await fetch(`${ANIME_BASE_URL_V3}search?q=${keyword}&page=${page}`);
        const d = await r.json();
        const animes = (d.data || []).map(normalizeAnimekompi).filter(Boolean);
        const pg = d.pagination || {};
        return res.json({ animes: filterBlacklist(animes, blacklist), pagination: { hasNext: !!pg.has_next, hasPrev: !!pg.prev_page, currentPage: Number(pg.current_page || page) } });
      } else if (isV2) {
        const r = await fetch(`${ANIME_BASE_URL}samehadaku/search?q=${keyword}&page=${page}`);
        const d = await r.json();
        return res.json({ animes: filterBlacklist((d.data?.animeList || []).map(normalizeSamehadaku), blacklist), pagination: { hasNext: !!d.pagination?.hasNextPage, hasPrev: !!d.pagination?.hasPrevPage, currentPage: Number(d.pagination?.currentPage || page) } });
      } else {
        const r = await fetch(`${ANIME_BASE_URL}animasu/search/${keyword}?apikey=${ANIME_API_KEY}`);
        const d = await r.json();
        return res.json({ animes: filterBlacklist((d.animes || []).map(normalizeAnimasu), blacklist), pagination: { hasNext: false, hasPrev: false, currentPage: 1 } });
      }
    }

    // ── EXPLORE ───────────────────────────────────────────────────────────────
    if (route === "explore") {
      const tab = params.tab || "Ongoing";
      const genreSlug = params.genreSlug || "";
      const page = params.page || "1";
      const cacheKey = `explore:${src}:${tab}:${genreSlug}:${page}`;
      const blacklist = await getBlacklistedSlugs();
      if (isV3) {
        // Animekompi tab mapping
        const epMap: Record<string, string> = {
          Popular: `order/popular`,
          Movies: `movie`,
          Completed: `status/completed`,
          Latest: `terbaru`,
          Genres: `genre/${genreSlug}`,
          All: `terbaru`,
          Ongoing: `status/ongoing`,
          Donghua: `donghua`,
          LiveAction: `live-action`,
          Tokusatsu: `tokusatsu`,
        };
        const ep = epMap[tab] || "terbaru";
        const data = await fetchWithCache(cacheKey, async () => {
          const d = await upstream(`${ANIME_BASE_URL_V3}${ep}?page=${page}`);
          const pg = d.pagination || {};
          return {
            animes: (d.data || []).map(normalizeAnimekompi).filter(Boolean),
            pagination: { hasNext: !!pg.has_next, hasPrev: !!pg.prev_page, currentPage: Number(pg.current_page || page) },
          };
        }, TTL.explore);
        return res.json({ animes: filterBlacklist(data.animes, blacklist), pagination: data.pagination });
      } else if (isV2) {
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
        const data = await fetchWithCache(cacheKey, async () => {
          const d = await upstream(`${ANIME_BASE_URL}animasu/${ep}?apikey=${ANIME_API_KEY}&page=${page}`);
          return { animes: (d.animes || []).map(normalizeAnimasu).filter(Boolean), pagination: { hasNext: !!d.pagination?.hasNext, hasPrev: !!d.pagination?.hasPrev, currentPage: Number(d.pagination?.currentPage || page) } };
        }, TTL.explore);
        return res.json({ animes: filterBlacklist(data.animes, blacklist), pagination: data.pagination });
      }
    }

    // ── GENRES ────────────────────────────────────────────────────────────────
    if (route === "genres") {
      if (isV3) {
        const data = await fetchWithCache(`genres:${src}`, async () => {
          const d = await upstream(`${ANIME_BASE_URL_V3}genres`);
          return (d.data || []).map((g: any) => ({ title: g.name, slug: g.value })).sort((a: any, b: any) => a.title.localeCompare(b.title));
        }, TTL.genres);
        return res.json(data);
      } else if (isV2) {
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

    // ── SCHEDULE ──────────────────────────────────────────────────────────────
    if (route === "schedule") {
      const blacklist = await getBlacklistedSlugs();
      if (isV3) {
        const data = await fetchWithCache(`schedule:${src}`, async () => {
          const d = await upstream(`${ANIME_BASE_URL_V3}schedule`);
          // Animekompi: data = array of { day: "Minggu", list: [...] }
          // day sudah Bahasa Indonesia tapi ada "Jum'at" → normalize ke "jumat"
          const dayNorm: Record<string, string> = {
            minggu: "minggu", senin: "senin", selasa: "selasa",
            rabu: "rabu", kamis: "kamis", "jum'at": "jumat", jumat: "jumat", sabtu: "sabtu",
          };
          const result: Record<string, any[]> = {};
          for (const entry of d.data || []) {
            const key = dayNorm[(entry.day || "").toLowerCase()] || (entry.day || "").toLowerCase();
            result[key] = (entry.list || []).map((item: any) => ({
              title: item.title || "Unknown",
              slug: item.slug || "",
              poster: item.poster || "",
              episode: item.episode || null,
              type: null,
              score: null,
              status: null,
              release: null,
              genres: [],
              estimation: item.time || null,
            })).filter(Boolean);
          }
          return result;
        }, TTL.schedule);
        const filtered: Record<string, any[]> = {};
        for (const [day, list] of Object.entries(data)) filtered[day] = filterBlacklist(list, blacklist);
        return res.json(filtered);
      } else if (isV2) {
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

    // ── DETAIL ────────────────────────────────────────────────────────────────
    if (route === "detail") {
      const slug = params.slug || "";
      if (!slug) return res.status(400).json({ error: "slug diperlukan" });
      const blacklist = await getBlacklistedSlugs();
      if (blacklist.has(slug.toLowerCase())) return res.status(403).json({ error: "Anime ini diblokir.", blacklisted: true });
      if (isV3) {
        const data = await fetchWithCache(`detail:${src}:${slug}`, async () => {
          const d = ((await upstream(`${ANIME_BASE_URL_V3}detail/${slug}`)).data) || {};
          const meta = d.metadata || {};
          return {
            title: d.title || d.alter_title || "Unknown",
            poster: d.image || "",
            score: d.rating || "N/A",
            synopsis: d.synopsis || "",
            trailer: null,
            type: meta.tipe || "N/A",
            status: meta.status || "N/A",
            aired: meta.dirilis_2 || meta.dirilis || "N/A",
            duration: meta.durasi || "N/A",
            studios: meta.studio || "N/A",
            season: meta.season || "N/A",
            genres: (d.genres || []).map((g: any) => ({ name: String(g.name ?? ""), slug: g.slug || "" })),
            episodes: (d.episodes || []).map((ep: any) => ({
              name: String(ep.title ?? ep.num ?? ""),
              slug: ep.slug || "",
            })),
            recommended: [],
          };
        }, TTL.detail);
        return res.json(data);
      } else if (isV2) {
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

    // ── EPISODE ───────────────────────────────────────────────────────────────
    if (route === "episode") {
      const slug = params.slug || "";
      if (!slug) return res.status(400).json({ error: "slug diperlukan" });
      if (isV3) {
        const r = await fetch(`${ANIME_BASE_URL_V3}episode/${slug}`);
        const s = ((await r.json()).data) || {};

        // Resolve Filedon → direct stream, sort bebas iklan / direct dulu
        const rawMirrors: { name: string; url: string }[] = s.mirrors || [];
        const resolvedMirrors = await Promise.all(
          rawMirrors.map(async (m: any) => {
            const isFreeByName = /bebas iklan/i.test(m.name || "");
            if (/filedon/i.test(m.url || "")) {
              try {
                const resolved = await extractFiledonStream(m.url);
                if (resolved) {
                  return { name: m.name, url: resolved.url, isDirect: true, isHls: resolved.isHls, isFree: true };
                }
              } catch {}
            }
            return { name: m.name, url: m.url, isDirect: false, isHls: false, isFree: isFreeByName };
          })
        );
        // Sort: direct/free naik ke atas
        resolvedMirrors.sort((a, b) => {
          const aScore = (a.isDirect ? 2 : 0) + (a.isFree ? 1 : 0);
          const bScore = (b.isDirect ? 2 : 0) + (b.isFree ? 1 : 0);
          return bScore - aScore;
        });

        const preferredUrl = resolvedMirrors[0]?.url || "";

        return res.json({
          title: s.title || "Nonton Anime",
          animeId: s.detail_slug || animeSlugFromEpSlug(slug),
          poster: "",
          defaultStreamingUrl: preferredUrl,
          hasPrev: !!s.prev_episode,
          prevSlug: s.prev_episode || null,
          prevTitle: "",
          hasNext: !!s.next_episode,
          nextSlug: s.next_episode || null,
          nextTitle: "",
          mirrors: resolvedMirrors,
          downloads: s.downloads || [],
        });
      } else if (isV2) {
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

    // ── SERVER (V2 only) ──────────────────────────────────────────────────────
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

    // ── SUGGEST (V3 autocomplete) ────────────────────────────────────────────
    if (route === "suggest") {
      const keyword = encodeURIComponent(params.keyword || "");
      if (!keyword) return res.json([]);
      if (!isV3) return res.json([]);
      const r = await fetch(`${ANIME_BASE_URL_V3}search/suggest?q=${keyword}`);
      const d = await r.json();
      return res.json(d.data || []);
    }

    // ── TOOLTIP (V3 quick preview) ────────────────────────────────────────────
    if (route === "tooltip") {
      const tooltipId = params.tooltipId || "";
      if (!tooltipId || !isV3) return res.json(null);
      const data = await fetchWithCache(`tooltip:${tooltipId}`, async () => {
        const r = await fetch(`${ANIME_BASE_URL_V3}tooltip/${tooltipId}`);
        const d = await r.json();
        return d.data || null;
      }, TTL.detail);
      return res.json(data);
    }

    // ── FILTER (V3 advanced filter) ───────────────────────────────────────────
    if (route === "filter") {
      if (!isV3) return res.json({ animes: [], pagination: { hasNext: false, hasPrev: false, currentPage: 1 } });
      const page = params.page || "1";
      const genre = params.genre || "";
      const studio = params.studio || "";
      const season = params.season || "";
      const type = params.type || "";
      const status = params.status || "";
      const order = params.order || "update";
      const cacheKey = `filter:v3:${genre}:${studio}:${season}:${type}:${status}:${order}:${page}`;
      const blacklist = await getBlacklistedSlugs();
      const data = await fetchWithCache(cacheKey, async () => {
        let url = `${ANIME_BASE_URL_V3}filter?page=${page}&order=${order}`;
        if (genre) url += `&genre[]=${genre}`;
        if (studio) url += `&studio[]=${studio}`;
        if (season) url += `&season[]=${season}`;
        if (type) url += `&type[]=${type}`;
        if (status) url += `&status[]=${status}`;
        const r = await fetch(url);
        const d = await r.json();
        const pg = d.pagination || {};
        return {
          animes: (d.data || []).map(normalizeAnimekompi).filter(Boolean),
          pagination: { hasNext: !!pg.has_next, hasPrev: !!pg.prev_page, currentPage: Number(pg.current_page || page) },
        };
      }, TTL.explore);
      return res.json({ animes: filterBlacklist(data.animes, blacklist), pagination: data.pagination });
    }

    // ── FILTER OPTIONS (seasons, studios, types, orders) ─────────────────────
    if (route === "filter_options") {
      if (!isV3) return res.json({});
      const data = await fetchWithCache("filter_options:v3", async () => {
        const [seasons, studios, types, orders, statuses] = await Promise.all([
          upstream(`${ANIME_BASE_URL_V3}seasons`).then(d => (d.data || []).map((i: any) => ({ name: i.name, value: i.value }))),
          upstream(`${ANIME_BASE_URL_V3}studios`).then(d => (d.data || []).map((i: any) => ({ name: i.name, value: i.value }))),
          upstream(`${ANIME_BASE_URL_V3}types`).then(d => (d.data || []).map((i: any) => ({ name: i.name, value: i.value }))),
          upstream(`${ANIME_BASE_URL_V3}orders`).then(d => (d.data || []).map((i: any) => ({ name: i.name, value: i.value }))),
          upstream(`${ANIME_BASE_URL_V3}status`).then(d => (d.data || []).map((i: any) => ({ name: i.name, value: i.value }))),
        ]);
        return { seasons, studios, types, orders, statuses };
      }, 60 * 60); // cache 1 jam
      return res.json(data);
    }

        return res.status(404).json({ error: "Route tidak ditemukan" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
