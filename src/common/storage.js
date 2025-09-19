const KEYS = {
  OPENAI_API_KEY: "openaiApiKey",   // just a label
  USER_PREFS: "userPrefs"
};

export async function setApiKey(key) {
  await chrome.storage.sync.set({ [KEYS.OPENAI_API_KEY]: key });
}

export async function getApiKey() {
  const res = await chrome.storage.sync.get(KEYS.OPENAI_API_KEY);
  console.log("[Storage] Retrieved:", res);
  return res[KEYS.OPENAI_API_KEY] || "";
}

export async function setUserPrefs(prefs) {
  const current = await getUserPrefs();
  await chrome.storage.sync.set({
    [KEYS.USER_PREFS]: { ...current, ...prefs }
  });
}

export async function getUserPrefs() {
  const res = await chrome.storage.sync.get(KEYS.USER_PREFS);
  return res[KEYS.USER_PREFS] || {
    firstName: "",
    lastName: "",
    cooldownSec: 20,
    enabled: false
  };
}
