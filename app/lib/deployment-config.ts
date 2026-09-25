// Backend connection configuration.
//
// The public deployment has a stable API base (including the required /sim
// path prefix). Local development can override it with an origin-only
// NEXT_PUBLIC_SIMULATION_BACKEND_URL value; adapters append the full contract
// routes themselves.
const configuredBackendUrl = process.env.NEXT_PUBLIC_SIMULATION_BACKEND_URL?.trim();

export const SIMULATION_BACKEND_URL =
  configuredBackendUrl || "https://git-pipeline.metatronhost.in/sim";
