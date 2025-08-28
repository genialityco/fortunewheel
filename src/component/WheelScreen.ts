// crearRuleta.ts — Responsive total (todas las imágenes se adaptan al tamaño de la pantalla)
// Mantiene Kinect/Firestore realtime y centra/agranda la ruleta.

import * as PIXI from "pixi.js";
import gsap from "gsap";

import { WheelStand } from "../core/Wheel";
import { LEDRing } from "../core/LEDRing";
import { Confetti } from "../core/Confetti";
import "../core/touchDebugOverlay";
import "../touchDebugOverlay.css";
import { Prize } from "../core/rng";
import { subscribePrizes, decrementPrize } from "../core/firebasePrizes";

// Lienzo virtual de referencia
const BASE = { width: 1920, height: 1080 };

type FirebasePrize = Prize & { id: string; cantidad: number; label: string };

interface RuletaInstance {
    destroy: () => void;
}

async function crearRuleta(app: PIXI.Application): Promise<RuletaInstance> {
    // escala global (se actualiza en layout())
    let uiScale = 1;

    // Contenedores
    const backgroundContainer = new PIXI.Container();
    const wheelContainer = new PIXI.Container();
    const uiContainer = new PIXI.Container();
    const menuContainer = new PIXI.Container();
    app.stage.addChild(backgroundContainer, wheelContainer, uiContainer, menuContainer);

    // Sprites reutilizados en layout()
    let fondo2!: PIXI.Sprite;
    let monedas!: PIXI.Sprite;
    let tarjetaSprite!: PIXI.Sprite;
    let tarjetaSpriteDer!: PIXI.Sprite;
    let copySprite!: PIXI.Sprite;
    let moneda1!: PIXI.Sprite;
    let moneda2!: PIXI.Sprite;

    // Ruleta y efectos
    const ring = new LEDRing();
    const confetti = new Confetti();
    let wheel: WheelStand | null = null;

    // Estado
    let isSpinning = false;
    let queuedPrizes: Prize[] | null = null;
    let noPrizesDiv: HTMLDivElement | null = null;

    // ----------- Assets -----------
    const [
        fondoTexture,
        monedasTexture,
        tarjetaTexture,
        copyTexture,
        buttonTexture,
        moneda1Texture,
        moneda2Texture,
    ] = await Promise.all([
        PIXI.Assets.load("/img/WHEEL/FONDO.png"),
        PIXI.Assets.load("/img/WHEEL/MONEDAS.png"),
        PIXI.Assets.load("/img/WHEEL/TARJETA_CREDITO_01.png"),
        PIXI.Assets.load("/img/WHEEL/COPY_SUPERIOR.png"),
        PIXI.Assets.load("img/WHEEL/LOGO_CENTRO_RULETA.png"),
        PIXI.Assets.load("/img/WHEEL/MONEDA_IZQUIERDA.png"),
        PIXI.Assets.load("/img/WHEEL/MONEDA_DERECHA.png"),
    ]);

    // ----------- Fondo y decoraciones -----------
    fondo2 = new PIXI.Sprite(fondoTexture);
    fondo2.anchor.set(0.5);
    backgroundContainer.addChild(fondo2);

    tarjetaSprite = new PIXI.Sprite(tarjetaTexture);
    tarjetaSprite.anchor.set(0.5);
    backgroundContainer.addChild(tarjetaSprite);
    
    tarjetaSpriteDer = new PIXI.Sprite(tarjetaTexture);
    tarjetaSpriteDer.anchor.set(0.1);
    backgroundContainer.addChild(tarjetaSpriteDer);
    
    monedas = new PIXI.Sprite(monedasTexture);
    monedas.anchor.set(0.5);
    backgroundContainer.addChild(monedas);
    // Animaciones sutiles (independientes del tamaño, usan funciones con uiScale)
    gsap.to(tarjetaSprite, {
        rotation: Math.PI / 16,
        duration: 1.2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });
    gsap.to(tarjetaSprite.scale, {
        x: () => 0.9 * uiScale * 0.65,
        y: () => 0.9 * uiScale * 0.65,
        duration: 1.2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });

    gsap.to(tarjetaSpriteDer, {
        rotation: -Math.PI / 16,
        duration: 1.2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });
    gsap.to(tarjetaSpriteDer.scale, {
        x: () => 0.3 * uiScale * 0.6,
        y: () => 0.3 * uiScale * 0.6,
        duration: 1.2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });

    gsap.to(monedas, {
        rotation: Math.PI / 16,
        duration: 1.3,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });
    gsap.to(monedas.scale, {
        x: () => 1 * uiScale * 1.08,
        y: () => 1 * uiScale * 1.08,
        duration: 1.3,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });

    // ----------- Wheel/Ring/Confetti -----------
    wheelContainer.addChild(ring);
    wheelContainer.addChild(confetti);

    // Copy superior
    copySprite = new PIXI.Sprite(copyTexture);
    copySprite.anchor.set(0.5);
    app.stage.addChild(copySprite);
    app.stage.setChildIndex(copySprite, app.stage.children.length - 1);

    // Botón central
    const btn = new PIXI.Sprite(buttonTexture);
    btn.anchor.set(0.5);
    btn.eventMode = "static";
    btn.cursor = "pointer";
    wheelContainer.addChild(btn);
    wheelContainer.setChildIndex(btn, wheelContainer.children.length - 1);

    // Monedas laterales (UI)
    moneda1 = new PIXI.Sprite(moneda1Texture);
    moneda2 = new PIXI.Sprite(moneda2Texture);
    moneda1.anchor.set(0.5);
    moneda2.anchor.set(0.5);
    uiContainer.addChild(moneda1, moneda2);

    gsap.to(moneda1, {
        y: () => moneda1.position.y - 20 * uiScale,
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });
    gsap.to(moneda2, {
        y: () => moneda2.position.y - 20 * uiScale,
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut",
    });

    // ----------- Overlay "sin premios" -----------
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

    // ----------- Giro de la ruleta -----------
    const executeSpinAction = (): void => {
        if (isSpinning || !wheel) return;
        isSpinning = true;
        wheel.spin(async (prize) => {
            try {
                if (prize.label === "TRY AGAIN") {
                    showPrizeOverlay(app, "Lo sentimos! Vuelve a intentar", () => uiScale);
                } else {
                    showPrizeOverlay(app, `¡Ganaste ${prize.label}!`, () => uiScale);
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
    btn.on("pointerdown", executeSpinAction);

    // ----------- Rebuild helper -----------
    function rebuildWheel(newPrizes: Prize[]) {
        hideNoPrizes();
        if (wheel?.parent) wheel.parent.removeChild(wheel);
        wheel = new WheelStand(newPrizes as Prize[], ring, confetti);
        wheelContainer.addChildAt(wheel, 0);
        layout();
    }

    // ----------- Firestore realtime -----------
    const unsubscribe = subscribePrizes((firebasePrizes: FirebasePrize[]) => {
        const available = firebasePrizes.filter((p) => (p.cantidad ?? 0) > 0) as Prize[];
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

    // ----------- Layout responsive -----------
    function layout() {
        const vw = app.screen.width;
        const vh = app.screen.height;
        const ar = vw / vh; // aspect ratio

        // Escala global que encaja BASE en pantalla
        uiScale = Math.min(vw / BASE.width, vh / BASE.height);

        // Centro real
        const cx = vw / 2;
        const cy = vh / 2;

        // Fondo cover
        fondo2.position.set(cx, cy);
        {
            const fw = fondo2.texture.width;
            const fh = fondo2.texture.height;
            const cover = Math.max(vw / fw, vh / fh);
            fondo2.scale.set(cover);
        }

        // Monedas del fondo
        monedas.position.set(cx, cy + 70 * uiScale);
        monedas.scale.set(1 * uiScale);

        // Margen seguro según tamaño
        const margin = 80 * uiScale;

        // Copy (arriba-derecha)
        copySprite.position.set(
            vw - margin - copySprite.width * 0.25, // pequeño margen con su propio ancho
            margin + copySprite.height * 0.25
        );
        copySprite.scale.set(Math.min(0.7, Math.max(0.35, 0.5 * uiScale)));
        copySprite.alpha = uiScale < 0.45 ? 0.9 : 1;

        // Tarjetas laterales (se separan más en pantallas amplias, se acercan en móviles)
        const sideSpread = (ar > 1.6 ? 700 : ar > 1.3 ? 560 : 420) * uiScale;
        const upOffset = (ar > 1.6 ? 250 : ar > 1.3 ? 220 : 180) * uiScale;

        tarjetaSprite.position.set(cx - sideSpread, cy - upOffset);
        if (!gsap.isTweening(tarjetaSprite.scale)) {
            tarjetaSprite.scale.set(Math.min(1.1, Math.max(0.5, 0.9 * uiScale)));
        }

        tarjetaSpriteDer.position.set(cx + sideSpread * 0.8, cy - upOffset * 0.4);
        if (!gsap.isTweening(tarjetaSpriteDer.scale)) {
            tarjetaSpriteDer.scale.set(Math.min(0.7, Math.max(0.35, 0.3 * uiScale)));
        }

        // En pantallas muy pequeñas, atenua/oculta tarjetas para no tapar la ruleta
        const tiny = uiScale < 0.42;
        tarjetaSprite.alpha = tiny ? 0.0 : 1.0;
        tarjetaSpriteDer.alpha = tiny ? 0.0 : 1.0;

        // Wheel/Ring/Confetti (centrada y adaptable)
        wheelContainer.position.set(cx, cy);

        // La ruleta crece pero no invade demasiado; clamp con base y ar
        const baseScale = 1.5; // grande por diseño
        const dyn = Math.min(1.3, Math.max(0.55, uiScale * (ar < 1 ? 0.95 : 1.05)));
        const wheelScale = baseScale * dyn;

        const wheelY = 50; // centrada vertical

        ring.scale.set(wheelScale);
        ring.position.set(0, wheelY);

        confetti.position.set(0, wheelY);

        if (wheel) {
            wheel.scale.set(wheelScale);
            wheel.position.set(0, wheelY);
        }

        // Botón proporcional al tamaño de la rueda
        btn.position.set(0, wheelY);
        btn.scale.set(Math.min(0.22, Math.max(0.10, 0.15 * (wheelScale / 0.9))));

        // Monedas UI laterales (siempre visibles, ajustadas a bordes)
        const coinOffsetX = Math.min(500 * uiScale, vw * 0.28);
        moneda1.scale.set(Math.min(0.9, 0.6 * uiScale + 0.1));
        moneda2.scale.set(Math.min(0.9, 0.6 * uiScale + 0.1));
        moneda1.position.set(cx - coinOffsetX, cy + Math.min(380 * uiScale, vh * 0.32));
        moneda2.position.set(cx + coinOffsetX, cy + Math.min(300 * uiScale, vh * 0.28));

        // Cartel "no hay premios"
        if (noPrizesDiv) {
            noPrizesDiv.style.left = "50%";
            noPrizesDiv.style.top = "50%";
            noPrizesDiv.style.transform = "translate(-50%, -50%)";
            noPrizesDiv.style.fontSize = `clamp(14px, ${26 * uiScale}px, 40px)`;
            noPrizesDiv.style.padding = `${18 * uiScale}px ${28 * uiScale}px`;
            noPrizesDiv.style.borderRadius = `${16 * uiScale}px`;
        }
    }

    // Resize/orientation
    window.addEventListener("resize", layout);
    layout();

    // ----------- destroy -----------
    return {
        destroy: (): void => {
            try {
                unsubscribe?.();
            } catch { }
            window.removeEventListener("resize", layout);
            app.stage.removeChild(backgroundContainer, wheelContainer, uiContainer, menuContainer);
            if (copySprite.parent) app.stage.removeChild(copySprite);
            if (noPrizesDiv?.parentElement) noPrizesDiv.parentElement.removeChild(noPrizesDiv);
        },
    };
}

// ----------- Overlay responsive de premio -----------
function showPrizeOverlay(
    app: PIXI.Application,
    prize: string,
    getScale: () => number
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

    overlay.on("pointerdown", () => {
        if (overlay.parent) app.stage.removeChild(overlay);
    });
    setTimeout(() => {
        if (overlay.parent) app.stage.removeChild(overlay);
    }, 8000);
}

export default crearRuleta;
