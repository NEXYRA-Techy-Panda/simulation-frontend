// K003 historical export browser adapter. The backend owns run coverage,
// aggregation, policy mapping, and serialization; this module only validates
// metadata, constructs the exact /sim-preserving request, and handles the
// returned file without transforming its bytes.

function sanitizeBackendBase(raw: string): string | null {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.search || url.hash) return null;
    url.username = "";
    url.password = "";
    return url.toString().replace(/\/+$/, "");
  } catch {
    return null;
  }
}

export const EXPORT_FORMATS = ["json", "csv"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const EXPORT_INTERVALS = [60, 300, 600, 900, 1800, 3600] as const;
export type ExportIntervalSeconds = (typeof EXPORT_INTERVALS)[number];

export const RUNS_TIMEOUT_MS = 30_000;
export const MAX_RUN_CATALOG_PAGES = 50;
export const EXPORT_TIMEOUT_MS = 120_000;

export type HistoricalRunStatus = "active" | "ended";

export interface HistoricalRun {
  runId: string;
  scenarioId: string;
  status: HistoricalRunStatus;
  runStartUtc: string;
  committedStartUtc: string | null;
  committedEndUtc: string | null;
  committedIntervalCount: number;
  exportable: boolean;
  unavailableReason: string | null;
}

export interface HistoricalRunsPage {
  runs: HistoricalRun[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ExportRequest {
  runId: string;
  format: ExportFormat;
  intervalSeconds: ExportIntervalSeconds;
  fromUtc: string;
  toUtc: string;
}

export interface ExportFile {
  blob: Blob;
  contentType: "application/json" | "text/csv";
  filename: string;
}

export class HistoricalExportError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly field: string | null;

  constructor(
    message: string,
    code: string,
    status: number | null = null,
    field: string | null = null,
  ) {
    super(message);
    this.name = "HistoricalExportError";
    this.code = code;
    this.status = status;
    this.field = field;
  }
}

interface ResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  blob(): Promise<Blob>;
  headers?: { get(name: string): string | null };
}

export type ExportFetchLike = (
  url: string,
  init?: { signal?: AbortSignal },
) => Promise<ResponseLike>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

export function isCanonicalUtc(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value)) {
    return false;
  }
  return Number.isFinite(Date.parse(value));
}

function requiredUtc(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && isCanonicalUtc(value) ? value : null;
}

function nullableUtc(record: Record<string, unknown>, key: string): string | null | undefined {
  const value = record[key];
  if (value === null) return null;
  return typeof value === "string" && isCanonicalUtc(value) ? value : undefined;
}

function parseRun(value: unknown): HistoricalRun | null {
  if (!isRecord(value)) return null;
  const runId = nonEmptyString(value.run_id);
  const scenarioId = nonEmptyString(value.scenario_id);
  const runStartUtc = requiredUtc(value, "run_start_utc");
  const committedStartUtc = nullableUtc(value, "committed_start_utc");
  const committedEndUtc = nullableUtc(value, "committed_end_utc");
  const unavailableReason = value.unavailable_reason ?? null;
  if (
    runId === null ||
    scenarioId === null ||
    runStartUtc === null ||
    committedStartUtc === undefined ||
    committedEndUtc === undefined ||
    (value.status !== "active" && value.status !== "ended") ||
    !Number.isInteger(value.committed_interval_count) ||
    (value.committed_interval_count as number) < 0 ||
    typeof value.exportable !== "boolean" ||
    (unavailableReason !== null && typeof unavailableReason !== "string")
  ) {
    return null;
  }

  const count = value.committed_interval_count as number;
  if (count > 0 && (committedStartUtc === null || committedEndUtc === null)) {
    return null;
  }
  if (
    committedStartUtc !== null &&
    committedEndUtc !== null &&
    Date.parse(committedEndUtc) <= Date.parse(committedStartUtc)
  ) {
    return null;
  }

  return {
    runId,
    scenarioId,
    status: value.status,
    runStartUtc,
    committedStartUtc,
    committedEndUtc,
    committedIntervalCount: count,
    exportable: value.exportable,
    unavailableReason,
  };
}

/** Parse { data: { runs: HistoricalRun[] }, meta?: ... }. */
export function parseRunsResponse(json: unknown): HistoricalRun[] | null {
  if (!isRecord(json) || !isRecord(json.data) || !Array.isArray(json.data.runs)) {
    return null;
  }
  const runs: HistoricalRun[] = [];
  const seen = new Set<string>();
  for (const value of json.data.runs) {
    const run = parseRun(value);
    if (run === null || seen.has(run.runId)) return null;
    seen.add(run.runId);
    runs.push(run);
  }
  return runs;
}

