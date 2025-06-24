// touchDebugOverlay.js
import { touchPointManager } from './touchPointManager.js';


const overlay = document.createElement('div');
overlay.className = 'touch-debug-overlay';
document.body.appendChild(overlay);

touchPointManager.onTouchPoints((points) => {
  overlay.innerHTML = '';

  for (const pt of points) {
    const x = window.innerWidth - (pt['2d_x_px'] / 640) * window.innerWidth;
    const y = (pt['2d_y_px'] / 480) * window.innerHeight;
    const id = pt.id;

    // Draw marker
    const marker = document.createElement('div');
    marker.className = `touch-point-marker ${pt.is_touching ? 'touching' : ''}`;
    marker.style.left = `${x}px`;
    marker.style.top = `${y}px`;
    marker.innerHTML = `
      <span class="label">${pt.name}<br />(${Math.round(x)}, ${Math.round(y)})</span>
    `;
    overlay.appendChild(marker);

    //if (!pt.is_touching || !touchPointManager.shouldDispatchClick(id)) continue;
    //if (!pt.is_touching || !touchPointManager.shouldDispatchClick(id)) continue;

    const target = document.elementFromPoint(x, y);
    if (!target) continue;

    const clickEvent = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      button: 0,
    });
    target.dispatchEvent(clickEvent);

    const pointerDown = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
      pointerType: 'touch',
      pointerId: 1,
      isPrimary: true,
      button: 0,
    });
    target.dispatchEvent(pointerDown);

    setTimeout(() => {
      const pointerUp = new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        pointerId: 1,
        pointerType: 'touch',
        isPrimary: true,
      });
      target.dispatchEvent(pointerUp);
    }, 50);
  }
});

// Log real clicks
document.addEventListener('click', (e) => {
  console.log('[REAL CLICK]', e.clientX, e.clientY, e.target);
});
