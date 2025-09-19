export function normalizeHistory(messages, { maxEntries = 20 } = {}) {
  const slice = messages.slice(-maxEntries);
  return slice.map(m => {
    let role;
    if (m.author === "self") {
      role = "assistant";   // our bot’s past replies
    } else {
      role = "user";        // the human speaker
    }
    return {
      role,
      content: m.text
    };
  });
}
