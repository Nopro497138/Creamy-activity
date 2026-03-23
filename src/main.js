// main.js — Discord Activity entry point
import PreloadScene   from "./scenes/PreloadScene.js";
import MenuScene      from "./scenes/MenuScene.js";
import LevelSelectScene from "./scenes/LevelSelectScene.js";
import GameScene      from "./scenes/GameScene.js";

// ── Discord SDK setup ─────────────────────────────────────────────
let discordSdk = null;
let discordUser = null;

async function initDiscord() {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID || window.__DISCORD_CLIENT_ID__;
  if (!clientId) { console.warn("[Discord] No client ID — running in standalone mode"); return; }

  try {
    // Load Discord SDK dynamically if not on CDN
    if (!window.DiscordSDK) {
      const { DiscordSDK } = await import("https://unpkg.com/@discord/embedded-app-sdk@1.0.0/output/index.js");
      window.DiscordSDK = DiscordSDK;
    }

    discordSdk = new window.DiscordSDK(clientId);
    await discordSdk.ready();
    console.log("[Discord] SDK ready");

    const { code } = await discordSdk.commands.authorize({
      client_id: clientId, response_type: "code", state: "", prompt: "none",
      scope: ["identify", "applications.commands"],
    });

    const resp = await fetch("/.proxy/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const { access_token } = await resp.json();

    const auth = await discordSdk.commands.authenticate({ access_token });
    discordUser = auth.user;
    console.log("[Discord] Authenticated as", discordUser?.username);
  } catch (e) {
    console.warn("[Discord] SDK init failed (standalone mode):", e.message);
  }
}

// ── Phaser game config ────────────────────────────────────────────
const config = {
  type: Phaser.AUTO,
  parent: "pvz-app",
  width: 900,
  height: 600,
  backgroundColor: "#000000",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [PreloadScene, MenuScene, LevelSelectScene, GameScene],
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 0 }, debug: false },
  },
};

// ── Bootstrap ────────────────────────────────────────────────────
async function bootstrap() {
  await initDiscord();

  const game = new Phaser.Game(config);

  // Pass discord user to game registry for display
  game.registry.set("discordUser", discordUser);
  game.registry.set("discordSdk",  discordSdk);

  // Hide loading screen once Phaser is initialised
  document.getElementById("loading-screen").style.display = "none";
}

bootstrap();
