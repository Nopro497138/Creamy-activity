// GameScene.js — Complete PvZ gameplay, fixed wave logic
import { PLANTS, LEVEL_PLANTS } from "../config/plants.js";
import { ZOMBIES } from "../config/zombies.js";
import { LEVELS }  from "../config/levels.js";

// Grid layout — fits properly inside 900×600 canvas
const COLS=9, ROWS=5;
const CELL_W=76, CELL_H=78;
const GRID_X=100;   // start x of grid
const GRID_Y=78;    // start y of grid (below top bar)
const TOP_H=78;     // top UI bar height
const SEED_H=92;    // bottom seed bar height
const GRID_W=COLS*CELL_W;  // 684
const GRID_H=ROWS*CELL_H;  // 390

const FONT = "'PoppinsBlack','Arial Black',sans-serif";

export default class GameScene extends Phaser.Scene {
  constructor() { super("GameScene"); }

  // ── Init ──────────────────────────────────────────────────────
  init(data) {
    this.levelIndex  = data?.levelIndex ?? 0;
    this.levelData   = LEVELS[this.levelIndex];

    // Reset all state
    this.sun          = this.levelData.startSun;
    this.wave         = 0;               // waves completed so far
    this.waveActive   = false;           // true while a wave's zombies are alive/queued
    this.queueRunning = false;           // true while we're still spawning from queue
    this.pendingSpawns= [];              // [{type,row,delay}] for current wave
    this.zombieCount  = 0;              // alive + pending for current wave
    this.tick         = 0;
    this.phase        = "playing";       // playing | gameover | victory

    this.plants      = [];
    this.zombies     = [];
    this.projectiles = [];
    this.sunOrbs     = [];

    this.selectedSeed = null;
    this.shovelMode   = false;

    this.lawnmowers  = Array.from({length:ROWS},(_,r)=>({row:r,active:true}));

    this.nextZombieId = 0;

    // Available seed cards for this level
    const levelPlants  = LEVEL_PLANTS[this.levelIndex] || LEVEL_PLANTS[0];
    const unlocked     = this.registry.get("unlockedPlants") || [];
    this.availablePlants = levelPlants.filter(k => {
      const free = ["peashooter","sunflower","wallnut"];
      return free.includes(k) || unlocked.includes(k) || levelPlants.includes(k);
    });
  }

  // ── Create ────────────────────────────────────────────────────
  create() {
    const W=this.scale.width, H=this.scale.height;
    this.W=W; this.H=H;

    // Camera fade-in
    this.cameras.main.fadeIn(400);

    // ── Background ─────────────────────────────────────────────
    this.bgImage = this.add.image(
      GRID_X + GRID_W/2, GRID_Y + GRID_H/2,
      this.textures.exists(this.levelData.bgKey) ? this.levelData.bgKey : "bg_day"
    ).setDisplaySize(GRID_W, GRID_H).setDepth(0);

    // Top & bottom UI bars (above/below the grid)
    this.add.rectangle(W/2, TOP_H/2, W, TOP_H, 0x0D2B00, 0.92).setDepth(18);
    this.add.rectangle(W/2, H-SEED_H/2, W, SEED_H, 0x0D2B00, 0.95).setDepth(18);

    // Left sidebar (sun / lane numbers)
    this.add.rectangle(GRID_X/2, GRID_Y+GRID_H/2, GRID_X, GRID_H, 0x0A2000, 0.85).setDepth(18);

    // ── Grid overlay ───────────────────────────────────────────
    this._drawGrid();

    // ── Lawnmowers ────────────────────────────────────────────
    this.lawnmowerSprites = this.lawnmowers.map(lm => {
      const y = GRID_Y + lm.row*CELL_H + CELL_H/2;
      const img = this.add.image(GRID_X - 28, y, "lawnmower")
        .setDisplaySize(38,38).setDepth(6);
      if (!this.textures.exists("lawnmower")) img.setVisible(false);
      return img;
    });

    // ── Top bar UI ────────────────────────────────────────────
    this._createTopBar();

    // ── Seed bar ──────────────────────────────────────────────
    this._createSeedBar();

    // ── Lane labels ───────────────────────────────────────────
    for (let r=0;r<ROWS;r++) {
      this.add.text(GRID_X/2, GRID_Y+r*CELL_H+CELL_H/2, `${r+1}`, {
        fontFamily:FONT, fontSize:"18px", color:"#FFFFC8",
        stroke:"#000000", strokeThickness:4,
      }).setOrigin(0.5).setDepth(19);
    }

    // ── Input ─────────────────────────────────────────────────
    this.input.on("pointerup", ptr => this._handleClick(ptr));

    // ── Music ─────────────────────────────────────────────────
    this.sound.stopAll();
    try { this.bgm = this.sound.add(this.levelData.music,{loop:true,volume:0.42}); this.bgm.play(); } catch(_){}

    // ── Timers ────────────────────────────────────────────────
    // Sun every 10s
    this.time.addEvent({delay:10000, callback:()=>{ if(this.phase==="playing") this._dropSun(null); }, loop:true});
    // Game loop at 100ms
    this.time.addEvent({delay:100,   callback:this._tick, callbackScope:this, loop:true});
    // Spawn queue processor at 2s intervals
    this.time.addEvent({delay:2000,  callback:this._processSpawnQueue, callbackScope:this, loop:true});

    // ── Tutorial / start ──────────────────────────────────────
    const tutDone = this.registry.get("tutorialDone");
    if (!tutDone && this.levelIndex===0) {
      this._runTutorial();
    } else {
      this.time.delayedCall(800, ()=>this._beginWave());
    }
  }

