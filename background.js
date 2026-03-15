import { dismissTabSuggestion, getTabInsights, recordTabActivity } from "./src/service.js";
import { getTabKey } from "./src/tabModel.js";

async function getCurrentWindowTabs() {
  const tabs = await chrome.tabs.query({
    currentWindow: true
  });

  const groupIds = [...new Set(tabs.map((tab) => tab.groupId).filter((groupId) => typeof groupId === "number" && groupId >= 0))];
  const groupTitleById = new Map();
  await Promise.all(
    groupIds.map(async (groupId) => {
      try {
        const group = await chrome.tabGroups.get(groupId);
        groupTitleById.set(groupId, group.title || "");
      } catch {
        groupTitleById.set(groupId, "");
      }
    })
  );

  return tabs.map((tab) => ({
    ...tab,
    groupTitle: groupTitleById.get(tab.groupId) || ""
  }));
}

async function recordExistingTab(tab) {
  if (!tab?.id || !tab.url) {
    return;
  }
  await recordTabActivity({
    type: "seen",
    usageKey: getTabKey(tab),
    timestamp: Date.now()
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const tabs = await chrome.tabs.query({});
  await Promise.all(tabs.map((tab) => recordExistingTab(tab)));
});

chrome.tabs.onCreated.addListener((tab) => {
  void recordExistingTab(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title || changeInfo.status === "complete") {
    void recordExistingTab(tab);
  }
});

chrome.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    await recordTabActivity({
      type: "focus",
      usageKey: getTabKey(tab),
      windowId,
      timestamp: Date.now()
    });
  } catch {
    // Ignore transient tabs that disappeared before we could fetch them.
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  void (async () => {
    try {
      if (message.type === "GET_POPUP_DATA") {
        const tabs = await getCurrentWindowTabs();
        const insights = await getTabInsights(tabs);
        sendResponse({
          ok: true,
          data: {
            tabs: insights.searchTabs(""),
            recommendations: insights.getCloseRecommendations(),
            groupingSuggestions: insights.getGroupingSuggestions()
          }
        });
        return;
      }

      if (message.type === "SEARCH_TABS") {
        const tabs = await getCurrentWindowTabs();
        const insights = await getTabInsights(tabs);
        sendResponse({
          ok: true,
          data: insights.searchTabs(message.query || "")
        });
        return;
      }

      if (message.type === "ACTIVATE_TAB") {
        await chrome.tabs.update(message.tabId, { active: true });
        const tab = await chrome.tabs.get(message.tabId);
        await chrome.windows.update(tab.windowId, { focused: true });
        sendResponse({ ok: true });
        return;
      }

      if (message.type === "CLOSE_TAB") {
        const tab = await chrome.tabs.get(message.tabId);
        await chrome.tabs.remove(message.tabId);
        sendResponse({ ok: true, closedTabId: message.tabId });
        return;
      }

      if (message.type === "DISMISS_RECOMMENDATION") {
        const tabs = await getCurrentWindowTabs();
        const tab = tabs.find((item) => item.id === message.tabId);
        if (tab) {
          await dismissTabSuggestion(tab);
        }
        sendResponse({ ok: true });
        return;
      }

      if (message.type === "CREATE_GROUP") {
        const groupId = await chrome.tabs.group({
          tabIds: message.tabIds
        });
        await chrome.tabGroups.update(groupId, {
          title: message.title
        });
        sendResponse({ ok: true, groupId });
        return;
      }

      sendResponse({ ok: false, error: "Unknown message type" });
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  })();

  return true;
});
