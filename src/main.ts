// main.ts reorganizado con menú de botones reactivado

import * as PIXI from "pixi.js";
// import { BLEND_MODES } from "pixi.js";
// import { GifSprite } from "pixi.js/gif";
import { WheelStand } from "./core/Wheel";
import { LEDRing } from "./core/LEDRing";
import { Confetti } from "./core/Confetti";
import "./core/touchDebugOverlay";
import './touchDebugOverlay.css';
import gsap from "gsap";
// import { Marker } from "./core/Marker";
// Use PIXI's built-in BlurFilter for compatibility
const { BlurFilter } = PIXI;
import { GlowFilter } from "@pixi/filter-glow";
import { Prize } from "./core/rng";

async function boot() {
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  await app.init({ resizeTo: window });
  document.body.appendChild(app.canvas);

  const backgroundContainer = new PIXI.Container();
  const wheelContainer = new PIXI.Container();
  const uiContainer = new PIXI.Container();
  const menuContainer = new PIXI.Container();

  app.stage.addChild(backgroundContainer, wheelContainer, uiContainer, menuContainer);

  const fondoTexture = await PIXI.Assets.load("/assets/FONDO.png");
  const fondo = new PIXI.Sprite(fondoTexture);
  fondo.anchor.set(0.5);
  fondo.position.set(app.screen.width / 2, app.screen.height / 2);
  fondo.scale.set(Math.max(
    app.screen.width / fondoTexture.width,
    app.screen.height / fondoTexture.height
  ));
  backgroundContainer.addChild(fondo);

  const monedasTexture = await PIXI.Assets.load("./images/MONEDAS.png");
  const monedas = new PIXI.Sprite(monedasTexture);
  monedas.anchor.set(0.5);
  monedas.position.set(app.screen.width / 2, app.screen.height / 2 + 150);
  monedas.scale.set(1);
  // monedas.scale.set(
  //   Math.max(app.screen.width / monedasTexture.width, app.screen.height / monedasTexture.height) / 1.5
  // );
  backgroundContainer.addChild(monedas);

  const configs = await (await fetch("/prizes.json")).json();
  let activeConfigIndex = 0;
  const ring = new LEDRing();
  const confetti = new Confetti();
  let wheel = new WheelStand(configs[activeConfigIndex].prizes as Prize[], ring, confetti);
  const positionButtonWheel = 100
  wheel.position.set(0, 0);
  ring.position.copyFrom(wheel.position);
  confetti.position.copyFrom(wheel.position);
  wheelContainer.addChild(wheel, ring, confetti);
  scaleAndCenterWheelContainer(wheelContainer, app, 1.8, positionButtonWheel);

  const buttonTexture = await PIXI.Assets.load("/assets/wheel_button.png");
  const btn = new PIXI.Sprite(buttonTexture);
  btn.anchor.set(0.5);
  btn.scale.set(0.4, 0.4); // Ajuste de proporciones para que no se vea estirado
  btn.position.set(app.screen.width / 2, app.screen.height / 2 + positionButtonWheel);
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
  uiContainer.addChild(btn);

  const legalesTexture = await PIXI.Assets.load("./images/LEGALES.png");
  const legales = new PIXI.Sprite(legalesTexture);
  legales.anchor.set(0.5, 1);
  legales.scale.set((app.screen.width * 1) / legalesTexture.width);
  legales.position.set(app.screen.width / 2, app.screen.height - 50);
  uiContainer.addChild(legales);

  const logoTexture = await PIXI.Assets.load("/assets/FRASE_COPY.png");
  const logo = new PIXI.Sprite(logoTexture);
  logo.anchor.set(0.5);
  logo.scale.set(0.8);
  logo.position.set(app.screen.width / 2, app.screen.height / 2 - 700);
  uiContainer.addChild(logo);

  const moneda2Texture = await PIXI.Assets.load("/assets/MONEDA_02.png");
  const moneda2 = new PIXI.Sprite(moneda2Texture);
  moneda2.anchor.set(0.5);
  moneda2.scale.set(0.45);
  moneda2.position.set(app.screen.width / 2 + 300, app.screen.height / 2 + 650);
  uiContainer.addChild(moneda2);

  gsap.to(moneda2, { y: moneda2.position.y - 20, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut" });

  const buttonImages = ["/assets/BOTON_01.png","/assets/BOTON_02.png", "/assets/BOTON_03.png"];
  const btnTextures = await Promise.all(buttonImages.map(img => PIXI.Assets.load(img)));
  const buttonScale = 0.25;
  const btnHeight = btnTextures[0].height * buttonScale;
  const btnWidth = btnTextures[0].width * buttonScale;

  // === OFFSET VERTICAL PARA MOVER EL MENÚ HACIA ABAJO ===
  const menuYOffset = 650; // <-- ajusta este valor para bajar/subir todos los botones y labels

  // Separación vertical entre botones
  const buttonSpacing = btnHeight + btnHeight / 3;

  // Posición X base del menú
  const menuX = 100;

  // Altura total del menú y origen Y (centrado + offset)
  const menuHeight = configs.length * buttonSpacing;
  const menuY = app.screen.height / 2 - menuHeight / 2 + menuYOffset;

  const shadow = new PIXI.Graphics();
  shadow.beginFill(0x000000, 0.4);
  shadow.drawRoundedRect(menuX - btnWidth / 2 - 10, menuY - btnHeight / 4 - 15, btnWidth + 20, menuHeight + 30, 40);
  shadow.endFill();
  shadow.filters = [new PIXI.BlurFilter(8)];
  shadow.filters = [new BlurFilter(8)];
  const highlight = new PIXI.Graphics();

  const menuButtons: PIXI.Sprite[] = [];
  function drawHighlight(x: number, y: number) {
    highlight.clear();
    highlight.lineStyle(5, 0xffffff, 1);
    highlight.beginFill(0, 0);
    highlight.drawRoundedRect(x - btnWidth / 2, y - btnHeight / 4 - 5, btnWidth - 27, btnHeight / 2 + 10, 30);
    highlight.endFill();
  }

  for (let i = 0; i < configs.length; i++) {
    const btnTexture2 = btnTextures[i % btnTextures.length];
    const btn2 = new PIXI.Sprite(btnTexture2);
    btn2.anchor.set(0.5);
    btn2.scale.set(buttonScale * 2); // respeté tu escala actual
    const btnY = menuY + i * buttonSpacing;
    btn2.position.set(menuX, btnY);
    btn2.eventMode = "static";
    btn2.cursor = "pointer";

    btn2.on("pointerdown", () => {
      if (activeConfigIndex === i) return;
      activeConfigIndex = i;

      const glowFilter = new GlowFilter({ distance: 15, outerStrength: 2, innerStrength: 1, color: 0xffff00 });
      wheel.filters = [glowFilter as unknown as PIXI.Filter];
      gsap.to(glowFilter, {
        outerStrength: 5,
        innerStrength: 3,
        duration: 0.5,
        yoyo: true,
        repeat: 1,
        onComplete: () => (wheel.filters = null),
      });

      const shine = new PIXI.Graphics();
      shine.beginFill(0xffffff, 0.5);
      shine.drawRect(-wheel.width / 2, -wheel.height / 2, wheel.width, wheel.height);
      // shine.blendMode = PIXI.BLEND_MODES.ADD;
      wheel.addChild(shine);
      gsap.to(shine, { alpha: 0, duration: 0.5, onComplete: () => { wheel.removeChild(shine); } });

      wheelContainer.removeChild(wheel);
      wheel.destroy();
      wheel = new WheelStand(configs[activeConfigIndex].prizes, ring, confetti);
      wheel.position.set(0, 0);
      wheelContainer.addChildAt(wheel, 0);
      ring.position.copyFrom(wheel.position);
      confetti.position.copyFrom(wheel.position);
      scaleAndCenterWheelContainer(wheelContainer, app, 2, 200);

      const activeBtn = menuButtons[activeConfigIndex];
      drawHighlight(activeBtn.position.x, activeBtn.position.y);
      menuContainer.setChildIndex(shadow, 0);
      menuContainer.setChildIndex(highlight, 1);
    });

    // === SOLO ESTE BLOQUE CAMBIADO: label a la DERECHA y color AZUL OSCURO ===
    const labelStyle = new PIXI.TextStyle({
      fontFamily: "Montserrat, sans-serif",
      fontSize: Math.round(150 * buttonScale),
      fontWeight: "700",
      fill: "#0A2540",      // azul oscuro
      align: "right",
      dropShadow: true,
    });
    const label = new PIXI.Text(configs[i].name.toUpperCase(), labelStyle);
    label.anchor.set(1, 0.5); // ancla al borde derecho, centrado vertical
    const labelRightPad = 50; // padding desde el borde derecho del botón
    label.position.set(menuX + btnWidth - labelRightPad, btnY);

    menuContainer.addChild(btn2, label);
    menuButtons.push(btn2);
  }

  drawHighlight(menuButtons[activeConfigIndex].position.x, menuButtons[activeConfigIndex].position.y);
  menuContainer.addChildAt(shadow, 0);
  menuContainer.addChildAt(highlight, 1);
}

function scaleAndCenterWheelContainer(
  container: PIXI.Container,
  app: PIXI.Application,
  uniformScale: number,
  offsetY: number = 0
) {
  if (container.children.length === 0) return;

  const b = container.getLocalBounds();
  const cx = b.x + b.width / 2;
  const cy = b.y + b.height / 2;

  container.pivot.set(cx, cy);
  container.scale.set(uniformScale);
  container.position.set(app.screen.width / 2, app.screen.height / 2 + offsetY);
}

function showPrizeOverlay(app: PIXI.Application, prize: string) {
  const overlay = new PIXI.Container();
  const bg = new PIXI.Graphics();
  const boxWidth = 600;
  const boxHeight = 300;
  bg.beginFill(0x000000, 0.7);
  bg.drawRoundedRect(0, 0, boxWidth, boxHeight, 20); // corregido para Pixi
  bg.endFill();

  const textStyle = new PIXI.TextStyle({
    fontFamily: "Luckiest Guy, sans-serif",
    fontSize: 57.6,
    fill: "#ffff00",
    align: "center",
    dropShadow: true,
  });

  const label = new PIXI.Text(`¡Ganaste ${prize}!`, textStyle);
  label.anchor.set(0.5);
  label.position.set(boxWidth / 2, boxHeight / 2);
  overlay.addChild(bg, label);
  overlay.pivot.set(boxWidth / 2, boxHeight / 2);
  overlay.position.set(app.screen.width / 2, app.screen.height / 2);
  app.stage.addChild(overlay);
  overlay.alpha = 0;
  gsap.to(overlay, { alpha: 1, duration: 0.8, ease: "power2.out" });
  overlay.eventMode = "static";
  overlay.cursor = "pointer";
  overlay.on("pointerdown", () => app.stage.removeChild(overlay));
  setTimeout(() => app.stage.removeChild(overlay), 4000);
}

boot();