  // ── Grid drawing ──────────────────────────────────────────────
  _drawGrid() {
    const gfx = this.add.graphics().setDepth(1);
    for (let r=0;r<ROWS;r++) {
      for (let c=0;c<COLS;c++) {
        const x=GRID_X+c*CELL_W, y=GRID_Y+r*CELL_H;
        // Alternate row shading
        gfx.fillStyle(r%2===0?0xFFFFFF:0x000000, r%2===0?0.04:0.06);
        gfx.fillRect(x,y,CELL_W,CELL_H);
        // Pool water rows
        if (this.levelData.atmosphere==="pool"&&(r===2||r===3)) {
          gfx.fillStyle(0x2468A0,0.32); gfx.fillRect(x,y,CELL_W,CELL_H);
        }
        gfx.lineStyle(1,0x000000,0.16); gfx.strokeRect(x,y,CELL_W,CELL_H);
      }
    }
  }

  // ── Top bar ───────────────────────────────────────────────────
  _createTopBar() {
    const W=this.W;
    // Sun counter
    this.add.circle(38, TOP_H/2, 20, 0xFFD800).setDepth(20);
    this.add.text(38,TOP_H/2,"*",{fontFamily:FONT,fontSize:"16px",color:"#FFB800",stroke:"#664400",strokeThickness:3}).setOrigin(0.5).setDepth(21);
    this.sunTxt = this.add.text(65,TOP_H/2,`${this.sun}`,{
      fontFamily:FONT,fontSize:"22px",color:"#FFFFC8",stroke:"#1A3A00",strokeThickness:5,
    }).setOrigin(0,0.5).setDepth(21);

    // Wave bar
    this.waveLbl = this.add.text(W/2,12,`Wave 1 / ${this.levelData.maxWaves}`,{
      fontFamily:FONT,fontSize:"14px",color:"#FFFFFF",stroke:"#000000",strokeThickness:4,
    }).setOrigin(0.5,0).setDepth(20);
    const bw=200, bx=W/2-bw/2, by=38;
    this.add.rectangle(W/2,by,bw+4,13,0x0A1A00).setDepth(20);
    this.waveBarFill=this.add.rectangle(bx,by,0,11,0xFF6420).setOrigin(0,0.5).setDepth(21);
    this.add.rectangle(W/2,by,bw,11,0x000000,0).setStrokeStyle(1.5,0xFF9050).setDepth(22);

    // Level name
    this.add.text(W-10,10,`${this.levelData.name}`,{
      fontFamily:FONT,fontSize:"13px",color:"#DCF0FF",stroke:"#000000",strokeThickness:3,
    }).setOrigin(1,0).setDepth(20);

    // Menu btn
    const mbtn=this.add.text(W-10,TOP_H-10,"Menu",{
      fontFamily:FONT,fontSize:"14px",color:"#FFFFC8",stroke:"#000000",strokeThickness:3,
    }).setOrigin(1,1).setDepth(20).setInteractive({useHandCursor:true});
    mbtn.on("pointerup",()=>this._quitToMenu());
  }

  // ── Seed bar ──────────────────────────────────────────────────
  _createSeedBar() {
    const W=this.W, H=this.H;
    this.seedCards=[];
    const cardW=64, cardH=80, gap=6;
    const total=this.availablePlants.length*(cardW+gap)-gap;
    const startX=(W-total)/2+cardW/2;

    this.availablePlants.forEach((pKey,i)=>{
      const pd=PLANTS[pKey];
      const px=startX+i*(cardW+gap), py=H-SEED_H/2;

      const bg=this.add.rectangle(px,py,cardW,cardH,0x1C4A00).setDepth(19)
        .setStrokeStyle(2,0x4A8C00,1);
      const imgKey=pd.sprite||`plant_${pKey}`;
      const img=this.add.image(px,py-8,this.textures.exists(imgKey)?imgKey:"plant_peashooter")
        .setDisplaySize(44,48).setDepth(20);
      const costTxt=this.add.text(px,py+30,`${pd.cost}`,{
        fontFamily:FONT,fontSize:"13px",color:"#FFFFC8",stroke:"#0A2000",strokeThickness:4,
      }).setOrigin(0.5).setDepth(21);
      const sunIco=this.add.circle(px-12,py+30,5,0xFFD800).setDepth(21);

      // Cooldown overlay (hidden by default)
      const cdOverlay=this.add.rectangle(px,py,cardW,cardH,0x000000,0).setDepth(22);
      const cdTxt=this.add.text(px,py,"",{fontFamily:FONT,fontSize:"20px",color:"#88FF44",stroke:"#000",strokeThickness:4}).setOrigin(0.5).setDepth(23);

      bg.setInteractive({useHandCursor:true});
      bg.on("pointerover",()=>{ if(this._canAfford(pKey)) bg.setFillStyle(0x2E8A00); this._showTooltip(pd,px,py-50); });
      bg.on("pointerout", ()=>{ bg.setFillStyle(this.selectedSeed===pKey?0x5AAA00:0x1C4A00); this._hideTooltip(); });
      bg.on("pointerdown",()=>{ if(this._canAfford(pKey)) this._selectSeed(pKey); });

      this.seedCards.push({key:pKey,bg,img,costTxt,sunIco,cdOverlay,cdTxt});
    });

    // Shovel
    const sx=W-48, sy=H-SEED_H/2;
    const shovelBg=this.add.rectangle(sx,sy,44,68,0x3A1800).setDepth(19).setStrokeStyle(2,0x8C5A00);
    this.add.text(sx,sy-8,"X",{fontFamily:FONT,fontSize:"22px",color:"#C89050",stroke:"#3A1800",strokeThickness:4}).setOrigin(0.5).setDepth(20);
    this.add.text(sx,sy+18,"Shovel",{fontFamily:"Arial",fontSize:"10px",color:"#C89050"}).setOrigin(0.5).setDepth(20);
    shovelBg.setInteractive({useHandCursor:true});
    shovelBg.on("pointerup",()=>this._toggleShovel());
    this.shovelBtn=shovelBg;

    // Tooltip
    this.tooltip=this.add.container(0,0).setDepth(50).setVisible(false);
    const tipBg=this.add.rectangle(0,0,200,52,0x001A00,0.96).setStrokeStyle(2,0x78C832);
    this.tipTitle=this.add.text(-92,-20,"",{fontFamily:FONT,fontSize:"13px",color:"#78C832"});
    this.tipDesc=this.add.text(-92,-2,"",{fontFamily:"Arial",fontSize:"11px",color:"#FFFFFF",wordWrap:{width:184}});
    this.tooltip.add([tipBg,this.tipTitle,this.tipDesc]);
  }

