import FastDaysPanel from "./components/fast-days-panel";
import SimLive from "./components/sim-live";
import TechnicalPanel from "./components/technical-panel";
import { SIMULATION_BACKEND_URL } from "./lib/deployment-config";

const backendUrl = SIMULATION_BACKEND_URL;

export default function Home() {
  return (
    <div className="sim-shell">
      <header className="sim-header">
        <div className="sim-brand">
          <span className="sim-brand-mark" aria-hidden="true">
            N
          </span>
          <div>
            <h1 className="sim-brand-title">NEXYRA Office Simulator</h1>
            <p className="sim-brand-sub">
              Commercial-building energy simulation · live office floor plan
            </p>
          </div>
        </div>
        <p className="sim-synthetic">
          Synthetic simulation — all readings are simulated, not measured from a
          real building.
        </p>
      </header>

      <main className="sim-main">
        <SimLive
          backendUrl={backendUrl}
          extraControls={<FastDaysPanel backendUrl={backendUrl} />}
        />
        <TechnicalPanel backendUrl={backendUrl} />
      </main>
    </div>
  );
}
