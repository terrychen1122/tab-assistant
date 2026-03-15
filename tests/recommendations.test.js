import test from "node:test";
import assert from "node:assert/strict";
import { getCloseRecommendations } from "../src/recommendations.js";

const now = Date.parse("2026-03-14T20:00:00Z");

test("close recommendations exclude pinned, audible, and active tabs", () => {
  const results = getCloseRecommendations([
    {
      id: 1,
      title: "Pinned",
      url: "https://example.com",
      hostname: "example.com",
      active: false,
      pinned: true,
      audible: false,
      isInternal: false,
      duplicateCount: 0,
      sessionAgeMs: 0,
      usage: { focusCount: 0, lastFocusedAt: 0, dismissedAt: 0 }
    },
    {
      id: 2,
      title: "Candidate",
      url: "https://example.com/stale",
      hostname: "example.com",
      active: false,
      pinned: false,
      audible: false,
      isInternal: false,
      duplicateCount: 1,
      sessionAgeMs: 3 * 24 * 60 * 60 * 1000,
      usage: { focusCount: 0, lastFocusedAt: 0, dismissedAt: 0 }
    }
  ], now);

  assert.deepEqual(results.map((result) => result.id), [2]);
});

test("duplicate and stale tabs rank above recently focused tabs", () => {
  const results = getCloseRecommendations([
    {
      id: 1,
      title: "Stale duplicate",
      url: "https://docs.example.com/guide",
      hostname: "docs.example.com",
      active: false,
      pinned: false,
      audible: false,
      isInternal: false,
      duplicateCount: 1,
      sessionAgeMs: 4 * 24 * 60 * 60 * 1000,
      usage: { focusCount: 0, lastFocusedAt: 0, dismissedAt: 0 }
    },
    {
      id: 2,
      title: "Fresh tab",
      url: "https://docs.example.com/fresh",
      hostname: "docs.example.com",
      active: false,
      pinned: false,
      audible: false,
      isInternal: false,
      duplicateCount: 0,
      sessionAgeMs: 2 * 60 * 60 * 1000,
      usage: { focusCount: 4, lastFocusedAt: now - 30 * 60 * 1000, dismissedAt: 0 }
    }
  ], now);

  assert.equal(results[0].id, 1);
});

test("distinct query-string tabs are not treated as duplicates for normal sites", () => {
  const results = getCloseRecommendations([
    {
      id: 1,
      title: "Search A",
      url: "https://example.com/search?q=alpha",
      hostname: "example.com",
      active: false,
      pinned: false,
      audible: false,
      isInternal: false,
      duplicateCount: 0,
      sessionAgeMs: 2 * 24 * 60 * 60 * 1000,
      usage: { focusCount: 0, lastFocusedAt: 0, dismissedAt: 0 }
    },
    {
      id: 2,
      title: "Search B",
      url: "https://example.com/search?q=beta",
      hostname: "example.com",
      active: false,
      pinned: false,
      audible: false,
      isInternal: false,
      duplicateCount: 0,
      sessionAgeMs: 2 * 24 * 60 * 60 * 1000,
      usage: { focusCount: 0, lastFocusedAt: 0, dismissedAt: 0 }
    }
  ], now);

  assert.equal(results[0].reasons.includes("duplicate of another tab"), false);
  assert.equal(results[1].reasons.includes("duplicate of another tab"), false);
});
