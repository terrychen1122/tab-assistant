import test from "node:test";
import assert from "node:assert/strict";
import { HISTORY_RETENTION_MS, STORAGE_KEY, STORAGE_VERSION } from "../src/constants.js";
import { loadState, mergeUsageEntry, pruneState, saveState } from "../src/storage.js";
import { getTabKey } from "../src/tabModel.js";

function createMemoryStorage(initialValue = {}) {
  const store = { ...initialValue };
  return {
    async get(key) {
      return {
        [key]: store[key]
      };
    },
    async set(patch) {
      Object.assign(store, patch);
    },
    dump() {
      return store;
    }
  };
}

test("loadState returns an empty versioned state when storage is empty", async () => {
  const storage = createMemoryStorage();
  const state = await loadState(storage);
  assert.equal(state.version, STORAGE_VERSION);
  assert.deepEqual(state.usageByKey, {});
});

test("saveState writes versioned data", async () => {
  const storage = createMemoryStorage();
  await saveState({
    version: STORAGE_VERSION,
    updatedAt: 0,
    usageByKey: {
      key: {
        firstSeenAt: 1,
        lastFocusedAt: 2,
        focusCount: 3,
        lastClosedSuggestionAt: 0,
        dismissedAt: 0
      }
    }
  }, storage);

  assert.equal(storage.dump()[STORAGE_KEY].version, STORAGE_VERSION);
});

test("pruneState removes entries older than the retention window", () => {
  const currentTime = Date.parse("2026-03-14T20:00:00Z");
  const state = pruneState({
    version: STORAGE_VERSION,
    updatedAt: currentTime,
    usageByKey: {
      stale: {
        firstSeenAt: currentTime - HISTORY_RETENTION_MS - 1000,
        lastFocusedAt: currentTime - HISTORY_RETENTION_MS - 1000,
        focusCount: 1,
        lastClosedSuggestionAt: 0,
        dismissedAt: 0
      },
      fresh: {
        firstSeenAt: currentTime,
        lastFocusedAt: currentTime,
        focusCount: 1,
        lastClosedSuggestionAt: 0,
        dismissedAt: 0
      }
    }
  }, currentTime);

  assert.equal(Boolean(state.usageByKey.stale), false);
  assert.equal(Boolean(state.usageByKey.fresh), true);
});

test("mergeUsageEntry preserves existing timestamps while incrementing usage", () => {
  const merged = mergeUsageEntry({
    firstSeenAt: 1,
    lastFocusedAt: 2,
    focusCount: 3,
    lastClosedSuggestionAt: 0,
    dismissedAt: 0
  }, {
    focusCount: 4
  }, 10);

  assert.equal(merged.firstSeenAt, 1);
  assert.equal(merged.focusCount, 4);
});

test("getTabKey preserves query params for normal sites", () => {
  const keyA = getTabKey({
    title: "Search",
    url: "https://example.com/search?q=alpha"
  });
  const keyB = getTabKey({
    title: "Search",
    url: "https://example.com/search?q=beta"
  });

  assert.notEqual(keyA, keyB);
});

test("getTabKey strips query params for Google docs editors", () => {
  const keyA = getTabKey({
    title: "Doc",
    url: "https://docs.google.com/document/d/123/edit?tab=t.0"
  });
  const keyB = getTabKey({
    title: "Doc",
    url: "https://docs.google.com/document/d/123/edit?usp=sharing"
  });

  assert.equal(keyA, keyB);
});
