import * as PIXI from "pixi.js";
import gsap from "gsap";
import { PixiPlugin } from "gsap/PixiPlugin";
import { Prize, weightedRandom } from "./rng";
import { LEDRing } from "./LEDRing";
import { Confetti } from "./Confetti";

gsap.registerPlugin(PixiPlugin);
PixiPlugin.registerPIXI(PIXI);

// 🔊 Crear sonido de giro
const spinSound = new Audio('/assets/sounds/spin.mp3');
spinSound.volume = 0.7;

const winSound = new Audio('/assets/sounds/winning.mp3');
winSound.volume = 0.8;


function hexToNumber(hex: string): number {
  return parseInt(hex.replace(/^#/, ""), 16);
}

// Wheel holds only the spinning parts (slices, labels)
class Wheel extends PIXI.Container {
  private slices: PIXI.Graphics[] = [];
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

  private async build() {
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
      const innerRadius = radius - 2;

      mask.beginFill(0xffffff, 0.2);
      mask.moveTo(0, 0);
      mask.arc(0, 0, innerRadius, i * sliceAngle, (i + 1) * sliceAngle);
      mask.lineTo(0, 0);
      mask.endFill();

      mask.beginFill(0xffffff);
      mask.moveTo(0, 0);
      mask.arc(0, 0, radius, i * sliceAngle, (i + 1) * sliceAngle);
      mask.lineTo(0, 0);
      mask.endFill();

      mask.lineStyle({
        width: 4,
        color: 0xffffff,
        alpha: 1,
        alignment: 0.5,
        cap: "round",
        join: "round",
      });

      mask.stroke({ width: 5, color: 0xffffff, alpha: 0.5 });
      sprite.mask = mask;
      segment.addChild(mask);

      segment.rotation = -Math.PI / 2;
      this.addChild(segment);
      this.slices.push(segment);
    });

    this.prizes.forEach((p, i) => {
      const style = new PIXI.TextStyle({
        fontFamily: "Montserrat, sans-serif",
        fontSize: 17.006112, // Reduced font size by another 10% of the current size (18.89568 * 0.9)
        fontWeight: "700",
        fill: "#fff",
        dropShadow: true,
        dropShadowDistance: 2,
        lineHeight: 20, // Existing reduced line interspacing
      });
      const txt = new PIXI.Text(p.label, style);
      txt.anchor.set(0.5, 0.5);
      const theta = (i + 0.5) * sliceAngle;
      txt.position.set(
        Math.cos(theta - Math.PI / 2) * radius * 0.65,
        Math.sin(theta - Math.PI / 2) * radius * 0.65
      );
      txt.rotation = theta - Math.PI / 2; // Adjust rotation for radial orientation
      this.addChild(txt);
    });
  }

  spin(onComplete: (result: Prize) => void) {
    // 🔊 Reproducir sonido al iniciar el giro
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

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.floor(Math.random() * 20) - 10;
      data[i] += noise;
      data[i + 1] += noise;
      data[i + 2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);

    return PIXI.Texture.from(canvas);
  }
}

// WheelStand holds fondoTexture and the spinning Wheel as a child
export class WheelStand extends PIXI.Container {
  private fondoSprite?: PIXI.Sprite;
  private wheel: Wheel;

  constructor(prizes: Prize[], ring: LEDRing, confetti: Confetti) {
    super();
    this.build(prizes, ring, confetti);
  }

  private async build(prizes: Prize[], ring: LEDRing, confetti: Confetti) {
    const radius = 150;
    const fondoTexture = await PIXI.Assets.load("/assets/fondo_ruleta.png");
    this.fondoSprite = new PIXI.Sprite(fondoTexture);
    this.fondoSprite.anchor.set(0.5);
    this.fondoSprite.position.set(15, -15);
    this.fondoSprite.width = (radius + 230) * 2;
    this.fondoSprite.height = (radius + 226) * 2;
    this.addChild(this.fondoSprite);

    this.wheel = new Wheel(prizes, ring, confetti);
    this.addChild(this.wheel);
  }

  spin(onComplete: (result: Prize) => void) {
    if (this.wheel) {
      this.wheel.spin(onComplete);
    }
  }

  override destroy(options?: boolean | PIXI.IDestroyOptions) {
    if (this.wheel) this.wheel.destroy();
    if (this.fondoSprite) this.fondoSprite.destroy();
    super.destroy(options);
  }
}
