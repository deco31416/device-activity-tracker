export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const TOKEN_KEY = 'dat_dashboard_token';

export function getDashboardToken(): string {
    return localStorage.getItem(TOKEN_KEY) || '';
}

export function setDashboardToken(token: string) {
    const trimmed = token.trim();
    if (trimmed) localStorage.setItem(TOKEN_KEY, trimmed);
    else localStorage.removeItem(TOKEN_KEY);
}

export function clearDashboardToken() {
    localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders(headers?: HeadersInit): HeadersInit {
    const token = getDashboardToken();
    return {
        ...(headers || {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

export function authFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    return fetch(input, {
        ...init,
        headers: authHeaders(init.headers),
    });
}

export function authUrl(url: string): string {
    const token = getDashboardToken();
    if (!token) return url;
    const parsed = new URL(url, window.location.href);
    parsed.searchParams.set('auth', token);
    return parsed.toString();
}