  _showTooltip(pd,x,y) {
    this.tooltip.setPosition(x,y).setVisible(true);
    this.tipTitle.setText(pd.name);
    this.tipDesc.setText(pd.description||"");
  }
  _hideTooltip() { this.tooltip.setVisible(false); }
  _updateSunDisplay() {
    this.sunTxt?.setText(`${this.sun}`);
    this.seedCards?.forEach(sc=>{
      const pd=PLANTS[sc.key]; const ok=this.sun>=pd.cost;
      sc.bg.setAlpha(ok?1:0.55);
      sc.costTxt.setStyle({color:ok?"#FFFFC8":"#FF6666"});
    });
  }

  // ── Interaction ───────────────────────────────────────────────
  _handleClick(ptr) {
    if (this.phase!=="playing") return;
    const col=Math.floor((ptr.x-GRID_X)/CELL_W);
    const row=Math.floor((ptr.y-GRID_Y)/CELL_H);
    if (col<0||col>=COLS||row<0||row>=ROWS) return;
    if (this.shovelMode) { this._removePlantAt(col,row); this._toggleShovel(); return; }
    if (this.selectedSeed) this._placePlant(col,row,this.selectedSeed);
  }

  _selectSeed(key) {
    this.selectedSeed=key; this.shovelMode=false;
    this.seedCards.forEach(sc=>sc.bg.setFillStyle(sc.key===key?0x5AAA00:0x1C4A00).setStrokeStyle(2,sc.key===key?0xFFFFFF:0x4A8C00));
    this.shovelBtn.setFillStyle(0x3A1800);
  }

  _toggleShovel() {
    this.shovelMode=!this.shovelMode; this.selectedSeed=null;
    this.seedCards.forEach(sc=>sc.bg.setFillStyle(0x1C4A00).setStrokeStyle(2,0x4A8C00));
    this.shovelBtn.setFillStyle(this.shovelMode?0x6A3800:0x3A1800);
  }

  _canAfford(key) { return PLANTS[key]&&this.sun>=PLANTS[key].cost; }

  // ── Plant placement ───────────────────────────────────────────
  _placePlant(col,row,key) {
    if (this._plantAt(col,row)) { this._floatText("Occupied!",GRID_X+col*CELL_W+CELL_W/2,GRID_Y+row*CELL_H,"#FF6666"); return; }
    const pd=PLANTS[key];
    if (!pd) return;
    if (!this._canAfford(key)) { this._floatText(`Need ${pd.cost} sun`,GRID_X+col*CELL_W+CELL_W/2,GRID_Y+row*CELL_H,"#FF6666"); return; }

    this.sun-=pd.cost; this._updateSunDisplay();
    const {x,y}=this._cell(col,row);

    const imgKey=pd.sprite||`plant_${key}`;
    const sprite=this.add.image(x,y,this.textures.exists(imgKey)?imgKey:"plant_peashooter")
      .setDisplaySize(CELL_W-6,CELL_H-8).setDepth(10);
    // Plant-in bounce
    sprite.setScale(0.5,0.5);
    this.tweens.add({targets:sprite,scaleX:1,scaleY:1,duration:200,ease:"Back.easeOut"});

    const hpBg  =this.add.rectangle(x,y+CELL_H/2-7,CELL_W-10,6,0x111111).setDepth(11);
    const hpBar =this.add.rectangle(x-(CELL_W-10)/2,y+CELL_H/2-7,CELL_W-10,6,0x22CC22).setOrigin(0,0.5).setDepth(12);

    const p={
      col,row,key,sprite,hpBg,hpBar,
      hp:pd.hp, maxHp:pd.hp,
      nextShoot:this.time.now+(pd.shootRate||99999),
      nextSun:  this.time.now+(pd.sunRate||99999),
      placedAt: this.time.now,
      armTime:  pd.armDelay ? this.time.now+pd.armDelay : null,
      armed:    !pd.armDelay,
      chompCd:  0,
    };
    this.plants.push(p);
    if (pd.instant) this._triggerInstant(p);

    this.selectedSeed=null;
    this.seedCards.forEach(sc=>sc.bg.setFillStyle(0x1C4A00).setStrokeStyle(2,0x4A8C00));
    this._sfx("sfx_plant");
  }

