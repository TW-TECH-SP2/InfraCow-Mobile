import { makeKey, readJson, removeJson, writeJson } from '../database/database';

type CacheEntry<T = any> = {
  data: T;
  ts: number;
};

const CACHE_PREFIX = 'cache';

const cacheKey = (key: string) => makeKey(CACHE_PREFIX, key);

export async function setCache(key: string, value: any) {
  await writeJson<CacheEntry>(cacheKey(key), { data: value, ts: Date.now() });
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  const entry = await readJson<CacheEntry<T> | null>(cacheKey(key), null);
  return entry?.data ?? null;
}

export async function clearCache(key: string) {
  await removeJson(cacheKey(key));
}

export async function getCacheTimestamp(key: string): Promise<number | null> {
  const entry = await readJson<CacheEntry | null>(cacheKey(key), null);
  return entry?.ts ?? null;
}

export default { setCache, getCache, clearCache, getCacheTimestamp };
