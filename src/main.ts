import * as PIXI from "pixi.js";
import { GifSprite } from "pixi.js/gif";
import { WheelStand } from "./core/Wheel";
import { LEDRing } from "./core/LEDRing";
import { Confetti } from "./core/Confetti";
import gsap from "gsap";
import { Marker } from "./core/Marker";
import { BlurFilter } from "@pixi/filter-blur";
import { GlowFilter } from "@pixi/filter-glow";

async function boot() {
  const app = new PIXI.Application();
  await app.init({ background: "#101020", resizeTo: window });
  document.body.appendChild(app.canvas);


  // --- Add FONDO_MALUMA.mp4 as PIXI video background ---
  const fondoTexture = await PIXI.Assets.load("/assets/FONDO.png");
  const fondo = new PIXI.Sprite(fondoTexture);
  fondo.anchor.set(0.5);
  fondo.position.set(window.innerWidth / 2, window.innerHeight / 2);

  fondo.anchor.set(0.5);
  fondo.position.set(window.innerWidth / 2, window.innerHeight / 2);
  
  const scale = Math.max(
    window.innerWidth / fondoTexture.width,
    window.innerHeight / fondoTexture.height
  );
  fondo.scale.set(scale);
  
  app.stage.addChild(fondo);

  // --- Add MONEDAS.png as another background layer ---
  const monedasTexture = await PIXI.Assets.load("/assets/MONEDAS.png");
  const monedas = new PIXI.Sprite(monedasTexture);
  monedas.anchor.set(0.5);
  monedas.position.set(window.innerWidth / 2, window.innerHeight / 2);

  // Scale to half of the original size
  const monedasScale =
    Math.max(
      window.innerWidth / monedasTexture.width,
      window.innerHeight / monedasTexture.height
    ) / 1.5;
  monedas.scale.set(monedasScale);

  app.stage.addChild(monedas);
  // ----------------------------------------

  // Load all wheel configurations
  const configs = await (await fetch("/prizes.json")).json();
  let activeConfigIndex = 0;

  const ring = new LEDRing();
  const confetti = new Confetti();
  let wheel = new WheelStand(configs[activeConfigIndex].prizes, ring, confetti);

  wheel.position.set(window.innerWidth / 2, window.innerHeight / 2);
  ring.position.copyFrom(wheel.position);
  confetti.position.copyFrom(wheel.position);

  // Add background first, then wheel/ring/confetti above
  app.stage.addChild(wheel, ring, confetti);

  // --- MENU BUTTONS ---
  const buttonImages = [
   // "/assets/BOTON_01.png",
   // "/assets/BOTON_02.png",
    "/assets/BOTON_03.png",
  ];
  const menuContainer = new PIXI.Container();
  const buttonScale = 0.25;

  // Preload button textures to get their height for layout
  const btnTextures = await Promise.all(
    buttonImages.map((img) => PIXI.Assets.load(img))
  );
  const btnHeight = btnTextures[0].height * buttonScale;
  const btnWidth = btnTextures[0].width * buttonScale;
  const buttonSpacing = btnHeight - btnHeight / 3; // Only 6px gap between buttons

  const menuX = 100;
  const menuHeight = configs.length * buttonSpacing;
  const menuY = window.innerHeight / 2 - menuHeight / 2;

  // --- White degraded shadow for active button ---
  const shadow = new PIXI.Graphics();
  // Use a blur filter for the shadow
  const blurFilter = new BlurFilter({ strength: 8 });
  shadow.filters = [blurFilter];

  // --- Highlight for active button ---
  const highlight = new PIXI.Graphics();

  function drawHighlight(x: number, y: number) {
    highlight.clear();
    highlight.lineStyle(5, 0xffffff, 1); // width, color, alpha
    highlight.beginFill(0, 0); // transparent fill, required for stroke to show
    highlight.drawRoundedRect(
      x - btnWidth / 2,
      y - btnHeight / 4 - 5,
      btnWidth - 27,
      btnHeight / 2 + 10,
      30
    );
    highlight.endFill();
  }
  // --- END Highlight ---

  function drawShadow(x: number, y: number) {
    shadow.clear();
    // Draw a white ellipse, faded (alpha)
    shadow.beginFill(0xffffff, 0.28);
    shadow.drawEllipse(x, y, btnWidth / 2, btnHeight / 2);
    shadow.endFill();
  }
  // Store button references for shadow/highlight movement
  const menuButtons: PIXI.Sprite[] = [];

  for (let i = 0; i < configs.length; i++) {
    const btnTexture = btnTextures[i % btnTextures.length];
    const btn = new PIXI.Sprite(btnTexture);
    btn.anchor.set(0.5);
    btn.scale.set(buttonScale);
    // Calculate y so buttons are evenly spaced and menu is vertically centered
    const btnY = menuY + i * buttonSpacing;
    btn.position.set(menuX, btnY);
    btn.eventMode = "static";
    btn.cursor = "pointer";

    btn.on("pointerdown", () => {
      if (activeConfigIndex === i) return;
      activeConfigIndex = i;

      // Add glowing effect to the wheel
      const glowFilter = new GlowFilter({
        distance: 15,
        outerStrength: 2,
        innerStrength: 1,
        color: 0xffff00,
        quality: 0.5,
      });
      wheel.filters = [glowFilter];

      // Animate the glow effect
      gsap.to(glowFilter, {
        outerStrength: 5,
        innerStrength: 3,
        duration: 0.5,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          wheel.filters = null; // Remove the glow effect after animation
        },
      });

      // Add shining effect to the wheel
      const shine = new PIXI.Graphics();
      shine.beginFill(0xffffff, 0.5);
      shine.drawRect(
        -wheel.width / 2,
        -wheel.height / 2,
        wheel.width,
        wheel.height
      );
      shine.endFill();
      shine.blendMode = 1; // Use numeric value for additive blend mode
      wheel.addChild(shine);

      gsap.to(shine, {
        alpha: 0,
        duration: 0.5,
        onComplete: () => {
          wheel.removeChild(shine); // Remove the shine effect after animation
        },
      });

      app.stage.removeChild(wheel);
      wheel.destroy();
      wheel = new WheelStand(configs[activeConfigIndex].prizes, ring, confetti);
      wheel.position.set(window.innerWidth / 2, window.innerHeight / 2);
      app.stage.addChildAt(wheel, 1);
      ring.position.copyFrom(wheel.position);
      confetti.position.copyFrom(wheel.position);

      // Move shadow and highlight to new active button
      const activeBtn = menuButtons[activeConfigIndex];
      drawHighlight(activeBtn.position.x, activeBtn.position.y);
      menuContainer.setChildIndex(shadow, 0);
      menuContainer.setChildIndex(highlight, 1);
    });
    // Add config name label INSIDE button, centered
    const labelStyle = new PIXI.TextStyle({
      fontFamily: "Montserrat, sans-serif",
      fontSize: 25,
      fontWeight: "700",
      fill: "#fff",
      align: "center",
      dropShadow: true,
      dropShadowDistance: 2,
    });
    const label = new PIXI.Text(configs[i].name.toUpperCase(), labelStyle);
    label.anchor.set(0.5);
    label.position.set(menuX, btnY);
    menuContainer.addChild(btn, label);
    menuButtons.push(btn);
  }

  // Draw initial shadow and highlight behind the first button
  drawHighlight(
    menuButtons[activeConfigIndex].position.x,
    menuButtons[activeConfigIndex].position.y
  );
  menuContainer.addChildAt(shadow, 0);
  menuContainer.addChildAt(highlight, 1);

  app.stage.addChild(menuContainer);
  // --- END MENU ---

  // spin button
  const buttonTexture = await PIXI.Assets.load("/assets/wheel_button.png");
  const btn = new PIXI.Sprite(buttonTexture);
  btn.anchor.set(0.5);
  btn.scale.set(0.15);
  btn.position.copyFrom(wheel.position);
  btn.eventMode = "static";

  let isSpinning = false;

  btn.on("pointerdown", () => {
    if (isSpinning) return;
    isSpinning = true;
    wheel.spin((prize) => {
      showPrizeOverlay(app, prize.label);
      isSpinning = false;
    });
  });

  const btn2 = new PIXI.Sprite(buttonTexture);
  btn2.anchor.set(0.5);
  btn2.scale.set(0.15);
  const offsetX = 220; // ajusta este valor a tu gusto
