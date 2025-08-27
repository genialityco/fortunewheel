// crearRuleta.ts — versión corregida

import * as PIXI from "pixi.js";
import gsap from "gsap";

import { WheelStand } from "../core/Wheel";
import { LEDRing } from "../core/LEDRing";
import { Confetti } from "../core/Confetti";
import "../core/touchDebugOverlay";
import "../touchDebugOverlay.css";
import { Prize } from "../core/rng";

const { BlurFilter } = PIXI;

async function crearRuleta(app: PIXI.Application) {
    const backgroundContainer = new PIXI.Container();
    const wheelContainer = new PIXI.Container();
    const uiContainer = new PIXI.Container();
    const menuContainer = new PIXI.Container();
    app.stage.addChild(backgroundContainer, wheelContainer, uiContainer, menuContainer);

    // ---------- Fondo y monedas ----------
    const fondoTexture = await PIXI.Assets.load("/img/WHEEL/FONDO.png");
    const fondo2 = new PIXI.Sprite(fondoTexture);
    fondo2.anchor.set(0.5);
    fondo2.position.set(app.screen.width / 2, app.screen.height / 2);
    fondo2.scale.set(
        Math.max(app.screen.width / fondoTexture.width, app.screen.height / fondoTexture.height)
    );
    backgroundContainer.addChild(fondo2);



    const monedasTexture = await PIXI.Assets.load("/img/WHEEL/MONEDAS.png");
    const monedas = new PIXI.Sprite(monedasTexture);
    monedas.anchor.set(0.5);
    monedas.position.set(app.screen.width / 2, app.screen.height / 2 + 20);
    monedas.scale.set(
        Math.max(app.screen.width / monedasTexture.width, app.screen.height / monedasTexture.height) /
        2.5
    );
    // Agregar imagen de tarjeta grande detrás de las monedas
    const tarjetaTexture = await PIXI.Assets.load("/img/WHEEL/TARJETA_CREDITO_01.png");
    const tarjetaSprite = new PIXI.Sprite(tarjetaTexture);
    tarjetaSprite.anchor.set(0.5);
    tarjetaSprite.position.set(app.screen.width / 2 - 400, app.screen.height / 2 - 100); // Ajusta posición según lo que necesites
    tarjetaSprite.scale.set(0.5); // Grande
    backgroundContainer.addChild(tarjetaSprite);
    // Animación: rotación y escalado cíclico
    gsap.to(tarjetaSprite, {
        rotation: Math.PI / 16,
        scaleX: 0.55,
        scaleY: 0.55,
        duration: 1.2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
    });

    // Imagen pequeña a la derecha
    const tarjetaSpriteDer = new PIXI.Sprite(tarjetaTexture);
    tarjetaSpriteDer.anchor.set(0.1);
    tarjetaSpriteDer.position.set(app.screen.width / 2 + 210, app.screen.height / 2 - 40); // Ajusta posición
    tarjetaSpriteDer.scale.set(0.15); // Pequeña
    backgroundContainer.addChild(tarjetaSpriteDer);
    // Animación: rotación y escalado cíclico
    gsap.to(tarjetaSpriteDer, {
        rotation: -Math.PI / 16,
        scaleX: 0.18,
        scaleY: 0.18,
        duration: 1.2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
    });
    backgroundContainer.addChild(monedas);
    // Animación: rotación y escalado cíclico para las monedas centrales
    gsap.to(monedas, {
        rotation: Math.PI / 16,
        scaleX: monedas.scale.x * 1.08,
        scaleY: monedas.scale.y * 1.08,
        duration: 1.3,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
    });

    // ---------- Configs, wheel, ring, confetti ----------
    const configs = await (await fetch("/prizes.json")).json();
    let activeConfigIndex = 0;

    const ring = new LEDRing();
    const confetti = new Confetti();
    let wheel = new WheelStand(configs[activeConfigIndex].prizes as Prize[], ring, confetti);

    // Diferencias específicas de este código:
    wheel.scale.set(0.7);
    ring.scale.set(0.7);
    wheel.position.set(0, 110);

    ring.position.copyFrom(wheel.position);
    confetti.position.copyFrom(wheel.position);
    // El LEDRing debe ir detrás de la ruleta y la silueta
    wheelContainer.addChild(wheel);
    wheelContainer.addChild(ring);
    wheelContainer.addChild(confetti);
    // Agregar imagen COPY_SUPERIOR fuera del contenedor de la ruleta, directamente en el stage
    const copyTexture = await PIXI.Assets.load("/img/WHEEL/COPY_SUPERIOR.png");
    const copySprite = new PIXI.Sprite(copyTexture);
    copySprite.anchor.set(0.5);
    // Centrada arriba de la ruleta
    copySprite.position.set(app.screen.width / 2, app.screen.height / 2 - 230); // Ajusta la posición vertical si lo necesitas
    copySprite.scale.set(0.3); // Ajusta el tamaño si es necesario
    app.stage.addChild(copySprite);
    app.stage.setChildIndex(copySprite, app.stage.children.length - 1); // Siempre al frente

    adjustContainerScaleAndPosition(wheelContainer, app);

    // ---------- Botón de girar ----------
    const buttonTexture = await PIXI.Assets.load("img/WHEEL/LOGO_CENTRO_RULETA.png");
    const btn = new PIXI.Sprite(buttonTexture);
    btn.anchor.set(0.5);
    btn.scale.set(0.15, 0.15);
    btn.position.set(0, 100);
    btn.eventMode = "static";
    btn.cursor = "pointer";
    wheelContainer.addChild(btn);
    wheelContainer.setChildIndex(btn, wheelContainer.children.length - 1); // Siempre al frente
    let isSpinning = false;
    btn.on("pointerdown", () => {
        if (isSpinning) return;
        isSpinning = true;

        wheel.spin((prize) => {
            try {
                if (prize.label === "TRY AGAIN") {
                    showPrizeOverlay(app, "Lo sentimos! Vuelve a intentar");
                } else {
                    showPrizeOverlay(app, `¡Ganaste ${prize.label}!`);
                }
            } catch (e) {
                console.error("Error mostrando overlay:", e);
            } finally {
                // Siempre liberamos el bloqueo (tras un pequeño delay “anti-spam”)
                setTimeout(() => {
                    isSpinning = false;
                }, 1200);
            }
        });
    });

    // ---------- Monedas laterales animadas ----------
    const moneda1Texture = await PIXI.Assets.load("/img/WHEEL/MONEDA_IZQUIERDA.png");
    const moneda2Texture = await PIXI.Assets.load("/img/WHEEL/MONEDA_DERECHA.png");
    const moneda1 = new PIXI.Sprite(moneda1Texture);
    const moneda2 = new PIXI.Sprite(moneda2Texture);
    moneda1.anchor.set(0.5);
    moneda2.anchor.set(0.5);
    moneda1.scale.set(0.2);
    moneda2.scale.set(0.2);
    moneda1.position.set(app.screen.width / 2 - 300, app.screen.height / 2 + 180);
    moneda2.position.set(app.screen.width / 2 + 300, app.screen.height / 2 + 150);
    uiContainer.addChild(moneda1, moneda2);

    gsap.to(moneda1, {
        y: moneda1.position.y - 20,
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });
    gsap.to(moneda2, {
        y: moneda2.position.y - 20,
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });

    // ---------- Menú de selección de config ----------
    const buttonImages = ["/assets/BOTON_02.png", "/assets/BOTON_03.png"];
    const btnTextures = await Promise.all(buttonImages.map((img) => PIXI.Assets.load(img)));
    const buttonScale = 0.25;
    const btnHeight = btnTextures[0].height * buttonScale;
    const btnWidth = btnTextures[0].width * buttonScale;
    const buttonSpacing = btnHeight - btnHeight / 3;
    const menuX = 100;
    const menuHeight = configs.length * buttonSpacing;
    const menuY = app.screen.height / 2 - menuHeight / 2;

    const shadow = new PIXI.Graphics();
    shadow.beginFill(0x000000, 0.4);
    shadow.drawRoundedRect(
        menuX - btnWidth / 2 - 10,
        menuY - btnHeight / 4 - 15,
        btnWidth + 20,
        menuHeight + 30,
        40
    );
    shadow.endFill();
    // Nota: estas dos asignaciones son redundantes, pero se conservan el comportamiento original.
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

    //   for (let i = 0; i < configs.length; i++) {
    //     const texture = btnTextures[i % btnTextures.length];
    //     const mbtn = new PIXI.Sprite(texture);
    //     mbtn.anchor.set(0.5);
    //     mbtn.scale.set(buttonScale);
    //     const btnY = menuY + i * buttonSpacing;
    //     mbtn.position.set(menuX, btnY);
    //     mbtn.eventMode = "static";
    //     mbtn.cursor = "pointer";

    //     mbtn.on("pointerdown", () => {
    //       if (activeConfigIndex === i) return;
    //       activeConfigIndex = i;

    //       // Efecto glow del wheel
    //       const glowFilter = new GlowFilter({
    //         distance: 15,
    //         outerStrength: 2,
    //         innerStrength: 1,
    //         color: 0xffff00,
    //       });
    //       wheel.filters = [glowFilter as unknown as PIXI.Filter];

    //       gsap.to(glowFilter, {
    //         outerStrength: 5,
    //         innerStrength: 3,
    //         duration: 0.5,
    //         yoyo: true,
    //         repeat: 1,
    //         onComplete: () => (wheel.filters = null),
    //       });

    //       // Shine rápido
    //       const shine = new PIXI.Graphics();
    //       shine.beginFill(0xffffff, 0.5);
    //       shine.drawRect(-wheel.width / 2, -wheel.height / 2, wheel.width, wheel.height);
    //       wheel.addChild(shine);
    //       gsap.to(shine, {
    //         alpha: 0,
    //         duration: 0.5,
    //         onComplete: () => {
    //           wheel.removeChild(shine);
    //         },
    //       });

    //       // Reemplazar wheel con nueva config
    //       wheelContainer.removeChild(wheel);
    //       wheel.destroy();
    //       wheel = new WheelStand(configs[activeConfigIndex].prizes, ring, confetti);
    //       wheel.position.set(0, 0);
    //       wheelContainer.addChildAt(wheel, 0);
    //       ring.position.copyFrom(wheel.position);
    //       confetti.position.copyFrom(wheel.position);

    //       // Mantener escalas/offset de este código
    //       wheel.scale.set(0.6);
    //       ring.scale.set(0.6);
    //       wheel.position.set(0, 60);

    //       adjustContainerScaleAndPosition(wheelContainer, app);

    //       // Highlight activo
    //       const activeBtn = menuButtons[activeConfigIndex];
    //       drawHighlight(activeBtn.position.x, activeBtn.position.y);
    //       menuContainer.setChildIndex(shadow, 0);
    //       menuContainer.setChildIndex(highlight, 1);
    //     });

    //     const labelStyle = new PIXI.TextStyle({
    //       fontFamily: "Montserrat, sans-serif",
    //       fontSize: 25,
    //       fontWeight: "700",
    //       fill: "#fff",
    //       align: "center",
    //       dropShadow: true,
    //     });
    //     const label = new PIXI.Text(configs[i].name.toUpperCase(), labelStyle);
    //     label.anchor.set(0.5);
    //     label.position.set(menuX, btnY);

    //     menuContainer.addChild(mbtn, label);
    //     menuButtons.push(mbtn);
    //   }

    drawHighlight(menuButtons[activeConfigIndex].position.x, menuButtons[activeConfigIndex].position.y);
    menuContainer.addChildAt(shadow, 0);
    menuContainer.addChildAt(highlight, 1);
}

