// main.ts reorganizado sin pantalla de inicio, carga ruleta directo

import * as PIXI from "pixi.js";
import "./core/touchDebugOverlay";
import './touchDebugOverlay.css';
import gsap from "gsap";
// import { Marker } from "./core/Marker";
// Use PIXI's built-in BlurFilter for compatibility
const { BlurFilter } = PIXI;
import { GlowFilter } from "@pixi/filter-glow";
import { Prize } from "./core/rng";

async function boot() {
  clearBody();

  // route puede venir del hash "#/admin" o del path "/admin"
  const route =
    (location.hash && location.hash.replace(/^#/, '')) || location.pathname;

  if (route === '/admin') {
    document.body.appendChild(await AdminScreen());
    return;
  }

  // Render principal (ruleta directamente)
  const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  await app.init({ resizeTo: window });
  document.body.appendChild(app.canvas);

  // Cargar la ruleta directamente
  await crearRuleta(app);
}

window.addEventListener('hashchange', boot);
window.addEventListener('popstate', boot); // para rutas tipo /admin
window.addEventListener('DOMContentLoaded', boot);
