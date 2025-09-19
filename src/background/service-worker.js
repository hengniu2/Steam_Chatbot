
import { getApiKey } from "../common/storage.js";
import { callOpenAI } from "../common/openai.js";
import { CooldownTracker } from "../common/cooldown.js";

// Maintain cooldown per tab (or more granular IDs in the future)
const cooldownByTab = new CooldownTracker();

chrome.runtime.onInstalled.addListener(() => {
  console.log("[Steam AI Chatbot] Installed.");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      if (message?.type === "STEAM_AI_REQUEST_REPLY") {
        console.log("message arrived");
        const { tabId, cooldownMs, systemPersona, chatHistory } = message.payload;

        // Cooldown check
        if (!cooldownByTab.isReady(tabId, cooldownMs)) {
          const msRemaining = cooldownByTab.msRemaining(tabId, cooldownMs);
          sendResponse({
            ok: false,
            error: `On cooldown. ${Math.ceil(msRemaining / 1000)}s remaining.`
          });
          return;
        }

        const apiKey = await getApiKey();
        console.log("apikey: ", apiKey);
        if (!apiKey) {
          sendResponse({ ok: false, error: "Missing OpenAI API key. Set it in the Options page." });
          return;
        }

        // Call OpenAI with the provided history & persona
        const replyText = await callOpenAI(apiKey, systemPersona, chatHistory);

        // Update cooldown timestamp on success
        cooldownByTab.mark(tabId);

        sendResponse({ ok: true, replyText });
      } else {
        // Ignore unknown message types
        sendResponse({ ok: false, error: "Unknown message type" });
      }
    } catch (err) {
      console.error("[STEAM AI ERROR]", err);
      sendResponse({ ok: false, error: String(err?.message || err) });
    }
  })();

  // Indicate we will respond asynchronously
  return true;
});
