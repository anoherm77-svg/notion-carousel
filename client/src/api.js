const API_BASE = import.meta.env.VITE_API_URL || '';

const defaultOptions = { credentials: 'include' };

export async function getMe() {
  const res = await fetch(`${API_BASE}/api/notion/me`, defaultOptions);
  if (res.status === 401) return { connected: false };
  if (!res.ok) throw new Error('Failed to check connection');
  return res.json();
}

export function getAuthUrl() {
  return `${API_BASE}/api/notion/auth`;
}

export async function disconnect() {
  const res = await fetch(`${API_BASE}/api/notion/disconnect`, {
    method: 'POST',
    ...defaultOptions,
  });
  if (!res.ok) throw new Error('Disconnect failed');
  return res.json();
}

export async function getDatabases() {
  const url = `${API_BASE}/api/notion/search-databases`;
  const res = await fetch(url, defaultOptions);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.error ||
      (res.status === 404
        ? '接口未找到。请确认已运行 npm run start（后端 + 前端），且 client/.env 中 VITE_API_URL 正确（或留空以使用代理）。'
        : res.statusText);
    throw new Error(msg);
  }
  return data;
}

export async function getDatabasePages(databaseIdOrUrl) {
  const id = databaseIdOrUrl.trim();
  const res = await fetch(`${API_BASE}/api/notion/databases/${encodeURIComponent(id)}/pages`, defaultOptions);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText);
  }
  return res.json();
}

export async function getChildPages(pageIdOrUrl) {
  const q = new URLSearchParams({ pageIdOrUrl: pageIdOrUrl.trim() });
  const res = await fetch(`${API_BASE}/api/notion/children?${q}`, defaultOptions);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText);
  }
  return res.json();
}

export async function getPageBlocks(blockId) {
  const q = new URLSearchParams({ blockIdOrUrl: blockId });
  const res = await fetch(`${API_BASE}/api/notion/blocks?${q}`, defaultOptions);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || res.statusText);
  }
  return res.json();
}

export function getProxyImageUrl(imageUrl) {
  if (!imageUrl) return '';
  return `${API_BASE}/api/notion/proxy-image?url=${encodeURIComponent(imageUrl)}`;
}
