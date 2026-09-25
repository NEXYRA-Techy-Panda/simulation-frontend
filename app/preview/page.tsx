// SIM-VIS-01 isolated visual preview route (Agent M-D — FreeBuff).
//
// This route exists ONLY for visual review and screenshot capture against
// clearly labelled mock state. In a production build it returns 404, so the
// mock fixtures never run in the deployed simulator. It never contacts a
// backend, never submits a command and never advances a simulation clock.

import { notFound } from "next/navigation";
import PreviewClient from "./preview-client";

export const dynamic = "force-static";

export default function PreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <PreviewClient />;
}
