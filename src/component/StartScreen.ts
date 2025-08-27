
import * as PIXI from "pixi.js";

async function crearPantallaInicio(app: PIXI.Application, onStart: () => void) {
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
    logo.position.set(app.screen.width / 2, app.screen.height / 2 -350);
    startScreenContainer.addChild(logo);

    // Botón personalizado
    const botonTexture = await PIXI.Assets.load("/img/INICIO/BOTON_INICIO.png");
    const boton = new PIXI.Sprite(botonTexture);
    boton.anchor.set(0.5);
    boton.scale.set(0.6, 0.6);
    boton.position.set(app.screen.width / 2, app.screen.height / 2 -100);
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
    import('gsap').then(({ default: gsap }) => {
        gsap.to(imagen, {
            y: imagen.position.y - 30,
            duration: 1.5,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });
    });
    startScreenContainer.addChild(boton);

    boton.on("pointerdown", () => {
        app.stage.removeChild(startScreenContainer);
        onStart();
    });
}
export default crearPantallaInicio;