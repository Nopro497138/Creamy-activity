// main.js — Discord Activity bootstrap + Phaser init
import PreloadScene      from "./scenes/PreloadScene.js";
import MenuScene         from "./scenes/MenuScene.js";
import LevelSelectScene  from "./scenes/LevelSelectScene.js";
import GameScene         from "./scenes/GameScene.js";

// ── Load saved progress immediately (before anything else) ─────────
function loadSavedProgress(game) {
  try {
    const raw = localStorage.getItem("pvz_progress");
    if (raw) {
      const d = JSON.parse(raw);
      if (d.levelStars)     game.registry.set("levelStars",     d.levelStars);
      if (d.unlockedLevels) game.registry.set("unlockedLevels", d.unlockedLevels);
      if (d.unlockedPlants) game.registry.set("unlockedPlants", d.unlockedPlants);
    }
  } catch(_){}
}

// ── Discord SDK initialisation ─────────────────────────────────────
async function initDiscord() {
  // Get client ID from env (injected by Vite) or window global set by server
  const clientId =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_DISCORD_CLIENT_ID) ||
    window.__DISCORD_CLIENT_ID__ ||
    null;

  if (!clientId) {
    console.info("[Discord] No client ID — running standalone");
    return null;
  }

  // Try loading the SDK
  let DiscordSDK = window.DiscordSDK;
  if (!DiscordSDK) {
    try {
      const mod = await import("https://unpkg.com/@discord/embedded-app-sdk@1.0.0/output/index.js");
      DiscordSDK = mod.DiscordSDK || mod.default?.DiscordSDK;
    } catch(e) {
      console.warn("[Discord] SDK import failed:", e.message);
      return null;
    }
  }
  if (!DiscordSDK) { console.warn("[Discord] SDK not found"); return null; }

  try {
    const sdk = new DiscordSDK(clientId);

    // Update loading text
    const loadTxt = document.getElementById("loading-text");
    if (loadTxt) loadTxt.textContent = "Connecting to Discord...";

    await sdk.ready();
    console.info("[Discord] SDK ready");

    if (loadTxt) loadTxt.textContent = "Authenticating...";

    const { code } = await sdk.commands.authorize({
      client_id:     clientId,
      response_type: "code",
      state:         "",
      prompt:        "none",
      scope:         ["identify", "applications.commands"],
    });

    const res = await fetch("/.proxy/api/token", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ code }),
    });

    if (!res.ok) { console.warn("[Discord] Token exchange failed:", res.status); return { sdk, user:null }; }
    const { access_token } = await res.json();
    if (!access_token) { console.warn("[Discord] Empty access token"); return { sdk, user:null }; }

    const auth = await sdk.commands.authenticate({ access_token });
    console.info("[Discord] Authenticated as", auth?.user?.username);
    return { sdk, user: auth?.user || null };
  } catch(e) {
    console.warn("[Discord] Init error (standalone mode):", e.message);
    return null;
  }
}

// ── Phaser game config ─────────────────────────────────────────────
const gameConfig = {
  type: Phaser.AUTO,
  parent: "pvz-app",
  width:  900,
  height: 600,
  backgroundColor: "#000000",
  scale: {
    mode:       Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloadScene, MenuScene, LevelSelectScene, GameScene],
  physics: {
    default: "arcade",
    arcade:  { gravity:{ y:0 }, debug:false },
  },
  render: {
    antialias:      true,
    pixelArt:       false,    // NO pixel art mode — prevents blurriness
    roundPixels:    false,
  },
  audio: {
    disableWebAudio: false,
  },
};

// ── Bootstrap ──────────────────────────────────────────────────────
(async () => {
  // Update loading bar progress
  const bar     = document.getElementById("loading-bar");
  const loadTxt = document.getElementById("loading-text");
  if (bar) bar.style.width = "10%";
  if (loadTxt) loadTxt.textContent = "Starting...";

  // Init Discord (non-blocking — game works without it)
  const discord = await initDiscord();

  if (bar) bar.style.width = "30%";

  // Start Phaser
  const game = new Phaser.Game(gameConfig);

  // Load saved progress into registry
  loadSavedProgress(game);

  // Pass Discord info to game registry
  game.registry.set("discordUser", discord?.user || null);
  game.registry.set("discordSdk",  discord?.sdk  || null);

  if (bar) bar.style.width = "60%";
  if (loadTxt) loadTxt.textContent = "Loading assets...";

  // Fallback: hide loading screen after 8s even if assets take long
  setTimeout(() => {
    const ls = document.getElementById("loading-screen");
    if (ls) ls.style.display = "none";
  }, 8000);
})();
