export async function callOpenAI(apiKey, systemPersona, chatHistory) {
    const messages = [
        {
            role: "system",
            content: 
                `You are a Steam chat companion. Always be helpful, concise, and respectful.
                Persona:\n${systemPersona}\n` +
                `Guidelines:\n` +
                `- Keep replies short but informative (1–3 sentences), unless the user asks for detail.\n` +
                `- Consider the recent chat context and answer directly.\n` +
                `- If asked to wait or respect a cooldown, do so.\n` +
                `- Avoid sensitive content and never reveal secrets or keys.`
        },
        ...chatHistory
    ];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            temperature: 0.7,
            max_tokens: 220,
            messages
        })
    });

    if(!resp.ok) {
        const errText = await resp.text().catch(() => "");
        throw new Error(`OpenAI error ${resp.status}: ${errText || resp.statusText}`);
    }

    const data = await resp.json();
    console.log("data: ", data);
    const reply = data?.choices?.[0]?.message?.content?.trim();
    console.log("reply: ", reply);
    if(!reply) throw new Error("OpenAI returned no content");
    return reply;
}