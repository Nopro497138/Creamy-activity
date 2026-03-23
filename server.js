// server.js — Express backend for Discord Activity OAuth token exchange + static serving
"use strict";
require("dotenv").config();
const express = require("express");
const cors    = require("cors");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;

const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

app.use(cors());
app.use(express.json());

// Serve built client files
app.use("/", express.static(path.join(__dirname, "dist")));
// Serve client assets directly in dev (when using vite proxy)
app.use("/assets", express.static(path.join(__dirname, "client", "assets")));

// OAuth token exchange — Discord SDK calls /.proxy/api/token
app.post(["/api/token", "/.proxy/api/token"], async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "Missing code" });

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
      console.error("[OAuth] Token exchange failed:", err);
      return res.status(500).json({ error: "Token exchange failed" });
    }

    const { access_token } = await response.json();
    console.log("[OAuth] Token exchange successful");
    res.json({ access_token });
  } catch (e) {
    console.error("[OAuth] Error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT}`);
  console.log(`[Server] Client ID: ${CLIENT_ID ? CLIENT_ID.slice(0,8)+"..." : "NOT SET"}`);
});
