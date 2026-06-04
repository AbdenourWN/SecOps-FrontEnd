// API client. Auth is cookie-based (Phase 20.1): the httpOnly access/refresh
// cookies are sent automatically via `credentials: "include"`. Mutating requests
// echo the readable `csrf_token` cookie back in the `X-CSRF-Token` header
// (double-submit CSRF). A 401 triggers a single silent refresh + retry; if that
// fails the user is sent to /login.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8900";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
    public body?: unknown,
  ) {
    super(detail);
  }
}

export function getAuthToken(): string | null {
  // Tokens live in httpOnly cookies (not readable by JS). Kept for the WS auth
  // frame's signature; the WS authenticates from the cookie sent on its handshake.
  return null;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Single-flight refresh: concurrent 401s share one /refresh call.
let refreshInFlight: Promise<boolean> | null = null;
function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        return res.ok;
      } catch {
        return false;
      } finally {
        // Allow a fresh refresh attempt after this one settles.
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

type RequestOptions = {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | undefined | null>;
  signal?: AbortSignal;
};

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
  _retried = false,
): Promise<T> {
  const url = new URL(`${API_BASE_URL}${path}`);

  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  // Double-submit CSRF token on state-changing requests.
  if (MUTATING_METHODS.has(method.toUpperCase())) {
    const csrf = readCookie("csrf_token");
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: options?.signal,
    credentials: "include",
  });

  // Auth recovery: one silent refresh + retry, then bounce to /login.
  if (
    res.status === 401 &&
    !_retried &&
    path !== "/api/auth/refresh" &&
    path !== "/api/auth/login" &&
    // A 401 here means "wrong password", not an expired session — don't refresh+retry.
    path !== "/api/auth/verify-password"
  ) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(method, path, body, options, true);
    }
    const isAuthPath = path.startsWith("/api/auth/");
    if (
      !isAuthPath &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = "/login";
    }
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    const detail = typeof error?.detail === "string"
      ? error.detail
      : (error?.detail?.error ?? error?.detail?.blocked_reason ?? "Request failed");
    throw new ApiError(res.status, detail, error?.detail ?? error);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const apiClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  delete: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("DELETE", path, body, options),
};
