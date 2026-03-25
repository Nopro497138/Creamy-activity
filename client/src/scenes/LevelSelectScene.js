// LevelSelectScene.js — PvZ-style graveyard level select (like the reference image)
import { LEVELS } from "../config/levels.js";

export default class LevelSelectScene extends Phaser.Scene {
  constructor() { super("LevelSelectScene"); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;

    this.unlockedLevels = this.registry.get("unlockedLevels") || [0];
    this.levelStars     = this.registry.get("levelStars") || {};

    // ── Load progress from localStorage ──────────────────────────
    this._loadProgress();

    // ── Background: graveyard scene like reference ─────────────────
    this._buildBackground();

    // ── Title cards at top (like the previews in ref image) ────────
    this._buildPreviewCards();

    // ── Gravestones at bottom ──────────────────────────────────────
    this._buildGravestones();

    // ── Back button ────────────────────────────────────────────────
    const back = this.add.text(60, H - 40, "BACK", {
      fontFamily:"'PoppinsBlack',Arial Black", fontSize:"18px",
      color:"#FFDD44", stroke:"#332200", strokeThickness:5,
    }).setOrigin(0.5).setDepth(20).setInteractive({ useHandCursor:true });
    back.on("pointerover", () => back.setStyle({color:"#FFFFFF"}));
    back.on("pointerout",  () => back.setStyle({color:"#FFDD44"}));
    back.on("pointerup",   () => { this.sound.stopAll(); this.scene.start("MenuScene"); });

    // ── Animate gravestones rising ─────────────────────────────────
    this._animateIn();

    // ── Music ─────────────────────────────────────────────────────
    this.sound.stopAll();
    try { this.sound.add("music_lvlselect",{loop:true,volume:0.5}).play(); } catch(_){}
  }

  _loadProgress() {
    try {
      const saved = JSON.parse(localStorage.getItem("pvz_progress") || "{}");
      if (saved.unlockedLevels) this.registry.set("unlockedLevels", saved.unlockedLevels);
      if (saved.levelStars)     this.registry.set("levelStars",     saved.levelStars);
      if (saved.unlockedPlants) this.registry.set("unlockedPlants", saved.unlockedPlants);
      this.unlockedLevels = this.registry.get("unlockedLevels") || [0];
      this.levelStars     = this.registry.get("levelStars") || {};
    } catch(_){}
  }

  _buildBackground() {
    const W = this.W, H = this.H;

    // Night sky gradient
    const gfx = this.add.graphics().setDepth(0);
    gfx.fillGradientStyle(0x0A0A25,0x0A0A25,0x152235,0x152235,1);
    gfx.fillRect(0,0,W,H);

    // Moon
    const moon = this.add.circle(W * 0.78, 80, 48, 0xF5E8C0, 1).setDepth(1);
    this.add.circle(W * 0.78 + 14, 72, 42, 0x152235, 1).setDepth(2); // crescent cut

    // Stars
    for (let i=0;i<60;i++){
      const s = this.add.circle(
        Phaser.Math.Between(0,W), Phaser.Math.Between(0,H*0.6),
        Phaser.Math.Between(1,2), 0xFFFFFF, Phaser.Math.FloatBetween(0.3,1)
      ).setDepth(1);
      this.tweens.add({targets:s,alpha:Phaser.Math.FloatBetween(0.1,0.4),duration:Phaser.Math.Between(800,2500),yoyo:true,repeat:-1,delay:Phaser.Math.Between(0,3000)});
    }

    // Stone wall (like reference)
    const wallY = H * 0.52;
    gfx.fillStyle(0x4A4A4A,1);
    gfx.fillRect(0, wallY, W, H - wallY);
    // Stone bricks
    gfx.lineStyle(1.5, 0x333333, 0.6);
    for (let y2 = wallY; y2 < H; y2 += 30) {
      for (let x2 = (Math.floor((y2-wallY)/30)%2)*40; x2 < W; x2 += 80) {
        gfx.strokeRect(x2, y2, 80, 30);
      }
    }

    // Ground / grass
    gfx.fillStyle(0x226622,1);
    gfx.fillRect(0, wallY - 22, W, 24);
    // Grass tufts
    for (let x2=10;x2<W;x2+=22){
      const h2=Phaser.Math.Between(8,16);
      gfx.fillStyle(0x2E8C2E,1);
      gfx.fillTriangle(x2,wallY-22,x2+8,wallY-22-h2,x2+16,wallY-22);
    }

    // Flowers
    const flowerPositions = [50,130,220,340,460,580,700,800];
    flowerPositions.forEach(fx => {
      const fy = wallY - 16;
      gfx.fillStyle(0xFF88CC,1); gfx.fillCircle(fx,fy,5);
      gfx.fillStyle(0xFF3399,1); gfx.fillCircle(fx,fy,3);
    });

    // Big zombie tree (left side, like reference)
    gfx.fillStyle(0x2A1A0A,1);
    gfx.fillRect(18, 80, 32, wallY - 80);
    // Branches
    gfx.fillStyle(0x2A1A0A,1);
    gfx.fillRect(50, 140, 60, 14);
    gfx.fillRect(0,  200, 40, 12);
    // Leaves
    gfx.fillStyle(0x1A3A0A,0.8);
    gfx.fillEllipse(34, 90, 80, 70);
    gfx.fillEllipse(80, 150, 60, 50);
    gfx.fillEllipse(0,  180, 60, 50);
  }

