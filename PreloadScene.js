// PreloadScene.js — loads all assets before game starts
export default class PreloadScene extends Phaser.Scene {
  constructor() { super("PreloadScene"); }

  preload() {
    const bar  = document.getElementById("loading-bar");
    const text = document.getElementById("loading-text");
    const screen = document.getElementById("loading-screen");
    screen.style.display = "flex";

    this.load.on("progress", (v) => {
      if (bar)  bar.style.width  = Math.round(v * 100) + "%";
      if (text) text.textContent = `Loading... ${Math.round(v * 100)}%`;
    });
    this.load.on("complete", () => {
      if (screen) screen.style.display = "none";
    });

    const BASE = "/assets/";

    // ── Backgrounds ─────────────────────────────────────────────
    // Download from: https://www.spriters-resource.com/pc_computer/plantsvszombies/
    // Day, Night, Pool, Fog, Roof backgrounds
    this.load.image("bg_day",   BASE + "bg_day.jpg");
    this.load.image("bg_night", BASE + "bg_night.jpg");   // place in /assets/
    this.load.image("bg_pool",  BASE + "bg_pool.jpg");
    this.load.image("bg_fog",   BASE + "bg_fog.jpg");
    this.load.image("bg_roof",  BASE + "bg_roof.jpg");

    // Fallback to day if others missing
    ["bg_night","bg_pool","bg_fog","bg_roof"].forEach(k => {
      if (!this.textures.exists(k)) this.load.image(k, BASE + "bg_day.jpg");
    });

    // ── UI Elements ──────────────────────────────────────────────
    this.load.image("sun_icon",     BASE + "ui_sun.png");       // yellow sun coin
    this.load.image("seed_packet",  BASE + "ui_seed_packet.png"); // seed packet bg
    this.load.image("lawn_mower",   BASE + "lawnmower.png");
    this.load.image("house",        BASE + "house.png");

    // ── Plants (single images — user provided) ────────────────────
    this.load.image("plant_peashooter",  BASE + "plant_peashooter.png");
    this.load.image("plant_sunflower",   BASE + "plant_sunflower.png");
    this.load.image("plant_wallnut",     BASE + "plant_wallnut.png");

    // ── Plant spritesheets ────────────────────────────────────────
    // Download from: https://www.spriters-resource.com/pc_computer/plantsvszombies/
    // Each sheet: frameWidth=70, frameHeight=70 typically (vary per plant)
    // Using single images as fallback, replace with spritesheets for animation
    const plantSheets = [
      ["plant_cherrybomb",  71,  71, 7],
      ["plant_snowpea",     70,  70, 7],
      ["plant_chomper",     70,  70, 10],
      ["plant_repeater",    70,  70, 7],
      ["plant_potatomine",  70,  70, 9],
      ["plant_iceshroom",   70,  70, 7],
      ["plant_squash",      70,  70, 6],
      ["plant_tallnut",     70,  70, 3],
      ["plant_threepeater", 70,  70, 7],
      ["plant_puffshroom",  70,  70, 6],
    ];
    plantSheets.forEach(([key, fw, fh]) => {
      // Load single image as fallback — replace path with real spritesheet
      this.load.image(key, BASE + key + ".png");
    });

    // ── Zombie spritesheets ───────────────────────────────────────
    // Download from: https://www.spriters-resource.com/pc_computer/plantsvszombies/
    // Regular Zombies sheet has walk (8 frames), attack (4), die (5) animations
    this.load.image("zombie_regular",    BASE + "zombie_regular.png");
    this.load.image("zombie_cone",       BASE + "zombie_cone.png");
    this.load.image("zombie_bucket",     BASE + "zombie_bucket.png");   // add to /assets
    this.load.image("zombie_flag",       BASE + "zombie_flag.png");
    this.load.image("zombie_newspaper",  BASE + "zombie_newspaper.png");
    this.load.image("zombie_football",   BASE + "zombie_football.png");
    this.load.image("zombie_polevault",  BASE + "zombie_polevault.png");
    this.load.image("zombie_gargantuar", BASE + "zombie_gargantuar.png");
    this.load.image("zombie_imp",        BASE + "zombie_imp.png");

    // ── Projectiles ───────────────────────────────────────────────
    this.load.image("proj_pea",     BASE + "projectile_pea.png");
    this.load.image("proj_snowpea", BASE + "projectile_snowpea.png");
    this.load.image("proj_fire",    BASE + "projectile_fire.png");

    // ── Effects ───────────────────────────────────────────────────
    this.load.image("fx_explode",   BASE + "fx_explosion.png");
    this.load.image("fx_freeze",    BASE + "fx_freeze.png");
    this.load.image("fx_sun",       BASE + "fx_sun.png");

    // ── Music ─────────────────────────────────────────────────────
    // Download official PvZ OST tracks (ogg format works best)
    // From: https://pvz.fandom.com/wiki/Plants_vs._Zombies_Original_Soundtrack
    this.load.audio("music_menu",        BASE + "music_grasswalk.ogg");
    this.load.audio("music_grasswalk",   BASE + "music_grasswalk.ogg");  // Day levels
    this.load.audio("music_moongrains",  BASE + "music_moongrains.ogg"); // Night levels
    this.load.audio("music_watery_graves",BASE+"music_watery_graves.ogg"); // Pool
    this.load.audio("music_cerebrawl",   BASE + "music_cerebrawl.ogg");  // Fog/Roof
    this.load.audio("sfx_zombie_groan",  BASE + "sfx_groan.ogg");
    this.load.audio("sfx_pea_hit",       BASE + "sfx_splat.ogg");
    this.load.audio("sfx_plant",         BASE + "sfx_plant.ogg");
    this.load.audio("sfx_sun_collect",   BASE + "sfx_coin.ogg");
    this.load.audio("sfx_lawnmower",     BASE + "sfx_lawnmower.ogg");
    this.load.audio("sfx_explosion",     BASE + "sfx_boom.ogg");
    this.load.audio("sfx_freeze",        BASE + "sfx_freeze.ogg");
    this.load.audio("sfx_level_complete",BASE + "sfx_complete.ogg");
  }

