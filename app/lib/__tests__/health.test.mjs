import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkHealth, parseHealthResponse } from "../health.ts";

const HEALTH = {
  data: {
    status: "ok",
    contract_version: "1.0.1",
    ml_reachable: true,
  },
  meta: { request_id: "sim-health-1" },
};

describe("simulator health adapter", () => {
  it("parses the public data envelope", () => {
    const parsed = parseHealthResponse(HEALTH);
    assert.equal(parsed?.status, "ok");
    assert.equal(parsed?.contractVersion, "1.0.1");
    assert.equal(parsed?.mlReachable, true);
  });

  it("classifies the envelope as reachable", async () => {
    const result = await checkHealth(
      "https://git-pipeline.metatronhost.in/sim",
      async (url, init) => {
        assert.equal(url, "https://git-pipeline.metatronhost.in/sim/api/v1/health");
        assert.ok(init?.signal);
        return { ok: true, status: 200, json: async () => HEALTH };
      },
      1000,
    );
    assert.equal(result.outcome, "reachable");
    assert.equal(result.data?.contractVersion, "1.0.1");
    assert.equal(result.error, null);
  });

  it("rejects a malformed data member instead of reading outer fields", () => {
    assert.equal(parseHealthResponse({ data: { status: 7 }, status: "ok" }), null);
  });
});
