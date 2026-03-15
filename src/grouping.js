import { MIN_GROUP_CONFIDENCE, MIN_GROUP_SIZE } from "./constants.js";
import { scoreTokenOverlap } from "./utils.js";

const GROUP_HINTS = [
  { token: "docs", label: "Docs" },
  { token: "github", label: "GitHub" },
  { token: "figma", label: "Design" },
  { token: "shop", label: "Shopping" },
  { token: "cart", label: "Shopping" },
  { token: "notion", label: "Notes" },
  { token: "calendar", label: "Planning" }
];

function getLabel(tab) {
  for (const hint of GROUP_HINTS) {
    if (tab.keywords.includes(hint.token) || tab.hostname.includes(hint.token)) {
      return hint.label;
    }
  }
  if (tab.baseDomain) {
    const [root] = tab.baseDomain.split(".");
    return root.charAt(0).toUpperCase() + root.slice(1);
  }
  return "Suggested group";
}

function maybeCreateCluster(key, label, tabs, confidence) {
  if (tabs.length < MIN_GROUP_SIZE || confidence < MIN_GROUP_CONFIDENCE) {
    return null;
  }
  return {
    key,
    label,
    confidence,
    tabIds: tabs.map((tab) => tab.id),
    tabs: tabs.map((tab) => ({
      id: tab.id,
      title: tab.title,
      url: tab.url,
      hostname: tab.hostname
    }))
  };
}

export function getGroupingSuggestions(tabModels) {
  const suggestions = [];
  const usedTabIds = new Set();
  const byBaseDomain = new Map();

  for (const tab of tabModels) {
    if (tab.pinned || tab.isInternal) {
      continue;
    }
    const existing = byBaseDomain.get(tab.baseDomain) || [];
    existing.push(tab);
    byBaseDomain.set(tab.baseDomain, existing);
  }

  for (const [domain, tabs] of byBaseDomain.entries()) {
    if (!domain) {
      continue;
    }
    const cluster = maybeCreateCluster(`domain:${domain}`, getLabel(tabs[0]), tabs, 0.75);
    if (cluster) {
      cluster.tabIds.forEach((tabId) => usedTabIds.add(tabId));
      suggestions.push(cluster);
    }
  }

  const leftovers = tabModels.filter((tab) => !usedTabIds.has(tab.id) && !tab.pinned && !tab.isInternal);
  const tokenClusters = [];
  for (const tab of leftovers) {
    let matched = false;
    for (const cluster of tokenClusters) {
      const overlap = scoreTokenOverlap(cluster.keywords, tab.keywords);
      if (overlap >= 0.55) {
        cluster.tabs.push(tab);
        cluster.keywords = [...new Set([...cluster.keywords, ...tab.keywords])];
        cluster.confidence = Math.max(cluster.confidence, overlap);
        matched = true;
        break;
      }
    }
    if (!matched) {
      tokenClusters.push({
        tabs: [tab],
        keywords: [...tab.keywords],
        confidence: 0.45
      });
    }
  }

  for (const cluster of tokenClusters) {
    const suggestion = maybeCreateCluster(
      `keyword:${cluster.keywords.slice(0, 3).join("-")}`,
      getLabel(cluster.tabs[0]),
      cluster.tabs,
      cluster.confidence
    );
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  return suggestions.sort((left, right) => right.confidence - left.confidence);
}
