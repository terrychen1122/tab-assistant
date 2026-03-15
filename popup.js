const state = {
  tabs: [],
  recommendations: [],
  groupingSuggestions: [],
  selectedIndex: 0,
  query: ""
};

const SEARCH_STATE_KEY = "tabAssistantPopupSearch";
const SEARCH_RETENTION_MS = 2 * 60 * 1000;

const searchInput = document.getElementById("searchInput");
const searchResults = document.getElementById("searchResults");
const recommendations = document.getElementById("recommendations");
const groups = document.getElementById("groups");
const refreshButton = document.getElementById("refreshButton");
const featureTabs = [...document.querySelectorAll(".feature-tab")];
const featurePanels = [...document.querySelectorAll(".feature-panel")];

async function sendMessage(type, payload = {}) {
  const response = await chrome.runtime.sendMessage({
    type,
    ...payload
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Unexpected extension error");
  }
  return response.data ?? response;
}

function loadPersistedSearch() {
  try {
    const rawValue = localStorage.getItem(SEARCH_STATE_KEY);
    if (!rawValue) {
      return "";
    }
    const parsed = JSON.parse(rawValue);
    if (!parsed.query || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      localStorage.removeItem(SEARCH_STATE_KEY);
      return "";
    }
    return parsed.query;
  } catch {
    localStorage.removeItem(SEARCH_STATE_KEY);
    return "";
  }
}

function persistSearch(query) {
  if (!query) {
    localStorage.removeItem(SEARCH_STATE_KEY);
    return;
  }

  localStorage.setItem(SEARCH_STATE_KEY, JSON.stringify({
    query,
    expiresAt: Date.now() + SEARCH_RETENTION_MS
  }));
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDisplayUrl(url) {
  return (url || "").replace(/^https?:\/\//, "");
}

function renderSearch() {
  const items = state.tabs;
  if (!items.length) {
    searchResults.innerHTML = '<p class="empty">No tabs match this search.</p>';
    return;
  }

  searchResults.innerHTML = items
    .map((tab, index) => `
      <article class="item" data-tab-id="${tab.id}">
        <div class="item-top">
          <div>
            <div class="item-title">${escapeHtml(tab.title)}</div>
            <div class="item-url">${escapeHtml(formatDisplayUrl(tab.url || tab.hostname))}</div>
          </div>
          ${index === state.selectedIndex ? '<span class="pill">Selected</span>' : ""}
        </div>
        <div class="pill-row">
          ${tab.active ? '<span class="pill">Active</span>' : ""}
          ${tab.pinned ? '<span class="pill">Pinned</span>' : ""}
          ${tab.audible ? '<span class="pill">Audible</span>' : ""}
        </div>
        <div class="action-row">
          ${tab.active ? "" : `<button class="primary-button" data-action="activate" data-tab-id="${tab.id}" type="button">Switch</button>`}
          <button class="danger-button" data-action="close" data-tab-id="${tab.id}" type="button">Close</button>
        </div>
      </article>
    `)
    .join("");
}

function renderRecommendations() {
  if (!state.recommendations.length) {
    recommendations.innerHTML = '<p class="empty">Nothing looks risky or stale enough to recommend closing right now.</p>';
    return;
  }

  recommendations.innerHTML = state.recommendations
    .map((item) => `
      <article class="item">
        <div class="item-title">${escapeHtml(item.title)}</div>
        <div class="item-url">${escapeHtml(formatDisplayUrl(item.url || item.hostname))}</div>
        <div class="pill-row">
          ${item.reasons.map((reason) => `<span class="pill">${escapeHtml(reason)}</span>`).join("")}
        </div>
        <div class="action-row">
          <button class="danger-button" data-action="close" data-tab-id="${item.id}" type="button">Close tab</button>
          <button class="ghost-button" data-action="dismiss" data-tab-id="${item.id}" type="button">Dismiss</button>
        </div>
      </article>
    `)
    .join("");
}

function renderGroups() {
  if (!state.groupingSuggestions.length) {
    groups.innerHTML = '<p class="empty">No strong grouping suggestions yet.</p>';
    return;
  }

  groups.innerHTML = state.groupingSuggestions
    .map((group) => `
      <article class="item">
        <div class="item-top">
          <div>
            <div class="item-title">${escapeHtml(group.label)}</div>
            <div class="meta">Confidence ${Math.round(group.confidence * 100)}%</div>
          </div>
          <span class="pill">${group.tabIds.length} tabs</span>
        </div>
        <div class="group-preview">${escapeHtml(group.tabs.map((tab) => formatDisplayUrl(tab.url || tab.title)).join(" • "))}</div>
        <div class="action-row">
          <button class="primary-button" data-action="group" data-group-key="${group.key}" type="button">Create group</button>
        </div>
      </article>
    `)
    .join("");
}

async function loadPopupData() {
  const data = await sendMessage("GET_POPUP_DATA");
  state.query = loadPersistedSearch();
  state.recommendations = data.recommendations;
  state.groupingSuggestions = data.groupingSuggestions;
  state.selectedIndex = 0;
  searchInput.value = state.query;
  state.tabs = state.query ? await sendMessage("SEARCH_TABS", { query: state.query }) : data.tabs;
  renderAll();
}

async function updateSearch(query) {
  state.query = query;
  persistSearch(query);
  state.tabs = await sendMessage("SEARCH_TABS", { query });
  state.selectedIndex = 0;
  renderSearch();
}

function renderAll() {
  renderSearch();
  renderRecommendations();
  renderGroups();
}

function setActiveFeature(feature) {
  featureTabs.forEach((tab) => {
    const isActive = tab.dataset.feature === feature;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
    tab.tabIndex = isActive ? 0 : -1;
  });

  featurePanels.forEach((panel) => {
    const isActive = panel.id === `feature-${feature}`;
    panel.classList.toggle("is-active", isActive);
    panel.hidden = !isActive;
  });

  if (feature === "search") {
    searchInput.focus();
  }
}

searchInput.addEventListener("input", (event) => {
  void updateSearch(event.target.value);
});

featureTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    setActiveFeature(tab.dataset.feature);
  });

  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
      return;
    }
    event.preventDefault();
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (index + direction + featureTabs.length) % featureTabs.length;
    featureTabs[nextIndex].focus();
    setActiveFeature(featureTabs[nextIndex].dataset.feature);
  });
});

