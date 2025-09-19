# Steam AI Chatbot (Chrome Extension)

A logically rich, cooldown-aware chatbot that auto-replies on **steamcommunity.com/chat** with a clean floating UI.

## Features
- Works **only** on `https://steamcommunity.com/chat`
- Floating UI with **First name**, **Last name**, **Cooldown** (seconds), and **Enable**
- Parses chat history to build smart, concise replies via OpenAI
- Cooldown per tab (prevents spam)
- API key stored in Chrome Sync Storage via Options page

## Install (Developer Mode)
1. `chrome://extensions`
2. Toggle **Developer mode** (top-right)
3. Click **Load unpacked** and select this folder
4. Go to **Options** and paste your *OpenAI API key*
5. Open `https://steamcommunity.com/chat` → control panel appears bottom-right

## Notes
- DOM selectors are centralized in `src/content/domSelectors.js`. If Steam updates layout, you only tweak that file.
- The OpenAI model is `gpt-4o-mini` by default. Change in `src/common/openai.js`.
- For streaming or tools, extend `background/service-worker.js` + `common/openai.js`.
- For per-conversation memory, persist to `chrome.storage` keyed by thread id.

## Security
- API key **never** injected into page context; only the background worker calls OpenAI.
- Do not hardcode your key; always set via **Options**.

## Extensibility Ideas
- Add a small “builder” UI to write custom system prompts
- Add keyword-based triggers or per-friend rules
- Multi-language auto-detect
- Sentiment-aware responses
- Streaming token-by-token typing animations
