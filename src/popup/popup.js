import { getUserPrefs, setUserPrefs } from "../common/storage.js";

const el = (id) => document.getElementById(id);
const statusEl = () => el("sai-status");

document.addEventListener("DOMContentLoaded", async () => {
  const prefs = await getUserPrefs();

  el("sai-first").value = prefs.firstName || "";
  el("sai-last").value = prefs.lastName || "";
  el("sai-cooldown").value = prefs.cooldownSec || 20;
  el("sai-enabled").checked = !!prefs.enabled;

  const persist = async () => {
    await setUserPrefs({
      firstName: el("sai-first").value.trim(),
      lastName: el("sai-last").value.trim(),
      cooldownSec: Math.max(1, Number(el("sai-cooldown").value) || 20),
      enabled: el("sai-enabled").checked
    });
    setStatus("Saved.");
  };

  ["sai-first","sai-last","sai-cooldown","sai-enabled"].forEach(id => {
    el(id).addEventListener("change", persist);
    el(id).addEventListener("input", () => setStatus("Editing…"));
  });

  setStatus("Ready.");
});

function setStatus(text) {
  const s = document.getElementById("sai-status");
  if (s) s.textContent = text;
}