  _buildPreviewCards() {
    const W = this.W, H = this.H;
    const cardW = 110, cardH = 90;
    const totalW = LEVELS.length * (cardW + 14) - 14;
    const startX = W/2 - totalW/2 + cardW/2;
    const cardY  = 60;

    this.previewCards = [];

    LEVELS.forEach((lvl, i) => {
      const cx = startX + i * (cardW + 14);
      const locked = !this.unlockedLevels.includes(i);

      const C = this.add.container(cx, cardY).setDepth(10).setAlpha(0).setScale(0.6);

      // Card frame (stone-like border)
      const frame = this.add.rectangle(0,0,cardW,cardH,locked?0x2A2A2A:0x3A3A3A)
        .setStrokeStyle(3, locked?0x555555:0x78C832, 1);

      // Mini background preview
      const miniKey = lvl.bgKey;
      let miniBg;
      if (this.textures.exists(miniKey)) {
        miniBg = this.add.image(0,-8,miniKey).setDisplaySize(cardW-6,cardH-24);
      } else {
        miniBg = this.add.rectangle(0,-8,cardW-6,cardH-24,0x1A3A1A);
      }

      // Label
      const label = this.add.text(0, cardH/2-14, lvl.name, {
        fontFamily:"'PoppinsBlack',Arial Black", fontSize:"11px",
        color: locked?"#666666":"#FFFF88",
        stroke:"#000000", strokeThickness:3,
      }).setOrigin(0.5);

      // Stars
      const stars = this.levelStars[i] || 0;
      const starTxt = this.add.text(0, cardH/2 - 2, "* ".repeat(stars) + "- ".repeat(3-stars), {
        fontFamily:"Arial", fontSize:"11px",
        color: stars>0?"#FFD800":"#555555",
      }).setOrigin(0.5);

      // Lock overlay
      let lockIcon;
      if (locked) {
        lockIcon = this.add.rectangle(0,0,cardW-6,cardH-6,0x000000,0.6);
        this.add.text(0,-4,"LOCKED",{fontFamily:"'PoppinsBlack',Arial Black",fontSize:"14px",color:"#888888",stroke:"#000",strokeThickness:3}).setOrigin(0.5);
      }

      const parts = [frame, miniBg, label, starTxt];
      if (lockIcon) parts.push(lockIcon);
      C.add(parts);

      if (!locked) {
        frame.setInteractive({ useHandCursor:true });
        frame.on("pointerover", () => {
          this.tweens.add({targets:C, scaleX:1.08,scaleY:1.08,y:cardY-6,duration:100});
          frame.setStrokeStyle(3,0xFFFFFF,1);
        });
        frame.on("pointerout", () => {
          this.tweens.add({targets:C, scaleX:1,scaleY:1,y:cardY,duration:100});
          frame.setStrokeStyle(3,0x78C832,1);
        });
        frame.on("pointerup", () => this._startLevel(i));
      }

      this.previewCards.push(C);
    });
  }

