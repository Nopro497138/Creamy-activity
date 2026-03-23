// GameScene.js — Main PvZ gameplay
import { PLANTS, LEVEL_PLANTS } from "../config/plants.js";
import { ZOMBIES } from "../config/zombies.js";
import { LEVELS }  from "../config/levels.js";

// Grid constants
const GRID_COLS   = 9;
const GRID_ROWS   = 5;
const CELL_W      = 76;
const CELL_H      = 84;
const GRID_X      = 130; // left edge of grid
const GRID_Y      = 94;  // top edge of grid
const UI_TOP_H    = 84;  // top bar height
const SEED_BAR_H  = 90;  // bottom seed bar height

export default class GameScene extends Phaser.Scene {
  constructor() { super("GameScene"); }

  // ──────────────────────────────────────────────────────────────
  init(data) {
    this.levelIndex   = data?.levelIndex ?? 0;
    this.levelData    = LEVELS[this.levelIndex];

    // Game state
    this.sun          = this.levelData.startSun;
    this.wave         = 0;
    this.waveQueue    = [];
    this.waveActive   = false;
    this.tick         = 0;
    this.houseHp      = 100;
    this.maxHouseHp   = 100;
    this.selectedPlant= null;
    this.phase        = "playing"; // playing | wave_clear | gameover | victory

    // Entity arrays
    this.plants      = [];  // { col, row, type, hp, maxHp, nextShoot, data, sprite, hpBar }
    this.zombies     = [];  // { id, type, x, row, hp, maxHp, speed, frozen, sprite, hpBar, state, anim }
    this.projectiles = [];  // { type, x, y, row, dmg, slow, sprite }
    this.sunOrbs     = [];  // falling sun objects
    this.particles   = [];  // visual effects

    this.nextZombieId = 0;

    // Lawnmowers (one per row)
    this.lawnmowers  = Array.from({ length: GRID_ROWS }, (_, r) => ({
      row: r, active: true, used: false, x: GRID_X - 40,
    }));

    // Available plants for this level
    this.availablePlants = [...(LEVEL_PLANTS[this.levelIndex] || LEVEL_PLANTS[0])];
    this.selectedSeed    = null; // currently chosen seed type
  }

  // ──────────────────────────────────────────────────────────────
  create() {
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;

    // ── Background ────────────────────────────────────────────────
    this.bgImage = this.add.image(W/2, H/2, this.levelData.bgKey)
      .setDisplaySize(W, H).setDepth(0);

    // ── Grid overlay ──────────────────────────────────────────────
    this.gridGfx = this.add.graphics().setDepth(1);
    this._drawGrid();

    // ── UI elements ───────────────────────────────────────────────
    this._createTopBar();
    this._createSeedBar();

    // ── House ─────────────────────────────────────────────────────
    this.houseSprite = this.add.image(GRID_X - 70, GRID_Y + GRID_ROWS*CELL_H/2 - 20, "house")
      .setDisplaySize(110, 180).setDepth(5);

    // ── Lawnmowers ────────────────────────────────────────────────
    this.lawnmowerSprites = this.lawnmowers.map(lm => {
      const img = this.add.image(lm.x, GRID_Y + lm.row*CELL_H + CELL_H/2, "lawn_mower")
        .setDisplaySize(44, 44).setDepth(6).setVisible(true);
      return img;
    });

    // ── Click on grid to place plant ─────────────────────────────
    this.input.on("pointerup", (ptr) => this._handleClick(ptr));

    // ── Music ─────────────────────────────────────────────────────
    try {
      this.bgm = this.sound.add(this.levelData.music, { loop:true, volume:0.45 });
      this.bgm.play();
    } catch(e) {}

    // ── Tutorial (first play) ─────────────────────────────────────
    const tutDone = this.registry.get("tutorialDone");
    if (!tutDone && this.levelIndex === 0) {
      this._showTutorial();
    } else {
      this._startWave();
    }

    // ── Main game loop ────────────────────────────────────────────
    // Sun production timer (every 10s ambient sun)
    this.time.addEvent({ delay:10000, callback:() => { if(this.phase==="playing") this._spawnSunOrb(null); }, loop:true });

    // Main physics loop
    this.time.addEvent({ delay:100, callback:this._gameTick, callbackScope:this, loop:true });

    // Wave spawn loop
    this.time.addEvent({ delay:1500, callback:this._spawnFromQueue, callbackScope:this, loop:true });
  }

