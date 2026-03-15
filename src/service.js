import { addDuplicateSignals, buildTabModel, getTabKey } from "./tabModel.js";
import { getGroupingSuggestions } from "./grouping.js";
import { dismissRecommendation, getCloseRecommendations } from "./recommendations.js";
import { searchTabs } from "./search.js";
import { loadState, mergeUsageEntry, pruneState, saveState } from "./storage.js";

export async function recordTabActivity(event, storageArea) {
  const state = await loadState(storageArea);
  const currentTime = event.timestamp || Date.now();
  const existing = state.usageByKey[event.usageKey];
  const nextUsage = mergeUsageEntry(existing, {
    firstSeenAt: currentTime,
    lastFocusedAt: event.type === "focus" ? currentTime : existing?.lastFocusedAt,
    focusCount: event.type === "focus" ? (existing?.focusCount || 0) + 1 : existing?.focusCount || 0
  }, currentTime);

  const nextState = {
    ...state,
    usageByKey: {
      ...state.usageByKey,
      [event.usageKey]: nextUsage
    }
  };

  await saveState(pruneState(nextState, currentTime), storageArea);
}

export async function getTabInsights(tabs, storageArea, currentTime = Date.now()) {
  const state = await loadState(storageArea);
  const models = addDuplicateSignals(
    tabs.map((tab) => {
      const usageKey = getTabKey(tab);
      return buildTabModel(tab, { ...state.usageByKey[usageKey], usageKey }, currentTime);
    })
  );

  return {
    state,
    models,
    searchTabs(query) {
      return searchTabs(models, query);
    },
    getCloseRecommendations() {
      return getCloseRecommendations(models, currentTime);
    },
    getGroupingSuggestions() {
      return getGroupingSuggestions(models);
    }
  };
}

export async function dismissTabSuggestion(tab, storageArea, currentTime = Date.now()) {
  const state = await loadState(storageArea);
  const usageKey = getTabKey(tab);
  const nextState = dismissRecommendation(state, usageKey, currentTime);
  await saveState(nextState, storageArea);
}
