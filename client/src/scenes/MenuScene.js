// MenuScene.js — Main menu with animated elements and music
export default class MenuScene extends Phaser.Scene {
  constructor() { super("MenuScene"); }

  create() {
    const W = this.scale.width, H = this.scale.height;

    // ── Background ────────────────────────────────────────────────
    const bg = this.add.image(W/2, H/2, "bg_day").setDisplaySize(W, H);

    // Green overlay fade
    const overlay = this.add.rectangle(W/2, H/2, W, H, 0x004000, 0.45);

    // ── Title Logo ────────────────────────────────────────────────
    // Animated title text (mimics PvZ style)
    const titleStyle = {
      fontFamily: "'Arial Black', Impact, sans-serif",
      fontSize: "62px",
      fill: "#78c832",
      stroke: "#004400",
      strokeThickness: 8,
      shadow: { offsetX:4, offsetY:4, color:"#001800", blur:8, fill:true },
    };
    const t1 = this.add.text(W/2, H/2 - 160, "PLANTS", titleStyle).setOrigin(0.5);
    const vsStyle = { ...titleStyle, fontSize:"36px", fill:"#FFFFFF", stroke:"#880000" };
    const t2 = this.add.text(W/2, H/2 - 100, "vs.", vsStyle).setOrigin(0.5);
    const t3 = this.add.text(W/2, H/2 - 40, "ZOMBIES", { ...titleStyle, fill:"#FF5500", stroke:"#440000" }).setOrigin(0.5);

    // Title bounce animation
    [t1, t3].forEach((t, i) => {
      this.tweens.add({
        targets: t, y: t.y - 12, duration: 1200, yoyo: true, repeat: -1,
        ease: "Sine.easeInOut", delay: i * 300,
      });
    });

    // ── Animated sun particles ────────────────────────────────────
    for (let i = 0; i < 6; i++) {
      const sun = this.add.circle(
        Phaser.Math.Between(80, W - 80),
        Phaser.Math.Between(60, H - 100),
        Phaser.Math.Between(14, 28), 0xFFD800
      );
      sun.setAlpha(0.7 + Math.random() * 0.3);
      this.tweens.add({
        targets: sun,
        y: sun.y - Phaser.Math.Between(30, 80),
        alpha: 0,
        scale: 0.3,
        duration: Phaser.Math.Between(2000, 4000),
        ease: "Quad.easeOut",
        delay: Phaser.Math.Between(0, 3000),
        repeat: -1,
        onRepeat: () => {
          sun.x = Phaser.Math.Between(80, W - 80);
          sun.y = Phaser.Math.Between(H / 2, H - 80);
          sun.alpha = 0.7;
          sun.scale = 1;
        },
      });
    }

    // ── Buttons ───────────────────────────────────────────────────
    this._makeButton(W/2, H/2 + 60,  "▶  START GAME", 0x226600, 0x44AA00, () => {
      this.scene.start("LevelSelectScene");
    });
    this._makeButton(W/2, H/2 + 130, "HOW TO PLAY",   0x004488, 0x0077CC, () => {
      this._showHowToPlay();
    });

    // ── Music ─────────────────────────────────────────────────────
    if (!this.sound.get("bgm_menu")) {
      try {
        const music = this.sound.add("music_menu", { loop: true, volume: 0.5 });
        music.play();
      } catch(e) { /* no audio */ }
    }

    // ── Discord user display ───────────────────────────────────────
    const user = this.registry.get("discordUser");
    if (user?.username) {
      this.add.text(W - 12, 12, `👤 ${user.username}`, {
        fontSize:"13px", fill:"#FFFFC8",
        stroke:"#000", strokeThickness:3,
      }).setOrigin(1, 0);
    }

    // ── Version ───────────────────────────────────────────────────
    this.add.text(8, H - 18, "PvZ Discord Activity v1.0", { fontSize:"11px", fill:"#888" });
  }

  _makeButton(x, y, label, bg, hover, cb) {
    const btn = this.add.container(x, y);

    const bgRect = this.add.rectangle(0, 0, 280, 52, bg, 1)
      .setStrokeStyle(3, 0xFFFFFF, 0.6);
    const txt = this.add.text(0, 0, label, {
      fontFamily: "'Arial Black', sans-serif",
      fontSize: "20px", fill: "#FFFFFF",
      stroke: "#000", strokeThickness: 4,
    }).setOrigin(0.5);

    btn.add([bgRect, txt]);
    bgRect.setInteractive({ useHandCursor: true })
      .on("pointerover",  () => { bgRect.setFillStyle(hover); this.tweens.add({ targets:btn, scaleX:1.05, scaleY:1.05, duration:100 }); })
      .on("pointerout",   () => { bgRect.setFillStyle(bg);    this.tweens.add({ targets:btn, scaleX:1, scaleY:1, duration:100 }); })
      .on("pointerdown",  () => { bgRect.setFillStyle(0x111111); })
      .on("pointerup",    () => { bgRect.setFillStyle(hover); cb(); });

    return btn;
  }

  _showHowToPlay() {
    const W = this.scale.width, H = this.scale.height;
    const panel = this.add.container(W/2, H/2);
    const bg = this.add.rectangle(0, 0, 620, 380, 0x001A00, 0.97).setStrokeStyle(3, 0x78C832);
    const title = this.add.text(0, -160, "HOW TO PLAY", { fontFamily:"Arial Black", fontSize:"24px", fill:"#78C832", stroke:"#004400", strokeThickness:5 }).setOrigin(0.5);

    const lines = [
      "☀️  Collect SUN to buy and place plants.",
      "🌱  Select a plant from the seed bar at the bottom.",
      "🖱️  Click a cell on the lawn to place your plant.",
      "🧟  Zombies enter from the right — stop them!",
      "🏠  Protect your house — if zombies reach it, you lose!",
      "⚠️  Between waves, prepare your defenses.",
      "⭐  Complete levels to unlock new plants!",
    ];
    const textBlock = this.add.text(-280, -130, lines.join("\n\n"), {
      fontFamily: "Arial", fontSize: "15px", fill: "#FFFFFF",
      lineSpacing: 4, wordWrap: { width: 560 },
    });

    const closeBtn = this.add.text(0, 155, "[ CLOSE ]", { fontFamily:"Arial Black", fontSize:"18px", fill:"#FF9900", stroke:"#441100", strokeThickness:4 }).setOrigin(0.5).setInteractive({ useHandCursor:true });
    closeBtn.on("pointerup", () => panel.destroy());

    panel.add([bg, title, textBlock, closeBtn]);
  }
}