export function parseRunsPageResponse(json: unknown): HistoricalRunsPage | null {
  const runs = parseRunsResponse(json);
  if (runs === null || !isRecord(json) || !isRecord(json.meta) || !isRecord(json.meta.pagination)) {
    return null;
  }
  const pagination = json.meta.pagination;
  const page = pagination.page;
  const pageSize = pagination.page_size;
  const totalItems = pagination.total_items;
  const totalPages = pagination.total_pages;
  if (
    !Number.isSafeInteger(page) || (page as number) < 1
    || !Number.isSafeInteger(pageSize) || (pageSize as number) < 1 || (pageSize as number) > 200
    || !Number.isSafeInteger(totalItems) || (totalItems as number) < 0
    || !Number.isSafeInteger(totalPages) || (totalPages as number) < 1
    || (totalPages as number) > MAX_RUN_CATALOG_PAGES
  ) {
    return null;
  }
  return {
    runs,
    page: page as number,
    pageSize: pageSize as number,
    totalItems: totalItems as number,
    totalPages: totalPages as number,
  };
}

/** Preserve an explicit selection; otherwise prefer the current run. */
export function chooseHistoricalRun(
  runs: HistoricalRun[],
  currentRunId: string | null,
  selectedRunId: string | null,
): HistoricalRun | null {
  if (runs.length === 0) return null;
  if (selectedRunId !== null) {
    const selected = runs.find((run) => run.runId === selectedRunId);
    if (selected) return selected;
  }
  if (currentRunId !== null) {
    const current = runs.find((run) => run.runId === currentRunId);
    if (current) return current;
  }
  return runs[0];
}

export function utcToDateTimeLocal(value: string): string {
  if (!isCanonicalUtc(value)) throw new Error("Invalid canonical UTC timestamp.");
  const withSeconds = value.slice(0, 19);
  return withSeconds.endsWith(":00") ? withSeconds.slice(0, 16) : withSeconds;
}

/** datetime-local is explicitly interpreted as UTC, never as browser OS time. */
export function dateTimeLocalToUtc(value: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return null;
  const timestamp = Date.parse(`${match[1]}:${match[2] ?? "00"}Z`);
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toISOString().replace(/\.\d{3}Z$/, "Z")
    : null;
}

export function validateExportWindow(fromUtc: string, toUtc: string): string | null {
  if (!isCanonicalUtc(fromUtc)) return "Start must be a valid UTC timestamp.";
  if (!isCanonicalUtc(toUtc)) return "End must be a valid UTC timestamp.";
  if (Date.parse(toUtc) <= Date.parse(fromUtc)) return "End must be after start.";
  return null;
}

export function buildRunsUrl(backendBase: string, page = 1, pageSize = 200): string {
  const base = sanitizeBackendBase(backendBase);
  if (!base) throw new HistoricalExportError("Backend API URL is invalid.", "INVALID_URL");
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 200) {
    throw new HistoricalExportError("Run catalog paging is invalid.", "VALIDATION_ERROR", null, "page");
  }
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  return `${base}/api/v1/runs?${query.toString()}`;
}

export function buildExportUrl(backendBase: string, request: ExportRequest): string {
  const base = sanitizeBackendBase(backendBase);
  if (!base) throw new HistoricalExportError("Backend API URL is invalid.", "INVALID_URL");
  const query = new URLSearchParams({
    run_id: request.runId,
    format: request.format,
    from: request.fromUtc,
    to: request.toUtc,
    interval_seconds: String(request.intervalSeconds),
  });
  // Do not use new URL('/api/v1/export', base): the leading slash would drop
  // the deployed /sim prefix.
  return `${base}/api/v1/export?${query.toString()}`;
}

function combinedSignal(controller: AbortController, external?: AbortSignal): AbortSignal {
  return external ? AbortSignal.any([controller.signal, external]) : controller.signal;
}

async function responseError(response: ResponseLike, fallback: string): Promise<HistoricalExportError> {
  let body: unknown = null;
  try {
    body = await response.json();
  } catch {
    // The stable error envelope is preferred, but an Nginx/proxy body is still
    // represented honestly rather than replaced with fabricated data.
  }
  if (isRecord(body) && isRecord(body.error)) {
    const message = nonEmptyString(body.error.message);
    const code = nonEmptyString(body.error.code);
    const field = nonEmptyString(body.error.field);
    if (message) {
      return new HistoricalExportError(message, code ?? "HTTP_ERROR", response.status, field);
    }
  }
  return new HistoricalExportError(fallback, "HTTP_ERROR", response.status);
}