searchInput.addEventListener("keydown", (event) => {
  if (!state.tabs.length) {
    return;
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    state.selectedIndex = Math.min(state.tabs.length - 1, state.selectedIndex + 1);
    renderSearch();
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    state.selectedIndex = Math.max(0, state.selectedIndex - 1);
    renderSearch();
  } else if (event.key === "Enter") {
    event.preventDefault();
    const tab = state.tabs[state.selectedIndex];
    if (tab) {
      if (tab.active) {
        void sendMessage("CLOSE_TAB", { tabId: tab.id }).then(() => {
          state.recommendations = state.recommendations.filter((item) => item.id !== tab.id);
          state.tabs = state.tabs.filter((item) => item.id !== tab.id);
          state.groupingSuggestions = state.groupingSuggestions
            .map((group) => ({
              ...group,
              tabIds: group.tabIds.filter((id) => id !== tab.id),
              tabs: group.tabs.filter((groupTab) => groupTab.id !== tab.id)
            }))
            .filter((group) => group.tabIds.length >= 2);
          renderAll();
        });
      } else {
        persistSearch(state.query);
        void sendMessage("ACTIVATE_TAB", { tabId: tab.id }).then(() => window.close());
      }
    }
  }
});

document.addEventListener("click", async (event) => {
  const target = event.target.closest("button[data-action]");
  if (!target) {
    return;
  }
  const { action } = target.dataset;
  const tabId = Number(target.dataset.tabId);

  if (action === "close") {
    await sendMessage("CLOSE_TAB", { tabId });
    state.recommendations = state.recommendations.filter((item) => item.id !== tabId);
    state.tabs = state.tabs.filter((item) => item.id !== tabId);
    state.groupingSuggestions = state.groupingSuggestions.map((group) => ({
      ...group,
      tabIds: group.tabIds.filter((id) => id !== tabId),
      tabs: group.tabs.filter((tab) => tab.id !== tabId)
    })).filter((group) => group.tabIds.length >= 2);
    renderAll();
    return;
  }

  if (action === "activate") {
    persistSearch(state.query);
    await sendMessage("ACTIVATE_TAB", { tabId });
    window.close();
    return;
  }

  if (action === "dismiss") {
    await sendMessage("DISMISS_RECOMMENDATION", { tabId });
    state.recommendations = state.recommendations.filter((item) => item.id !== tabId);
    renderRecommendations();
    return;
  }

  if (action === "group") {
    const group = state.groupingSuggestions.find((item) => item.key === target.dataset.groupKey);
    if (group) {
      await sendMessage("CREATE_GROUP", {
        tabIds: group.tabIds,
        title: group.label
      });
      await loadPopupData();
    }
  }
});

refreshButton.addEventListener("click", () => {
  void loadPopupData();
});

setActiveFeature("search");
void loadPopupData();
