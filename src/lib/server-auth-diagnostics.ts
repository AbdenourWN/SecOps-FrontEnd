/**
 * Minimal helper for the "reachable but auth failed" UI state.
 *
 * The backend always populates `auth_failure_reason` with a real message — the
 * actual OS/library error string captured from the executor, or a clear
 * explanation when the probe completed but couldn't be classified as success.
 *
 * We deliberately don't pattern-match against the error string here: that path
 * led to misleading hints for environments we don't control. The raw error is
 * the source of truth — we just render it.
 */

export interface AuthDiagnosis {
  /** Banner headline. */
  title: string;
  /** What this state means for the operator, generically. */
  explanation: string;
  /** Verbatim error from the backend, or null if none was captured. */
  rawError: string | null;
}

export function diagnoseAuthFailure(
  reason: string | null | undefined,
  _osType: "windows" | "linux" | string | undefined,
): AuthDiagnosis {
  const raw = (reason || "").trim();
  return {
    title: "Server reachable but authentication failed",
    explanation:
      "The network probe succeeded, but the stored credentials were rejected by the remote service. The exact error returned by the server is shown below.",
    rawError: raw || null,
  };
}
