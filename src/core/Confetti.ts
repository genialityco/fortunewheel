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

    for (let i = 0; i < this.count; i++) {
      const c = new Graphics()
      c.beginFill(Math.random() * 0xffffff)
      c.drawRect(-2, -2, 4, 4)
      c.endFill()
      c.position.set((Math.random() - 0.5) * this.area.w,
                     (Math.random() - 1) * this.area.h)
      c['vy'] = Math.random() * 6 + 3
      c['vx'] = (Math.random() - 0.5) * 6
      this.addChild(c)
    }

    const removeTime = performance.now() + 3000
    this.ticker.add(() => {
      this.children.forEach(g => {
        g['vy'] += 0.2
        g.y += g['vy']
        g.x += g['vx']
      })
      if (performance.now() > removeTime) {
        this.removeChildren()
        this.live = false
      }
    })
  }
}