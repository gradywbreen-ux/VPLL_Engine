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
const MAX_BODY_BYTES = 64 * 1024; // article prompts are natural-language text, not large payloads

// This proxy holds a real Anthropic API key — CORS has to actually restrict who can call it,
// not just document an assumption. "Access-Control-Allow-Origin: *" would let ANY webpage open
// in the same browser silently call this proxy (and read the response) while it's running,
// spending the developer's own API credits on attacker-controlled prompts — a real CSRF-style
// abuse path, not a theoretical one, since a local dev server is a same-machine, no-auth target.
// Only ever reflect back an Origin that's actually loopback (any port — the Vite dev port isn't
// fixed), never "*"; a request from anywhere else gets no CORS header at all, so the browser
// blocks the page from reading the response even if the request itself reaches the server.
const LOOPBACK_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function corsHeaders(req) {
  const origin = req.headers.origin;
  const headers = { "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
  if (origin && LOOPBACK_ORIGIN.test(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function sendJson(req, res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json", ...corsHeaders(req) });
  res.end(JSON.stringify(body));
}

async function handleGenerateArticle(req, res) {
  let raw = "";
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > MAX_BODY_BYTES) {
      sendJson(req, res, 413, { error: "Request body too large" });
      req.destroy();
      return;
    }
  }

  let prompt;
  try {
    ({ prompt } = JSON.parse(raw));
  } catch {
    sendJson(req, res, 400, { error: "Request body must be valid JSON" });
    return;
  }
  if (!prompt || typeof prompt !== "string") {
    sendJson(req, res, 400, { error: "Missing 'prompt' string in request body" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    sendJson(req, res, 500, {
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
    sendJson(req, res, upstream.status, data);
  } catch (err) {
    sendJson(req, res, 502, { error: `Couldn't reach api.anthropic.com: ${err.message}` });
  }
}

const server = createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(req));
    res.end();
    return;
  }
  if (req.method === "POST" && req.url === "/api/press-box/article") {
    handleGenerateArticle(req, res);
    return;
  }
  sendJson(req, res, 404, { error: "Not found" });
});

// Explicit loopback bind — Node's default (no host argument) listens on every network
// interface, which would make this API-key-backed proxy reachable from other devices on
// the same network (or, in a misconfigured/firewalled environment, further than that),
// not just this machine, despite every log line and doc comment here describing it as
// "local-only."
server.listen(PORT, "127.0.0.1", () => {
  const keyStatus = process.env.ANTHROPIC_API_KEY ? "found" : "MISSING — see .env.example";
  console.log(`Press Box proxy listening on http://localhost:${PORT}  (ANTHROPIC_API_KEY: ${keyStatus})`);
});
