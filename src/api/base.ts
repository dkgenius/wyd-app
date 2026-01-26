export const API_BASE = "https://whatyoudink.com"; // your production server

export function apiUrl(path: string) {
  const base = API_BASE.replace(/\/+$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
