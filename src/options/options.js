import { getApiKey, setApiKey } from "../common/storage.js";

document.addEventListener("DOMContentLoaded", async () => {
  const apiKeyInput = document.getElementById("apiKey");
  const saveBtn = document.getElementById("saveBtn");
  const status = document.getElementById("status");

  // Load saved key
  const savedKey = await getApiKey();
  if (savedKey) {
    apiKeyInput.value = savedKey;
  }

  saveBtn.addEventListener("click", async () => {
    const newKey = apiKeyInput.value.trim();

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving…";

    if (!newKey.startsWith("sk-")) {
      status.textContent = "❌ Please enter a valid OpenAI key.";
      status.style.color = "red";
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
      return;
    }

    await setApiKey(newKey);

    status.textContent = "✅ API key saved!";
    status.style.color = "green";
    saveBtn.textContent = "Saved!";

    setTimeout(() => {
      saveBtn.disabled = false;
      saveBtn.textContent = "Save";
      status.textContent = "";
    }, 1500);
  });
});
