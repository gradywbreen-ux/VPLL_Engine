// Calls the local Press Box proxy (server/index.mjs) instead of
// api.anthropic.com directly — the proxy holds the API key server-side and
// owns the model/max_tokens choice; this just sends the prompt and parses
// the response. See CLAUDE.md's "What has to change for local/non-Claude.ai
// execution". Requires `npm run server` (or `npm run dev:all`) running
// alongside `npm run dev` — without it this throws and the caller's
// existing catch block shows "The presses jammed" in the UI, same as any
// other article-generation failure.
export async function fetchArticle(prompt) {
  const response = await fetch("/api/press-box/article", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error || `Press Box proxy returned ${response.status}`);
  }
  const data = await response.json();
  const text = (data.content || []).filter((i) => i.type === "text").map((i) => i.text).join("");
  const clean = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(clean);
  if (!parsed.headline || !parsed.body) throw new Error("Malformed article");
  return parsed;
}
