"use client";

// Backend connection panel (P001 / F4-A, Agent A — OpenCode).
// Browser-side fetch so real CORS behaviour is exercised when the service is
// available. One bounded request per check, no polling, no duplicates.
//
// SIM-VIS-01 restyles this panel for the navy theme and keeps it inside the
// subordinate technical disclosure. Behaviour is unchanged.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HEALTH_TIMEOUT_MS,
  checkHealth,
  sanitizeOrigin,
  type CheckResult,
  type CheckState,
} from "../lib/health";

const badgeModifier: Record<CheckState, string> = {
  "not-checked": "",
  checking: "sim-conn-badge-checking",
  reachable: "sim-conn-badge-reachable",
  unreachable: "sim-conn-badge-unreachable",
  unexpected: "sim-conn-badge-unexpected",
};

const label: Record<CheckState, string> = {
  "not-checked": "Not checked",
  checking: "Checking…",
  reachable: "Reachable",
  unreachable: "Unreachable / request failed",
  unexpected: "Unexpected response",
};

export default function ConnectionPanel({
  backendUrl,
  kind,
}: {
  backendUrl: string;
  kind: "simulator" | "auditor";
}) {
  const [state, setState] = useState<CheckState>("not-checked");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [displayUrl, setDisplayUrl] = useState<string | null>(() =>
    sanitizeOrigin(backendUrl),
  );
  const inFlight = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  const run = useCallback(async () => {
    if (inFlight.current) return; // never duplicate an outstanding request
    const origin = sanitizeOrigin(backendUrl);
    setDisplayUrl(origin);
    if (!origin) {
      setResult({
        outcome: "unexpected",
        data: null,
        error:
          "Backend API URL is missing or invalid. Verify the deployment configuration.",
        checkedAtIso: new Date().toISOString(),
      });
      setState("unexpected");
      return;
    }
    const controller = new AbortController();
    inFlight.current = controller;
    setState("checking");
    try {
      const r = await checkHealth(
        origin,
        (url, init) => fetch(url, { ...init, signal: controller.signal }),
        HEALTH_TIMEOUT_MS,
      );
      if (!mounted.current) return;
      setResult(r);
      setState(r.outcome);
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [backendUrl]);

  useEffect(() => {
    mounted.current = true;
    // Defer past the effect body: keeps the initial check out of the
    // synchronous effect path and lets StrictMode cleanup cancel it.
    const t = setTimeout(() => {
      void run(); // initial check on page load
    }, 0);
    return () => {
      mounted.current = false;
      clearTimeout(t);
      inFlight.current?.abort(); // cancel outstanding work on unmount
      inFlight.current = null;
    };
  }, [run]);

  const data = result?.data ?? null;
  const showEngineNote =
    kind === "simulator" && data?.status === "not_initialized";
  const showMlNote =
    kind === "auditor" &&
    (data?.mlReachable === "not_checked" || data?.mlReachable === false);

  return (
    <section className="sim-panel" aria-label="Backend connection">
      <div className="sim-conn-head">
        <h2 className="sim-panel-title">Backend connection</h2>
        <span className={`sim-conn-badge ${badgeModifier[state]}`}>
          {label[state]}
        </span>
      </div>

      <dl className="sim-config" style={{ marginTop: "0.7rem" }}>
        <div>
          <dt>URL</dt>
          <dd className="sim-mono sim-break">
            {displayUrl ?? "(invalid or missing)"}
          </dd>
        </div>
        <div>
          <dt>Contract</dt>
          <dd>{data?.contractVersion ?? "—"}</dd>
        </div>
        <div>
          <dt>Last check</dt>
          <dd>
            {result ? new Date(result.checkedAtIso).toLocaleString() : "—"}
          </dd>
        </div>
      </dl>

      {result?.error && (
        <p className="sim-small" style={{ color: "var(--sim-danger)" }}>
          {result.error}
        </p>
      )}

      {state === "reachable" && showEngineNote && (
        <p className="sim-warn sim-small">
          Backend is reachable, but the simulation engine is not ready
          (not_initialized). This is not an error — start the engine before
          using simulator features.
        </p>
      )}

      {state === "reachable" && showMlNote && (
        <p className="sim-warn sim-small">
          {data?.mlReachable === false
            ? "The auditor backend is reachable, but it reports the ML service as not reachable."
            : "ML connectivity has not been checked — this does not mean ML is connected."}
        </p>
      )}

      {state === "reachable" && !showEngineNote && !showMlNote && (
        <p className="sim-small sim-muted">
          Backend responded with a valid health payload.
        </p>
      )}

      <button
        type="button"
        onClick={() => void run()}
        disabled={state === "checking"}
        className="sim-btn sim-btn-primary"
        style={{ marginTop: "0.7rem" }}
      >
        {state === "checking" ? "Checking…" : "Check connection"}
      </button>
    </section>
  );
}
