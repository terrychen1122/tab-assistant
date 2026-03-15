import { MAX_RECOMMENDATIONS } from "./constants.js";
import { clamp, formatRelativeAge } from "./utils.js";

export function getCloseRecommendations(tabModels, currentTime = Date.now()) {
  const scored = tabModels
    .filter((tab) => !tab.active && !tab.pinned && !tab.audible && !tab.isInternal)
    .map((tab) => {
      const hoursSinceFocus = tab.usage.lastFocusedAt ? (currentTime - tab.usage.lastFocusedAt) / (60 * 60 * 1000) : 999;
      const focusPenalty = clamp(1 - tab.usage.focusCount / 8, 0, 1);
      const staleScore = clamp(hoursSinceFocus / 72, 0, 1);
      const duplicateBoost = tab.duplicateCount > 0 ? clamp(0.3 + tab.duplicateCount * 0.2, 0, 0.8) : 0;
      const ageScore = clamp(tab.sessionAgeMs / (24 * 60 * 60 * 1000), 0, 1);
      const dismissalPenalty = tab.usage.dismissedAt && currentTime - tab.usage.dismissedAt < 12 * 60 * 60 * 1000 ? 0.35 : 0;
      const score = staleScore * 0.45 + focusPenalty * 0.25 + duplicateBoost * 0.2 + ageScore * 0.1 - dismissalPenalty;
      const reasons = [];

      if (tab.duplicateCount > 0) {
        reasons.push(`duplicate of ${tab.duplicateCount === 1 ? "another tab" : `${tab.duplicateCount} other tabs`}`);
      }
      if (!tab.usage.lastFocusedAt) {
        reasons.push("rarely focused");
      } else if (hoursSinceFocus >= 24) {
        reasons.push(formatRelativeAge(tab.usage.lastFocusedAt, currentTime));
      }
      if (tab.usage.focusCount <= 1) {
        reasons.push("opened long ago, rarely focused");
      }

      return {
        id: tab.id,
        title: tab.title,
        url: tab.url,
        hostname: tab.hostname,
        score,
        reasons: reasons.slice(0, 2)
      };
    })
    .filter((tab) => tab.score >= 0.35)
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_RECOMMENDATIONS);

  return scored;
}

export function dismissRecommendation(state, usageKey, currentTime = Date.now()) {
  const existing = state.usageByKey[usageKey] || {};
  return {
    ...state,
    usageByKey: {
      ...state.usageByKey,
      [usageKey]: {
        ...existing,
        firstSeenAt: existing.firstSeenAt || currentTime,
        focusCount: existing.focusCount || 0,
        lastFocusedAt: existing.lastFocusedAt || 0,
        lastClosedSuggestionAt: existing.lastClosedSuggestionAt || 0,
        dismissedAt: currentTime
      }
    }
  };
}
