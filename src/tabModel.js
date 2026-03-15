import { getBaseDomain, getHostname, getPathname, isInternalUrl, normalizeTabUrl, normalizeText, tokenize, unique } from "./utils.js";

export function getTabKey(tab) {
  const url = normalizeTabUrl(tab.url || "");
  const title = normalizeText(tab.title || "");
  const hostname = getHostname(url);
  return `${hostname}|${title}|${url}`;
}

export function buildTabModel(tab, usage = {}, currentTime = Date.now()) {
  const normalizedUrl = normalizeTabUrl(tab.url || "");
  const hostname = getHostname(normalizedUrl);
  const baseDomain = getBaseDomain(hostname);
  const pathname = getPathname(normalizedUrl);
  const title = tab.title || "Untitled tab";
  const titleTokens = tokenize(title);
  const hostTokens = tokenize(hostname.replace(/\./g, " "));
  const pathTokens = tokenize(pathname.replace(/[/-]/g, " "));
  const groupTitle = tab.groupTitle || "";
  const searchableText = normalizeText(
    [title, normalizedUrl, hostname, pathname, groupTitle, tab.status, tab.pinned ? "pinned" : "", tab.audible ? "audible" : ""]
      .filter(Boolean)
      .join(" ")
  );

  return {
    id: tab.id,
    windowId: tab.windowId,
    index: tab.index,
    active: Boolean(tab.active),
    pinned: Boolean(tab.pinned),
    audible: Boolean(tab.audible),
    discarded: Boolean(tab.discarded),
    groupId: typeof tab.groupId === "number" ? tab.groupId : -1,
    groupTitle,
    title,
    url: normalizedUrl,
    hostname,
    baseDomain,
    pathname,
    titleTokens,
    hostTokens,
    pathTokens,
    searchableText,
    sessionAgeMs: currentTime - (tab.lastAccessed || currentTime),
    usageKey: usage.usageKey || getTabKey(tab),
    usage: {
      firstSeenAt: usage.firstSeenAt || currentTime,
      lastFocusedAt: usage.lastFocusedAt || 0,
      focusCount: usage.focusCount || 0,
      lastClosedSuggestionAt: usage.lastClosedSuggestionAt || 0,
      dismissedAt: usage.dismissedAt || 0
    },
    duplicateCount: 0,
    isInternal: isInternalUrl(normalizedUrl)
  };
}

export function addDuplicateSignals(tabModels) {
  const byUrl = new Map();
  for (const tab of tabModels) {
    const existing = byUrl.get(tab.url) || [];
    existing.push(tab.id);
    byUrl.set(tab.url, existing);
  }

  return tabModels.map((tab) => ({
    ...tab,
    duplicateCount: Math.max(0, (byUrl.get(tab.url)?.length || 1) - 1),
    keywords: unique([...tab.titleTokens, ...tab.hostTokens, ...tab.pathTokens])
  }));
}
