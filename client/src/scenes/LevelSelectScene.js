// LevelSelectScene.js — PvZ-style level map selection screen
import { LEVELS } from "../config/levels.js";

export default class LevelSelectScene extends Phaser.Scene {
  constructor() { super("LevelSelectScene"); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    // Progress from registry
    this.unlockedLevels = this.registry.get("unlockedLevels") || [0];
    this.levelStars     = this.registry.get("levelStars")     || {};

    // ── Sky background gradient ────────────────────────────────────
    const gfx = this.add.graphics();
    gfx.fillGradientStyle(0x5AB5E8, 0x5AB5E8, 0xA8D4F0, 0xA8D4F0, 1);
    gfx.fillRect(0, 0, W, H);

    // ── Clouds (animated) ─────────────────────────────────────────
    const cloudData = [[90,60,120,50],[230,40,140,56],[410,75,150,60],[568,48,120,50],[660,80,110,46],[160,110,90,38]];
    cloudData.forEach(([x,y,cw,ch]) => {
      const c = this.add.graphics();
      c.fillStyle(0xFFFFFF, 0.9);
      c.fillEllipse(x, y, cw, ch);
      c.fillEllipse(x - cw*0.38, y+5, cw*0.6, ch*0.7);
      c.fillEllipse(x + cw*0.38, y+5, cw*0.6, ch*0.7);
      this.tweens.add({ targets:c, x: "+=30", duration:Phaser.Math.Between(8000,14000), yoyo:true, repeat:-1, ease:"Sine.easeInOut", delay:Phaser.Math.Between(0,5000) });
    });

    // ── Title ─────────────────────────────────────────────────────
    this.add.text(W/2, 24, "SELECT LEVEL", {
      fontFamily:"'Arial Black', sans-serif", fontSize:"32px",
      fill:"#FFFFFF", stroke:"#003366", strokeThickness:6,
      shadow:{ x:2, y:2, color:"#000", blur:4, fill:true },
    }).setOrigin(0.5, 0);

    // ── Dirt path ─────────────────────────────────────────────────
    const pathGfx = this.add.graphics();
    pathGfx.lineStyle(28, 0xC8A464, 0.7);
    pathGfx.beginPath();
    const nodes = [[90,200],[200,278],[355,195],[510,278],[630,198]];
    pathGfx.moveTo(nodes[0][0], nodes[0][1]);
    nodes.slice(1).forEach(([nx,ny]) => pathGfx.lineTo(nx, ny));
    pathGfx.strokePath();

    // Dashed overlay
    pathGfx.lineStyle(6, 0xE8C87C, 0.5);
    for (let i=0; i<nodes.length-1; i++) {
      const [x1,y1] = nodes[i], [x2,y2] = nodes[i+1];
      const len = Math.hypot(x2-x1,y2-y1), steps = Math.floor(len/22);
      for (let s=0; s<steps; s+=2) {
        const t0=s/steps, t1=Math.min((s+1)/steps,1);
        pathGfx.beginPath();
        pathGfx.moveTo(x1+(x2-x1)*t0, y1+(y2-y1)*t0);
        pathGfx.lineTo(x1+(x2-x1)*t1, y1+(y2-y1)*t1);
        pathGfx.strokePath();
      }
    }

    // ── Level nodes ───────────────────────────────────────────────
    const atmoColors = { day:0xFFD840, night:0x5050C0, pool:0x38A0D0, fog:0x888888, roof:0xD08030 };

    LEVELS.forEach((lvl, i) => {
      const [nx, ny] = nodes[i];
      const locked   = !this.unlockedLevels.includes(i);
      const stars    = this.levelStars[i] || 0;
      const col      = locked ? 0x484848 : (atmoColors[lvl.atmosphere] || 0xFFD840);

      // Node shadow
      const shadow = this.add.ellipse(nx+4, ny+6, 92, 52, 0x000000, 0.3);

      // Node button
      const node = this.add.ellipse(nx, ny, 92, 48, col)
        .setStrokeStyle(3, locked ? 0x3A3A3A : 0xFFFFFF, 1);

      if (locked) {
        // Lock icon text
        this.add.text(nx, ny-10, "🔒", { fontSize:"20px" }).setOrigin(0.5);
        this.add.text(nx, ny+8, `Level ${i+1}`, { fontFamily:"Arial", fontSize:"11px", fill:"#888" }).setOrigin(0.5);
      } else {
        // Level name
        this.add.text(nx, ny-10, lvl.name, { fontFamily:"Arial Black", fontSize:"14px", fill:"#100800", stroke:"rgba(255,255,255,0.5)", strokeThickness:2 }).setOrigin(0.5);
        // Star rating
        const starStr = "★".repeat(stars) + "☆".repeat(3-stars);
        this.add.text(nx, ny+8, starStr, { fontFamily:"Arial", fontSize:"14px", fill: stars>0?"#FFD800":"#666" }).setOrigin(0.5);

        // Bounce animation on unlocked nodes
        this.tweens.add({ targets:node, y: ny-5, duration:1200, yoyo:true, repeat:-1, ease:"Sine.easeInOut", delay:i*200 });

        // Click handler
        node.setInteractive({ useHandCursor:true });
        node.on("pointerover",  () => { node.setScale(1.12); this._showLevelInfo(lvl, nx, ny); });
        node.on("pointerout",   () => { node.setScale(1.0);  this._hideLevelInfo(); });
        node.on("pointerup",    () => this._startLevel(i));
      }
    });

    // ── Info panel (appears on hover) ─────────────────────────────
    this.infoPanel = this.add.container(W/2, 470).setVisible(false);
    const infoBg = this.add.rectangle(0, 0, 480, 80, 0x001A00, 0.92).setStrokeStyle(2, 0x78C832);
    this.infoTitle = this.add.text(-220, -22, "", { fontFamily:"Arial Black", fontSize:"15px", fill:"#78C832" });
    this.infoDesc  = this.add.text(-220, 2,   "", { fontFamily:"Arial", fontSize:"13px", fill:"#FFFFC8" });
    this.infoPanel.add([infoBg, this.infoTitle, this.infoDesc]);

    // ── Back button ───────────────────────────────────────────────
    const back = this.add.text(24, H-32, "◀ Menu", { fontFamily:"Arial Black", fontSize:"16px", fill:"#FFFFFF", stroke:"#000", strokeThickness:4 })
      .setInteractive({ useHandCursor:true });
    back.on("pointerover", () => back.setStyle({ fill:"#FFD800" }));
    back.on("pointerout",  () => back.setStyle({ fill:"#FFFFFF" }));
    back.on("pointerup",   () => this.scene.start("MenuScene"));

    // ── Progress text ─────────────────────────────────────────────
    const totalStars = Object.values(this.levelStars).reduce((s,v)=>s+v,0);
    this.add.text(W-12, H-32, `Total Stars: ${totalStars}/${LEVELS.length*3}`, {
      fontFamily:"Arial", fontSize:"14px", fill:"#FFD800", stroke:"#000", strokeThickness:3,
    }).setOrigin(1,1);
  }

  _showLevelInfo(lvl, nx, ny) {
    this.infoPanel.setVisible(true);
    this.infoTitle.setText(`${lvl.name} — ${lvl.subtitle}  (${lvl.maxWaves} Waves)`);
    this.infoDesc.setText(`Atmosphere: ${lvl.atmosphere.toUpperCase()}   |   Click to play!`);
  }
  _hideLevelInfo() { this.infoPanel.setVisible(false); }

  _startLevel(idx) {
    // Stop menu music
    this.sound.stopAll();
    this.registry.set("currentLevel", idx);
    this.scene.start("GameScene", { levelIndex: idx });
  }
}