  _triggerInstant(p) {
    const pd=PLANTS[p.key]; const {x,y}=this._cell(p.col,p.row);
    if (pd.aoe||pd.globalAoe) {
      const rng=pd.globalAoe?999:pd.aoeRange||1.5;
      const flash=this.add.rectangle(this.W/2,this.H/2,this.W,this.H,0xFFFFFF,0.5).setDepth(60);
      this.tweens.add({targets:flash,alpha:0,duration:350,onComplete:()=>flash.destroy()});
      this.zombies.forEach(z=>{
        if (Math.abs(z.row-p.row)<=rng&&Math.abs(z.x-p.col)<=rng+1) {
          z.hp-=pd.aoeDmg||1800;
          this._floatText(`-${pd.aoeDmg}`,GRID_X+z.x*CELL_W,GRID_Y+z.row*CELL_H+CELL_H/2-20,"#FF4400");
          if (z.hp<=0) this._killZombie(z);
        }
      });
      this._sfx("sfx_explosion"); this._destroyPlant(p);
    }
    if (pd.freeze) {
      const now=this.time.now;
      this.zombies.forEach(z=>{ z.frozen=true; z.freezeUntil=now+(pd.freezeMs||4500); });
      const fxRect=this.add.rectangle(this.W/2,this.H/2,this.W,this.H,0x8CDCFF,0.35).setDepth(60);
      this.tweens.add({targets:fxRect,alpha:0,duration:700,onComplete:()=>fxRect.destroy()});
      this._sfx("sfx_freeze"); this._destroyPlant(p);
    }
    if (pd.squash) {
      const targets=this.zombies.filter(z=>z.row===p.row&&!z.dying).sort((a,b)=>a.x-b.x);
      if (targets.length) {
        const t=targets[0];
        const tx=GRID_X+t.x*CELL_W, ty=GRID_Y+t.row*CELL_H+CELL_H/2;
        this.tweens.add({targets:p.sprite,x:tx,y:ty-40,duration:300,ease:"Quad.easeOut",
          onComplete:()=>this.tweens.add({targets:p.sprite,y:ty,duration:100,ease:"Bounce.out",
            onComplete:()=>{ this._killZombie(t); this._destroyPlant(p); }})});
      } else { this._destroyPlant(p); }
    }
  }

  _plantAt(col,row) { return this.plants.find(p=>p.col===col&&p.row===row)||null; }

  _removePlantAt(col,row) {
    const p=this._plantAt(col,row); if(p) this._destroyPlant(p);
  }

  _destroyPlant(p) {
    p.sprite?.destroy(); p.hpBg?.destroy(); p.hpBar?.destroy();
    const i=this.plants.indexOf(p); if(i!==-1) this.plants.splice(i,1);
  }

  _updatePlantHp(p) {
    if (!p.hpBar) return;
    const r=Math.max(0,p.hp/p.maxHp);
    p.hpBar.width=(CELL_W-10)*r;
    p.hpBar.setFillStyle(r>0.6?0x22CC22:r>0.3?0xDDCC20:0xCC2222);
  }

  // ── Game tick (100ms) ─────────────────────────────────────────
  _tick() {
    if (this.phase!=="playing") return;
    this.tick++;
    const now=this.time.now;

    // ── Plant actions ─────────────────────────────────────────
    for (const p of [...this.plants]) {
      const pd=PLANTS[p.key]; if(!pd) continue;
      // Sun production
      if (pd.sunProduction && now>=p.nextSun) { p.nextSun=now+pd.sunRate; this._dropSun(p); }
      // Lifetime
      if (pd.lifetime && now-p.placedAt>pd.lifetime) { this._destroyPlant(p); continue; }
      // Arm mine
      if (p.armTime && !p.armed && now>=p.armTime) { p.armed=true; this.tweens.add({targets:p.sprite,scale:1.1,duration:150,yoyo:true}); }
      // Chomp cooldown
      if (p.chompCd>0) p.chompCd-=100;

      // Zombies in same row ahead of this plant
      const rowZ=this.zombies.filter(z=>z.row===p.row&&!z.dying&&z.x>p.col).sort((a,b)=>a.x-b.x);
      if (!rowZ.length) continue;

      // Fume
      if (pd.fume && now>=p.nextShoot) {
        p.nextShoot=now+(pd.shootRate||3000);
        this.zombies.filter(z=>z.row===p.row&&!z.dying).forEach(z=>{z.hp-=pd.dmg||16;if(z.hp<=0)this._killZombie(z);});
      }
      // Shooting
      if (pd.shootRate && !pd.fume && now>=p.nextShoot) {
        p.nextShoot=now+pd.shootRate;
        const rows=pd.threeRow?[p.row-1,p.row,p.row+1].filter(r=>r>=0&&r<ROWS):[p.row];
        rows.forEach(r=>{
          this._firePea(p.col+0.8,r,pd.projType||"pea",pd.dmg||16,pd.slow||false);
          if (pd.doubleShot) this._firePea(p.col+0.4,r,pd.projType||"pea",pd.dmg||16,pd.slow||false);
        });
        this.tweens.add({targets:p.sprite,x:p.sprite.x+3,duration:50,yoyo:true});
      }
      // Chomp
      if (pd.chomp && p.chompCd<=0) {
        const near=rowZ.find(z=>z.x<p.col+1.6);
        if (near) { p.chompCd=pd.rechargeTicks||44000; this._killZombie(near); this.tweens.add({targets:p.sprite,scaleX:1.3,scaleY:0.7,duration:120,yoyo:true}); }
      }
      // Mine
      if (p.armed && pd.mine) {
        const boom=rowZ.find(z=>z.x<p.col+0.7);
        if (boom) {
          this.zombies.filter(z=>z.row===p.row&&!z.dying&&z.x<p.col+2).forEach(z=>{z.hp-=pd.mineDmg||1800;if(z.hp<=0)this._killZombie(z);});
          this._sfx("sfx_explosion"); this._destroyPlant(p);
        }
      }
    }

    // ── Projectile movement ───────────────────────────────────
    for (const proj of [...this.projectiles]) {
      proj.x+=3.8; // px per tick
      const sx=GRID_X+proj.x; if(proj.sprite) proj.sprite.x=sx;
      if (sx>GRID_X+GRID_W+30) { proj.sprite?.destroy(); this.projectiles.splice(this.projectiles.indexOf(proj),1); continue; }
      let hit=false;
      for (const z of this.zombies) {
        if (z.dying||z.row!==proj.row) continue;
        if (Math.abs(GRID_X+z.x*CELL_W-sx)<26) {
          z.hp-=proj.dmg;
          if (proj.slow) { z.frozen=true; z.freezeUntil=now+2200; }
          this._floatText(`-${proj.dmg}`,GRID_X+z.x*CELL_W,GRID_Y+z.row*CELL_H+CELL_H/2-22,"#FF4400");
          if (z.hp<=0) this._killZombie(z);
          hit=true; this._sfx("sfx_pea_hit"); break;
        }
      }
      if (hit) { this._peaHitFx(sx,GRID_Y+proj.row*CELL_H+CELL_H/2); proj.sprite?.destroy(); this.projectiles.splice(this.projectiles.indexOf(proj),1); }
    }

    // ── Zombie movement ───────────────────────────────────────
    for (const z of [...this.zombies]) {
      if (z.dying) continue;
      if (z.frozen && now<z.freezeUntil) continue;
      z.frozen=false;

      const zd=ZOMBIES[z.type]||ZOMBIES.regular;
      const spd=zd.speed; // px/s → per 100ms tick = spd/10
      const col=Math.floor(z.x);
      const plantAhead=this._plantAt(col,z.row)||this._plantAt(col-1,z.row);

      if (plantAhead && z.x<plantAhead.col+0.95) {
        // Attack plant
        plantAhead.hp-=zd.dmg*0.1;
        this._updatePlantHp(plantAhead);
        if (plantAhead.hp<=0) { this._destroyPlant(plantAhead); this._floatText("Nom!",GRID_X+plantAhead.col*CELL_W+CELL_W/2,GRID_Y+plantAhead.row*CELL_H,"#FF9900"); }
        // Eat animation
        if (this.tick%7===0 && z.sprite) this.tweens.add({targets:z.sprite,y:z.sprite.y+3,duration:80,yoyo:true});
      } else {
        z.x-=spd/10/CELL_W*10; // normalise to col-units per tick
        if (z.sprite) {
          z.sprite.x=GRID_X+z.x*CELL_W;
          z.hpBg.x=z.sprite.x; z.hpBar.x=z.sprite.x-z.barW/2;
          // Walk bob
          if (this.tick%4===0) this.tweens.add({targets:z.sprite,y:z.sprite.y-2,duration:80,yoyo:true,ease:"Sine"});
        }
      }

      // Lawnmower trigger
      if (z.x<0.35) {
        const lm=this.lawnmowers.find(l=>l.row===z.row&&l.active);
        if (lm) {
          lm.active=false;
          const lmSprite=this.lawnmowerSprites[z.row];
          this.tweens.add({targets:lmSprite,x:GRID_X+GRID_W+60,duration:800,ease:"Quad.easeIn",onComplete:()=>lmSprite.setVisible(false)});
          this.zombies.filter(zz=>zz.row===z.row&&!zz.dying).forEach(zz=>this._killZombie(zz));
          this._sfx("sfx_lawnmower");
          this._floatText("LAWNMOWER!",GRID_X+CELL_W*2,GRID_Y+z.row*CELL_H+CELL_H/2,"#FFD800");
          continue;
        }
        // No lawnmower — GAME OVER
        this._gameOver();
        return;
      }
    }

    // ── Check wave complete ───────────────────────────────────
    this._checkWaveComplete();
  }

