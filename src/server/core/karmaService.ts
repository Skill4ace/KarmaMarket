import { reddit, redis } from '@devvit/web/server';

const KARMA_CACHE_TTL_SECONDS = 24 * 60 * 60;
export const DEFAULT_STIPEND = 1000;
const MAX_STIPEND = 10_000;
const STIPEND_SLOPE = 0.5;

const memoryCache = new Map<string, { karma: number; expires: number }>();

const normalizeUsername = (username?: string): string | null => {
  if (!username) return null;
  const trimmed = username.trim();
  if (!trimmed) return null;
  return trimmed.toLowerCase();
};

const karmaCacheKey = (username: string) => `karma-market:karma:${username}`;

const readCache = async (username: string): Promise<number | null> => {
  const now = Date.now();
  try {
    const raw = await redis.get(karmaCacheKey(username));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { karma?: number };
        if (typeof parsed.karma === 'number') {
          return parsed.karma;
        }
      } catch {
        // ignore parse issues and fall back to memory
      }
    }
  } catch {
    // ignore redis errors, fall back to memory cache
  }

  const entry = memoryCache.get(username);
  if (entry && entry.expires > now) {
    return entry.karma;
  }
  return null;
};

const writeCache = async (username: string, karma: number) => {
  const expires = Date.now() + KARMA_CACHE_TTL_SECONDS * 1000;
  memoryCache.set(username, { karma, expires });
  try {
    await redis.set(
      karmaCacheKey(username),
      JSON.stringify({ karma }),
      { expiration: new Date(expires) }
    );
  } catch {
    // ignore redis errors; memory cache already populated
  }
};

const fetchKarmaFromReddit = async (username: string): Promise<number | null> => {
  try {
    const user = await reddit.getUserByUsername(username);
    if (!user) return null;
    return user.linkKarma + user.commentKarma;
  } catch (error) {
    console.warn(`[karma] Failed to fetch karma for ${username}`, error);
    return null;
  }
};

export const computeStipend = (karma: number): number => {
  const raw = DEFAULT_STIPEND + karma * STIPEND_SLOPE;
  return Math.min(Math.max(Math.round(raw), DEFAULT_STIPEND), MAX_STIPEND);
};

export const getDeterministicMockKarma = (username?: string): number => {
  const normalized = normalizeUsername(username) ?? 'guest';
  let hash = 0;
  for (const char of normalized) {
    hash = (hash * 31 + char.charCodeAt(0)) & 0xffffffff;
  }
  const base = Math.abs(hash % 6000);
  return 500 + base;
};

export const getKarmaStipend = async (
  username?: string
): Promise<{ stipend: number; karma: number | null }> => {
  const normalized = normalizeUsername(username);
  if (!normalized) {
    return { stipend: DEFAULT_STIPEND, karma: null };
  }

  let karma = await readCache(normalized);
  if (karma == null) {
    karma = await fetchKarmaFromReddit(normalized);
    if (karma != null) {
      await writeCache(normalized, karma);
    }
  }

  if (karma == null) {
    await writeCache(normalized, 0);
    return { stipend: DEFAULT_STIPEND, karma: null };
  }

  return {
    stipend: computeStipend(karma),
    karma,
  };
};
