import * as PIXI from "pixi.js";
import io from "socket.io-client";
// ...existing code...
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

    // Fondo personalizado
    const fondoTexture = await PIXI.Assets.load("/img/INICIO/FONDO_INICIO.png");
    const fondo = new PIXI.Sprite(fondoTexture);
    fondo.anchor.set(0.5);
    fondo.position.set(app.screen.width / 2, app.screen.height / 2);
    fondo.scale.set(Math.max(
        (app.screen.width / fondoTexture.width),
        (app.screen.height / fondoTexture.height),
        1
    ));
    startScreenContainer.addChild(fondo);

    // Logo personalizado
    const logoTexture = await PIXI.Assets.load("/img/INICIO/COPY_SUPERIOR.png");
    const logo = new PIXI.Sprite(logoTexture);
    logo.anchor.set(0.5);
    logo.scale.set(0.6);
    logo.position.set(app.screen.width / 2, app.screen.height / 2 - 350);
    startScreenContainer.addChild(logo);

    // Botón personalizado
    const botonTexture = await PIXI.Assets.load("/img/INICIO/BOTON_INICIO.png");
    const boton = new PIXI.Sprite(botonTexture);
    boton.anchor.set(0.5);
    boton.scale.set(0.6, 0.6);
    boton.position.set(app.screen.width / 2, app.screen.height / 2 - 100);
    boton.eventMode = "static";
    boton.cursor = "pointer";

    // Imagen personalizada
    const imagenTexture = await PIXI.Assets.load("/img/INICIO/MOBILE-Y-TARJETA.png");
    const imagen = new PIXI.Sprite(imagenTexture);
    imagen.anchor.set(0.5);
    imagen.scale.set(0.6);
    imagen.position.set(app.screen.width / 2, app.screen.height / 2 + 300);
    startScreenContainer.addChild(imagen);

    // Animación de flotación vertical
    try {
        const { default: gsap } = await import('gsap');
        gsap.to(imagen, {
            y: imagen.position.y - 30,
            duration: 1.5,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
    } catch (error) {
        console.warn("GSAP no disponible, continuando sin animación:", error);
    }

    startScreenContainer.addChild(boton);

    // Variable para controlar si ya se ejecutó el clic (evitar múltiples ejecuciones)
    let clickExecuted = false;

    // Función para manejar el clic del botón
    const handleClick = (): void => {
        if (clickExecuted) return; // Evita múltiples ejecuciones
        clickExecuted = true;

        console.log("Iniciando juego...");
        app.stage.removeChild(startScreenContainer);
        onStart();

        // Cerrar la conexión Socket.IO al iniciar
        if (socket && socket.connected) {
            socket.disconnect();
        }
    };

    // Evento de clic manual
    boton.on("pointerdown", handleClick);

    // Configuración de Socket.IO para conectar con el servidor Kinect
    let socket: ReturnType<typeof io> | null = null;

    try {
        // Conectar al servidor Kinect (por defecto en localhost:8000)
        const serverUrl = wsUrl || 'http://localhost:8000';
        socket = io(serverUrl, {
            transports: ['websocket', 'polling'],
            timeout: 5000,
            forceNew: true
        });

        socket.on('connect', (): void => {
            console.log("Conectado al servidor Kinect:", socket?.id);
        });

        socket.on('gesture', (gestureData: GestureData): void => {
            console.log("Gesto recibido:", gestureData);

            // Verificar si es un gesto de "click" (push hacia adelante)
            if (gestureData.type === 'click') {
                console.log(`Click detectado con mano ${gestureData.hand}. Iniciando juego...`);
                handleClick(); // Simula el clic en el botón
            }

            // También puedes responder a otros gestos si lo necesitas:
            // - 'hand_open': mano abierta
            // - 'hand_closed': mano cerrada  
            // - 'hand_lasso': mano en forma de laso
            // - 'swipe_left', 'swipe_right': deslizar horizontal
            // - 'swipe_up', 'swipe_down': deslizar vertical
        });

        socket.on('connect_error', (error: Error): void => {
            console.error("Error de conexión Socket.IO:", error);
        });

        socket.on('disconnect', (reason: string): void => {
            console.log("Desconectado del servidor Kinect:", reason);
        });

    } catch (error) {
        console.error("Error al configurar Socket.IO:", error);
        console.log("Asegúrate de instalar: npm install socket.io-client");
        console.log("Y sus tipos: npm install @types/socket.io-client");
    }

    // Función para limpiar recursos
    return {
        destroy: (): void => {
            if (socket && socket.connected) {
                socket.disconnect();
            }
            if (startScreenContainer.parent) {
                app.stage.removeChild(startScreenContainer);
            }
        }
    };
}

export default crearPantallaInicio;