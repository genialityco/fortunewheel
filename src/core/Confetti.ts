import { Container, Graphics, Ticker } from 'pixi.js'

export class Confetti extends Container {
  private ticker = Ticker.shared
  private live = false

  constructor(private count = 150, private area = { w: 600, h: 400 }) {
    super()
  }

  burst() {
    if (this.live) return
    this.live = true
    this.removeChildren()

    // Define a type for confetti pieces with vx and vy
    type ConfettiPiece = Graphics & { vx: number; vy: number };

    // Set the time when confetti should be removed (e.g., after 2 seconds)
    const removeTime = performance.now() + 2000;

    for (let i = 0; i < this.count; i++) {
      const c = new Graphics() as ConfettiPiece;
      c.beginFill(Math.random() * 0xffffff)
      c.drawRect(-2, -2, 4, 4)
      c.endFill()
      c.position.set((Math.random() - 0.5) * this.area.w,
                     (Math.random() - 1) * this.area.h)
      c.vy = Math.random() * 6 + 3
      c.vx = (Math.random() - 0.5) * 6
      this.addChild(c)
    }

    this.ticker.add(() => {
      this.children.forEach(g => {
        const confetti = g as Graphics & { vx: number; vy: number };
        confetti.vy += 0.2
        confetti.y += confetti.vy
        confetti.x += confetti.vx
      })
      if (performance.now() > removeTime) {
        this.removeChildren()
        this.live = false
      }
    })
  }
}