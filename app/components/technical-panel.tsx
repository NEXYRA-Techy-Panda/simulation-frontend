"use client";

// SIM-VIS-01 technical panel (Agent M-D — FreeBuff).
//
// The functional connection check and deployment configuration stay available
// but are visually subordinate to the map, behind a collapsed disclosure.

import { useState } from "react";
import ConnectionPanel from "./connection-panel";

export default function TechnicalPanel({
  backendUrl,
}: {
  backendUrl: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="sim-tech"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="sim-tech-summary">
        Connection &amp; configuration
      </summary>
      <div className="sim-tech-body">
        <ConnectionPanel backendUrl={backendUrl} kind="simulator" />
        <dl className="sim-mono sim-small sim-config">
          <div>
            <dt>Backend API</dt>
            <dd className="sim-break">{backendUrl}</dd>
          </div>
          <div>
            <dt>Contract</dt>
            <dd>v1.0.1 (read-only this layer)</dd>
          </div>
        </dl>
      </div>
    </details>
  );
}