  // ── Wave management ───────────────────────────────────────────
  _beginWave() {
    if (this.phase!=="playing") return;
    if (this.wave>=this.levelData.maxWaves) return;

    this.wave++;
    this.waveActive=true;
    this.queueRunning=true;
    this.pendingSpawns=[];

    const waveDef=this.levelData.waves[this.wave-1];
    if (!waveDef) { this.waveActive=false; this.queueRunning=false; return; }

    // Build spawn queue
    let offset=0;
    waveDef.forEach(group=>{
      for (let i=0;i<group.count;i++) {
        const row=group.rows[i%group.rows.length];
        this.pendingSpawns.push({type:group.type,row,delay:offset});
        offset+=1800+Phaser.Math.Between(0,500);
      }
    });

    // Count total zombies for this wave
    this.zombieCount=this.pendingSpawns.length;

    this._updateWaveBar();
    this._waveBanner(`Wave ${this.wave}`);
    if (this.wave===this.levelData.maxWaves) this._sfx("sfx_wave_flag");
  }

  _processSpawnQueue() {
    if (this.phase!=="playing" || !this.queueRunning) return;
    if (this.pendingSpawns.length===0) { this.queueRunning=false; return; }
    const next=this.pendingSpawns.shift();
    this._spawnZombie(next.type,next.row);
  }

  _checkWaveComplete() {
    // Only transition if wave is active AND no pending spawns AND no alive zombies
    if (!this.waveActive) return;
    if (this.queueRunning) return;
    if (this.pendingSpawns.length>0) return;
    const aliveZombies=this.zombies.filter(z=>!z.dying).length;
    if (aliveZombies>0) return;

    // Wave is complete
    this.waveActive=false;

    if (this.wave>=this.levelData.maxWaves) {
      this.time.delayedCall(1200,()=>this._victory());
    } else {
      this._waveBanner("Wave Cleared!");
      this.time.delayedCall(2400,()=>this._showNextWaveBtn());
    }
  }

  _showNextWaveBtn() {
    if (this.phase!=="playing"||this.waveActive) return;
    const W=this.W, H=this.H;
    const C=this.add.container(W/2,H-SEED_H-44).setDepth(40);
    const bg=this.add.rectangle(0,0,220,46,0x1C5C00).setStrokeStyle(2.5,0xFFFFFF);
    const txt=this.add.text(0,0,"NEXT WAVE",{fontFamily:FONT,fontSize:"20px",color:"#FFFFFF",stroke:"#003300",strokeThickness:5}).setOrigin(0.5);
    C.add([bg,txt]);
    this.tweens.add({targets:C,y:C.y-5,duration:600,yoyo:true,repeat:-1,ease:"Sine"});
    bg.setInteractive({useHandCursor:true});
    bg.on("pointerover",()=>bg.setFillStyle(0x2E8A00));
    bg.on("pointerout", ()=>bg.setFillStyle(0x1C5C00));
    bg.on("pointerup",  ()=>{ C.destroy(); this._beginWave(); });
    this.nextWaveBtn=C;
  }