// ---------- Utils ----------
function adjustContainerScaleAndPosition(container: PIXI.Container, app: PIXI.Application) {
    const physicalHeight = 450;
    const displayHeight = app.renderer.height;
    const displayWidth = app.renderer.width;
    const stretchY = physicalHeight / displayHeight;
    const scale = displayHeight / physicalHeight;
    container.scale.set(scale, stretchY * scale);
    container.position.set(displayWidth / 2, displayHeight / 2);
}

function showPrizeOverlay(app: PIXI.Application, prize: string) {
    const overlay = new PIXI.Container();
    const bg = new PIXI.Graphics();
    const boxWidth = 600;
    const boxHeight = 300;

    // Fondo blanco (según tu código 2)
    bg.beginFill(0xffffff, 1);
    bg.roundRect(0, 0, boxWidth, boxHeight, 20);
    bg.endFill();

    const textStyle = new PIXI.TextStyle({
        fontFamily: "Luckiest Guy, sans-serif",
        fontSize: 57.6,
        fill: "#000000", // Texto negro
        align: "center",
        dropShadow: true,
    });

    const label = new PIXI.Text(prize, textStyle);
    label.anchor.set(0.5);
    label.position.set(boxWidth / 2, boxHeight / 2);

    overlay.addChild(bg, label);
    overlay.pivot.set(boxWidth / 2, boxHeight / 2);
    overlay.position.set(app.screen.width / 2, app.screen.height / 2);
    overlay.scale.set(1);

    // Deshabilitar eventos hasta que sea visible (evita capa invisible que bloquee)
    overlay.eventMode = "none";
    overlay.cursor = "pointer";

    app.stage.addChild(overlay);
    app.stage.setChildIndex(overlay, app.stage.children.length - 1);

    // Animación con fallback
    overlay.alpha = 0;
    try {
        gsap.to(overlay, {
            alpha: 1,
            duration: 0.8,
            ease: "power2.out",
            onStart: () => {
                overlay.eventMode = "static";
            },
        });
    } catch {
        overlay.alpha = 1;
        overlay.eventMode = "static";
    }

    // Cierre por click
    overlay.on("pointerdown", () => app.stage.removeChild(overlay));

    // Cierre automático (8s como tu código 2)
    setTimeout(() => {
        if (overlay.parent) {
            app.stage.removeChild(overlay);
        }
    }, 8000);
}

export default crearRuleta;
