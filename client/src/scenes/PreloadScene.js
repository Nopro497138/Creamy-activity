// PreloadScene.js — loads all assets, shows logo loading screen
export default class PreloadScene extends Phaser.Scene {
  constructor() { super("PreloadScene"); }

  preload() {
    const W = this.scale.width, H = this.scale.height;

    // ── Loading screen canvas ─────────────────────────────────────
    this.cameras.main.setBackgroundColor("#000000");

    // Logo centered
    this.logoImg = this.add.image(W/2, H/2 - 60, "__DEFAULT").setAlpha(0);
    this.logoLoaded = false;

    // Progress bar elements
    const barW = 360, barH = 18;
    const barX = W/2 - barW/2, barY = H/2 + 100;

    this.add.rectangle(W/2, barY + barH/2, barW + 6, barH + 6, 0x226600).setOrigin(0.5);
    this.barBg = this.add.rectangle(barX, barY, barW, barH, 0x0a1a00).setOrigin(0);
    this.bar   = this.add.rectangle(barX, barY, 0, barH, 0x78c832).setOrigin(0);
    this.loadTxt = this.add.text(W/2, barY + 36, "Loading...", {
      fontFamily: "Arial", fontSize: "15px", color: "#888888",
    }).setOrigin(0.5);

    // ── Load logo first so we can show it ────────────────────────
    this.load.image("logo",          "/assets/logo.png");
    this.load.image("lvlselect_bg",  "/assets/lvlselect_bg.png");
    this.load.image("bg_day",        "/assets/bg_day.jpg");

    // ── Font ─────────────────────────────────────────────────────
    this.load.font = this.load.font || (() => {});
    // Load via CSS @font-face
    if (!document.querySelector('#pvz-font-style')) {
      const style = document.createElement('style');
      style.id    = 'pvz-font-style';
      style.textContent = `@font-face {
        font-family: 'PoppinsBlack';
        src: url('/assets/Poppins-Black.ttf') format('truetype');
      }`;
      document.head.appendChild(style);
    }

    // ── Backgrounds ───────────────────────────────────────────────
    this.load.image("bg_night",   "/assets/bg_night.jpg");
    this.load.image("bg_pool",    "/assets/bg_pool.jpg");
    this.load.image("bg_fog",     "/assets/bg_fog.jpg");
    this.load.image("bg_roof",    "/assets/bg_roof.jpg");

    // ── Plants — single images OR spritesheets ────────────────────
    // Drop any 70×70 spritesheet as plant_<name>_sheet.png in /assets/
    // Otherwise falls back to plant_<name>.png (single idle frame)
    const plantKeys = [
      "peashooter","sunflower","wallnut","cherrybomb","snowpea",
      "chomper","repeater","potatomine","iceshroom","squash",
      "tallnut","threepeater","puffshroom",
    ];
    plantKeys.forEach(k => {
      this.load.image(`plant_${k}`,  `/assets/plant_${k}.png`);
    });

    // ── Zombies ───────────────────────────────────────────────────
    const zombieKeys = [
      "regular","cone","bucket","flag","newspaper",
      "football","polevault","gargantuar","imp",
    ];
    zombieKeys.forEach(k => {
      this.load.image(`zombie_${k}`, `/assets/zombie_${k}.png`);
    });

    // ── Projectiles ───────────────────────────────────────────────
    this.load.image("proj_pea",      "/assets/projectile_pea.png");
    this.load.image("proj_snowpea",  "/assets/projectile_snowpea.png");
    this.load.image("proj_fire",     "/assets/projectile_fire.png");

    // ── UI ────────────────────────────────────────────────────────
    this.load.image("ui_sun",        "/assets/ui_sun.png");
    this.load.image("ui_seed_bg",    "/assets/ui_seed_bg.png");
    this.load.image("lawnmower",     "/assets/lawnmower.png");
    this.load.image("gravestone",    "/assets/gravestone.png");

    // ── Audio ─────────────────────────────────────────────────────
    this.load.audio("music_menu",         "/assets/music_grasswalk.ogg");
    this.load.audio("music_lvlselect",    "/assets/music_lvlselect.ogg");
    this.load.audio("music_grasswalk",    "/assets/music_grasswalk.ogg");
    this.load.audio("music_moongrains",   "/assets/music_moongrains.ogg");
    this.load.audio("music_watery",       "/assets/music_watery_graves.ogg");
    this.load.audio("music_fog",          "/assets/music_cerebrawl.ogg");
    this.load.audio("music_cerebrawl",    "/assets/music_cerebrawl.ogg");
    this.load.audio("sfx_zombie_groan",   "/assets/sfx_groan.ogg");
    this.load.audio("sfx_pea_hit",        "/assets/sfx_splat.ogg");
    this.load.audio("sfx_plant",          "/assets/sfx_plant.ogg");
    this.load.audio("sfx_sun_collect",    "/assets/sfx_coin.ogg");
    this.load.audio("sfx_lawnmower",      "/assets/sfx_lawnmower.ogg");
    this.load.audio("sfx_explosion",      "/assets/sfx_boom.ogg");
    this.load.audio("sfx_freeze",         "/assets/sfx_freeze.ogg");
    this.load.audio("sfx_level_complete", "/assets/sfx_complete.ogg");
    this.load.audio("sfx_wave_flag",      "/assets/sfx_flag.ogg");

    // ── Progress events ───────────────────────────────────────────
    this.load.on("progress", (v) => {
      const w = Math.round(barW * v);
      if (this.bar) this.bar.width = w;
      if (this.loadTxt) this.loadTxt.setText(`Loading... ${Math.round(v*100)}%`);
    });

    this.load.on("filecomplete-image-logo", () => {
      if (this.logoImg) {
        this.logoImg.setTexture("logo");
        this.logoImg.setDisplaySize(Math.min(W * 0.6, 460), undefined);
        this.logoImg.displayHeight = this.logoImg.displayWidth * (1024/1536);
        this.tweens.add({ targets: this.logoImg, alpha: 1, duration: 600, ease: "Quad.easeIn" });
        this.logoLoaded = true;
      }
    });
  }

