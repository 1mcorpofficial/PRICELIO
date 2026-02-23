export const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined)?.trim() || '/api';

export function readCookie(name: string): string {
  const prefix = `${name}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return '';
}

export function getCsrfToken(): string {
  return readCookie('pricelio_csrf_token') || readCookie('csrf_token');
}
