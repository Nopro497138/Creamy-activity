// server.js — Express backend for Discord Activity
"use strict";
require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");
const fs      = require("fs");

const app  = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

app.use(cors());
app.use(express.json());

// ── Static files ──────────────────────────────────────────────────
// Serve built dist/ if it exists, otherwise serve client/ directly (dev fallback)
const distPath   = path.join(__dirname, "dist");
const clientPath = path.join(__dirname, "client");

if (fs.existsSync(distPath)) {
  console.log("[Server] Serving from dist/");
  app.use("/", express.static(distPath));
} else {
  console.log("[Server] dist/ not found — serving client/ directly (dev mode)");
  // Serve assets from client/assets/
  app.use("/assets",  express.static(path.join(clientPath, "assets")));
  // Serve src files (for native ES modules — works in modern browsers)
  app.use("/src",     express.static(path.join(clientPath, "src")));
  // Serve index.html for all routes
  app.get("*", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
}

// Always serve assets (even from dist)
app.use("/assets", express.static(path.join(clientPath, "assets")));

// ── OAuth token exchange ───────────────────────────────────────────
app.post(["/api/token", "/.proxy/api/token"], async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Missing code" });

  if (!CLIENT_ID || !CLIENT_SECRET) {
    // Standalone mode — return empty token so game still loads
    console.warn("[OAuth] No Discord credentials — running in standalone mode");
    return res.json({ access_token: "" });
  }

  try {
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    "authorization_code",
        code,
      }),
    });
    if (!response.ok) {
      const err = await response.text();
      console.error("[OAuth] Failed:", err);
      return res.status(500).json({ error: "Token exchange failed" });
    }
    const { access_token } = await response.json();
    console.log("[OAuth] Token exchange OK");
    res.json({ access_token });
  } catch (e) {
    console.error("[OAuth] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── Health check ──────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok", port: PORT }));

app.listen(PORT, () => {
  console.log(`[Server] Listening on port ${PORT}`);
  console.log(`[Server] dist/ exists: ${fs.existsSync(distPath)}`);
  console.log(`[Server] Discord Client ID: ${CLIENT_ID ? CLIENT_ID.slice(0,10)+"..." : "NOT SET (standalone mode)"}`);
});
