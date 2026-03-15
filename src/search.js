import { fuzzyIncludes, normalizeText } from "./utils.js";

function getQueryTokens(query) {
  return normalizeText(query).split(" ").filter(Boolean);
}

function scoreField(field, query, weight) {
  if (!query || !field) {
    return 0;
  }
  if (field.startsWith(query)) {
    return weight * 1.2;
  }
  if (field.includes(query)) {
    return weight;
  }
  if (fuzzyIncludes(field, query)) {
    return weight * 0.55;
  }
  return 0;
}

export function scoreTabMatch(tab, query) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return 0;
  }
  const queryTokens = getQueryTokens(normalizedQuery);
  const fields = [
    [normalizeText(tab.title), 9],
    [normalizeText(tab.hostname), 7],
    [normalizeText(tab.baseDomain), 6],
    [normalizeText(tab.pathname), 4],
    [normalizeText(tab.url), 3],
    [normalizeText(tab.groupTitle), 2]
  ];

  let score = 0;
  for (const [field, weight] of fields) {
    score += scoreField(field, normalizedQuery, weight);
    for (const token of queryTokens) {
      score += scoreField(field, token, weight * 0.35);
    }
  }

  if (tab.active) {
    score += 1.5;
  }
  if (tab.usage.focusCount) {
    score += Math.min(2, tab.usage.focusCount * 0.2);
  }
  return score;
}

export function searchTabs(tabModels, query) {
  const normalizedQuery = normalizeText(query);
  const ranked = tabModels
    .map((tab) => ({
      ...tab,
      searchScore: normalizedQuery ? scoreTabMatch(tab, normalizedQuery) : 0
    }))
    .filter((tab) => !normalizedQuery || tab.searchScore > 0)
    .sort((left, right) => {
      if (right.searchScore !== left.searchScore) {
        return right.searchScore - left.searchScore;
      }
      return (right.usage.lastFocusedAt || 0) - (left.usage.lastFocusedAt || 0);
    });

  return ranked.map((tab) => ({
    id: tab.id,
    windowId: tab.windowId,
    title: tab.title,
    url: tab.url,
    hostname: tab.hostname,
    active: tab.active,
    pinned: tab.pinned,
    audible: tab.audible,
    score: tab.searchScore
  }));
}
