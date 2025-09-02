// crearRuleta.ts — COPY.png como footer (abajo) y sin banner sobre la ruleta

import * as PIXI from "pixi.js";
import gsap from "gsap";

import { WheelStand } from "../core/Wheel";
import { LEDRing } from "../core/LEDRing";
import { Confetti } from "../core/Confetti";
import "../core/touchDebugOverlay";
import "../touchDebugOverlay.css";
import { Prize } from "../core/rng";
import { subscribePrizes, decrementPrize } from "../core/firebasePrizes";

const BASE = { width: 1920, height: 1080 };

type FirebasePrize = Prize & { id: string; cantidad: number; label: string };

interface RuletaInstance {
  destroy: () => void;
}

async function crearRuleta(app: PIXI.Application): Promise<RuletaInstance> {
  // ----------- Assets -----------
  const [
    fondoTexture, // /buk/FONDO_MAIN.png
    coinsBackTexture, // /buk/MONEDA_BUK_FONDO.png
    footerTexture, // /buk/COPY.png  (AHORA ES EL FOOTER)
    topLogoTexture, // /buk/LOGO_BUK.png
    wheelCenterLogoTexture, // img/WHEEL/LOGO_CENTRO_RULETA.png
    coinLeftTexture, // /buk/MONEDA_BUK_IZQUIERDA.png
    coinRightTexture, // /buk/MONEDA_BUK_DERECHA.png
  ] = await Promise.all([
    PIXI.Assets.load("/buk/FONDO_MAIN.png"),
    PIXI.Assets.load("/buk/MONEDA_BUK_FONDO.png"),
    PIXI.Assets.load("/buk/COPY.png"),
    PIXI.Assets.load("/buk/LOGO_BUK.png"),
    PIXI.Assets.load("/buk/LOGO_CENTRO_RULETA.png"),
    PIXI.Assets.load("/buk/MONEDA_BUK_IZQUIERDA.png"),
    PIXI.Assets.load("/buk/MONEDA_BUK_DERECHA.png"),
  ]);

  // ----------- Estado y contenedores -----------
  let uiScale = 1;
  const backgroundContainer = new PIXI.Container();
  const wheelContainer = new PIXI.Container();
  const uiContainer = new PIXI.Container();
  app.stage.addChild(backgroundContainer, wheelContainer, uiContainer);

  // Fondo + monedas de fondo
  const background = new PIXI.Sprite(fondoTexture);
  background.anchor.set(0.5);

  backgroundContainer.addChild(background);

  const coinsBack = new PIXI.Sprite(coinsBackTexture);
  coinsBack.anchor.set(0.5);
  backgroundContainer.addChild(coinsBack);

  // Logo superior
  const topLogo = new PIXI.Sprite(topLogoTexture);
  topLogo.anchor.set(0.5);
  uiContainer.addChild(topLogo);

  // --- (ELIMINADO) Banner superior “copy” sobre la ruleta ---

  // Monedas decorativas
  const coinLeft = new PIXI.Sprite(coinLeftTexture);
  const coinRight = new PIXI.Sprite(coinRightTexture);
  coinLeft.anchor.set(0.5);
  coinRight.anchor.set(0.5);
  uiContainer.addChild(coinRight);

  // Footer: ahora es la imagen COPY.png
  const footerSprite = new PIXI.Sprite(footerTexture);
  footerSprite.anchor.set(0.5);
  uiContainer.addChild(footerSprite);

  // ----------- Ruleta / Efectos -----------
  const ring = new LEDRing();
  const confetti = new Confetti();
  let wheel: WheelStand | null = null;

  // Logo centro ruleta (opcional)
  const centerLogo = new PIXI.Sprite(wheelCenterLogoTexture);
  centerLogo.anchor.set(0.5);
  centerLogo.alpha = 0.95;

  // Botón invisible para girar
  const spinHit = new PIXI.Graphics();
  spinHit.beginFill(0xffffff, 0.001);
  spinHit.drawCircle(0, 0, 190);
  spinHit.endFill();
  spinHit.eventMode = "static";
  spinHit.cursor = "pointer";

  wheelContainer.addChild(coinLeft, ring, confetti, centerLogo, spinHit);

  // ----------- Estado de premios -----------
  let isSpinning = false;
  let queuedPrizes: Prize[] | null = null;
  let noPrizesDiv: HTMLDivElement | null = null;

  const showNoPrizes = () => {
    if (noPrizesDiv) return;
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.top = "50%";
    el.style.left = "50%";
    el.style.transform = "translate(-50%, -50%)";
    el.style.background = "#222";
    el.style.color = "#fff";
    el.style.padding = "40px 60px";
    el.style.borderRadius = "20px";
    el.style.fontSize = "2rem";
    el.style.textAlign = "center";
    el.innerText = "No hay premios disponibles";
    document.body.appendChild(el);
    noPrizesDiv = el;
    layout();
  };
  const hideNoPrizes = () => {
    if (noPrizesDiv?.parentElement) {
      noPrizesDiv.parentElement.removeChild(noPrizesDiv);
      noPrizesDiv = null;
    }
  };

  // ----------- Girar -----------
  const executeSpinAction = (): void => {
    if (isSpinning || !wheel) return;
    isSpinning = true;
    wheel.spin(async (prize) => {
      try {
        if (prize.label === "TRY AGAIN") {
          showPrizeOverlay(
            app,
            "¡Lo sentimos! Vuelve a intentar",
            () => uiScale,
            "",
          );
        } else {
          showPrizeOverlay(app, `¡Ganaste ${prize.label}!`, () => uiScale, "https://bulk-game.netlify.app/");
          if (prize.id) await decrementPrize(prize.id);

        }
      } finally {
        setTimeout(() => {
          isSpinning = false;
          if (queuedPrizes) {
            rebuildWheel(queuedPrizes);
            queuedPrizes = null;
          }
        }, 1200);
      }
    });
  };
  spinHit.on("pointerdown", executeSpinAction);
  wheelContainer.eventMode = "static";
  wheelContainer.on("pointerdown", executeSpinAction);

  // ----------- Rebuild -----------
  function rebuildWheel(newPrizes: Prize[]) {
    hideNoPrizes();
    if (wheel?.parent) wheel.parent.removeChild(wheel);
    wheel = new WheelStand(newPrizes as Prize[], ring, confetti);
    wheelContainer.addChildAt(wheel, 0);
    wheelContainer.addChildAt(coinLeft, 0);
    layout();
  }

  // ----------- Firestore realtime -----------
  const unsubscribe = subscribePrizes((firebasePrizes: FirebasePrize[]) => {
    const available = firebasePrizes.filter(
      (p) => (p.cantidad ?? 0) > 0
    ) as Prize[];
    if (available.length === 0) {
      if (wheel?.parent) {
        wheel.parent.removeChild(wheel);
        wheel = null;
      }
      showNoPrizes();
      return;
    }
    if (isSpinning) queuedPrizes = available;
    else rebuildWheel(available);
  });

  // ----------- Animaciones sutiles -----------
  // gsap.to(coinLeft, {
  //   y: () => coinLeft.position.y - 18 * uiScale,
  //   duration: 1.6,
  //   yoyo: true,
  //   repeat: -1,
  //   ease: "sine.inOut",
  // });
  // gsap.to(coinRight, {
  //   y: () => coinRight.position.y - 18 * uiScale,
  //   duration: 1.6,
  //   yoyo: true,
  //   repeat: -1,
  //   ease: "sine.inOut",
  // });
  // gsap.to(coinsBack.scale, {
  //   x: () => 1.04 * uiScale,
  //   y: () => 1.04 * uiScale,
  //   duration: 2.2,
  //   yoyo: true,
  //   repeat: -1,
  //   ease: "sine.inOut",
  // });

  // ----------- Layout responsive -----------
  function layout() {
    const vw = app.screen.width;
    const vh = app.screen.height;
    const ar = vw / vh;

    // breakpoints
    const isDesktop = vw >= 1200 && ar >= 1.1;
    const isTablet = !isDesktop && vw >= 700 && vh >= 700; // << mantiene tu vista actual            // móviles pequeños

    uiScale = Math.min(vw / BASE.width, vh / BASE.height);

    const cx = vw / 2;
    const cy = vh / 2;

    // Background cover
    background.position.set(cx, cy);
    {
      const bw = background.texture.width;
      const bh = background.texture.height;
      const cover = Math.max(vw / bw, vh / bh);
      background.scale.set(cover);
    }

    if (isTablet) {
      // ====== TABLET: se mantiene como está ======
      coinsBack.position.set(cx + 300, cy - 900 * uiScale);
      coinsBack.scale.set(2 * uiScale);
      topLogo.position.set(cx, Math.max(80 * uiScale, vh * 0.12));
      //const topLogoMax = ar < 0.65 ? 0.35 : 0.4;
      //topLogo.scale.set(Math.min(topLogoMax, Math.max(0.3, 0.8 * uiScale)));
      topLogo.scale.set(0.5);

      const wheelY = cy + (ar < 0.7 ? 40 : 80) * uiScale;
      wheelContainer.position.set(cx, wheelY + 50);

      const dyn = Math.min(
        1.45,
        Math.max(0.6, uiScale * (ar < 1 ? 0.98 : 1.1))
      );
      const wheelScale = 1.8 * dyn;

      ring.scale.set(wheelScale);
      ring.position.set(0, 0);
      confetti.position.set(0, 0);

      centerLogo.scale.set(Math.min(0.42, 0.2 * wheelScale));
      centerLogo.position.set(0, 0);

      if (wheel) {
        wheel.scale.set(wheelScale);
        wheel.position.set(0, 0);
      }

      const coinOffsetX = Math.min(520 * uiScale, vw * 0.3);
      coinLeft.scale.set(Math.min(0.95, 0.95 * uiScale + 0.4));
      coinRight.scale.set(Math.min(0.95, 0.7 * uiScale + 0.4));
      coinLeft.position.set(
        cx - coinOffsetX * 3.3,
        wheelY + Math.min(360 * uiScale, vh * -0.8)
      );
      coinRight.position.set(
        cx + coinOffsetX + 20,
        wheelY + Math.min(900 * uiScale, vh)
      );

      footerSprite.position.set(cx, vh - Math.max(50, 100 * uiScale));
      footerSprite.scale.set(0.7);
    } else if (isDesktop) {
      coinsBack.position.set(cx + 300 * uiScale, cy - 350 * uiScale);
      coinsBack.scale.set(Math.max(0.2, 0 * uiScale));

      topLogo.position.set(cx, Math.max(60 * uiScale, vh * 0.09));
      const topCap = 0.28; // límite pequeño en desktop
      topLogo.scale.set(Math.min(topCap, Math.max(0.18, 0.35 * uiScale)));

      // ruleta centrada (ligeramente arriba)
      const wheelY = cy + 20 * uiScale;
      wheelContainer.position.set(cx, wheelY + 10);

      const dyn = Math.min(1.6, Math.max(0.8, uiScale * 1.2));
      const wheelScale = 0.7* dyn; // un poco mayor en desktop

      ring.scale.set(wheelScale);
      ring.position.set(0, 0);
      confetti.position.set(0, 0);

      // logo centro visible (más grande que en tablet)
      centerLogo.scale.set(Math.min(0.35, 0.3 * wheelScale));
      centerLogo.position.set(0, 0);

      if (wheel) {
        wheel.scale.set(wheelScale);
        wheel.position.set(0, 0);
      }

      // monedas laterales alineadas a la base de la ruleta, nunca negativas
      const coinOffsetX = Math.min(520 * uiScale, vw * 0.28);
      const baseY = wheelY + Math.min(360 * uiScale, vh * 0.3);
      coinLeft.scale.set(Math.min(0.9, 0.3 * uiScale + 0.15));
      coinRight.scale.set(Math.min(0.9, 0.3 * uiScale + 0.15));
      coinLeft.position.set(cx - coinOffsetX * 2.9, baseY - 700);
      coinRight.position.set(cx + coinOffsetX * 0.4, baseY - 40 * uiScale);

      // footer más bajo y escalado por ancho disponible
      footerSprite.position.set(cx, vh - 50);
      const footerScale =
        Math.min((vw * 0.6) / footerSprite.texture.width, 1.0) *
        Math.max(0.6, uiScale * 0.9);
      footerSprite.scale.set(footerScale * 0.9);
    } else {
      // ====== MÓVIL PEQUEÑO ======
      // monedas de fondo detrás de la rueda
      coinsBack.position.set(cx, cy - 40 * uiScale);
      coinsBack.scale.set(Math.max(0.9, 1.05 * uiScale));

      // logo reducido y cercano al borde superior
      topLogo.position.set(cx, Math.max(50 * uiScale, vh * 0.06));
      topLogo.scale.set(Math.min(0.34, Math.max(0.22, 0.32 * uiScale)));

      // ruleta más centrada y un pelín menor para que quepa todo
      const wheelY = cy + 10 * uiScale;
      wheelContainer.position.set(cx, wheelY);

      const dyn = Math.min(1.35, Math.max(0.7, uiScale * 1.05));
      const wheelScale = 1.35 * dyn;

      ring.scale.set(wheelScale);
      ring.position.set(0, 0);
      confetti.position.set(0, 0);

      centerLogo.scale.set(Math.min(0.32, 0.2 * wheelScale));
      centerLogo.position.set(0, 0);

      if (wheel) {
        wheel.scale.set(wheelScale);
        wheel.position.set(0, 0);
      }

      // monedas laterales chicas y dentro de pantalla
      //const coinOffsetX = Math.min(360 * uiScale, vw * 0.32);
      coinLeft.scale.set(Math.min(0.75, 0.55 * uiScale + 0.08));
      coinRight.scale.set(Math.min(0.75, 0.55 * uiScale + 0.08));
      //const baseY = wheelY + Math.min(260 * uiScale, vh * 0.24);
      const footerScale =
        Math.min((vw * 0.9) / footerSprite.texture.width, 1.0) *
        Math.max(0.6, uiScale * 0.9);
      footerSprite.scale.set(footerScale);
    }

    // Área clicable para girar (común)
    const hitR = Math.max(120, 180 * uiScale);
    spinHit.clear();
    spinHit.beginFill(0xffffff, 0.001);
    spinHit.drawCircle(0, 0, hitR);
    spinHit.endFill();

    // Overlay “no premios”
    if (noPrizesDiv) {
      noPrizesDiv.style.left = "50%";
      noPrizesDiv.style.top = "50%";
      noPrizesDiv.style.transform = "translate(-50%, -50%)";
      noPrizesDiv.style.fontSize = `clamp(14px, ${26 * uiScale}px, 40px)`;
      noPrizesDiv.style.padding = `${18 * uiScale}px ${28 * uiScale}px`;
      noPrizesDiv.style.borderRadius = `${16 * uiScale}px`;
    }
  }

  window.addEventListener("resize", layout);
  layout();

  // ----------- destroy -----------
  return {
    destroy: (): void => {
      try {
        unsubscribe?.();
      } catch { }
      window.removeEventListener("resize", layout);
      app.stage.removeChild(backgroundContainer, wheelContainer, uiContainer);
      if (noPrizesDiv?.parentElement)
        noPrizesDiv.parentElement.removeChild(noPrizesDiv);
    },
  };
}

