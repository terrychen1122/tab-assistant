import test from "node:test";
import assert from "node:assert/strict";
import { getGroupingSuggestions } from "../src/grouping.js";

test("groups tabs by shared domain", () => {
  const results = getGroupingSuggestions([
    {
      id: 1,
      title: "GitHub repo 1",
      url: "https://github.com/org/repo1",
      hostname: "github.com",
      baseDomain: "github.com",
      pinned: false,
      isInternal: false,
      keywords: ["github", "repo"]
    },
    {
      id: 2,
      title: "GitHub repo 2",
      url: "https://github.com/org/repo2",
      hostname: "github.com",
      baseDomain: "github.com",
      pinned: false,
      isInternal: false,
      keywords: ["github", "repo"]
    }
  ]);

  assert.equal(results[0].label, "GitHub");
  assert.deepEqual(results[0].tabIds, [1, 2]);
});