btn2.position.set(
  wheel.position.x + offsetX,
  wheel.position.y
);
  btn2.eventMode = "static";
  
  btn2.on("pointerdown", () => {
    if (isSpinning) return;
    isSpinning = true;
    wheel.spin((prize) => {
      showPrizeOverlay(app, prize.label);
      isSpinning = false;
    });
  });

  app.stage.addChild(btn);
  app.stage.addChild(btn2);

  // Load MONEDA_01.png and MONEDA_02.png and add them to the left and right of the wheel
  const moneda1Texture = await PIXI.Assets.load("/assets/MONEDA_01.png");
  const moneda2Texture = await PIXI.Assets.load("/assets/MONEDA_02.png");

  const moneda1 = new PIXI.Sprite(moneda1Texture);
  const moneda2 = new PIXI.Sprite(moneda2Texture);

  moneda1.anchor.set(0.5);
  moneda2.anchor.set(0.5);

  // Scale down the size of the sprites
  moneda1.scale.set(0.2);
  moneda2.scale.set(0.2);

  // Position MONEDA_01 to the left of the wheel and MONEDA_02 to the right
  moneda1.position.set(
    wheel.position.x - wheel.width / 2.8,
    wheel.position.y + 180
  );
  moneda2.position.set(
    wheel.position.x + wheel.width / 2.8,
    wheel.position.y + 150
  );

  // Add floating animation using gsap
  function animateFloating(sprite: PIXI.Sprite) {
    gsap.to(sprite, {
      y: sprite.position.y - 20,
      duration: 1.5,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    });
  }

  animateFloating(moneda1);
  animateFloating(moneda2);

  app.stage.addChild(moneda1, moneda2);

  const legalesTexture = await PIXI.Assets.load("/assets/LEGALES.png");
  const legales = new PIXI.Sprite(legalesTexture);
  legales.anchor.set(0.5, 1);
  legales.scale.set((app.screen.width * 0.8) / legalesTexture.width);
  legales.position.set(app.screen.width / 2, app.screen.height - 10);
  app.stage.addChild(legales);
}

