// src/api/client.js
export const API_BASE_URL = "https://whatyoudink.com/api/v1";

export async function apiGet(path, params = {}) {
  const url = new URL(API_BASE_URL + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}
