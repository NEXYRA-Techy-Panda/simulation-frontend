import ConnectionPanel from "./components/connection-panel";
import OfficeMap from "./components/office-map";

const backendUrl =
  process.env.NEXT_PUBLIC_SIMULATION_BACKEND_URL ?? "(not configured)";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <header className="border-b border-zinc-200 bg-white px-8 py-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Office Simulator
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          NEXYRA simulation frontend — office map and inventory
        </p>
      </header>
      <main className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 px-4 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <OfficeMap backendUrl={backendUrl} />
        <div className="flex flex-col gap-6">
          <ConnectionPanel backendUrl={backendUrl} kind="simulator" />
          <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-sm font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Configuration
            </h2>
            <dl className="mt-2 space-y-1 font-mono text-sm text-zinc-800 dark:text-zinc-200">
              <div className="flex gap-2">
                <dt className="shrink-0 text-zinc-500 dark:text-zinc-400">
                  NEXT_PUBLIC_SIMULATION_BACKEND_URL =
                </dt>
                <dd className="break-all">{backendUrl}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="shrink-0 text-zinc-500 dark:text-zinc-400">
                  Contract =
                </dt>
                <dd>v1.0.1 (read-only this layer)</dd>
              </div>
            </dl>
          </section>
        </div>
      </main>
    </div>
  );
}
