import { getUserPrefs, setUserPrefs } from "../common/storage.js";
import { requestAIReply } from "../common/messaging.js";
import { normalizeHistory } from "../common/history.js";
import { steamSelectors } from "./domSelectors.js";

export async function start() {
  console.log("[Steam AI Chatbot] Content script loaded.");

  // Always show floating UI
  // await createFloatingUI();

  // Only run chatbot logic on Steam chat
  if (location.hostname === "steamcommunity.com" && location.pathname.startsWith("/chat")) {
    console.log("[Steam AI Chatbot] Chatbot logic enabled.");
    waitForChatRoot().then(setupChatObserver).catch(err => {
      console.warn("Could not find chat root:", err);
    });
  } else {
    console.log("[Steam AI Chatbot] Not on Steam chat, chatbot logic disabled.");
  }
}

/** ----- UI ----- */

async function createFloatingUI() {
  const prefs = await getUserPrefs();

  // Shadow root container (prevents style collisions)
  const host = document.createElement("div");
  host.id = "steam-ai-floating-host";
  document.documentElement.appendChild(host);
  const shadow = host.attachShadow({ mode: "open" });

  // Container
  const wrapper = document.createElement("div");
  wrapper.className = "sai-wrapper";
  wrapper.innerHTML = `
    <div class="sai-card">
      <div class="sai-header">
        <div class="sai-title">Steam AI Chatbot</div>
        <label class="sai-switch">
          <input id="sai-enabled" type="checkbox" ${prefs.enabled ? "checked" : ""}/>
          <span class="sai-slider"></span>
        </label>
      </div>

      <div class="sai-row">
        <div class="sai-field">
          <label>First name</label>
          <input id="sai-first" type="text" placeholder="e.g., Alex" value="${escapeHtml(prefs.firstName)}"/>
        </div>
        <div class="sai-field">
          <label>Last name</label>
          <input id="sai-last" type="text" placeholder="e.g., Chen" value="${escapeHtml(prefs.lastName)}"/>
        </div>
      </div>

      <div class="sai-row">
        <div class="sai-field">
          <label>Response cooldown (sec)</label>
          <input id="sai-cooldown" type="number" min="1" step="1" value="${Number(prefs.cooldownSec) || 20}"/>
        </div>
        <div class="sai-hint">
          Replies only when enabled and both names are filled.
        </div>
      </div>

      <div id="sai-status" class="sai-status">Idle</div>
    </div>
  `;

  // Attach CSS from the extension's bundled CSS file
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = chrome.runtime.getURL("src/content/ui.css");
  shadow.appendChild(link);
  shadow.appendChild(wrapper);

  // Wire inputs
  const first = shadow.getElementById("sai-first");
  const last = shadow.getElementById("sai-last");
  const cooldown = shadow.getElementById("sai-cooldown");
  const enabled = shadow.getElementById("sai-enabled");
  const statusEl = shadow.getElementById("sai-status");

  const persist = async () => {
    await setUserPrefs({
      firstName: first.value.trim(),
      lastName: last.value.trim(),
      cooldownSec: Math.max(1, Number(cooldown.value) || 20),
      enabled: enabled.checked
    });
  };

  [first, last, cooldown, enabled].forEach(el => {
    el.addEventListener("change", () => {
      persist();
      setStatus(statusEl, "Settings saved.");
    });
    el.addEventListener("input", () => {
      // live feedback, don’t spam storage
      setStatus(statusEl, "Editing…");
    });
  });
}

function setStatus(statusEl, text, type = "info") {
  statusEl.textContent = text;
  statusEl.dataset.type = type; // style via [data-type]
}

/** ----- Chat observation & reply loop ----- */

let mutationObserver;
let lastSeenMessageId = null;
let isSending = false;

// Heuristic: pick the chat root; Steam may update DOM; we keep flexible
async function waitForChatRoot(timeoutMs = 15000) {
  const start = performance.now();
  while (performance.now() - start < timeoutMs) {
    const root = document.querySelector(steamSelectors.chatRoot);
    if (root) return root;
    await sleep(300);
  }
  throw new Error("chat root not found");
}

function setupChatObserver(root) {
  mutationObserver = new MutationObserver(async () => {
    try {
      await maybeReply(root);
    } catch (e) {
      console.warn("maybeReply error:", e);
    }
  });

  mutationObserver.observe(root, { childList: true, subtree: true });
  // Initial check
  maybeReply(root).catch(() => {});
}

