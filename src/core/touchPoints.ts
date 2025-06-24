// touchPoints.ts
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

type TouchCallback = (touches: TouchPoint[]) => void;

class TouchPointManager {
  private ws: WebSocket;
  private listeners: Set<TouchCallback> = new Set();

  constructor(url: string) {
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (Array.isArray(data)) {
          this.notifyListeners(data);
        }
      } catch (err) {
        console.error("Failed to parse touch point data:", err);
      }
    };

    this.ws.onclose = () => {
      console.warn("WebSocket closed. Attempting to reconnect...");
      setTimeout(() => {
        this.reconnect(url);
      }, 1000);
    };
  }

  private reconnect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onmessage = this.ws.onmessage;
    this.ws.onclose = this.ws.onclose;
  }

  private notifyListeners(data: TouchPoint[]) {
    for (const callback of this.listeners) {
      callback(data);
    }
  }

  public subscribe(callback: TouchCallback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

// Create a singleton instance for reuse
export const touchPointManager = new TouchPointManager("ws://localhost:8000/ws/touches");