  // ──────────────────────────────────────────────────────────────
  // UI CREATION
  // ──────────────────────────────────────────────────────────────
  _createTopBar() {
    const W = this.W;
    // Top bar background
    this.add.rectangle(W/2, UI_TOP_H/2, W, UI_TOP_H, 0x1A3A00, 0.9).setDepth(20);

    // Sun counter
    const sunCircle = this.add.circle(36, UI_TOP_H/2, 22, 0xFFD800).setDepth(21);
    this.add.text(36, UI_TOP_H/2, "☀", { fontSize:"20px" }).setOrigin(0.5).setDepth(22);
    this.sunText = this.add.text(72, UI_TOP_H/2, `${this.sun}`, {
      fontFamily:"Arial Black", fontSize:"20px", fill:"#FFFFC8", stroke:"#1A3A00", strokeThickness:4,
    }).setOrigin(0, 0.5).setDepth(22);

    // Wave progress bar
    this.waveLabelText = this.add.text(W/2, 14, `Wave 1 / ${this.levelData.maxWaves}`, {
      fontFamily:"Arial Black", fontSize:"14px", fill:"#FFFFFF", stroke:"#000", strokeThickness:3,
    }).setOrigin(0.5, 0).setDepth(22);

    this.waveBarBg = this.add.rectangle(W/2, 52, 220, 12, 0x1A1A1A).setDepth(22);
    this.waveBar   = this.add.rectangle(W/2 - 110, 52, 0, 12, 0xFF6420).setOrigin(0, 0.5).setDepth(23);
    this.add.rectangle(W/2, 52, 220, 12, 0x000000, 0).setStrokeStyle(1.5, 0xFF9050).setDepth(24);

    // House HP
    const hpX = W - 130;
    this.add.text(hpX, 12, "HOUSE HP", { fontFamily:"Arial", fontSize:"11px", fill:"#FFC8C8", stroke:"#000", strokeThickness:2 }).setOrigin(0.5, 0).setDepth(22);
    this.houseHpBg  = this.add.rectangle(hpX, 40, 120, 10, 0x1A1A1A).setDepth(22);
    this.houseHpBar = this.add.rectangle(hpX-60, 40, 120, 10, 0x28C828).setOrigin(0, 0.5).setDepth(23);
    this.add.rectangle(hpX, 40, 120, 10, 0x000000, 0).setStrokeStyle(1, 0xFFFFFF, 0.4).setDepth(24);
    this.houseHpText= this.add.text(hpX, 54, "100 / 100", { fontFamily:"Arial", fontSize:"11px", fill:"#FFFFFF", stroke:"#000", strokeThickness:2 }).setOrigin(0.5, 0).setDepth(22);

    // Level name
    this.add.text(W - 12, 14, `${this.levelData.name} — ${this.levelData.subtitle}`, {
      fontFamily:"Arial", fontSize:"11px", fill:"#DCF0FF", stroke:"#000", strokeThickness:2,
    }).setOrigin(1, 0).setDepth(22);

    // Pause / Menu button
    const menuBtn = this.add.text(W - 12, UI_TOP_H - 14, "⏸ Menu", {
      fontFamily:"Arial Black", fontSize:"13px", fill:"#FFFFC8", stroke:"#000", strokeThickness:3,
    }).setOrigin(1, 1).setDepth(22).setInteractive({ useHandCursor:true });
    menuBtn.on("pointerup", () => this._returnToMenu());
  }

  _createSeedBar() {
    const W = this.W, H = this.H;
    const barY = H - SEED_BAR_H;

    // Seed bar background
    this.add.rectangle(W/2, H - SEED_BAR_H/2, W, SEED_BAR_H, 0x1A3A00, 0.92).setDepth(20);

    // Seed packets
    this.seedPackets  = [];
    this.seedCooldowns= {};
    const packetW     = 66, packetH = 72, gap = 6;
    const totalW      = this.availablePlants.length * (packetW + gap) - gap;
    const startX      = (W - totalW) / 2 + packetW / 2;

    this.availablePlants.forEach((plantType, i) => {
      const pd  = PLANTS[plantType];
      const px  = startX + i * (packetW + gap);
      const py  = H - SEED_BAR_H / 2;

      // Card background
      const card = this.add.rectangle(px, py, packetW, packetH, 0x2A5A10).setDepth(21)
        .setStrokeStyle(2, 0x78C832, 1);

      // Plant sprite on card
      const plantImg = this.add.image(px, py - 8, pd.sprite || "plant_peashooter")
        .setDisplaySize(46, 46).setDepth(22);

      // Cost label
      const costTxt = this.add.text(px, py + 24, `☀${pd.cost}`, {
        fontFamily:"Arial Black", fontSize:"13px", fill:"#FFFFC8", stroke:"#1A3A00", strokeThickness:3,
      }).setOrigin(0.5).setDepth(23);

      // Cooldown overlay
      const cdOverlay = this.add.rectangle(px, py, packetW, packetH, 0x000000, 0).setDepth(24);

      card.setInteractive({ useHandCursor:true });
      card.on("pointerover",  () => { if(this._canAfford(plantType)) card.setFillStyle(0x3A8A20); this._showPlantTooltip(pd, px, py - 50); });
      card.on("pointerout",   () => { card.setFillStyle(this.selectedSeed===plantType?0x6AB830:0x2A5A10); this._hideTooltip(); });
      card.on("pointerdown",  () => { if(this._canAfford(plantType)) this._selectSeed(plantType); });

      this.seedPackets.push({ type:plantType, card, plantImg, costTxt, cdOverlay });
    });

    // Shovel button
    const shovelX = W - 52;
    const shovel  = this.add.rectangle(shovelX, H - SEED_BAR_H/2, 44, 64, 0x5A3010).setDepth(21)
      .setStrokeStyle(2, 0xC89050).setInteractive({ useHandCursor:true });
    this.add.text(shovelX, H - SEED_BAR_H/2 - 10, "⛏", { fontSize:"26px" }).setOrigin(0.5).setDepth(22);
    this.add.text(shovelX, H - SEED_BAR_H/2 + 16, "Shovel", { fontFamily:"Arial", fontSize:"11px", fill:"#C89050" }).setOrigin(0.5).setDepth(22);
    shovel.on("pointerup", () => this._toggleShovelMode());
    this.shovelMode  = false;
    this.shovelBtn   = shovel;

    // Tooltip container (hidden)
    this.tooltip = this.add.container(0, 0).setDepth(99).setVisible(false);
    const tipBg  = this.add.rectangle(0, 0, 200, 60, 0x001A00, 0.95).setStrokeStyle(2, 0x78C832);
    this.tipTitle= this.add.text(-90, -24, "", { fontFamily:"Arial Black", fontSize:"13px", fill:"#78C832" });
    this.tipDesc = this.add.text(-90, -4,  "", { fontFamily:"Arial", fontSize:"11px", fill:"#FFFFFF", wordWrap:{width:180} });
    this.tooltip.add([tipBg, this.tipTitle, this.tipDesc]);
  }

