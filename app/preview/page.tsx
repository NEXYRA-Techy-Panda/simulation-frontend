// SIM-VIS-01 isolated visual preview route (Agent M-D — FreeBuff).
//
// This route renders clearly labelled mock state for visual review and
// screenshots. It is safe to expose in the deployed frontend because it never
// contacts a backend, submits commands or advances a simulation clock.

import PreviewClient from "./preview-client";

export const dynamic = "force-static";

export default function PreviewPage() {
  return <PreviewClient />;
}
