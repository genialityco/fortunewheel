// crearPantallaInicio.ts — Responsive + control por gestos (Kinect vía Socket.IO)

import * as PIXI from "pixi.js";
import io from "socket.io-client";

// Lienzo virtual de referencia para layout responsive
const BASE = { width: 1920, height: 1080 };

// Interfaz para los datos de gesto recibidos del Kinect
interface GestureData {
    hand: "izq" | "der";
    type:
    | "click"
    | "hand_open"
    | "hand_closed"
    | "hand_lasso"
    | "swipe_left"
    | "swipe_right"
    | "swipe_up"
    | "swipe_down";
    coordinates: { x: number; y: number; z: number };
    timestamp: number;
}

// Interfaz para el objeto de retorno
interface PantallaInicioInstance {
    destroy: () => void;
}

async function crearPantallaInicio(
    app: PIXI.Application,
    onStart: () => void,
    wsUrl?: string
): Promise<PantallaInicioInstance> {
    const startScreenContainer = new PIXI.Container();
    app.stage.addChild(startScreenContainer);

    // Escala global responsive
    let uiScale = 1;

    // ---------- Cargar assets ----------
    const [fondoTexture, logoTexture, botonTexture, imagenTexture] =
        await Promise.all([
            PIXI.Assets.load("/img/INICIO/FONDO_INICIO.png"),
            PIXI.Assets.load("/img/INICIO/COPY_SUPERIOR.png"),
            PIXI.Assets.load("/img/INICIO/BOTON_INICIO.png"),
            PIXI.Assets.load("/img/INICIO/MOBILE-Y-TARJETA.png"),
        ]);

    // ---------- Fondo (cover) ----------
    const fondo = new PIXI.Sprite(fondoTexture);
    fondo.anchor.set(0.5);
    startScreenContainer.addChild(fondo);

    // ---------- Logo ----------
    const logo = new PIXI.Sprite(logoTexture);
    logo.anchor.set(0.5);
    startScreenContainer.addChild(logo);

    // ---------- Botón ----------
    const boton = new PIXI.Sprite(botonTexture);
    boton.anchor.set(0.5);
    boton.eventMode = "static";
    boton.cursor = "pointer";
    startScreenContainer.addChild(boton);

    // ---------- Imagen decorativa ----------
    const imagen = new PIXI.Sprite(imagenTexture);
    imagen.anchor.set(0.5);
    startScreenContainer.addChild(imagen);

    // ---------- Animación de flotación (reiniciable en resize) ----------
    let gsapMod: typeof import("gsap") | null = null;
    let floatTween: any = null; // gsap.core.Tween | null

    async function ensureGsap() {
        if (!gsapMod) {
            try {
                const mod = await import("gsap");
                gsapMod = mod;
            } catch (err) {
                console.warn("GSAP no disponible, continuando sin animación:", err);
            }
        }
    }

    function startFloat() {
        if (!gsapMod) return;
        if (floatTween) {
            try {
                floatTween.kill();
            } catch { }
            floatTween = null;
        }
        // 30px relativos a la escala
        floatTween = (gsapMod!.default).to(imagen, {
            y: imagen.position.y - 30 * uiScale,
            duration: 1.5,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut",
        });
    }

    await ensureGsap();

    // ---------- Responsive layout ----------
    function layout() {
        const vw = app.screen.width;
        const vh = app.screen.height;

        // Escala global para encajar BASE en la ventana real
        uiScale = Math.min(vw / BASE.width, vh / BASE.height);

        // Centro real
        const cx = vw / 2;
        const cy = vh / 2;

        // Fondo: cubrir toda la pantalla manteniendo proporción
        fondo.position.set(cx, cy);
        {
            const fw = fondoTexture.width;
            const fh = fondoTexture.height;
            const cover = Math.max(vw / fw, vh / fh);
            fondo.scale.set(cover);
        }

        // Logo: arriba-centro
        logo.position.set(cx, cy - 350 * uiScale);
        // Limitar escala para que no crezca demasiado ni quede muy pequeño
        logo.scale.set(Math.min(1.0, Math.max(0.35, 0.6 * uiScale)));

        // Botón: centro un poco arriba
        boton.position.set(cx, cy - 100 * uiScale);
        // Escala coherente con pantalla
        const botonScale = Math.min(1.1, Math.max(0.4, 0.6 * uiScale));
        boton.scale.set(botonScale);

        // Imagen decorativa: centro inferior
        imagen.position.set(cx, cy + 300 * uiScale);
        imagen.scale.set(Math.min(1.25, Math.max(0.4, 0.6 * uiScale)));

        // Reiniciar/ajustar flotación tras relocalizar
        startFloat();
    }

    // Primer layout
    layout();
    // Ajustar en tiempo real
    window.addEventListener("resize", layout);

    // ---------- Lógica de inicio ----------
    let clickExecuted = false;
    const handleClick = (): void => {
        if (clickExecuted) return;
        clickExecuted = true;

        app.stage.removeChild(startScreenContainer);
        onStart();

        if (socket && socket.connected) {
            socket.disconnect();
        }

        window.removeEventListener("resize", layout);
        if (floatTween) {
            try {
                floatTween.kill();
            } catch { }
            floatTween = null;
        }
    };

    boton.on("pointerdown", handleClick);

    // ---------- Integración Socket.IO (gestos) ----------
    let socket: ReturnType<typeof io> | null = null;

    try {
        const serverUrl = wsUrl || "http://localhost:8000";
        socket = io(serverUrl, {
            transports: ["websocket", "polling"],
            timeout: 5000,
            forceNew: true,
        });

        socket.on("connect", (): void => {
            console.log("Conectado al servidor Kinect:", socket?.id);
        });

        socket.on("gesture", (gestureData: GestureData): void => {
            // Sólo actuamos ante "click" (empuje hacia adelante)
            if (gestureData.type === "click") {
                handleClick();
            }
            // Otros gestos disponibles en gestureData.type si quieres extender comportamiento
        });

        socket.on("connect_error", (error: Error): void => {
            console.error("Error de conexión Socket.IO:", error);
        });

        socket.on("disconnect", (reason: string): void => {
            console.log("Desconectado del servidor Kinect:", reason);
        });
    } catch (error) {
        console.error("Error al configurar Socket.IO:", error);
        console.log("Asegúrate de instalar: npm i socket.io-client");
        console.log("Y sus tipos: npm i -D @types/socket.io-client");
    }

    // ---------- Limpieza ----------
    return {
        destroy: (): void => {
            try {
                window.removeEventListener("resize", layout);
                if (floatTween) {
                    try {
                        floatTween.kill();
                    } catch { }
                    floatTween = null;
                }
                if (socket && socket.connected) {
                    socket.disconnect();
                }
                if (startScreenContainer.parent) {
                    app.stage.removeChild(startScreenContainer);
                }
            } catch { }
        },
    };
}

export default crearPantallaInicio;
