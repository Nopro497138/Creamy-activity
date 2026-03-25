// MenuScene.js — Main menu
export default class MenuScene extends Phaser.Scene {
  constructor() { super("MenuScene"); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.W = W; this.H = H;

    // Background
    const bg = this.add.image(W/2, H/2, "bg_day").setDisplaySize(W, H);
    this.add.rectangle(W/2, H/2, W, H, 0x001800, 0.55);

    // Logo
    if (this.textures.exists("logo")) {
      const logo = this.add.image(W/2, H/2 - 90, "logo");
      const scale = Math.min((W * 0.65) / logo.width, (H * 0.42) / logo.height);
      logo.setScale(scale);
      this.tweens.add({ targets:logo, y: logo.y - 10, duration:2200, yoyo:true, repeat:-1, ease:"Sine.easeInOut" });
    }

    // Animated sun particles
    this._spawnSunParticles();

    // Buttons
    this._btn(W/2, H/2 + 80,  "START GAME", () => { this.sound.stopAll(); this.scene.start("LevelSelectScene"); });
    this._btn(W/2, H/2 + 148, "HOW TO PLAY", () => this._howToPlay());

    // Discord user display
    const user = this.registry.get("discordUser");
    if (user?.username) {
      const avatar = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`
        : null;
      this.add.text(W - 12, 12,
        `Logged in as ${user.global_name || user.username}`,
        { fontFamily:"'PoppinsBlack',Arial", fontSize:"13px", color:"#FFFFC8", stroke:"#000000", strokeThickness:3 }
      ).setOrigin(1,0).setDepth(10);

      // Reset progress button
      const reset = this.add.text(W - 12, H - 14,
        "Reset Progress",
        { fontFamily:"'PoppinsBlack',Arial", fontSize:"12px", color:"#888888", stroke:"#000", strokeThickness:2 }
      ).setOrigin(1,1).setDepth(10).setInteractive({ useHandCursor:true });
      reset.on("pointerover", () => reset.setStyle({ color:"#FF6666" }));
      reset.on("pointerout",  () => reset.setStyle({ color:"#888888" }));
      reset.on("pointerup",   () => this._confirmReset());
    }

    // Music
    if (!this.sound.get("music_menu") || !this.sound.get("music_menu")?.isPlaying) {
      try { this.sound.add("music_menu",{ loop:true, volume:0.45 }).play(); } catch(_){}
    }

    this.add.text(8, H-16, "Plants Mayhem v1.0", {
      fontFamily:"Arial", fontSize:"11px", color:"#555555",
    });
  }

  _btn(x, y, label, cb) {
    const C = this.add.container(x, y).setDepth(5);
    const bg = this.add.rectangle(0, 0, 270, 50, 0x1C5C00, 1)
      .setStrokeStyle(2.5, 0x78C832, 1);
    const txt = this.add.text(0, 0, label, {
      fontFamily:"'PoppinsBlack',Arial Black,sans-serif",
      fontSize:"20px", color:"#FFFFFF",
      stroke:"#003300", strokeThickness:5,
    }).setOrigin(0.5);
    C.add([bg, txt]);
    bg.setInteractive({ useHandCursor:true })
      .on("pointerover",  () => { bg.setFillStyle(0x2E8A00); this.tweens.add({targets:C,scaleX:1.05,scaleY:1.05,duration:80}); })
      .on("pointerout",   () => { bg.setFillStyle(0x1C5C00); this.tweens.add({targets:C,scaleX:1,scaleY:1,duration:80}); })
      .on("pointerdown",  () => bg.setFillStyle(0x0E3000))
      .on("pointerup",    () => { bg.setFillStyle(0x2E8A00); cb(); });
    return C;
  }

  _spawnSunParticles() {
    const W = this.W, H = this.H;
    for (let i = 0; i < 8; i++) {
      const sun = this.add.circle(
        Phaser.Math.Between(80, W - 80),
        Phaser.Math.Between(80, H - 100),
        Phaser.Math.Between(10, 22), 0xFFD800, 0.85
      );
      this.tweens.add({
        targets:sun, y: sun.y - Phaser.Math.Between(40,100), alpha:0, scale:0.3,
        duration:Phaser.Math.Between(2200,4500), ease:"Quad.easeOut",
        delay:Phaser.Math.Between(0,4000), repeat:-1,
        onRepeat:()=>{ sun.x=Phaser.Math.Between(80,W-80); sun.y=Phaser.Math.Between(H/2,H-80); sun.alpha=0.85; sun.scale=1; }
      });
    }
  }

  _howToPlay() {
    const W = this.W, H = this.H;
    const ov = this.add.rectangle(W/2,H/2,W,H,0x000000,0.8).setDepth(20).setInteractive();
    const panel = this.add.container(W/2,H/2).setDepth(21);
    const bg    = this.add.rectangle(0,0,580,360,0x001800,0.97).setStrokeStyle(3,0x78C832);
    const title = this.add.text(0,-155,"HOW TO PLAY",{fontFamily:"'PoppinsBlack',Arial Black",fontSize:"24px",color:"#78C832",stroke:"#003300",strokeThickness:5}).setOrigin(0.5);
    const lines = [
      "Collect SUN to buy and place plants on the lawn.",
      "Select a plant card at the bottom, then click a cell.",
      "Zombies enter from the RIGHT — stop them with plants!",
      "If zombies reach the left edge, the lawnmower triggers once.",
      "If all lawnmowers are used and zombies get through: GAME OVER!",
      "Complete levels to unlock new plants.",
    ];
    const body = this.add.text(-265,-110, lines.join("\n\n"),{
      fontFamily:"Arial",fontSize:"15px",color:"#FFFFFF",lineSpacing:4,wordWrap:{width:530},
    });
    const close = this.add.text(0,155,"[ CLOSE ]",{fontFamily:"'PoppinsBlack',Arial Black",fontSize:"18px",color:"#FF9900",stroke:"#441100",strokeThickness:4}).setOrigin(0.5).setInteractive({useHandCursor:true});
    close.on("pointerup",()=>{ panel.destroy(); ov.destroy(); });
    panel.add([bg,title,body,close]);
    this.tweens.add({targets:panel,y:H/2,scaleX:1,scaleY:1,alpha:1,duration:280,ease:"Back.easeOut",from:()=>({y:H/2+60,scaleX:0.8,scaleY:0.8,alpha:0})});
  }

  _confirmReset() {
    const W = this.W, H = this.H;
    const ov = this.add.rectangle(W/2,H/2,W,H,0x000000,0.7).setDepth(30).setInteractive();
    const panel = this.add.container(W/2,H/2).setDepth(31);
    const bg    = this.add.rectangle(0,0,420,180,0x1A0000,0.98).setStrokeStyle(3,0xFF2222);
    const title = this.add.text(0,-60,"Reset all progress?",{fontFamily:"'PoppinsBlack',Arial Black",fontSize:"20px",color:"#FF4444",stroke:"#440000",strokeThickness:4}).setOrigin(0.5);
    const desc  = this.add.text(0,-15,"This cannot be undone.",{fontFamily:"Arial",fontSize:"14px",color:"#CCCCCC"}).setOrigin(0.5);
    const yesBtn= this.add.text(-70,50,"YES, RESET",{fontFamily:"'PoppinsBlack',Arial Black",fontSize:"16px",color:"#FF4444",stroke:"#000",strokeThickness:3}).setOrigin(0.5).setInteractive({useHandCursor:true});
    const noBtn = this.add.text(70,50,"CANCEL",{fontFamily:"'PoppinsBlack',Arial Black",fontSize:"16px",color:"#78C832",stroke:"#000",strokeThickness:3}).setOrigin(0.5).setInteractive({useHandCursor:true});
    yesBtn.on("pointerup",()=>{
      this.registry.set("levelStars",{});
      this.registry.set("unlockedLevels",[0]);
      this.registry.set("unlockedPlants",["peashooter","sunflower","wallnut"]);
      this._saveProgress();
      panel.destroy(); ov.destroy();
      this.scene.restart();
    });
    noBtn.on("pointerup",()=>{ panel.destroy(); ov.destroy(); });
    panel.add([bg,title,desc,yesBtn,noBtn]);
  }

  _saveProgress() {
    try {
      const data = {
        levelStars:     this.registry.get("levelStars") || {},
        unlockedLevels: this.registry.get("unlockedLevels") || [0],
        unlockedPlants: this.registry.get("unlockedPlants") || [],
      };
      localStorage.setItem("pvz_progress", JSON.stringify(data));
    } catch(_){}
  }
}
