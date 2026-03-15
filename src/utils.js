import { STOP_WORDS } from "./constants.js";

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function now() {
  return Date.now();
}

export function normalizeText(value) {
  return (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token && !STOP_WORDS.has(token));
}

export function unique(values) {
  return [...new Set(values)];
}

export function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function getPathname(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return "";
  }
}

export function getProtocol(url) {
  try {
    return new URL(url).protocol;
  } catch {
    return "";
  }
}

export function isInternalUrl(url) {
  const protocol = getProtocol(url);
  return protocol === "chrome:" || protocol === "edge:" || protocol === "about:";
}

export function shouldStripQueryParams(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "docs.google.com") {
      return false;
    }
    return (
      parsed.pathname.startsWith("/document/") ||
      parsed.pathname.startsWith("/spreadsheets/") ||
      parsed.pathname.startsWith("/presentation/")
    );
  } catch {
    return false;
  }
}

export function normalizeTabUrl(url) {
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    if (shouldStripQueryParams(url)) {
      parsed.search = "";
    }
    return parsed.toString();
  } catch {
    return url || "";
  }
}

export function getBaseDomain(hostname) {
  if (!hostname) {
    return "";
  }
  const parts = hostname.split(".");
  if (parts.length <= 2) {
    return hostname;
  }
  return parts.slice(-2).join(".");
}

export function formatRelativeAge(timestamp, currentTime = now()) {
  if (!timestamp) {
    return "not visited yet";
  }
  const diff = Math.max(0, currentTime - timestamp);
  const hours = Math.floor(diff / (60 * 60 * 1000));
  if (hours < 1) {
    return "visited recently";
  }
  if (hours < 24) {
    return `not visited in ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.floor(hours / 24);
  return `not visited in ${days} day${days === 1 ? "" : "s"}`;
}

export function scoreTokenOverlap(leftTokens, rightTokens) {
  if (!leftTokens.length || !rightTokens.length) {
    return 0;
  }
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);
  let matches = 0;
  for (const token of left) {
    if (right.has(token)) {
      matches += 1;
    }
  }
  return matches / Math.max(left.size, right.size);
}

export function fuzzyIncludes(candidate, query) {
  if (!query) {
    return true;
  }
  if (!candidate) {
    return false;
  }
  if (candidate.includes(query)) {
    return true;
  }
  let cursor = 0;
  for (const char of query) {
    cursor = candidate.indexOf(char, cursor);
    if (cursor === -1) {
      return false;
    }
    cursor += 1;
  }
  return true;
}
