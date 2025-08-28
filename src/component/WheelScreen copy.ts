// crearRuleta.ts — versión con soporte para Kinect

import * as PIXI from "pixi.js";
import gsap from "gsap";

import { WheelStand } from "../core/Wheel";
import { LEDRing } from "../core/LEDRing";
import { Confetti } from "../core/Confetti";
import "../core/touchDebugOverlay";
import "../touchDebugOverlay.css";
import { Prize } from "../core/rng";

const { BlurFilter } = PIXI;

// Interfaz para los datos de gesto recibidos del Kinect
interface GestureData {
    hand: 'izq' | 'der';
    type: 'click' | 'hand_open' | 'hand_closed' | 'hand_lasso' | 'swipe_left' | 'swipe_right' | 'swipe_up' | 'swipe_down';
    coordinates: {
        x: number;
        y: number;
        z: number;
    };
    timestamp: number;
}

// Interfaz para el objeto de retorno
interface RuletaInstance {
    destroy: () => void;
}

async function crearRuleta(app: PIXI.Application, wsUrl?: string): Promise<RuletaInstance> {
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
    monedas.position.set(app.screen.width / 2, app.screen.height / 2 + 70);
    monedas.scale.set(1);
    
    // Agregar imagen de tarjeta grande detrás de las monedas
    const tarjetaTexture = await PIXI.Assets.load("/img/WHEEL/TARJETA_CREDITO_01.png");
    const tarjetaSprite = new PIXI.Sprite(tarjetaTexture);
    tarjetaSprite.anchor.set(0.5);
    tarjetaSprite.position.set(app.screen.width / 2 - 700, app.screen.height / 2 - 250);
    tarjetaSprite.scale.set(0.9);
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
    tarjetaSpriteDer.position.set(app.screen.width / 2 + 400, app.screen.height / 2 - 100);
    tarjetaSpriteDer.scale.set(0.3);
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
    wheel.scale.set(0.6);
    ring.scale.set(0.6);
    wheel.position.set(0, 250);

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
    copySprite.position.set(app.screen.width / 2 + 600, app.screen.height / 2 - 400);
    copySprite.scale.set(0.5);
    app.stage.addChild(copySprite);
    app.stage.setChildIndex(copySprite, app.stage.children.length - 1); // Siempre al frente

    adjustContainerScaleAndPosition(wheelContainer, app);

    // ---------- Control de giro ----------
    let isSpinning = false;

    // Función para ejecutar el giro
    const executeSpinAction = (): void => {
        if (isSpinning) {
            console.log("Ruleta ya está girando, ignorando comando...");
            return;
        }
        
        console.log("Ejecutando giro de ruleta...");
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
                // Siempre liberamos el bloqueo (tras un pequeño delay "anti-spam")
                setTimeout(() => {
                    isSpinning = false;
                    console.log("Ruleta lista para girar nuevamente");
                }, 1200);
            }
        });
    };

    // ---------- Botón de girar ----------
    const buttonTexture = await PIXI.Assets.load("img/WHEEL/LOGO_CENTRO_RULETA.png");
    const btn = new PIXI.Sprite(buttonTexture);
    btn.anchor.set(0.5);
    btn.scale.set(0.1, 0.10);
    btn.position.set(0, 250);
    btn.eventMode = "static";
    btn.cursor = "pointer";
    wheelContainer.addChild(btn);
    wheelContainer.setChildIndex(btn, wheelContainer.children.length - 1); // Siempre al frente
    wheelContainer.position.set(950, 0);

    // Evento de clic manual en el botón
    btn.on("pointerdown", executeSpinAction);

    // ---------- Configuración de Socket.IO para Kinect ----------
    let socket: any = null;
    
    try {
        // Import dinámico de socket.io-client
        const { io } = await import('socket.io-client');
        
        // Conectar al servidor Kinect (por defecto en localhost:8000)
        const serverUrl = wsUrl || 'http://localhost:8000';
        socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            timeout: 5000,
            forceNew: true
        });
        
        socket.on('connect', (): void => {
            console.log("🎯 Ruleta conectada al servidor Kinect:", socket?.id);
        });
        
        socket.on('gesture', (gestureData: GestureData): void => {
            console.log("🎮 Gesto recibido en ruleta:", gestureData);
            
            // Verificar si es un gesto de "click" (push hacia adelante)
            if (gestureData.type === 'click') {
                console.log(`🎰 Click detectado con mano ${gestureData.hand}. Girando ruleta...`);
                executeSpinAction();
            }
            
            // Puedes agregar más gestos para otras funciones:
            // if (gestureData.type === 'swipe_left') {
            //     // Cambiar configuración anterior
            // }
            // if (gestureData.type === 'swipe_right') {
            //     // Cambiar configuración siguiente
            // }
        });
        
        socket.on('connect_error', (error: Error): void => {
            console.error("❌ Error de conexión Socket.IO en ruleta:", error);
        });
        
        socket.on('disconnect', (reason: string): void => {
            console.log("🔌 Ruleta desconectada del servidor Kinect:", reason);
        });
        
    } catch (error) {
        console.error("❌ Error al configurar Socket.IO para ruleta:", error);
        console.log("📦 Para usar Kinect, instala: npm install socket.io-client");
        console.log("🖱️ El botón manual seguirá funcionando normalmente.");
    }

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

    // El menú está comentado en el código original, lo mantengo comentado
    // drawHighlight(menuButtons[activeConfigIndex].position.x, menuButtons[activeConfigIndex].position.y);
    // menuContainer.addChildAt(shadow, 0);
    // menuContainer.addChildAt(highlight, 1);

    // Función para limpiar recursos
    return {
        destroy: (): void => {
            if (socket && socket.connected) {
                socket.disconnect();
            }
            // Limpiar containers
            app.stage.removeChild(backgroundContainer);
            app.stage.removeChild(wheelContainer);
            app.stage.removeChild(uiContainer);
            app.stage.removeChild(menuContainer);
            if (copySprite.parent) {
                app.stage.removeChild(copySprite);
            }
        }
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
    
    // Crear el texto primero para medirlo y adaptar el fondo
    const textStyle = new PIXI.TextStyle({
        fontFamily: "Luckiest Guy, sans-serif",
        fontSize: 57.6,
        fill: "#fff",
        align: "center"
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
    bg.lineStyle(6, 0x2196F3, 0.9);
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

    // Cierre automático (8s)
    setTimeout(() => {
        if (overlay.parent) {
            app.stage.removeChild(overlay);
        }
    }, 8000);
}

export default crearRuleta;