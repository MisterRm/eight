/**
 * redis.ts — Upstash Redis helper via REST API
 *
 * Upstash Redis pakai HTTP REST, jadi tidak perlu koneksi persistent
 * dan aman dipakai di Vercel serverless / Edge functions.
 *
 * Setup:
 *   1. Buat akun gratis di https://upstash.com
 *   2. Buat database Redis (pilih region terdekat, misal Singapore)
 *   3. Copy "UPSTASH_REDIS_REST_URL" dan "UPSTASH_REDIS_REST_TOKEN"
 *   4. Tambahkan ke Vercel Environment Variables
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const isConfigured = !!REDIS_URL && !!REDIS_TOKEN;

// Fallback ke in-memory kalau Redis belum dikonfigurasi
const memoryCache = new Map<string, { value: string; expires: number }>();

function memGet(key: string): string | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { memoryCache.delete(key); return null; }
  return entry.value;
}
function memSet(key: string, value: string, ttlSeconds: number) {
  memoryCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

async function redisRequest(command: string[]): Promise<any> {
  const res = await fetch(`${REDIS_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!res.ok) throw new Error(`Redis error: ${res.status}`);
  const json = await res.json();
  return json.result;
}

/**
 * Ambil data dari cache.
 * Return null kalau tidak ada / expired.
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    if (!isConfigured) {
      const v = memGet(key);
      return v ? (JSON.parse(v) as T) : null;
    }
    const result = await redisRequest(["GET", key]);
    if (!result) return null;
    return JSON.parse(result) as T;
  } catch {
    return null;
  }
}

/**
 * Simpan data ke cache dengan TTL dalam detik.
 */
export async function cacheSet(key: string, data: any, ttlSeconds: number): Promise<void> {
  try {
    const value = JSON.stringify(data);
    if (!isConfigured) {
      memSet(key, value, ttlSeconds);
      return;
    }
    // SET key value EX ttl
    await redisRequest(["SET", key, value, "EX", String(ttlSeconds)]);
  } catch {
    // Cache write fail — tidak fatal, data tetap dikembalikan
  }
}

/**
 * Hapus cache key tertentu (untuk invalidasi manual).
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    if (!isConfigured) { memoryCache.delete(key); return; }
    await redisRequest(["DEL", key]);
  } catch {}
}

/**
 * Helper: fetch dengan cache otomatis.
 *
 * Urutan:
 *   1. Cek cache → return kalau hit
 *   2. Fetch ke upstream
 *   3. Simpan ke cache
 *   4. Return data
 */
export async function fetchWithCache<T = any>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number
): Promise<T> {
  const cached = await cacheGet<T>(cacheKey);
  if (cached !== null) return cached;

  const data = await fetcher();
  await cacheSet(cacheKey, data, ttlSeconds);
  return data;
}

export const redis = { get: cacheGet, set: cacheSet, del: cacheDel };