async function maybeReply(root) {
  if (isSending) return;

  try {
    // Load preferences once
    const prefs = await getUserPrefs();
    window.__steamPrefs = prefs; // cache globally for isSelfSpeaker

    // Only run if enabled and names are present
    if (!prefs.enabled || !prefs.firstName?.trim()) {
      console.log("[Steam AI] Disabled or missing name(s).");
      return;
    }

    // Extract messages from DOM
    const messages = extractMessages(root);
    if (!messages.length) return;

    const last = messages[messages.length - 1];

    // Skip if it's our own message or same as last processed
    if (last.author === "self" || last.id === lastSeenMessageId) {
      return;
    }
    lastSeenMessageId = last.id;

    // Build system persona & normalized history for OpenAI
    const systemPersona =
      `Your display identity is: ${prefs.firstName} ${prefs.lastName}. ` +
      `You are chatting inside Steam. Keep friendly, brief, and useful.`;

    const openAiHistory = normalizeHistory(messages, { maxEntries: 20 });

    isSending = true;

    const resp = await requestAIReply({
      tabId: getTabKey(),
      cooldownMs: (Number(prefs.cooldownSec) || 20) * 1000,
      systemPersona,
      chatHistory: openAiHistory
    });

    console.log("[Steam AI] Background response:", resp);

    if (!resp?.ok) {
      console.warn("[Steam AI] AI reply error:", resp?.error || "Unknown error");
      return;
    }

    const reply = resp.replyText;
    console.log("[Steam AI] Reply ready, sending:", reply);

    await sendMessageIntoChat(root, reply);

    console.log("[Steam AI] Reply sent. Cooldown active.");
  } catch (err) {
    console.error("[Steam AI] maybeReply error:", err);
  } finally {
    isSending = false;
  }
}

/** ----- DOM helpers ----- */

// Try to extract messages from Steam chat. We keep selectors soft + robust.
function extractMessages(root) {
  const items = [...root.querySelectorAll(steamSelectors.messageItem)];
  return items
    .map((el, idx) => {
      const speaker = el.querySelector(steamSelectors.speakerName)?.textContent?.trim() || "Unknown";
      const text = el.querySelector(steamSelectors.messageText)?.textContent?.trim() || "";
      const id = el.getAttribute("data-msgid") || `${idx}-${speaker}-${text.slice(0, 18)}`;

      const author = isSelfSpeaker(speaker) ? "self" : "other";
      return { id, author, text, speaker };
    })
    .filter(m => m.text);
}

function isSelfSpeaker(speaker) {
  if (!speaker) return false;

  const lower = speaker.toLowerCase();

  // Case 1: Steam marks own name with "(You)"
  if (lower.includes("(you)")) return true;

  // Case 2: Exact match against stored name
  const prefs = window.__steamPrefs;
  if (prefs) {
    const fullName = `${prefs.firstName} ${prefs.lastName}`.trim().toLowerCase();
    if (lower === fullName) return true;
    if (lower.startsWith(fullName + " ")) return true;  // handles "John Doe (You)"
  }

  return false;
}

async function sendMessageIntoChat(root, text) {
  // Find the input area (Steam uses a contenteditable div in many skins; we’ll try multiple)
  const input = root.querySelector(steamSelectors.inputEditable);

  if (!input) throw new Error("Chat input not found.");

  // Focus the input
  input.focus();

  // If contenteditable:
  if (input.isContentEditable) {
    // Clear and insert text
    setContentEditableText(input, text);
    dispatchEnter(input);
    return;
  }

  // If <textarea> or <input>
  if ("value" in input) {
    input.value = text;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    dispatchEnter(input);
    return;
  }

  throw new Error("Unsupported input element for sending.");
}

function setContentEditableText(el, text) {
  // Replace the content with a single text node
  el.innerHTML = "";
  el.appendChild(document.createTextNode(text));
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

function dispatchEnter(el) {
  const ev = new KeyboardEvent("keydown", {
    key: "Enter",
    code: "Enter",
    keyCode: 13,
    which: 13,
    bubbles: true,
    cancelable: true
  });
  el.dispatchEvent(ev);
}

function getTabKey() {
  // Using tabId is ideal, but content scripts don’t have it. We create a stable key per page.
  return `${location.hostname}${location.pathname}`;
}

function getStatusEl() {
  const host = document.getElementById("steam-ai-floating-host");
  const status = host?.shadowRoot?.querySelector("#sai-status");
  return status;
}

/** ----- Small utils ----- */

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function escapeHtml(s = "") {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
