// main.ts reorganizado con menú de botones reactivado

import * as PIXI from "pixi.js";
import "./core/touchDebugOverlay";
import './touchDebugOverlay.css';

import crearPantallaInicio from "./component/StartScreen";
import crearRuleta from "./component/WheelScreen";
import AdminScreen from "./component/AdminScreen";

function clearBody() {
  document.body.innerHTML = '';
}
async function boot() {
  clearBody();
  // route puede venir del hash "#/admin" o del path "/admin"
  const route =
    (location.hash && location.hash.replace(/^#/, '')) || location.pathname;

  if (route === '/admin') {
    document.body.appendChild(await AdminScreen());
    return;
  }

  // Render principal
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

window.addEventListener('hashchange', boot);
window.addEventListener('popstate', boot); // para rutas tipo /admin
window.addEventListener('DOMContentLoaded', boot);

