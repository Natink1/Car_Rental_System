/**
 * Ensure car/media image URLs work when API returns relative paths (e.g. /storage/...).
 * Prepends the API origin so images load from the backend server.
 */
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

export function getImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return `${API_ORIGIN}${trimmed}`;
  return `${API_ORIGIN}/${trimmed}`;
}