export async function fetchHistoricalRuns(
  backendBase: string,
  fetchImpl: ExportFetchLike,
  externalSignal?: AbortSignal,
  timeoutMs = RUNS_TIMEOUT_MS,
): Promise<HistoricalRun[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const allRuns: HistoricalRun[] = [];
    const seen = new Set<string>();
    let pageNumber = 1;
    let totalPages = 1;
    let expectedTotal: number | null = null;

    while (pageNumber <= totalPages) {
      const response = await fetchImpl(buildRunsUrl(backendBase, pageNumber, 200), {
        signal: combinedSignal(controller, externalSignal),
      });
      if (!response.ok) {
        throw await responseError(response, `Run catalog answered HTTP ${response.status}.`);
      }
      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new HistoricalExportError("Run catalog response was not valid JSON.", "BAD_RESPONSE", response.status);
      }
      const page = parseRunsPageResponse(body);
      if (page === null || page.page !== pageNumber || page.pageSize !== 200) {
        throw new HistoricalExportError("Run catalog pagination payload was malformed.", "BAD_RESPONSE", response.status);
      }
      if (expectedTotal === null) expectedTotal = page.totalItems;
      if (page.totalItems !== expectedTotal || page.totalPages !== totalPages && pageNumber > 1) {
        throw new HistoricalExportError("Run catalog pagination changed during loading.", "BAD_RESPONSE", response.status);
      }
      totalPages = page.totalPages;
      if (pageNumber > 1 && page.runs.length === 0 && page.totalItems > 0) {
        throw new HistoricalExportError("Run catalog ended before all reported pages were loaded.", "BAD_RESPONSE", response.status);
      }
      for (const run of page.runs) {
        if (seen.has(run.runId)) {
          throw new HistoricalExportError(`Run catalog repeated run_id ${run.runId}.`, "BAD_RESPONSE", response.status);
        }
        seen.add(run.runId);
        allRuns.push(run);
      }
      pageNumber += 1;
    }
    if (allRuns.length !== expectedTotal) {
      throw new HistoricalExportError("Run catalog item count did not match pagination metadata.", "BAD_RESPONSE");
    }
    return allRuns;
  } catch (error) {
    if (error instanceof HistoricalExportError) throw error;
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new HistoricalExportError(
      aborted
        ? `Run catalog request timed out or was aborted after ${timeoutMs} ms.`
        : error instanceof Error
          ? `Run catalog request failed: ${error.message}`
          : "Run catalog request failed with an unknown error.",
      aborted ? "TIMEOUT" : "UNREACHABLE",
    );
  } finally {
    clearTimeout(timer);
  }
}

function safeFilename(value: string): string | null {
  const cleaned = value
    .replace(/^["']|["']$/g, "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[. -]+|[. -]+$/g, "")
    .slice(0, 180);
  return cleaned || null;
}

export function filenameFromContentDisposition(value: string | null): string | null {
  if (!value) return null;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (encoded?.[1]) {
    try {
      return safeFilename(decodeURIComponent(encoded[1]));
    } catch {
      // Fall through to the plain parameter.
    }
  }
  const plain = /filename="([^"]+)"|filename=([^;]+)/i.exec(value);
  return safeFilename(plain?.[1] ?? plain?.[2] ?? "");
}

export function buildExportFilename(request: ExportRequest): string {
  const run = safeFilename(request.runId) ?? "run";
  const from = request.fromUtc.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const to = request.toUtc.replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  return `nexyra-${run}-${from}-${to}-${request.intervalSeconds}s.${request.format}`;
}

export async function fetchExportFile(
  backendBase: string,
  request: ExportRequest,
  fetchImpl: ExportFetchLike,
  externalSignal?: AbortSignal,
  timeoutMs = EXPORT_TIMEOUT_MS,
): Promise<ExportFile> {
  const windowError = validateExportWindow(request.fromUtc, request.toUtc);
  if (windowError) throw new HistoricalExportError(windowError, "VALIDATION_ERROR", null, "to");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(buildExportUrl(backendBase, request), {
      signal: combinedSignal(controller, externalSignal),
    });
    if (!response.ok) {
      throw await responseError(response, `Export answered HTTP ${response.status}.`);
    }
    if (response.status === 204) {
      throw new HistoricalExportError("Export returned no file content.", "BAD_RESPONSE", response.status);
    }

    const contentType = (response.headers?.get("content-type") ?? "")
      .split(";", 1)[0]
      .trim()
      .toLowerCase();
    const expected = request.format === "csv" ? "text/csv" : "application/json";
    if (contentType !== expected) {
      throw new HistoricalExportError(
        `Export returned ${contentType || "no content type"}; expected ${expected}.`,
        "BAD_RESPONSE",
        response.status,
      );
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      throw new HistoricalExportError("Export returned an empty file.", "BAD_RESPONSE", response.status);
    }
    return {
      blob,
      contentType: expected,
      filename:
        filenameFromContentDisposition(response.headers?.get("content-disposition") ?? null) ??
        buildExportFilename(request),
    };
  } catch (error) {
    if (error instanceof HistoricalExportError) throw error;
    const aborted = error instanceof Error && error.name === "AbortError";
    throw new HistoricalExportError(
      aborted
        ? `Export request timed out or was aborted after ${timeoutMs} ms.`
        : error instanceof Error
          ? `Export request failed: ${error.message}`
          : "Export request failed with an unknown error.",
      aborted ? "TIMEOUT" : "UNREACHABLE",
    );
  } finally {
    clearTimeout(timer);
  }
}
