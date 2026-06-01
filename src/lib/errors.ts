import { ApiError } from "@/lib/api";

/**
 * Turn any thrown value into a short, plain-English message safe to show a user
 * (in a toast or inline) — never a raw stack trace or technical exception text.
 *
 * Priority:
 *  1. `ApiError` — the backend now returns a friendly `detail` string for every
 *     error (see `app/core/errors.py`), so we surface that; if it's missing we
 *     fall back to a per-status message.
 *  2. Typed command errors (BlockedError / RateLimitedError /
 *     ConfirmationRequiredError) and other `Error`s already carry a written-for-
 *     humans `.message`, so we use it — unless it looks like a network failure.
 *  3. Anything else → a generic, calm fallback.
 */

const STATUS_MESSAGE: Record<number, string> = {
  400: "That request couldn't be processed — please check your input and try again.",
  401: "Your session has expired — please sign in again.",
  403: "You don't have permission to do that.",
  404: "We couldn't find what you were looking for.",
  409: "That conflicts with the current state — refresh and try again.",
  412: "This action needs confirmation before it can run.",
  422: "Some of the information provided isn't valid.",
  429: "Too many requests — please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again.",
  502: "The server is unreachable right now. Please try again shortly.",
  503: "This feature is temporarily unavailable. Please try again shortly.",
  504: "The request took too long. Please try again.",
};

const GENERIC = "Something went wrong. Please try again.";

export function getFriendlyMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.detail && error.detail.trim()) return error.detail;
    return STATUS_MESSAGE[error.status] ?? GENERIC;
  }
  if (error instanceof Error) {
    // A failed fetch (server down / no network) has an opaque browser message.
    if (/failed to fetch|networkerror|load failed/i.test(error.message)) {
      return "Can't reach the server — check your connection and try again.";
    }
    return error.message?.trim() || GENERIC;
  }
  if (typeof error === "string" && error.trim()) return error;
  return GENERIC;
}
