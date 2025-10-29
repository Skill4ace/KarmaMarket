const resolveBaseUrl = (): string => {
  if (typeof window === 'undefined') return '';
  const devvitBase = (window as unknown as { __DEVVIT__?: { apiBaseUrl?: string } }).__DEVVIT__
    ?.apiBaseUrl;
  if (devvitBase) return devvitBase;
  const envBase =
    typeof import.meta !== 'undefined'
      ? ((import.meta as unknown) as { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL
      : undefined;
  if (envBase) return envBase;
  return window.location.origin;
};

const API_BASE = resolveBaseUrl();

const resolveActiveUsername = (): string => {
  if (typeof window === 'undefined') return 'demo';
  const search = new URL(window.location.href).searchParams.get('user');
  if (search && search.trim()) return search.trim();
  const devvitUser = (window as unknown as { __DEVVIT__?: { user?: { username?: string } } }).__DEVVIT__
    ?.user?.username;
  const normalized = devvitUser?.trim();
  return normalized && normalized.length > 0 ? normalized : 'demo';
};

export const ACTIVE_USERNAME = resolveActiveUsername();

export const apiUrl = (path: string) => {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = new URL(path, base);
  if (ACTIVE_USERNAME) {
    url.searchParams.set('user', ACTIVE_USERNAME);
  }
  return url.toString();
};