  create() {
    // Create placeholder textures for any missing assets
    this._createFallbacks();
    this.scene.start("MenuScene");
  }

  _createFallbacks() {
    // Generate simple colored rectangle textures for any sprite not found
    const plantColors = {
      plant_cherrybomb:  0xFF2222, plant_snowpea:    0x64C8E6,
      plant_chomper:     0xA030C0, plant_repeater:   0x20A028,
      plant_potatomine:  0xA07828, plant_iceshroom:  0x8CDCFF,
      plant_squash:      0x3CB43C, plant_tallnut:    0xB07828,
      plant_threepeater: 0x14C828, plant_puffshroom: 0x507890,
    };
    Object.entries(plantColors).forEach(([key, color]) => {
      if (!this.textures.exists(key)) {
        const g = this.make.graphics({x:0,y:0,add:false});
        g.fillStyle(color); g.fillRoundedRect(0,0,60,60,8);
        g.generateTexture(key, 60, 60); g.destroy();
      }
    });

    const zombieColors = {
      zombie_bucket:0x9090AA, zombie_flag:0xBEC8A8, zombie_newspaper:0xC8C3AF,
      zombie_football:0x9C7040, zombie_polevault:0xB0B0A0,
      zombie_gargantuar:0x60563C, zombie_imp:0xB07860,
    };
    Object.entries(zombieColors).forEach(([key, color]) => {
      if (!this.textures.exists(key)) {
        const g = this.make.graphics({x:0,y:0,add:false});
        g.fillStyle(color); g.fillRect(0,0,60,100);
        g.generateTexture(key, 60, 100); g.destroy();
      }
    });

    // Projectile fallbacks
    const projColors = { proj_pea:0x50C850, proj_snowpea:0x96E8FF, proj_fire:0xFF7814 };
    Object.entries(projColors).forEach(([key, color]) => {
      if (!this.textures.exists(key)) {
        const g = this.make.graphics({x:0,y:0,add:false});
        g.fillStyle(color); g.fillCircle(8,8,8);
        g.generateTexture(key, 16, 16); g.destroy();
      }
    });

    // Sun fallback
    if (!this.textures.exists("fx_sun")) {
      const g = this.make.graphics({x:0,y:0,add:false});
      g.fillStyle(0xFFD800); g.fillCircle(20,20,20);
      g.generateTexture("fx_sun", 40, 40); g.destroy();
    }

    // Background fallbacks
    const bgColors = { bg_night:0x0A0A2E, bg_pool:0x3C8C8C, bg_fog:0x7C8C96, bg_roof:0xC07832 };
    Object.entries(bgColors).forEach(([key, color]) => {
      if (!this.textures.exists(key)) {
        const g = this.make.graphics({x:0,y:0,add:false});
        g.fillStyle(color); g.fillRect(0,0,900,600);
        g.generateTexture(key, 900, 600); g.destroy();
      }
    });

    // House fallback
    if (!this.textures.exists("house")) {
      const g = this.make.graphics({x:0,y:0,add:false});
      g.fillStyle(0xE8D0A0); g.fillRect(0,20,80,120);
      g.fillStyle(0xC84020); g.fillTriangle(0,20,80,20,40,0);
      g.generateTexture("house", 80, 140); g.destroy();
    }

    // Audio fallbacks (silence buffers)
    const audioKeys = ["music_menu","music_grasswalk","music_moongrains","music_watery_graves",
                       "music_cerebrawl","sfx_zombie_groan","sfx_pea_hit","sfx_plant",
                       "sfx_sun_collect","sfx_lawnmower","sfx_explosion","sfx_freeze","sfx_level_complete"];
    audioKeys.forEach(k => {
      if (!this.cache.audio.exists(k)) {
        // Create silent audio via Web Audio API
        try {
          const ctx = this.sound.context;
          if (ctx) {
            const buf = ctx.createBuffer(1, 44100, 44100);
            this.cache.audio.add(k, buf);
          }
        } catch(_) {}
      }
    });
  }
}
