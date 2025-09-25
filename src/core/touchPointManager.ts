export interface TouchPoint {
  id: string;
  x: number;
  y: number;
  z: number;
  is_touching: boolean;
  name: string;
  bodypart: string;
  '2d_x_px': number;
  '2d_y_px': number;
  '2d_depth': number;
}

type TouchCallback = (points: TouchPoint[]) => void;

class TouchPointManager {
  private ws: WebSocket;
  private subscribers: Set<TouchCallback> = new Set();
  private lastClickTimestamps = new Map<string, number>();
  private readonly CLICK_INTERVAL_MS = 1000;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          this.subscribers.forEach(cb => cb(data));
        }
      } catch (e) {
        console.error('[TouchWS] Invalid JSON', e);
      }
    };

    this.ws.onclose = () => {
      console.warn('[TouchWS] Reconnecting...');
      setTimeout(() => new TouchPointManager(url), 1000);
    };
  }

  public onTouchPoints(callback: TouchCallback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  public shouldDispatchClick(id: string): boolean {
    const now = Date.now();
    const last = this.lastClickTimestamps.get(id) || 0;
    if (now - last >= this.CLICK_INTERVAL_MS) {
      this.lastClickTimestamps.set(id, now);
      return true;
    }
    return false;
  }
}

export const touchPointManager = new TouchPointManager('ws://localhost:8000/ws/touches');