  _buildGravestones() {
    const W = this.W, H = this.H;
    const wallY = H * 0.52;
    const stoneY = wallY + 30;
    const stoneW = 90, stoneH = 80;

    const names = LEVELS.map(l => l.name.split(" ")[0].toUpperCase()); // DAY, NIGHT, etc

    const spacing = W / (LEVELS.length + 1);
    this.stones = [];

    LEVELS.forEach((lvl, i) => {
      const locked = !this.unlockedLevels.includes(i);
      const sx = spacing * (i + 1);
      const C  = this.add.container(sx, stoneY + stoneH).setDepth(15).setAlpha(0);

      const gfx = this.add.graphics();
      // Gravestone shape
      gfx.fillStyle(locked ? 0x555555 : 0x888888, 1);
      // Main rect
      gfx.fillRoundedRect(-stoneW/2, -stoneH/2, stoneW, stoneH, { tl:stoneW/2,tr:stoneW/2,bl:4,br:4 });
      // Stone details
      gfx.lineStyle(2, locked?0x3A3A3A:0x666666, 0.8);
      gfx.strokeRoundedRect(-stoneW/2,-stoneH/2,stoneW,stoneH,{tl:stoneW/2,tr:stoneW/2,bl:4,br:4});
      // Cracks
      if (!locked) {
        gfx.lineStyle(1,0x666666,0.5);
        gfx.lineBetween(-10,-20,-6,10); gfx.lineBetween(8,-15,12,5);
      }

      const nameTxt = this.add.text(0, -8, names[i], {
        fontFamily:"'PoppinsBlack',Arial Black", fontSize:"16px",
        color: locked?"#666666":"#FFFF44",
        stroke:"#000000", strokeThickness:4,
      }).setOrigin(0.5);

      const wavesTxt = this.add.text(0, 14, locked?"???":`${lvl.maxWaves} waves`, {
        fontFamily:"Arial", fontSize:"11px",
        color: locked?"#555":"#AAAAAA",
      }).setOrigin(0.5);

      const parts = [gfx, nameTxt, wavesTxt];

      if (!locked) {
        // Star rating below gravestone
        const stars = this.levelStars[i] || 0;
        const starGfx = this.add.text(0, 36, "* ".repeat(stars)+"- ".repeat(3-stars), {
          fontFamily:"Arial", fontSize:"14px",
          color:stars>0?"#FFD800":"#555",
        }).setOrigin(0.5);
        parts.push(starGfx);

        gfx.setInteractive({ useHandCursor:true });
        gfx.on("pointerover", () => {
          this.tweens.add({targets:C,y:stoneY+stoneH-12,duration:120});
          nameTxt.setStyle({color:"#FFFFFF"});
        });
        gfx.on("pointerout", () => {
          this.tweens.add({targets:C,y:stoneY+stoneH,duration:120});
          nameTxt.setStyle({color:"#FFFF44"});
        });
        gfx.on("pointerup", () => this._startLevel(i));
      }

      C.add(parts);
      this.stones.push(C);
    });
  }

  _animateIn() {
    // Cards drop in from top
    this.previewCards.forEach((C, i) => {
      C.y -= 30;
      this.tweens.add({
        targets:C, y:C.y+30, alpha:1, scaleX:1, scaleY:1,
        duration:500, ease:"Back.easeOut", delay: 100 + i*80,
      });
    });
    // Gravestones rise from ground
    this.stones.forEach((C, i) => {
      this.tweens.add({
        targets:C, y:C.y - (this.H*0.52 + 30 + 80), alpha:1,
        duration:700, ease:"Back.easeOut", delay: 300 + i*100,
      });
    });
  }

  _startLevel(idx) {
    this.sound.stopAll();
    this.registry.set("currentLevel", idx);
    // Quick zoom-in transition
    this.cameras.main.zoomTo(1.12, 300, "Linear", true, (cam, progress) => {
      if (progress === 1) {
        this.cameras.main.fade(200, 0, 0, 0, true, (c,p) => {
          if (p===1) this.scene.start("GameScene", { levelIndex:idx });
        });
      }
    });
  }
}
