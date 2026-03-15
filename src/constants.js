export const STORAGE_VERSION = 1;
export const STORAGE_KEY = "tabAssistantState";
export const HISTORY_RETENTION_DAYS = 3;
export const HISTORY_RETENTION_MS = HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const MAX_RECOMMENDATIONS = 6;
export const MIN_GROUP_SIZE = 2;
export const MIN_GROUP_CONFIDENCE = 0.45;
export const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "com",
  "for",
  "from",
  "home",
  "how",
  "in",
  "is",
  "of",
  "on",
  "or",
  "page",
  "the",
  "to",
  "www"
]);