function showPrizeOverlay(app: PIXI.Application, prize: string) {
  const overlay = new PIXI.Container();

  // Fondo (bg)
  const bg = new PIXI.Graphics();
  const boxWidth = 600;
  const boxHeight = 300;
  bg.beginFill(0x000000, 0.7);
  bg.roundRect(0, 0, boxWidth, boxHeight, 20);
  bg.endFill();

  // Texto centrado dentro del fondo
  const textStyle = new PIXI.TextStyle({
    fontFamily: "Luckiest Guy, sans-serif",
    fontSize: 57.6, // Increased font size by 20% of the original (48 * 1.2)
    fill: "#ffff00",
    align: "center",
    dropShadow: true,
    dropShadowColor: "#000",
    dropShadowBlur: 5,
    dropShadowDistance: 4,
  });

  const label = new PIXI.Text(`¡Ganaste ${prize}!`, textStyle);
  label.anchor.set(0.5);
  label.position.set(boxWidth / 2, boxHeight / 2); // CENTRADO dentro de bg

  overlay.addChild(bg, label);

  // Centramos todo el overlay en el centro de la pantalla
  overlay.pivot.set(boxWidth / 2, boxHeight / 2);
  overlay.position.set(app.screen.width / 2, app.screen.height / 2);

  app.stage.addChild(overlay);

  // Animación de aparición
  overlay.alpha = 0;
  gsap.to(overlay, {
    alpha: 1,
    duration: 0.8,
    ease: "power2.out",
  });

  // Remover tras clic o tiempo
  overlay.eventMode = "static";
  overlay.cursor = "pointer";
  overlay.on("pointerdown", () => app.stage.removeChild(overlay));
  setTimeout(() => app.stage.removeChild(overlay), 4000);
}

boot();
