// src/core/Wheel.ts
import * as PIXI from "pixi.js";
import gsap from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import { Prize, weightedRandom } from "./rng";
import { LEDRing } from "./LEDRing";
import { Confetti } from "./Confetti";

// Registrar GSAP plugin para Pixi
gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

const spinSound = new Audio('/assets/sounds/spin.mp3');
spinSound.volume = 0.7;

const winSound = new Audio('/assets/sounds/winning.mp3');
winSound.volume = 0.8;

// function hexToNumber(hex: string): number {
//   return parseInt(hex.replace(/^#/, ""), 16);
// }

class Wheel extends PIXI.Container {
  private slices: PIXI.Container[] = [];
  private prizes: Prize[];
  private ring: LEDRing;
  private confetti: Confetti;

  constructor(prizes: Prize[], ring: LEDRing, confetti: Confetti) {
    super();
    this.prizes = prizes;
    this.ring = ring;
    this.confetti = confetti;
    this.build();
  }

  private build() {
    const radius = 210;
    const sliceAngle = (Math.PI * 2) / this.prizes.length;

    this.prizes.forEach((p, i) => {
      const segment = new PIXI.Container();
      const texture = this.createGradientTexture(p.color);
      const sprite = new PIXI.Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.width = radius * 2;
      sprite.height = radius * 2;
      segment.addChild(sprite);

      const mask = new PIXI.Graphics();
      mask.beginFill(0xffffff);
      mask.moveTo(0, 0);
      mask.arc(0, 0, radius, i * sliceAngle, (i + 1) * sliceAngle);
      mask.lineTo(0, 0);
      mask.endFill();
      sprite.mask = mask;
      segment.addChild(mask);

      segment.rotation = -Math.PI / 2;
      this.addChild(segment);
      this.slices.push(segment);
    });

    this.prizes.forEach((p, i) => {
      const style = new PIXI.TextStyle({
        fontFamily: "Montserrat, sans-serif",
        fontSize: 20,
        fontWeight: "700",
        fill: "#1b1754ff",
        align: "center",
        wordWrap: true,
        wordWrapWidth: radius * 1.2,
        lineHeight: 8
      });

      const txt = new PIXI.Text(p.label, style);
      txt.anchor.set(0.5);
      const theta = (i + 0.5) * sliceAngle;
      txt.position.set(
        Math.cos(theta - Math.PI / 2) * radius * 0.65,
        Math.sin(theta - Math.PI / 2) * radius * 0.65
      );
      txt.rotation = theta - Math.PI / 2;
      this.addChild(txt);
    });
  }

  spin(onComplete: (result: Prize) => void) {
    spinSound.currentTime = 0;
    spinSound.play();

    const winnerIndex = weightedRandom(this.prizes);
    const sliceAngle = 360 / this.prizes.length;
    const targetRot = -(winnerIndex * sliceAngle) - sliceAngle / 2;
    const extraSpins = 5;

    this.ring.setMode("spinning");

    gsap.to(this, {
      rotation: (extraSpins * 360 + targetRot) * (Math.PI / 180),
      duration: 5,
      ease: "power4.out",
      onComplete: () => {
        spinSound.pause();
        spinSound.currentTime = 0;
        winSound.currentTime = 0;
        winSound.play();
        this.rotation = this.rotation % (Math.PI * 2);
        this.ring.setMode("winner", winnerIndex);
        this.confetti.burst();
        onComplete(this.prizes[winnerIndex]);
      },
    });
  }

  private createGradientTexture(color: string): PIXI.Texture {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
    gradient.addColorStop(0.1, "rgba(255,255,255,0.9)");
    gradient.addColorStop(1, color);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    return PIXI.Texture.from(canvas);
  }
}

export class WheelStand extends PIXI.Container {
  private fondoSprite?: PIXI.Sprite;
  private wheel!: Wheel;
  private ring: LEDRing;
  private confetti: Confetti;

  constructor(prizes: Prize[], ring: LEDRing, confetti: Confetti) {
    super();
    this.ring = ring;
    this.confetti = confetti;
    this.build(prizes);
  }

  private async build(prizes: Prize[]) {
    const radius = 150;
    this.wheel = new Wheel(prizes, this.ring, this.confetti);
    this.wheel.position.set(0, 0);
    this.addChild(this.wheel);

    const fondoTexture = await PIXI.Assets.load("/assets/fondo_ruleta.png");
    this.fondoSprite = new PIXI.Sprite(fondoTexture);
    this.fondoSprite.anchor.set(0.5);
    this.fondoSprite.position.set(0, -20);
    this.fondoSprite.width = (radius + 200) * 2;
    this.fondoSprite.height = (radius + 200) * 2;
    this.addChildAt(this.fondoSprite, 1);
  }

  spin(onComplete: (result: Prize) => void) {
    this.wheel.spin(onComplete);
  }

  override destroy(options?: boolean | PIXI.DestroyOptions) {
    if (this.wheel) this.wheel.destroy();
    if (this.fondoSprite) this.fondoSprite.destroy();
    super.destroy(options);
  }
}
