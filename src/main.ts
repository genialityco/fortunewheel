// main.ts reorganizado con menú de botones reactivado

import * as PIXI from "pixi.js";
import "./core/touchDebugOverlay";
import './touchDebugOverlay.css';
import crearPantallaInicio from "./component/StartScreen";
import crearRuleta from "./component/WheelScreen";


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

  await crearPantallaInicio(app, async () => {
    await crearRuleta(app);
  });
}  
boot();
