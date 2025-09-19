export function requestAIReply({ tabId, cooldownMs, systemPersona, chatHistory }) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        type: "STEAM_AI_REQUEST_REPLY",
        payload: { tabId, cooldownMs, systemPersona, chatHistory }
      },
      (resp) => {
        if (chrome.runtime.lastError) {
          console.error("requestAIReply error:", chrome.runtime.lastError);
          resolve({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        resolve(resp);
      }
    );
  });
}
