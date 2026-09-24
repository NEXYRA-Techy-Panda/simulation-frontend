// K003 pure browser-adapter checks. No React DOM or production API calls.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  EXPORT_INTERVALS,
  buildExportFilename,
  buildExportUrl,
  buildRunsUrl,
  chooseHistoricalRun,
  dateTimeLocalToUtc,
  fetchExportFile,
  fetchHistoricalRuns,
  filenameFromContentDisposition,
  parseRunsPageResponse,
  parseRunsResponse,
  utcToDateTimeLocal,
  validateExportWindow,
} from "../historical-export.ts";

const RUNS = {
  data: {
    runs: [
      {
        run_id: "run-current",
        scenario_id: "original",
        status: "active",
        run_start_utc: "2025-12-31T18:30:00Z",
        committed_start_utc: "2025-12-31T18:31:00Z",
        committed_end_utc: "2025-12-31T18:31:30Z",
        committed_interval_count: 18,
        exportable: true,
        unavailable_reason: null,
      },
      {
        run_id: "run-empty",
        scenario_id: "original",
        status: "ended",
        run_start_utc: "2025-12-31T18:30:00Z",
        committed_start_utc: null,
        committed_end_utc: null,
        committed_interval_count: 0,
        exportable: false,
        unavailable_reason: "NO_COMMITTED_DATA",
      },
    ],
  },
  meta: {
    request_id: "request",
    pagination: { page: 1, page_size: 200, total_items: 2, total_pages: 1 },
  },
};

const REQUEST = {
  runId: "run-current",
  format: "json",
  fromUtc: "2025-12-31T18:31:00Z",
  toUtc: "2025-12-31T18:31:30Z",
  intervalSeconds: 60,
};

describe("historical run catalog", () => {
  it("parses strict records and rejects duplicate run IDs", () => {
    const runs = parseRunsResponse(RUNS);
    assert.equal(runs.length, 2);
    assert.equal(runs[0].committedEndUtc, "2025-12-31T18:31:30Z");
    assert.equal(runs[1].exportable, false);
    const page = parseRunsPageResponse(RUNS);
    assert.equal(page.totalItems, 2);
    assert.equal(page.totalPages, 1);
    const duplicate = structuredClone(RUNS);
    duplicate.data.runs[1].run_id = "run-current";
    assert.equal(parseRunsResponse(duplicate), null);
  });

  it("preserves explicit history, otherwise prefers current, then newest", () => {
    const runs = parseRunsResponse(RUNS);
    assert.equal(chooseHistoricalRun(runs, "run-current", "run-empty")?.runId, "run-empty");
    assert.equal(chooseHistoricalRun(runs, "run-current", "missing")?.runId, "run-current");
    assert.equal(chooseHistoricalRun(runs, null, null)?.runId, "run-current");
  });

  it("uses committed persisted coverage, not live simulated time", async () => {
    let seen;
    const result = await fetchHistoricalRuns(
      "https://git-pipeline.metatronhost.in/sim",
      async (url) => {
        seen = url;
        return { ok: true, status: 200, json: async () => RUNS, blob: async () => new Blob() };
      },
      undefined,
      1000,
    );
    assert.equal(result.length, 2);
    assert.equal(seen, "https://git-pipeline.metatronhost.in/sim/api/v1/runs?page=1&page_size=200");
  });

  it("loads every bounded catalog page and rejects cross-page duplicates", async () => {
    const first = structuredClone(RUNS);
    first.data.runs = [first.data.runs[0]];
    first.meta.pagination = { page: 1, page_size: 200, total_items: 2, total_pages: 2 };
    const second = structuredClone(RUNS);
    second.data.runs = [second.data.runs[1]];
    second.meta.pagination = { page: 2, page_size: 200, total_items: 2, total_pages: 2 };
    const seen = [];
    const runs = await fetchHistoricalRuns(
      "https://git-pipeline.metatronhost.in/sim",
      async (url) => {
        seen.push(url);
        const body = url.includes("page=2") ? second : first;
        return { ok: true, status: 200, json: async () => body, blob: async () => new Blob() };
      },
      undefined,
      1000,
    );
    assert.deepEqual(runs.map((run) => run.runId), ["run-current", "run-empty"]);
    assert.ok(seen[0].includes("page=1"));
    assert.ok(seen[1].includes("page=2"));

    const duplicateSecond = structuredClone(second);
    duplicateSecond.data.runs = [first.data.runs[0]];
    await assert.rejects(
      fetchHistoricalRuns(
        "https://git-pipeline.metatronhost.in/sim",
        async (url) => ({
          ok: true,
          status: 200,
          json: async () => (url.includes("page=2") ? duplicateSecond : first),
          blob: async () => new Blob(),
        }),
        undefined,
        1000,
      ),
      (error) => error.code === "BAD_RESPONSE" && /repeated run_id/.test(error.message),
    );
  });

  it("maps stable HTTP and transport errors", async () => {
    await assert.rejects(
      fetchHistoricalRuns(
        "https://example.invalid/sim",
        async () => ({
          ok: false,
          status: 503,
          json: async () => ({ error: { code: "CONFLICT", message: "busy" } }),
          blob: async () => new Blob(),
        }),
        undefined,
        1000,
      ),
      (error) => error.code === "CONFLICT" && error.status === 503,
    );
    await assert.rejects(
      fetchHistoricalRuns(
        "https://example.invalid/sim",
        async () => { throw new TypeError("fetch failed"); },
        undefined,
        1000,
      ),
      (error) => error.code === "UNREACHABLE",
    );
  });
});

