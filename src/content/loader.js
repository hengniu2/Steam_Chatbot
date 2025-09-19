console.log("[Steam AI] loader injected");   // add this line at the top

(async () => {
  try {
    const url = chrome.runtime.getURL("src/content/contentScript.js");
    const mod = await import(url);
    if (mod && typeof mod.start === "function") {
      mod.start();
    } else {
      console.error("[Steam AI] contentScript.js missing exported start()");
    }
  } catch (err) {
    console.error("[Steam AI] loader failed:", err);
  }
})();
