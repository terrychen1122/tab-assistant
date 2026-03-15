import test from "node:test";
import assert from "node:assert/strict";
import { searchTabs } from "../src/search.js";

const tabs = [
  {
    id: 1,
    windowId: 1,
    title: "OpenAI API docs",
    url: "https://platform.openai.com/docs",
    hostname: "platform.openai.com",
    baseDomain: "openai.com",
    pathname: "/docs",
    groupTitle: "Docs",
    active: false,
    pinned: false,
    audible: false,
    usage: { focusCount: 3, lastFocusedAt: 10 }
  },
  {
    id: 2,
    windowId: 1,
    title: "Repository pull request",
    url: "https://github.com/org/repo/pull/1",
    hostname: "github.com",
    baseDomain: "github.com",
    pathname: "/org/repo/pull/1",
    groupTitle: "",
    active: false,
    pinned: false,
    audible: false,
    usage: { focusCount: 1, lastFocusedAt: 5 }
  }
];

test("search ranks title and domain matches ahead of weaker matches", () => {
  const results = searchTabs(tabs, "openai docs");
  assert.equal(results[0].id, 1);
});

test("search supports fuzzy typo matching", () => {
  const results = searchTabs(tabs, "opnai");
  assert.equal(results[0].id, 1);
});