describe("UTC window and exact /sim request", () => {
  it("round-trips minute and committed partial-edge seconds as explicit UTC", () => {
    assert.equal(utcToDateTimeLocal("2025-12-31T18:31:00Z"), "2025-12-31T18:31");
    assert.equal(utcToDateTimeLocal("2025-12-31T18:31:30Z"), "2025-12-31T18:31:30");
    assert.equal(dateTimeLocalToUtc("2025-12-31T18:31"), "2025-12-31T18:31:00Z");
    assert.equal(dateTimeLocalToUtc("2025-12-31T18:31:30"), "2025-12-31T18:31:30Z");
    assert.equal(validateExportWindow(REQUEST.fromUtc, REQUEST.toUtc), null);
    assert.match(validateExportWindow(REQUEST.toUtc, REQUEST.fromUtc), /after/);
  });

  it("preserves the deployed /sim prefix and all six resolutions", () => {
    assert.equal(
      buildRunsUrl("https://git-pipeline.metatronhost.in/sim"),
      "https://git-pipeline.metatronhost.in/sim/api/v1/runs?page=1&page_size=200",
    );
    const url = buildExportUrl("https://git-pipeline.metatronhost.in/sim", REQUEST);
    assert.ok(url.startsWith("https://git-pipeline.metatronhost.in/sim/api/v1/export?"));
    assert.ok(url.includes("run_id=run-current"));
    assert.ok(url.includes("format=json"));
    assert.ok(url.includes("interval_seconds=60"));
    assert.deepEqual([...EXPORT_INTERVALS], [60, 300, 600, 900, 1800, 3600]);
    assert.throws(() => buildRunsUrl("https://example.invalid/sim?wrong=1"), /invalid/i);
    assert.throws(() => buildExportUrl("https://example.invalid/sim#fragment", REQUEST), /invalid/i);
  });
});

describe("file response handling", () => {
  it("accepts exact non-empty JSON and preserves Content-Disposition", async () => {
    let seen;
    const file = await fetchExportFile(
      "https://git-pipeline.metatronhost.in/sim",
      REQUEST,
      async (url) => {
        seen = url;
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
          blob: async () => new Blob(['{"schema_version":"1.0.1"}'], { type: "application/json" }),
          headers: {
            get: (name) => name.toLowerCase() === "content-type"
              ? "application/json; charset=utf-8"
              : name.toLowerCase() === "content-disposition"
                ? 'attachment; filename="safe-export.json"'
                : null,
          },
        };
      },
      undefined,
      1000,
    );
    assert.equal(file.filename, "safe-export.json");
    assert.equal(file.contentType, "application/json");
    assert.ok(file.blob.size > 0);
    assert.ok(seen.includes("/sim/api/v1/export?"));
  });

  it("rejects 204, empty bodies, wrong content types, and safe-names fallback", async () => {
    const response = (status, type, body = "x") => async () => ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => ({ error: { code: "VALIDATION_ERROR", message: "bad" } }),
      blob: async () => new Blob([body], { type }),
      headers: { get: () => type },
    });
    await assert.rejects(fetchExportFile("https://x/sim", REQUEST, response(204, "application/json")), /no file/);
    await assert.rejects(fetchExportFile("https://x/sim", REQUEST, response(200, "application/json", "")), /empty/);
    await assert.rejects(fetchExportFile("https://x/sim", REQUEST, response(200, "text/plain")), /expected/);
    assert.equal(filenameFromContentDisposition('attachment; filename="../../unsafe.csv"'), "unsafe.csv");
    assert.match(buildExportFilename(REQUEST), /^nexyra-run-current-20251231T183100Z-20251231T183130Z-60s\.json$/);
  });
});