  create() {
    // Generate fallback textures for anything that failed to load
    this._buildFallbacks();

    // Small delay so logo fade-in finishes
    this.time.delayedCall(400, () => {
      this.scene.start("MenuScene");
    });
  }

  _buildFallbacks() {
    const colors = {
      plant_cherrybomb:0xFF2222,   plant_snowpea:0x64C8E6,
      plant_chomper:0xA030C0,      plant_repeater:0x20A028,
      plant_potatomine:0xA07828,   plant_iceshroom:0x8CDCFF,
      plant_squash:0x3CB43C,       plant_tallnut:0xB07828,
      plant_threepeater:0x14C828,  plant_puffshroom:0x507890,
    };
    Object.entries(colors).forEach(([k,c]) => this._fallbackImg(k,c,70,90));

    const zc = {
      zombie_bucket:0x9090AA,      zombie_flag:0xBEC8A8,
      zombie_newspaper:0xC8C3AF,   zombie_football:0x9C7040,
      zombie_polevault:0xB0B0A0,   zombie_gargantuar:0x60563C,
      zombie_imp:0xB07860,
    };
    Object.entries(zc).forEach(([k,c]) => this._fallbackImg(k,c,60,110));

    const px = { proj_pea:0x50C850, proj_snowpea:0x96E8FF, proj_fire:0xFF7814 };
    Object.entries(px).forEach(([k,c]) => this._fallbackCircle(k,c,9));

    if (!this.textures.exists("ui_sun"))    this._fallbackCircle("ui_sun",0xFFD800,20);
    if (!this.textures.exists("lawnmower")) this._fallbackImg("lawnmower",0x885522,44,30);
    if (!this.textures.exists("gravestone"))this._fallbackImg("gravestone",0x909090,60,80);
    if (!this.textures.exists("ui_seed_bg"))this._fallbackImg("ui_seed_bg",0x2A5A10,64,80);

    const bgFallbacks = { bg_night:0x0A0A2E, bg_pool:0x3C8C8C, bg_fog:0x7C8C96, bg_roof:0xC07832 };
    Object.entries(bgFallbacks).forEach(([k,c]) => {
      if (!this.textures.exists(k)) this._fallbackImg(k,c,900,600);
    });
  }

  _fallbackImg(key, color, w, h) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({x:0,y:0,add:false});
    g.fillStyle(color,1); g.fillRoundedRect(0,0,w,h,8);
    g.generateTexture(key,w,h); g.destroy();
  }
  _fallbackCircle(key, color, r) {
    if (this.textures.exists(key)) return;
    const g = this.make.graphics({x:0,y:0,add:false});
    g.fillStyle(color,1); g.fillCircle(r,r,r);
    g.generateTexture(key,r*2,r*2); g.destroy();
  }
}