  // ──────────────────────────────────────────────────────────────
  // GRID
  // ──────────────────────────────────────────────────────────────
  _drawGrid() {
    const gfx = this.gridGfx;
    gfx.clear();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const x = GRID_X + c * CELL_W;
        const y = GRID_Y + r * CELL_H;
        // Alternating row shading
        const shade = r % 2 === 0 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
        gfx.fillStyle(r%2===0 ? 0xFFFFFF : 0x000000, r%2===0?0.05:0.06);
        gfx.fillRect(x, y, CELL_W, CELL_H);
        // Pool rows
        if (this.levelData.atmosphere === "pool" && (r===2||r===3)) {
          gfx.fillStyle(0x3C82B4, 0.35);
          gfx.fillRect(x, y, CELL_W, CELL_H);
        }
        // Grid lines
        gfx.lineStyle(1, 0x000000, 0.18);
        gfx.strokeRect(x, y, CELL_W, CELL_H);
      }
    }
  }

  _cellToWorld(col, row) {
    return {
      x: GRID_X + col * CELL_W + CELL_W / 2,
      y: GRID_Y + row * CELL_H + CELL_H / 2,
    };
  }

  _worldToCell(px, py) {
    const c = Math.floor((px - GRID_X) / CELL_W);
    const r = Math.floor((py - GRID_Y) / CELL_H);
    return { col: c, row: r };
  }

  _isValidCell(col, row) {
    return col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;
  }

  _getPlantAt(col, row) {
    return this.plants.find(p => p.col === col && p.row === row) || null;
  }

  // ──────────────────────────────────────────────────────────────
  // INTERACTION
  // ──────────────────────────────────────────────────────────────
  _handleClick(ptr) {
    if (this.phase !== "playing") return;
    const { col, row } = this._worldToCell(ptr.x, ptr.y);

    if (!this._isValidCell(col, row)) return;

    if (this.shovelMode) {
      this._removePlant(col, row);
      this._toggleShovelMode();
      return;
    }

    if (this.selectedSeed) {
      this._placePlant(col, row, this.selectedSeed);
    }
  }

  _selectSeed(type) {
    const pd = PLANTS[type];
    if (!this._canAfford(type)) return;

    this.selectedSeed = type;
    this.shovelMode   = false;

    // Highlight selected packet
    this.seedPackets.forEach(sp => {
      sp.card.setFillStyle(sp.type === type ? 0x6AB830 : 0x2A5A10);
      sp.card.setStrokeStyle(2, sp.type === type ? 0xFFFFFF : 0x78C832);
    });

    this.input.setDefaultCursor(`url('/assets/cursor_plant.png'), pointer`);
  }

  _canAfford(type) {
    const pd = PLANTS[type];
    return pd && this.sun >= pd.cost;
  }

  _toggleShovelMode() {
    this.shovelMode = !this.shovelMode;
    this.selectedSeed = null;
    this.shovelBtn.setFillStyle(this.shovelMode ? 0x9A5020 : 0x5A3010);
    this.seedPackets.forEach(sp => sp.card.setFillStyle(0x2A5A10));
    this.input.setDefaultCursor(this.shovelMode ? "url('/assets/cursor_shovel.png'), pointer" : "default");
  }

  _showPlantTooltip(pd, x, y) {
    this.tooltip.setPosition(x, y).setVisible(true);
    this.tipTitle.setText(pd.name);
    this.tipDesc.setText(pd.description);
  }
  _hideTooltip() { this.tooltip.setVisible(false); }

  // ──────────────────────────────────────────────────────────────
  // PLANT PLACEMENT
  // ──────────────────────────────────────────────────────────────
  _placePlant(col, row, type) {
    if (this._getPlantAt(col, row)) { this._showFloatingText("Already occupied!", GRID_X+col*CELL_W+CELL_W/2, GRID_Y+row*CELL_H, "#FF6666"); return; }
    const pd = PLANTS[type];
    if (!this._canAfford(type)) { this._showFloatingText(`Need ☀${pd.cost}!`, GRID_X+col*CELL_W+CELL_W/2, GRID_Y+row*CELL_H, "#FF6666"); return; }

    this.sun -= pd.cost;
    this._updateSunDisplay();

    const {x, y} = this._cellToWorld(col, row);
    const sprite  = this.add.image(x, y, pd.sprite || "plant_peashooter")
      .setDisplaySize(CELL_W - 4, CELL_H - 4).setDepth(10);

    // Plant-in animation
    this.tweens.add({ targets:sprite, y: y - 6, duration:120, yoyo:true, ease:"Bounce.out" });

    // HP bar
    const hpBg  = this.add.rectangle(x, y + CELL_H/2 - 8, CELL_W - 10, 6, 0x1A1A1A).setDepth(11);
    const hpBar = this.add.rectangle(x - (CELL_W-10)/2, y + CELL_H/2 - 8, CELL_W - 10, 6, 0x28C828).setOrigin(0, 0.5).setDepth(12);

    const plant = {
      col, row, type, sprite, hpBg, hpBar,
      hp: pd.hp, maxHp: pd.hp,
      nextShoot: this.time.now + (pd.shootRate || 99999),
      nextSun:   this.time.now + (pd.sunRate   || 99999),
      placedAt:  this.time.now,
      armTime:   pd.armDelay ? this.time.now + pd.armDelay : null,
      armed:     !pd.armDelay,
      chompCooldown: 0,
    };
    this.plants.push(plant);

    // Instant plants trigger immediately
    if (pd.instant) { this._triggerInstant(plant); }

    this.selectedSeed = null;
    this.seedPackets.forEach(sp => { sp.card.setFillStyle(0x2A5A10); sp.card.setStrokeStyle(2, 0x78C832); });
    this.input.setDefaultCursor("default");

    this._tryPlaySfx("sfx_plant");
  }

  _triggerInstant(plant) {
    const pd = PLANTS[plant.type];
    const {x, y} = this._cellToWorld(plant.col, plant.row);

    if (pd.aoe || pd.globalAoe) {
      const range = pd.globalAoe ? 999 : pd.aoeRange || 1.5;
      // Flash effect
      const flash = this.add.rectangle(this.W/2, this.H/2, this.W, this.H, 0xFFFFFF, 0.6).setDepth(50);
      this.tweens.add({ targets:flash, alpha:0, duration:400, onComplete:()=>flash.destroy() });
      // Damage zombies in range
      this.zombies.forEach(z => {
        const zx = GRID_X + z.x * CELL_W;
        const zy = GRID_Y + z.row * CELL_H + CELL_H/2;
        if (Math.abs(z.row - plant.row) <= range && Math.abs(z.x - plant.col) <= range + 1) {
          z.hp -= pd.aoeDmg || 1800;
          this._showFloatingText(`-${pd.aoeDmg}`, zx, zy - 20, "#FF4400");
          if (z.hp <= 0) this._killZombie(z);
        }
      });
      this._tryPlaySfx("sfx_explosion");
      this._removePlantFromScene(plant);
    }

    if (pd.freeze) {
      this.zombies.forEach(z => { z.frozen = true; z.freezeUntil = this.time.now + (pd.freezeMs || 5000); });
      const fxBurst = this.add.rectangle(this.W/2, this.H/2, this.W, this.H, 0x8CDCFF, 0.4).setDepth(50);
      this.tweens.add({ targets:fxBurst, alpha:0, duration:800, onComplete:()=>fxBurst.destroy() });
      this._tryPlaySfx("sfx_freeze");
      this._removePlantFromScene(plant);
    }

    if (pd.squash) {
      const targets = this.zombies.filter(z => z.row === plant.row && !z.dying).sort((a,b)=>a.x-b.x);
      if (targets.length > 0) {
        const t = targets[0];
        const {x:tx, y:ty} = { x: GRID_X + t.x*CELL_W, y: GRID_Y + t.row*CELL_H+CELL_H/2 };
        this.tweens.add({
          targets: plant.sprite, x: tx, y: ty - 40, duration: 350, ease:"Quad.easeOut",
          onComplete: () => {
            this.tweens.add({ targets:plant.sprite, y:ty, duration:120, ease:"Bounce.out",
              onComplete: () => { this._killZombie(t); this._removePlantFromScene(plant); }});
          }
        });
      } else {
        this._removePlantFromScene(plant);
      }
    }
  }

  _removePlant(col, row) {
    const p = this._getPlantAt(col, row);
    if (p) this._removePlantFromScene(p);
  }

  _removePlantFromScene(plant) {
    plant.sprite?.destroy();
    plant.hpBg?.destroy();
    plant.hpBar?.destroy();
    const idx = this.plants.indexOf(plant);
    if (idx !== -1) this.plants.splice(idx, 1);
  }

  // ──────────────────────────────────────────────────────────────
  // GAME TICK (called every 100ms)
  // ──────────────────────────────────────────────────────────────
  _gameTick() {
    if (this.phase !== "playing") return;
    const now = this.time.now;
    this.tick++;

    // ── Plant actions ─────────────────────────────────────────────
    for (const plant of [...this.plants]) {
      const pd = PLANTS[plant.type];
      if (!pd) continue;

      // Arm mine
      if (plant.armTime && !plant.armed && now >= plant.armTime) {
        plant.armed = true;
        this.tweens.add({ targets:plant.sprite, scale:1.1, duration:200, yoyo:true });
      }

      // Lifetime expiry (puffshroom etc)
      if (pd.lifetime && now - plant.placedAt > pd.lifetime) {
        this._removePlantFromScene(plant);
        continue;
      }

      // Sun production
      if (pd.sunProduction && now >= plant.nextSun) {
        plant.nextSun = now + pd.sunRate;
        this._spawnSunOrb(plant);
      }

      // Fume attack
      if (pd.fume && now >= plant.nextShoot) {
        plant.nextShoot = now + (pd.shootRate || 3000);
        this.zombies.filter(z => z.row === plant.row && !z.dying).forEach(z => {
          z.hp -= pd.dmg || 20;
          if (z.hp <= 0) this._killZombie(z);
        });
      }

      // Shooting
      if (pd.shootRate && !pd.fume && now >= plant.nextShoot) {
        const rowZ = this.zombies.filter(z => z.row === plant.row && !z.dying && z.x > plant.col);
        if (rowZ.length > 0) {
          plant.nextShoot = now + pd.shootRate;
          const rows = pd.threeRow ? [plant.row-1, plant.row, plant.row+1].filter(r=>r>=0&&r<GRID_ROWS) : [plant.row];
          rows.forEach(r => {
            this._fireProjectile(plant.col, r, pd.projType || "pea", pd.dmg || 20, pd.slow || false);
            if (pd.doubleShot) this._fireProjectile(plant.col - 0.3, r, pd.projType || "pea", pd.dmg || 20, pd.slow || false);
          });
          // Shoot animation
          this.tweens.add({ targets:plant.sprite, x:plant.sprite.x+4, duration:60, yoyo:true });
        }
      }

      // Chomp
      if (pd.chomp && plant.chompCooldown === 0) {
        const target = this.zombies.find(z => z.row===plant.row && !z.dying && z.x > plant.col && z.x < plant.col+1.5);
        if (target) {
          plant.chompCooldown = pd.rechargeTicks || 42000;
          this.time.delayedCall(pd.rechargeTicks||42000, () => { plant.chompCooldown = 0; });
          this._killZombie(target);
          this.tweens.add({ targets:plant.sprite, scaleX:1.3, scaleY:0.7, duration:150, yoyo:true });
        }
      }

      // Potato mine activation
      if (plant.armed && pd.mine) {
        const mineTarget = this.zombies.find(z => z.row===plant.row && !z.dying && z.x < plant.col+0.6);
        if (mineTarget) {
          this.zombies.filter(z => z.row===plant.row && !z.dying && z.x < plant.col+2).forEach(z => {
            z.hp -= pd.mineDmg || 1800;
            if (z.hp <= 0) this._killZombie(z);
          });
          this._tryPlaySfx("sfx_explosion");
          this._removePlantFromScene(plant);
          continue;
        }
      }
    }

    // ── Projectile movement ───────────────────────────────────────
    for (const proj of [...this.projectiles]) {
      proj.x += 4;  // pixels per tick (100ms * 4 = 400px/s)
      if (proj.sprite) proj.sprite.x = GRID_X + proj.x;

      // Off-screen
      if (proj.x > GRID_X + GRID_COLS * CELL_W + 50) {
        proj.sprite?.destroy(); this.projectiles.splice(this.projectiles.indexOf(proj), 1);
        continue;
      }

      // Hit check
      let hit = false;
      for (const z of this.zombies) {
        if (z.dying || z.row !== proj.row) continue;
        const zScrX = GRID_X + z.x * CELL_W;
        if (Math.abs(zScrX - (GRID_X + proj.x)) < 28) {
          z.hp -= proj.dmg;
          if (proj.slow) { z.frozen=true; z.freezeUntil=this.time.now+2000; }
          this._showFloatingText(`-${proj.dmg}`, zScrX, GRID_Y+z.row*CELL_H+CELL_H/2 - 24, "#FF4400");
          if (z.hp <= 0) this._killZombie(z);
          hit = true;
          this._tryPlaySfx("sfx_pea_hit");
          break;
        }
      }
      if (hit) {
        this._spawnHitParticle(GRID_X + proj.x, GRID_Y + proj.row*CELL_H + CELL_H/2);
        proj.sprite?.destroy(); this.projectiles.splice(this.projectiles.indexOf(proj), 1);
      }
    }

    // ── Zombie movement ───────────────────────────────────────────
    for (const z of [...this.zombies]) {
      if (z.dying) continue;
      if (z.frozen && this.time.now < z.freezeUntil) continue;
      z.frozen = false;

      const zdDef = ZOMBIES[z.type];
      const speed = zdDef?.speed || 30; // pixels/second

      // Check for plant ahead
      const zCol = Math.floor(z.x);
      const plantAhead = this._getPlantAt(zCol, z.row) || this._getPlantAt(zCol-1, z.row);
      if (plantAhead && z.x < plantAhead.col + 0.9) {
        // Attack plant
        plantAhead.hp -= (zdDef?.dmg || 2) * 0.1; // per tick
        this._updatePlantHpBar(plantAhead);
        if (plantAhead.hp <= 0) {
          this._removePlantFromScene(plantAhead);
          this._showFloatingText("Eaten!", GRID_X+plantAhead.col*CELL_W+CELL_W/2, GRID_Y+plantAhead.row*CELL_H, "#FF9900");
        }
        // Zombies eat animation (bob head)
        if (z.sprite && this.tick % 8 === 0) {
          this.tweens.add({ targets:z.sprite, y:z.sprite.y+4, duration:80, yoyo:true });
        }
      } else {
        // Move left (col units per second)
        z.x -= (speed / CELL_W) * 0.1;
        if (z.sprite) {
          z.sprite.x = GRID_X + z.x * CELL_W;
          // Walk animation: slight bob
          if (this.tick % 5 === 0) {
            this.tweens.add({ targets:z.sprite, y:z.sprite.y-3, duration:100, yoyo:true, ease:"Sine" });
          }
        }
      }

      // Reached lawnmower
      const lm = this.lawnmowers.find(l => l.row===z.row && l.active && !l.used && z.x < 0.4);
      if (lm) {
        lm.used = true; lm.active = false;
        this.lawnmowerSprites[z.row].setVisible(false);
        // Kill all zombies in row
        this.zombies.filter(zz => zz.row === z.row && !zz.dying).forEach(zz => this._killZombie(zz));
        this._tryPlaySfx("sfx_lawnmower");
        this._showFloatingText("LAWNMOWER!", GRID_X + CELL_W, GRID_Y + z.row*CELL_H + CELL_H/2, "#FFD800");
        continue;
      }

      // Reached house (no lawnmower)
      if (z.x <= -0.5 && !lm) {
        this.houseHp -= zdDef?.dmg || 10;
        this._updateHouseHp();
        this._killZombie(z);
        this.cameras.main.shake(200, 0.008);
        if (this.houseHp <= 0) { this._gameOver(); return; }
      }
    }

    // ── Wave complete check ───────────────────────────────────────
    if (this.waveActive && this.waveQueue.length === 0 && this.zombies.filter(z=>!z.dying).length === 0) {
      this.waveActive = false;
      if (this.wave >= this.levelData.maxWaves) {
        this.time.delayedCall(1500, () => this._victory());
      } else {
        this._showWaveClearedBanner();
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // PROJECTILES
  // ──────────────────────────────────────────────────────────────
  _fireProjectile(fromCol, row, type, dmg, slow) {
    const startX = fromCol + 0.8;
    const y      = GRID_Y + row * CELL_H + CELL_H/2 - 6;
    const texKey = type === "snowpea" ? "proj_snowpea" : type === "fire" ? "proj_fire" : "proj_pea";
    const sprite = this.add.image(GRID_X + startX * CELL_W, y, texKey)
      .setDisplaySize(18, 18).setDepth(15);
    this.projectiles.push({ x: startX * CELL_W, y, row, type, dmg, slow, sprite });
  }

  _spawnHitParticle(x, y) {
    for (let i = 0; i < 4; i++) {
      const p = this.add.circle(x, y, Phaser.Math.Between(3,7), 0x50C850, 0.9).setDepth(16);
      const angle = Phaser.Math.Between(0, 360) * Math.PI/180;
      this.tweens.add({
        targets:p, x: x + Math.cos(angle)*20, y: y + Math.sin(angle)*20 - 10,
        alpha: 0, duration: 300, ease:"Quad.easeOut",
        onComplete:()=>p.destroy(),
      });
    }
  }

  // ──────────────────────────────────────────────────────────────
  // ZOMBIES
  // ──────────────────────────────────────────────────────────────
  _spawnZombie(type, row) {
    const zdDef = ZOMBIES[type] || ZOMBIES.regular;
    const startX= GRID_COLS + 0.5; // off-screen right
    const scale = zdDef.scale || 1.0;

    const sprite = this.add.image(
      GRID_X + startX * CELL_W,
      GRID_Y + row * CELL_H + CELL_H/2,
      zdDef.sprite || "zombie_regular"
    ).setDisplaySize(Math.round(CELL_W * scale * 0.95), Math.round(CELL_H * scale * 1.35))
     .setDepth(10 + row);

    // Flip sprite to face left (zombies walk left)
    sprite.setFlipX(true);

    // HP bar
    const barW  = Math.round(CELL_W * scale * 0.9);
    const hpBg  = this.add.rectangle(sprite.x, sprite.y + CELL_H*scale/2 - 6, barW, 6, 0x1A1A1A).setDepth(11+row);
    const hpBar = this.add.rectangle(sprite.x - barW/2, sprite.y + CELL_H*scale/2 - 6, barW, 6, 0x28C828).setOrigin(0,0.5).setDepth(12+row);

    const z = {
      id:   this.nextZombieId++,
      type, row, sprite, hpBg, hpBar,
      x:        startX,
      hp:       zdDef.hp,
      maxHp:    zdDef.hp,
      speed:    zdDef.speed,
      scale,
      frozen:   false,
      freezeUntil: 0,
      dying:    false,
    };
    this.zombies.push(z);

    // Entrance groan
    if (Math.random() < 0.4) this._tryPlaySfx("sfx_zombie_groan");

    return z;
  }

  _killZombie(z) {
    if (z.dying) return;
    z.dying = true;

    // Death animation
    if (z.sprite) {
      this.tweens.add({
        targets: [z.sprite, z.hpBg, z.hpBar],
        alpha: 0, y: z.sprite.y + 20, duration: 500, ease:"Quad.easeIn",
        onComplete: () => {
          z.sprite?.destroy(); z.hpBg?.destroy(); z.hpBar?.destroy();
          const idx = this.zombies.indexOf(z);
          if (idx !== -1) this.zombies.splice(idx, 1);
        },
      });
    }
  }

  _spawnFromQueue() {
    if (this.phase !== "playing" || this.waveQueue.length === 0) return;
    const entry = this.waveQueue.shift();
    this._spawnZombie(entry.type, entry.row);
  }

  // ──────────────────────────────────────────────────────────────
  // SUN
  // ──────────────────────────────────────────────────────────────
  _spawnSunOrb(sourcePlant) {
    const x = sourcePlant
      ? this._cellToWorld(sourcePlant.col, sourcePlant.row).x + Phaser.Math.Between(-16,16)
      : Phaser.Math.Between(GRID_X + 40, GRID_X + GRID_COLS*CELL_W - 40);
    const y = sourcePlant ? this._cellToWorld(sourcePlant.col, sourcePlant.row).y - 30 : 40;
    const destY = y + Phaser.Math.Between(60, 120);

    const orb = this.add.circle(x, y, 20, 0xFFD800, 1).setDepth(30);
    const txt  = this.add.text(x, y, "☀", { fontSize:"24px" }).setOrigin(0.5).setDepth(31);

    this.tweens.add({
      targets: [orb, txt], y: destY, duration: 1200, ease:"Bounce.out",
      onComplete: () => {
        // Make clickable
        orb.setInteractive({ useHandCursor:true });
        orb.on("pointerup", () => {
          this.sun += 25;
          this._updateSunDisplay();
          this._tryPlaySfx("sfx_sun_collect");
          this._showFloatingText("+25 ☀", x, destY - 20, "#FFD800");
          this.tweens.add({ targets:[orb,txt], alpha:0, scale:1.4, duration:250, onComplete:()=>{ orb.destroy();txt.destroy(); } });
        });
        // Auto-collect after 8s
        this.time.delayedCall(8000, () => { if (orb.active) { orb.destroy(); txt.destroy(); } });
      }
    });
  }

  _updateSunDisplay() {
    if (this.sunText) this.sunText.setText(`${this.sun}`);
    // Update seed packet affordability
    this.seedPackets?.forEach(sp => {
      const pd = PLANTS[sp.type];
      const canAfford = this.sun >= pd.cost;
      sp.card.setAlpha(canAfford ? 1 : 0.55);
      sp.costTxt.setStyle({ fill: canAfford ? "#FFFFC8" : "#FF6666" });
    });
  }

  // ──────────────────────────────────────────────────────────────
  // HP UPDATES
  // ──────────────────────────────────────────────────────────────
  _updatePlantHpBar(plant) {
    if (!plant.hpBar) return;
    const pct = Math.max(0, plant.hp / plant.maxHp);
    const w   = CELL_W - 10;
    plant.hpBar.width = w * pct;
    plant.hpBar.setFillStyle(pct > 0.6 ? 0x28C828 : pct > 0.3 ? 0xDCC820 : 0xDC2828);
  }

  _updateHouseHp() {
    const pct = Math.max(0, this.houseHp / this.maxHouseHp);
    if (this.houseHpBar) {
      this.houseHpBar.width = 120 * pct;
      this.houseHpBar.setFillStyle(pct>0.6?0x28C828:pct>0.3?0xDCC820:0xDC2828);
    }
    if (this.houseHpText) this.houseHpText.setText(`${this.houseHp} / ${this.maxHouseHp}`);
    if (pct < 0.4 && this.houseSprite) {
      this.houseSprite.setTint(0xFF6666);
    }
  }

  // ──────────────────────────────────────────────────────────────
  // WAVES
  // ──────────────────────────────────────────────────────────────
  _startWave() {
    if (this.wave >= this.levelData.maxWaves) return;
    const waveDef = this.levelData.waves[this.wave];
    if (!waveDef) return;

    this.wave++;
    this.waveActive = true;
    this._updateWaveBar();

    // Queue all zombies for this wave
    waveDef.forEach(group => {
      for (let i = 0; i < group.count; i++) {
        const row = group.rows[i % group.rows.length];
        // Stagger spawns
        this.time.delayedCall(i * 1800 + Phaser.Math.Between(0, 600), () => {
          if (this.phase === "playing") this._spawnZombie(group.type, row);
        });
      }
    });

    // Show wave banner
    this._showWaveBanner(`Wave ${this.wave}`);
  }

  _showWaveBanner(text) {
    const banner = this.add.text(this.W/2, this.H/2 - 60, text, {
      fontFamily:"'Arial Black', sans-serif", fontSize:"52px",
      fill:"#FF6420", stroke:"#2A0A00", strokeThickness:8,
      shadow:{ x:4, y:4, color:"#000", blur:6, fill:true },
    }).setOrigin(0.5).setDepth(60).setAlpha(0);

    this.tweens.add({ targets:banner, alpha:1, duration:400, ease:"Quad.easeOut",
      onComplete: () => this.tweens.add({ targets:banner, alpha:0, duration:600, delay:1200, ease:"Quad.easeIn", onComplete:()=>banner.destroy() }) });
  }

  _showWaveClearedBanner() {
    this._showWaveBanner("Wave Cleared!");
    // Show next wave button after delay
    this.time.delayedCall(2000, () => {
      if (this.phase !== "playing") return;
      const btn = this._makeWaveButton();
      this.time.delayedCall(15000, () => { if (btn?.active) { btn.destroy(); this._startWave(); } });
    });
  }

  _makeWaveButton() {
    const W = this.W, H = this.H;
    const container = this.add.container(W/2, H - SEED_BAR_H - 40).setDepth(50);
    const bg  = this.add.rectangle(0, 0, 240, 48, 0x226600, 1).setStrokeStyle(3, 0xFFFFFF);
    const lbl = this.add.text(0, 0, "▶ NEXT WAVE", { fontFamily:"Arial Black", fontSize:"20px", fill:"#FFFFFF", stroke:"#003300", strokeThickness:5 }).setOrigin(0.5);
    container.add([bg, lbl]);
    bg.setInteractive({ useHandCursor:true });
    bg.on("pointerover", () => bg.setFillStyle(0x44AA00));
    bg.on("pointerout",  () => bg.setFillStyle(0x226600));
    bg.on("pointerup",   () => { container.destroy(); this._startWave(); });
    this.tweens.add({ targets:container, y:"+=6", duration:600, yoyo:true, repeat:-1, ease:"Sine" });
    return container;
  }

  _updateWaveBar() {
    if (!this.waveBar || !this.waveLabelText) return;
    const maxW = 220;
    const pct  = Math.min((this.wave) / this.levelData.maxWaves, 1);
    this.waveBar.width = maxW * pct;
    this.waveLabelText.setText(`Wave ${this.wave} / ${this.levelData.maxWaves}`);
  }

  // ──────────────────────────────────────────────────────────────
  // GAME OVER / VICTORY
  // ──────────────────────────────────────────────────────────────
  _gameOver() {
    if (this.phase === "gameover") return;
    this.phase = "gameover";
    this.bgm?.stop();

    // Dim overlay
    const overlay = this.add.rectangle(this.W/2, this.H/2, this.W, this.H, 0x000000, 0.7).setDepth(80);
    const title   = this.add.text(this.W/2, this.H/2 - 80, "GAME OVER", {
      fontFamily:"'Arial Black', sans-serif", fontSize:"64px",
      fill:"#DC2828", stroke:"#440000", strokeThickness:10,
    }).setOrigin(0.5).setDepth(81).setAlpha(0);

    this.tweens.add({ targets:title, alpha:1, duration:600, ease:"Bounce.out" });
    this.cameras.main.shake(400, 0.015);

    this.time.delayedCall(1500, () => {
      this._addEndButton(this.W/2, this.H/2 + 20, "🔄 Try Again", 0x226600, () => {
        this.scene.restart({ levelIndex: this.levelIndex });
      });
      this._addEndButton(this.W/2, this.H/2 + 80, "🏠 Level Select", 0x004488, () => {
        this._returnToMenu();
      });
    });
  }

  _victory() {
    if (this.phase === "victory") return;
    this.phase = "victory";
    this.bgm?.stop();
    this._tryPlaySfx("sfx_level_complete");

    // Save progress
    const prevStars = (this.registry.get("levelStars") || {})[this.levelIndex] || 0;
    const newStars  = Math.max(prevStars, 3);
    const allStars  = { ...(this.registry.get("levelStars") || {}), [this.levelIndex]: newStars };
    this.registry.set("levelStars", allStars);
    const unlocked  = this.registry.get("unlockedLevels") || [0];
    if (!unlocked.includes(this.levelIndex + 1) && this.levelIndex + 1 < LEVELS.length) {
      unlocked.push(this.levelIndex + 1);
      this.registry.set("unlockedLevels", unlocked);
    }
    // Unlock new plants
    const newPlants = this.levelData.unlockPlants || [];
    const known     = this.registry.get("unlockedPlants") || [];
    newPlants.forEach(p => { if (!known.includes(p)) known.push(p); });
    this.registry.set("unlockedPlants", known);

    // Star particles
    for (let i = 0; i < 20; i++) {
      const star = this.add.text(
        Phaser.Math.Between(100, this.W-100), Phaser.Math.Between(50, 200), "★",
        { fontSize:`${Phaser.Math.Between(20,40)}px`, fill:"#FFD800" }
      ).setDepth(80).setAlpha(0);
      this.tweens.add({ targets:star, alpha:1, y:`-=${Phaser.Math.Between(40,120)}`, delay:i*80, duration:800, ease:"Quad.easeOut",
        onComplete:()=>this.tweens.add({ targets:star, alpha:0, duration:400, onComplete:()=>star.destroy() }) });
    }

    const overlay = this.add.rectangle(this.W/2, this.H/2, this.W, this.H, 0x000000, 0.55).setDepth(79);
    this.add.text(this.W/2, this.H/2 - 100, "YOU WIN!", {
      fontFamily:"'Arial Black', sans-serif", fontSize:"64px",
      fill:"#FFD828", stroke:"#663300", strokeThickness:10,
    }).setOrigin(0.5).setDepth(81);

    const unlockedMsg = newPlants.length > 0 ? `Unlocked: ${newPlants.join(", ")}!` : "Level Complete!";
    this.add.text(this.W/2, this.H/2 - 24, unlockedMsg, {
      fontFamily:"Arial", fontSize:"18px", fill:"#FFFFC8", stroke:"#000", strokeThickness:4,
    }).setOrigin(0.5).setDepth(81);

    this.time.delayedCall(1500, () => {
      if (this.levelIndex + 1 < LEVELS.length) {
        this._addEndButton(this.W/2, this.H/2 + 40, "▶ Next Level", 0x226600, () => {
          this.scene.start("GameScene", { levelIndex: this.levelIndex + 1 });
        });
      }
      this._addEndButton(this.W/2, this.H/2 + 100, "🏠 Level Select", 0x004488, () => this._returnToMenu());
    });
  }

  _addEndButton(x, y, label, color, cb) {
    const container = this.add.container(x, y).setDepth(82);
    const bg  = this.add.rectangle(0, 0, 240, 50, color, 1).setStrokeStyle(3, 0xFFFFFF);
    const lbl = this.add.text(0, 0, label, { fontFamily:"Arial Black", fontSize:"20px", fill:"#FFFFFF", stroke:"#000", strokeThickness:4 }).setOrigin(0.5);
    container.add([bg, lbl]);
    bg.setInteractive({ useHandCursor:true });
    bg.on("pointerup", cb);
    this.tweens.add({ targets:container, alpha:0, duration:0 });
    this.tweens.add({ targets:container, alpha:1, duration:400, delay:200 });
    return container;
  }

  _returnToMenu() {
    this.bgm?.stop();
    this.sound.stopAll();
    this.scene.start("LevelSelectScene");
  }

  // ──────────────────────────────────────────────────────────────
  // TUTORIAL
  // ──────────────────────────────────────────────────────────────
  _showTutorial() {
    this.registry.set("tutorialDone", true);
    const W = this.W, H = this.H;

    const steps = [
      { text:"Welcome! ☀️ Sun is your currency.\nClick falling sun and sunflowers produce it.\nYou need sun to plant things!", spotlight:[0,0,140,UI_TOP_H] },
      { text:"Select a plant from the seed bar below.\nChoose Sunflower first — she produces sun!", spotlight:[0,H-SEED_BAR_H,W/2,SEED_BAR_H] },
      { text:"Click a cell on the lawn to place your plant.\nRows 1-5 from top.",  spotlight:[GRID_X,GRID_Y,GRID_COLS*CELL_W,GRID_ROWS*CELL_H] },
      { text:"🧟 Zombies enter from the RIGHT side.\nPlant Peashooters to stop them!", spotlight:[GRID_X+6*CELL_W,GRID_Y,3*CELL_W,GRID_ROWS*CELL_H] },
      { text:"If zombies pass all your plants, the\nlawnmower triggers — but only once per row!\nProtect your house at all costs.", spotlight:[0,GRID_Y,GRID_X,GRID_ROWS*CELL_H] },
    ];

    let step = 0;
    const dim     = this.add.rectangle(W/2,H/2,W,H,0x000000,0.7).setDepth(90);
    const spotGfx = this.add.graphics().setDepth(91);
    const panel   = this.add.container(W/2, H/2 + 80).setDepth(92);
    const panelBg = this.add.rectangle(0,0,520,130,0x001A00,0.96).setStrokeStyle(3,0x78C832);
    const panelTxt= this.add.text(-245,-52,"",{ fontFamily:"Arial",fontSize:"15px",fill:"#FFFFFF",lineSpacing:6,wordWrap:{width:490} });
    const nextBtn = this.add.text(0,50,"[ NEXT ]",{ fontFamily:"Arial Black",fontSize:"18px",fill:"#78C832",stroke:"#004400",strokeThickness:4 }).setOrigin(0.5).setInteractive({useHandCursor:true});
    const skipBtn = this.add.text(200,50,"[ SKIP ]",{ fontFamily:"Arial",fontSize:"14px",fill:"#888" }).setOrigin(0.5).setInteractive({useHandCursor:true});
    panel.add([panelBg,panelTxt,nextBtn,skipBtn]);

    const showStep = () => {
      if (step >= steps.length) { cleanup(); return; }
      const s = steps[step];
      panelTxt.setText(s.text);
      spotGfx.clear();
      if (s.spotlight) {
        const [sx,sy,sw,sh] = s.spotlight;
        spotGfx.fillStyle(0xFFD828,0.25); spotGfx.fillRect(sx,sy,sw,sh);
        spotGfx.lineStyle(3,0xFFD828,1);  spotGfx.strokeRect(sx,sy,sw,sh);
      }
    };

    nextBtn.on("pointerup", () => { step++; showStep(); });
    skipBtn.on("pointerup", () => cleanup());

    const cleanup = () => { dim.destroy(); spotGfx.destroy(); panel.destroy(); this._startWave(); };
    showStep();
  }

  // ──────────────────────────────────────────────────────────────
  // HELPERS
  // ──────────────────────────────────────────────────────────────
  _showFloatingText(text, x, y, color="#FFFFFF") {
    const t = this.add.text(x, y, text, {
      fontFamily:"Arial Black", fontSize:"15px", fill:color, stroke:"#000", strokeThickness:4,
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({ targets:t, y:y-36, alpha:0, duration:900, ease:"Quad.easeOut", onComplete:()=>t.destroy() });
  }

  _tryPlaySfx(key) {
    try { if (this.cache.audio.exists(key)) this.sound.play(key, { volume:0.5 }); } catch(_) {}
  }
}