  _waveBanner(text) {
    const b=this.add.text(this.W/2,this.H/2-50,text,{
      fontFamily:FONT,fontSize:"52px",color:"#FF6420",stroke:"#2A0A00",strokeThickness:9,
      shadow:{x:4,y:4,color:"#000",blur:5,fill:true},
    }).setOrigin(0.5).setDepth(60).setAlpha(0).setScale(0.5);
    this.tweens.add({targets:b,alpha:1,scaleX:1,scaleY:1,duration:300,ease:"Back.easeOut",
      onComplete:()=>this.tweens.add({targets:b,alpha:0,duration:500,delay:1100,ease:"Quad.easeIn",onComplete:()=>b.destroy()})});
  }

  _updateWaveBar() {
    if (!this.waveBarFill||!this.waveLbl) return;
    const bw=200, bx=this.W/2-bw/2;
    const pct=Math.min((this.wave)/this.levelData.maxWaves,1);
    this.waveBarFill.width=bw*pct;
    this.waveLbl.setText(`Wave ${this.wave} / ${this.levelData.maxWaves}`);
  }

  // ── Spawn zombie ──────────────────────────────────────────────
  _spawnZombie(type,row) {
    const zd=ZOMBIES[type]||ZOMBIES.regular;
    const startX=COLS+0.5;
    const sy=GRID_Y+row*CELL_H+CELL_H/2;
    const scale=zd.scale||1.0;
    const sw=Math.round(CELL_W*scale*1.05), sh=Math.round(CELL_H*scale*1.45);

    const sprite=this.add.image(GRID_X+startX*CELL_W,sy,
      this.textures.exists(zd.sprite)?zd.sprite:"zombie_regular")
      .setDisplaySize(sw,sh).setDepth(10+row).setFlipX(true);

    // HP bar
    const barW=Math.round(sw*0.88);
    const hpBg =this.add.rectangle(sprite.x,sy+sh/2-6,barW,6,0x111111).setDepth(11+row);
    const hpBar=this.add.rectangle(sprite.x-barW/2,sy+sh/2-6,barW,6,0x22CC22).setOrigin(0,0.5).setDepth(12+row);

    const z={
      id:this.nextZombieId++, type, row, sprite, hpBg, hpBar, barW,
      x:startX, hp:zd.hp, maxHp:zd.hp,
      frozen:false, freezeUntil:0, dying:false,
    };
    this.zombies.push(z);
    if (Math.random()<0.35) this._sfx("sfx_zombie_groan");
    return z;
  }

  _killZombie(z) {
    if (z.dying) return;
    z.dying=true;
    this.zombies.filter(p=>p.id===z.id&&p!==z).forEach(dup=>dup.dying=true);
    this.tweens.add({
      targets:[z.sprite,z.hpBg,z.hpBar],
      alpha:0, y:(z.sprite?.y||0)+18, duration:520, ease:"Quad.easeIn",
      onComplete:()=>{
        z.sprite?.destroy(); z.hpBg?.destroy(); z.hpBar?.destroy();
        const i=this.zombies.indexOf(z); if(i!==-1) this.zombies.splice(i,1);
      }
    });
  }

  // ── Projectiles ───────────────────────────────────────────────
  _firePea(fromCol,row,type,dmg,slow) {
    const startX=fromCol*CELL_W;
    const y=GRID_Y+row*CELL_H+CELL_H/2-7;
    const key=type==="snowpea"?"proj_snowpea":type==="fire"?"proj_fire":"proj_pea";
    const sprite=this.add.image(GRID_X+startX,y,this.textures.exists(key)?key:"proj_pea")
      .setDisplaySize(18,18).setDepth(15);
    this.projectiles.push({x:startX,y,row,type,dmg,slow,sprite});
  }

  _peaHitFx(x,y) {
    for (let i=0;i<5;i++){
      const p=this.add.circle(x,y,Phaser.Math.Between(3,8),0x50C850,0.9).setDepth(16);
      const a=Phaser.Math.Between(0,360)*Math.PI/180;
      this.tweens.add({targets:p,x:x+Math.cos(a)*18,y:y+Math.sin(a)*18-8,alpha:0,duration:280,ease:"Quad.easeOut",onComplete:()=>p.destroy()});
    }
  }