// ----------- Overlay premio -----------
function showPrizeOverlay(
  app: PIXI.Application,
  prize: string,
  getScale: () => number,
  redirectUrl: string
) {
  const overlay = new PIXI.Container();
  const bg = new PIXI.Graphics();

  const s = getScale ? getScale() : 1;
  const fs = 48 * Math.max(0.8, Math.min(1.6, s));

  const textStyle = new PIXI.TextStyle({
    fontFamily: "Luckiest Guy, sans-serif",
    fontSize: fs,
    fill: "#fff",
    align: "center",
    wordWrap: true,
    wordWrapWidth: app.screen.width * 0.8,
  });

  const label = new PIXI.Text(prize, textStyle);
  label.anchor.set(0.5);

  const bounds = label.getLocalBounds();
  const paddingX = 80 * Math.min(1.5, s);
  const paddingY = 60 * Math.min(1.5, s);
  const maxW = app.screen.width * 0.9;
  const maxH = app.screen.height * 0.55;
  const boxWidth = Math.min(bounds.width + paddingX, maxW);
  const boxHeight = Math.min(bounds.height + paddingY, maxH);

  bg.clear();
  bg.beginFill(0x000000, 0.7);
  bg.lineStyle(6 * Math.min(1.5, s), 0x2196f3, 0.9);
  bg.roundRect(0, 0, boxWidth, boxHeight, 32 * Math.min(1.5, s));
  bg.endFill();

  label.position.set(boxWidth / 2, boxHeight / 2);
  overlay.addChild(bg, label);

  overlay.pivot.set(boxWidth / 2, boxHeight / 2);
  overlay.position.set(app.screen.width / 2, app.screen.height / 2);
  overlay.eventMode = "static";
  overlay.cursor = "pointer";

  app.stage.addChild(overlay);
  app.stage.setChildIndex(overlay, app.stage.children.length - 1);

  overlay.alpha = 0;
  try {
    gsap.to(overlay, { alpha: 1, duration: 0.8, ease: "power2.out" });
  } catch {
    overlay.alpha = 1;
  }
  const targetUrl = redirectUrl;
  let redirected = false;
  const closeAndMaybeRedirect = () => {
    if (overlay.parent) app.stage.removeChild(overlay);
    if (targetUrl && !redirected) {
      redirected = true;
      try {
        window.location.assign(targetUrl);
      } catch {
        window.location.href = targetUrl;
      }
    }
  };

  overlay.on("pointerdown", closeAndMaybeRedirect);
  setTimeout(closeAndMaybeRedirect, 10000);
}

export default crearRuleta;