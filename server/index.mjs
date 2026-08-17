#!/usr/bin/env node
/* ============================================================
   PRESS BOX PROXY
   Minimal local server that holds the Anthropic API key server-side and
   forwards Press Box article requests to it. Exists because fetchArticle()
   used to call api.anthropic.com directly with no key — that only ever
   worked inside the Claude.ai artifact sandbox, which proxied and
   authenticated it transparently. Outside that sandbox the key has to live
   somewhere that isn't the browser (see CLAUDE.md's "What has to change
   for local/non-Claude.ai execution"). This is that somewhere.

   Deliberately dependency-free (plain node:http) to match this project's
   minimal-dependency ethos elsewhere (the test suite uses node:test for
   the same reason). Reads ANTHROPIC_API_KEY from a .env file at the repo
   root if present, then from the real environment — no npm package, no
   reliance on a specific Node CLI flag, works with `node server/index.mjs`
   run directly.

   Usage: npm run server   (or: node server/index.mjs)
   ============================================================ */
import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.join(__dirname, "..", ".env");

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  const lines = readFileSync(filePath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadDotEnv(ENV_PATH);

const PORT = process.env.PRESS_BOX_PROXY_PORT || 8787;
const ANTHROPIC_MODEL = "claude-sonnet-5"; // was "claude-sonnet-4-6" client-side — not a real model ID, fixed here
const MAX_TOKENS = 1000;

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*", // local-only tool; permissive is fine
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

async function handleGenerateArticle(req, res) {
  let raw = "";
  for await (const chunk of req) raw += chunk;

  let prompt;
  try {
    ({ prompt } = JSON.parse(raw));
  } catch {
    sendJson(res, 400, { error: "Request body must be valid JSON" });
    return;
  }
  if (!prompt || typeof prompt !== "string") {
    sendJson(res, 400, { error: "Missing 'prompt' string in request body" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, {
      error: "Server is missing ANTHROPIC_API_KEY. Copy .env.example to .env and add your key, then restart the proxy.",
    });
    return;
  }

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: MAX_TOKENS,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await upstream.json();
    sendJson(res, upstream.status, data);
  } catch (err) {
    sendJson(res, 502, { error: `Couldn't reach api.anthropic.com: ${err.message}` });
  }
}

const server = createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }
  if (req.method === "POST" && req.url === "/api/press-box/article") {
    handleGenerateArticle(req, res);
    return;
  }
  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  const keyStatus = process.env.ANTHROPIC_API_KEY ? "found" : "MISSING — see .env.example";
  console.log(`Press Box proxy listening on http://localhost:${PORT}  (ANTHROPIC_API_KEY: ${keyStatus})`);
});