  // ── Sun ────────────────────────────────────────────────────────
  _dropSun(sourcePlant) {
    const H=this.H;
    const x=sourcePlant
      ?this._cell(sourcePlant.col,sourcePlant.row).x+Phaser.Math.Between(-14,14)
      :Phaser.Math.Between(GRID_X+30,GRID_X+GRID_W-30);
    const y=sourcePlant?this._cell(sourcePlant.col,sourcePlant.row).y-28:Phaser.Math.Between(30,60);
    const destY=Math.min(y+Phaser.Math.Between(60,110),H-SEED_H-20);

    const orb=this.add.circle(x,y,19,0xFFD800,1).setDepth(30);
    this.add.circle(x,y,19,0xFFD800,1);  // outer glow
    const ico=this.add.text(x,y,"*",{fontFamily:FONT,fontSize:"18px",color:"#FFB800",stroke:"#664400",strokeThickness:3}).setOrigin(0.5).setDepth(31);

    this.tweens.add({targets:[orb,ico],y:destY,duration:1100,ease:"Bounce.out",
      onComplete:()=>{
        orb.setInteractive({useHandCursor:true});
        orb.on("pointerup",()=>{
          this.sun+=25; this._updateSunDisplay(); this._sfx("sfx_sun_collect");
          this._floatText("+25",x,destY-18,"#FFD800");
          this.tweens.add({targets:[orb,ico],alpha:0,scale:1.4,duration:220,onComplete:()=>{orb.destroy();ico.destroy();}});
        });
        this.time.delayedCall(8000,()=>{ if(orb.active){orb.destroy();ico.destroy();} });
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  _cell(col,row) { return { x:GRID_X+col*CELL_W+CELL_W/2, y:GRID_Y+row*CELL_H+CELL_H/2 }; }

  _floatText(text,x,y,color="#FFFFFF") {
    const t=this.add.text(x,y,text,{fontFamily:FONT,fontSize:"14px",color,stroke:"#000000",strokeThickness:4}).setOrigin(0.5).setDepth(50);
    this.tweens.add({targets:t,y:y-34,alpha:0,duration:850,ease:"Quad.easeOut",onComplete:()=>t.destroy()});
  }

  _sfx(key) { try{ if(this.cache.audio.exists(key)) this.sound.play(key,{volume:0.5}); }catch(_){} }

  // ── Game Over ──────────────────────────────────────────────────
  _gameOver() {
    if (this.phase==="gameover") return;
    this.phase="gameover"; this.bgm?.stop();
    this.cameras.main.shake(400,0.016);
    const ov=this.add.rectangle(this.W/2,this.H/2,this.W,this.H,0x000000,0.74).setDepth(80);
    const title=this.add.text(this.W/2,this.H/2-70,"GAME OVER",{
      fontFamily:FONT,fontSize:"60px",color:"#CC2222",stroke:"#440000",strokeThickness:11,
    }).setOrigin(0.5).setDepth(81).setAlpha(0);
    this.tweens.add({targets:title,alpha:1,scaleX:1,scaleY:1,duration:500,ease:"Bounce.out"});
    this.time.delayedCall(1400,()=>{
      this._endBtn(this.W/2,this.H/2+20,"Try Again",0x1C5C00,()=>this.scene.restart({levelIndex:this.levelIndex}));
      this._endBtn(this.W/2,this.H/2+80,"Level Select",0x004488,()=>this._quitToMenu());
    });
  }

  // ── Victory ────────────────────────────────────────────────────
  _victory() {
    if (this.phase==="victory") return;
    this.phase="victory"; this.bgm?.stop(); this._sfx("sfx_level_complete");
    this._saveProgress();
    // Stars burst
    for(let i=0;i<16;i++){
      const star=this.add.text(Phaser.Math.Between(80,this.W-80),Phaser.Math.Between(40,180),"*",
        {fontFamily:FONT,fontSize:`${Phaser.Math.Between(20,38)}px`,color:"#FFD800"}).setDepth(80).setAlpha(0);
      this.tweens.add({targets:star,alpha:1,y:`-=${Phaser.Math.Between(30,100)}`,delay:i*70,duration:700,ease:"Quad.easeOut",
        onComplete:()=>this.tweens.add({targets:star,alpha:0,duration:300,onComplete:()=>star.destroy()})});
    }
    const ov=this.add.rectangle(this.W/2,this.H/2,this.W,this.H,0x000000,0.58).setDepth(79);
    this.add.text(this.W/2,this.H/2-90,"YOU WIN!",{fontFamily:FONT,fontSize:"60px",color:"#FFD828",stroke:"#442200",strokeThickness:11}).setOrigin(0.5).setDepth(81);
    const unlocks=this.levelData.unlockPlants||[];
    if (unlocks.length) {
      this.add.text(this.W/2,this.H/2-20,`Unlocked: ${unlocks.join(", ")}`,{
        fontFamily:FONT,fontSize:"16px",color:"#FFFFC8",stroke:"#000",strokeThickness:4,
      }).setOrigin(0.5).setDepth(81);
    }
    this.time.delayedCall(1400,()=>{
      if (this.levelIndex+1<LEVELS.length)
        this._endBtn(this.W/2,this.H/2+30,"Next Level",0x1C5C00,()=>this.scene.start("GameScene",{levelIndex:this.levelIndex+1}));
      this._endBtn(this.W/2,this.H/2+90,"Level Select",0x004488,()=>this._quitToMenu());
    });
  }

  _saveProgress() {
    try {
      const prevStars=(this.registry.get("levelStars")||{})[this.levelIndex]||0;
      const allStars={...(this.registry.get("levelStars")||{}),[this.levelIndex]:Math.max(prevStars,3)};
      this.registry.set("levelStars",allStars);
      const ulArr=this.registry.get("unlockedLevels")||[0];
      if (!ulArr.includes(this.levelIndex+1)&&this.levelIndex+1<LEVELS.length) ulArr.push(this.levelIndex+1);
      this.registry.set("unlockedLevels",ulArr);
      const knownPlants=this.registry.get("unlockedPlants")||[];
      (this.levelData.unlockPlants||[]).forEach(p=>{ if(!knownPlants.includes(p)) knownPlants.push(p); });
      this.registry.set("unlockedPlants",knownPlants);
      localStorage.setItem("pvz_progress",JSON.stringify({
        levelStars:allStars,unlockedLevels:ulArr,unlockedPlants:knownPlants,
      }));
    } catch(_){}
  }

  _endBtn(x,y,label,color,cb) {
    const C=this.add.container(x,y).setDepth(82);
    const bg=this.add.rectangle(0,0,240,50,color).setStrokeStyle(3,0xFFFFFF);
    const txt=this.add.text(0,0,label,{fontFamily:FONT,fontSize:"20px",color:"#FFFFFF",stroke:"#000000",strokeThickness:4}).setOrigin(0.5);
    C.add([bg,txt]); C.setAlpha(0); this.tweens.add({targets:C,alpha:1,duration:350,delay:100});
    bg.setInteractive({useHandCursor:true});
    bg.on("pointerover",()=>bg.setFillStyle(Phaser.Display.Color.ValueToColor(color).brighten(30).color));
    bg.on("pointerout", ()=>bg.setFillStyle(color));
    bg.on("pointerup",  ()=>cb());
    return C;
  }

  _quitToMenu() { this.bgm?.stop(); this.sound.stopAll(); this.cameras.main.fade(300,0,0,0,true,(_,p)=>{ if(p===1) this.scene.start("LevelSelectScene"); }); }

  // ── Tutorial ──────────────────────────────────────────────────
  _runTutorial() {
    this.registry.set("tutorialDone",true);
    const W=this.W, H=this.H;
    let step=0;

    const steps=[
      {
        title:"Welcome to Plants Mayhem!",
        body:"Your lawn is under zombie attack!\nCollect SUN to plant defenses and stop them.",
        spotlight:[0,0,140,TOP_H],
        arrow:{x:70,y:TOP_H+20,dir:"up"},
      },
      {
        title:"Choose Your Plants",
        body:"Select a plant card from the bottom bar.\nEach costs sun. Sunflowers produce more sun!",
        spotlight:[0,H-SEED_H,W/2,SEED_H],
        arrow:{x:W/4,y:H-SEED_H-18,dir:"down"},
      },
      {
        title:"Plant on the Lawn",
        body:"Click any green cell to place your selected plant.\nStrategy matters — protect every lane!",
        spotlight:[GRID_X,GRID_Y,GRID_W,GRID_H],
      },
      {
        title:"Stop the Zombies!",
        body:"Zombies enter from the RIGHT side.\nPlant Peashooters to shoot them down.",
        spotlight:[GRID_X+6*CELL_W,GRID_Y,3*CELL_W,GRID_H],
        arrow:{x:GRID_X+7.5*CELL_W,y:GRID_Y+GRID_H/2,dir:"right"},
      },
      {
        title:"Lawnmowers Save You — Once",
        body:"If a zombie reaches the left edge, the lawnmower\ntriggers automatically — but only ONCE per lane!\nAfter that, a zombie reaching your edge = GAME OVER.",
        spotlight:[0,GRID_Y,GRID_X+20,GRID_H],
      },
    ];

    const dimRect=this.add.rectangle(W/2,H/2,W,H,0x000000,0).setDepth(90).setInteractive();
    const spotGfx=this.add.graphics().setDepth(91);
    const panelC=this.add.container(W/2,H/2+85).setDepth(93);
    const panelBg=this.add.rectangle(0,0,540,130,0x001200,0.97).setStrokeStyle(3,0x78C832);
    const titleTxt=this.add.text(0,-46,"",{fontFamily:FONT,fontSize:"18px",color:"#78C832",stroke:"#003300",strokeThickness:4}).setOrigin(0.5);
    const bodyTxt =this.add.text(0,-8,"",{fontFamily:"Arial",fontSize:"14px",color:"#FFFFFF",align:"center",wordWrap:{width:510}}).setOrigin(0.5);
    const nextTxt =this.add.text(0,52,"[ NEXT ]",{fontFamily:FONT,fontSize:"17px",color:"#FFD800",stroke:"#332200",strokeThickness:4}).setOrigin(0.5).setInteractive({useHandCursor:true});
    const skipTxt =this.add.text(200,52,"[ SKIP ALL ]",{fontFamily:"Arial",fontSize:"13px",color:"#666666"}).setOrigin(0.5).setInteractive({useHandCursor:true});
    const stepTxt =this.add.text(-220,-46,"",{fontFamily:"Arial",fontSize:"12px",color:"#666666"}).setOrigin(0,0.5);
    panelC.add([panelBg,titleTxt,bodyTxt,nextTxt,skipTxt,stepTxt]);

    let arrowShape=null;

    const show=()=>{
      if(step>=steps.length){cleanup();return;}
      const s=steps[step];
      // Update text
      titleTxt.setText(s.title);
      bodyTxt.setText(s.body);
      stepTxt.setText(`${step+1} / ${steps.length}`);
      nextTxt.setText(step===steps.length-1?"[ START GAME ]":"[ NEXT ]");

      // Spotlight
      dimRect.setAlpha(0.72);
      spotGfx.clear();
      if(s.spotlight){
        const[sx,sy,sw,sh]=s.spotlight;
        // Cutout via composite
        spotGfx.fillStyle(0x000000,0); spotGfx.fillRect(sx,sy,sw,sh);
        spotGfx.lineStyle(3,0xFFD828,1); spotGfx.strokeRect(sx,sy,sw,sh);
        // Gold pulsing border
        this.tweens.add({targets:spotGfx,alpha:0.7,duration:600,yoyo:true,repeat:2});
      }

      // Arrow
      arrowShape?.destroy(); arrowShape=null;
      if(s.arrow){
        const{x:ax,y:ay,dir}=s.arrow;
        arrowShape=this.add.triangle(ax,ay,0,0,16,0,8,dir==="up"?-18:18,0xFFD828).setDepth(94);
        this.tweens.add({targets:arrowShape,y:ay+(dir==="up"?-8:8),duration:400,yoyo:true,repeat:-1});
      }

      // Panel slide-in
      this.tweens.add({targets:panelC,scaleX:1,scaleY:1,alpha:1,duration:250,ease:"Back.easeOut"});
    };

    nextTxt.on("pointerover",()=>nextTxt.setStyle({color:"#FFFFFF"}));
    nextTxt.on("pointerout", ()=>nextTxt.setStyle({color:"#FFD800"}));
    nextTxt.on("pointerup",  ()=>{step++;show();});
    skipTxt.on("pointerup",  ()=>cleanup());

    const cleanup=()=>{
      dimRect.destroy(); spotGfx.destroy(); panelC.destroy(); arrowShape?.destroy();
      this._beginWave();
    };

    // Animate panel in
    panelC.setScale(0.7,0.7).setAlpha(0);
    this.time.delayedCall(200,()=>show());
  }
}
