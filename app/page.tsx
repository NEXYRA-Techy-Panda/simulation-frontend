import FastDaysPanel from "./components/fast-days-panel";
import SimLive from "./components/sim-live";
import TechnicalPanel from "./components/technical-panel";
import { SIMULATION_BACKEND_URL } from "./lib/deployment-config";

const backendUrl = SIMULATION_BACKEND_URL;

const navigation = [
  { href: "#overview", label: "Overview", detail: "Workspace summary", icon: "grid" },
  { href: "#live-map", label: "Office map", detail: "Rooms & devices", icon: "map" },
  { href: "#telemetry", label: "Telemetry", detail: "Power & energy", icon: "chart" },
  { href: "#fast-days", label: "Fast days", detail: "Run acceleration", icon: "bolt" },
  { href: "#historical-export", label: "Exports", detail: "Committed data", icon: "download" },
] as const;

function NavIcon({ name }: { name: (typeof navigation)[number]["icon"] }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "map") {
    return (
      <svg {...common}>
        <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
        <path d="M9 3v15M15 6v15" />
      </svg>
    );
  }
  if (name === "chart") {
    return (
      <svg {...common}>
        <path d="M4 19V5M4 19h16" />
        <path d="m7 15 3-4 3 2 5-7" />
      </svg>
    );
  }
  if (name === "bolt") {
    return (
      <svg {...common}>
        <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />
      </svg>
    );
  }
  if (name === "download") {
    return (
      <svg {...common}>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5M5 21h14" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <rect x="14" y="14" width="6" height="6" rx="1" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="sim-shell">
      <header className="sim-header">
        <div className="sim-header-inner">
          <div className="sim-brand">
            <span className="sim-brand-mark" aria-hidden="true">
              N
            </span>
            <div>
              <h1 className="sim-brand-title">NEXYRA</h1>
              <p className="sim-brand-sub">Office energy simulator</p>
            </div>
          </div>

          <div className="sim-header-meta">
            <span className="sim-workspace-chip">
              <span className="sim-status-dot" aria-hidden="true" />
              Operations workspace
            </span>
            <span className="sim-synthetic">Synthetic data · not measured</span>
            <span className="sim-user-chip" aria-label="Workspace profile">
              NX
            </span>
          </div>
        </div>
      </header>

      <div className="sim-app-frame">
        <aside className="sim-sidebar" aria-label="Workspace navigation">
          <div className="sim-sidebar-intro">
            <p className="sim-overline">Workspace</p>
            <p className="sim-sidebar-title">Simulation console</p>
          </div>

          <nav className="sim-nav">
            <p className="sim-nav-label">Monitor</p>
            {navigation.map((item, index) => (
              <a
                key={item.href}
                href={item.href}
                className={`sim-nav-link ${index === 0 ? "sim-nav-link-active" : ""}`}
                aria-current={index === 0 ? "page" : undefined}
              >
                <span className="sim-nav-icon">
                  <NavIcon name={item.icon} />
                </span>
                <span className="sim-nav-copy">
                  <span>{item.label}</span>
                  <small>{item.detail}</small>
                </span>
                {index === 0 && <span className="sim-nav-active-dot" aria-hidden="true" />}
              </a>
            ))}
            <p className="sim-nav-label sim-nav-label-spaced">System</p>
            <a href="#connection" className="sim-nav-link">
              <span className="sim-nav-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                  <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.8 1.8-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20h-2.55v-.1a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-1.8-1.8.06-.06A1.7 1.7 0 0 0 8.1 15a1.7 1.7 0 0 0-1.56-1.03h-.1v-2.55h.1A1.7 1.7 0 0 0 8.1 10a1.7 1.7 0 0 0-.34-1.88L7.7 8.06l1.8-1.8.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 12.47 5V4.9h2.55V5a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.88-.34l.06-.06 1.8 1.8-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.1v2.55h-.1A1.7 1.7 0 0 0 19.4 15Z" />
                </svg>
              </span>
              <span className="sim-nav-copy">
                <span>Connection</span>
                <small>API &amp; configuration</small>
              </span>
            </a>
          </nav>

          <div className="sim-sidebar-footer">
            <div className="sim-sidebar-footer-status">
              <span className="sim-status-dot" aria-hidden="true" />
              <span>Simulation environment</span>
            </div>
            <p>Readings are generated for demonstration and audit workflows.</p>
          </div>
        </aside>

        <main className="sim-main">
          <div className="sim-page-intro" id="overview">
            <div className="sim-page-heading">
              <p className="sim-overline">Live simulation / Overview</p>
              <h2>Office energy command center</h2>
              <p>
                Monitor live building telemetry, inspect room equipment, and
                export committed simulation runs.
              </p>
            </div>
            <div className="sim-page-status">
              <span className="sim-page-status-icon" aria-hidden="true">
                <span className="sim-status-dot" />
              </span>
              <span>
                <small>Environment</small>
                <strong>Synthetic simulation</strong>
              </span>
            </div>
          </div>

          <div className="sim-live-region sim-anchor" id="live-workspace">
            <SimLive backendUrl={backendUrl} />
          </div>

          <div className="sim-support-grid">
            <div className="sim-anchor" id="fast-days">
              <FastDaysPanel backendUrl={backendUrl} />
            </div>
            <div className="sim-anchor" id="connection">
              <TechnicalPanel backendUrl={backendUrl} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
