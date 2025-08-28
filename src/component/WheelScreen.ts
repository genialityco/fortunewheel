// crearRuleta.ts — versión con soporte para Kinect + Firestore realtime

import * as PIXI from "pixi.js";
import gsap from "gsap";

import { WheelStand } from "../core/Wheel";
import { LEDRing } from "../core/LEDRing";
import { Confetti } from "../core/Confetti";
import "../core/touchDebugOverlay";
import "../touchDebugOverlay.css";
import { Prize } from "../core/rng";
// ✔ realtime:
import { subscribePrizes, decrementPrize } from "../core/firebasePrizes";
// (opcional) si exportas el tipo:
// import type { FirebasePrize } from "../core/firebasePrizes";


interface RuletaInstance {
    destroy: () => void;
}

async function crearRuleta(app: PIXI.Application): Promise<RuletaInstance> {
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
    fondo2.scale.set(Math.max(app.screen.width / fondoTexture.width, app.screen.height / fondoTexture.height));
    backgroundContainer.addChild(fondo2);

    const monedasTexture = await PIXI.Assets.load("/img/WHEEL/MONEDAS.png");
    const monedas = new PIXI.Sprite(monedasTexture);
    monedas.anchor.set(0.5);
    monedas.position.set(app.screen.width / 2, app.screen.height / 2 + 70);
    monedas.scale.set(1);

    const tarjetaTexture = await PIXI.Assets.load("/img/WHEEL/TARJETA_CREDITO_01.png");
    const tarjetaSprite = new PIXI.Sprite(tarjetaTexture);
    tarjetaSprite.anchor.set(0.5);
    tarjetaSprite.position.set(app.screen.width / 2 - 700, app.screen.height / 2 - 250);
    tarjetaSprite.scale.set(0.9);
    backgroundContainer.addChild(tarjetaSprite);

    gsap.to(tarjetaSprite, {
        rotation: Math.PI / 16,
        scaleX: 0.55,
        scaleY: 0.55,
        duration: 1.2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });

    const tarjetaSpriteDer = new PIXI.Sprite(tarjetaTexture);
    tarjetaSpriteDer.anchor.set(0.1);
    tarjetaSpriteDer.position.set(app.screen.width / 2 + 400, app.screen.height / 2 - 100);
    tarjetaSpriteDer.scale.set(0.3);
    backgroundContainer.addChild(tarjetaSpriteDer);

    gsap.to(tarjetaSpriteDer, {
        rotation: -Math.PI / 16,
        scaleX: 0.18,
        scaleY: 0.18,
        duration: 1.2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });

    backgroundContainer.addChild(monedas);
    gsap.to(monedas, {
        rotation: Math.PI / 16,
        scaleX: monedas.scale.x * 1.08,
        scaleY: monedas.scale.y * 1.08,
        duration: 1.3,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });

    // ---------- Wheel/Ring/Confetti + realtime ----------
    const ring = new LEDRing();
    const confetti = new Confetti();
    let wheel: WheelStand | null = null;

    // posición/tamaño de la ruleta
    const WHEEL_SCALE = 0.6;
    const WHEEL_POS = { x: 0, y: 250 };

    // cartel "sin premios"
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
    };
    const hideNoPrizes = () => {
        if (noPrizesDiv && noPrizesDiv.parentElement) {
            noPrizesDiv.parentElement.removeChild(noPrizesDiv);
            noPrizesDiv = null;
        }
    };

    // Contenedores a escena (ring detrás de wheel)
    ring.scale.set(WHEEL_SCALE);
    confetti.position.copyFrom(new PIXI.Point(WHEEL_POS.x, WHEEL_POS.y));
    ring.position.copyFrom(new PIXI.Point(WHEEL_POS.x, WHEEL_POS.y));
    wheelContainer.addChild(ring);
    wheelContainer.addChild(confetti);

    // COPY_SUPERIOR
    const copyTexture = await PIXI.Assets.load("/img/WHEEL/COPY_SUPERIOR.png");
    const copySprite = new PIXI.Sprite(copyTexture);
    copySprite.anchor.set(0.5);
    copySprite.position.set(app.screen.width / 2 + 600, app.screen.height / 2 - 400);
    copySprite.scale.set(0.5);
    app.stage.addChild(copySprite);
    app.stage.setChildIndex(copySprite, app.stage.children.length - 1);

    adjustContainerScaleAndPosition(wheelContainer, app);

    // ---------- Control de giro ----------
    let isSpinning = false;
    let queuedPrizes: Prize[] | null = null;

    const executeSpinAction = (): void => {
        if (isSpinning || !wheel) return;
        isSpinning = true;
        wheel.spin(async (prize) => {
            try {
                if (prize.label === "TRY AGAIN") {
                    showPrizeOverlay(app, "Lo sentimos! Vuelve a intentar");
                } else {
                    showPrizeOverlay(app, `¡Ganaste ${prize.label}!`);
                    if (prize.id) await decrementPrize(prize.id);
                }
            } finally {
                setTimeout(() => {
                    isSpinning = false;
                    // si llegó una actualización durante el giro, la aplicamos ahora
                    if (queuedPrizes) {
                        rebuildWheel(queuedPrizes);
                        queuedPrizes = null;
                    }
                }, 1200);
            }
        });
    };

    // botón
    const buttonTexture = await PIXI.Assets.load("img/WHEEL/LOGO_CENTRO_RULETA.png");
    const btn = new PIXI.Sprite(buttonTexture);
    btn.anchor.set(0.5);
    btn.scale.set(0.1, 0.1);
    btn.position.set(0, 250);
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.on("pointerdown", executeSpinAction);
    wheelContainer.addChild(btn);
    wheelContainer.setChildIndex(btn, wheelContainer.children.length - 1);
    wheelContainer.position.set(950, 0);

    // ---------- Rebuild helper ----------
    function rebuildWheel(newPrizes: Prize[]) {
        hideNoPrizes();

        // quitar wheel anterior
        if (wheel && wheel.parent) {
            wheel.parent.removeChild(wheel);
        }
        // crear wheel nueva
        wheel = new WheelStand(newPrizes as Prize[], ring, confetti);
        wheel.scale.set(WHEEL_SCALE);
        wheel.position.set(WHEEL_POS.x, WHEEL_POS.y);

        // orden: wheel detrás del botón; ring/confetti ya añadidos
        wheelContainer.addChildAt(wheel, 0);
        wheelContainer.setChildIndex(btn, wheelContainer.children.length - 1);
    }

    // ---------- Suscripción en tiempo real ----------
    type FirebasePrize = Prize & { id: string; cantidad: number; label: string };

    const unsubscribe = subscribePrizes((firebasePrizes: FirebasePrize[]) => {
        // nos quedamos sólo con premios disponibles (>0)
        const available = firebasePrizes.filter((p) => (p.cantidad ?? 0) > 0) as Prize[];

        if (available.length === 0) {
            // sin premios: quitamos la wheel si existiera y mostramos cartel
            if (wheel && wheel.parent) {
                wheel.parent.removeChild(wheel);
                wheel = null;
            }
            showNoPrizes();
            return;
        }

        if (isSpinning) {
            // difiere el rebuild hasta terminar el giro
            queuedPrizes = available;
        } else {
            rebuildWheel(available);
        }
    });

    // ---------- Monedas laterales animadas ----------
    const moneda1Texture = await PIXI.Assets.load("/img/WHEEL/MONEDA_IZQUIERDA.png");
    const moneda2Texture = await PIXI.Assets.load("/img/WHEEL/MONEDA_DERECHA.png");
    const moneda1 = new PIXI.Sprite(moneda1Texture);
    const moneda2 = new PIXI.Sprite(moneda2Texture);
    moneda1.anchor.set(0.5);
    moneda2.anchor.set(0.5);
    moneda1.scale.set(0.6);
    moneda2.scale.set(0.6);
    moneda1.position.set(app.screen.width / 2 - 500, app.screen.height / 2 + 380);
    moneda2.position.set(app.screen.width / 2 + 500, app.screen.height / 2 + 300);
    uiContainer.addChild(moneda1, moneda2);

    gsap.to(moneda1, { y: moneda1.position.y - 20, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut" });
    gsap.to(moneda2, { y: moneda2.position.y - 20, duration: 1.5, yoyo: true, repeat: -1, ease: "sine.inOut" });

    // ---------- destroy ----------
    return {
        destroy: (): void => {
            try { unsubscribe?.(); } catch { }
            app.stage.removeChild(backgroundContainer, wheelContainer, uiContainer, menuContainer);
            if (copySprite.parent) app.stage.removeChild(copySprite);
            hideNoPrizes();
        },
    };
}

// ---------- Utils ----------
function adjustContainerScaleAndPosition(container: PIXI.Container, app: PIXI.Application) {
    const physicalHeight = 450;
    const displayHeight = app.renderer.height;
    const displayWidth = app.renderer.width;
    const scale = Math.min(displayWidth / physicalHeight, displayHeight / physicalHeight);
    container.scale.set(scale, scale);
    container.position.set(displayWidth / 2, displayHeight / 2 - 500);
}

function showPrizeOverlay(app: PIXI.Application, prize: string) {
    const overlay = new PIXI.Container();
    const bg = new PIXI.Graphics();

    const textStyle = new PIXI.TextStyle({
        fontFamily: "Luckiest Guy, sans-serif",
        fontSize: 57.6,
        fill: "#fff",
        align: "center",
    });
    const label = new PIXI.Text(prize, textStyle);
    label.anchor.set(0.5);
    const bounds = label.getLocalBounds();
    const paddingX = 80;
    const paddingY = 60;
    const boxWidth = bounds.width + paddingX;
    const boxHeight = bounds.height + paddingY;

    bg.clear();
    bg.beginFill(0x000000, 0.7);
    bg.lineStyle(6, 0x2196f3, 0.9);
    bg.roundRect(0, 0, boxWidth, boxHeight, 32);
    bg.endFill();
    label.position.set(boxWidth / 2, boxHeight / 2);

    overlay.addChild(bg, label);
    overlay.pivot.set(boxWidth / 2, boxHeight / 2);
    overlay.position.set(app.screen.width / 2, app.screen.height / 2);
    overlay.scale.set(1);

    overlay.eventMode = "none";
    overlay.cursor = "pointer";

    app.stage.addChild(overlay);
    app.stage.setChildIndex(overlay, app.stage.children.length - 1);

    overlay.alpha = 0;
    try {
        gsap.to(overlay, {
            alpha: 1,
            duration: 0.8,
            ease: "power2.out",
            onStart: () => { overlay.eventMode = "static"; },
        });
    } catch {
        overlay.alpha = 1;
        overlay.eventMode = "static";
    }

    overlay.on("pointerdown", () => app.stage.removeChild(overlay));
    setTimeout(() => { if (overlay.parent) app.stage.removeChild(overlay); }, 8000);
}

export default crearRuleta;
