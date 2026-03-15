import { HISTORY_RETENTION_MS, STORAGE_KEY, STORAGE_VERSION } from "./constants.js";
import { now } from "./utils.js";

function getStorageArea(storageArea) {
  if (storageArea) {
    return storageArea;
  }
  return chrome.storage.local;
}

export function createEmptyState(currentTime = now()) {
  return {
    version: STORAGE_VERSION,
    updatedAt: currentTime,
    usageByKey: {}
  };
}

export async function loadState(storageArea) {
  const storage = getStorageArea(storageArea);
  const result = await storage.get(STORAGE_KEY);
  const rawState = result[STORAGE_KEY];
  if (!rawState || rawState.version !== STORAGE_VERSION) {
    return createEmptyState();
  }
  return pruneState(rawState);
}

export async function saveState(state, storageArea) {
  const storage = getStorageArea(storageArea);
  const nextState = {
    ...state,
    version: STORAGE_VERSION,
    updatedAt: now()
  };
  await storage.set({
    [STORAGE_KEY]: nextState
  });
  return nextState;
}

export function pruneState(state, currentTime = now()) {
  const usageByKey = {};
  for (const [key, value] of Object.entries(state.usageByKey || {})) {
    const latestActivity = Math.max(value.firstSeenAt || 0, value.lastFocusedAt || 0, value.dismissedAt || 0);
    if (currentTime - latestActivity <= HISTORY_RETENTION_MS) {
      usageByKey[key] = value;
    }
  }
  return {
    version: STORAGE_VERSION,
    updatedAt: currentTime,
    usageByKey
  };
}

export function mergeUsageEntry(existing = {}, patch = {}, currentTime = now()) {
  return {
    firstSeenAt: existing.firstSeenAt || patch.firstSeenAt || currentTime,
    lastFocusedAt: patch.lastFocusedAt || existing.lastFocusedAt || 0,
    focusCount: patch.focusCount ?? existing.focusCount ?? 0,
    lastClosedSuggestionAt: patch.lastClosedSuggestionAt || existing.lastClosedSuggestionAt || 0,
    dismissedAt: patch.dismissedAt || existing.dismissedAt || 0
  };
}
