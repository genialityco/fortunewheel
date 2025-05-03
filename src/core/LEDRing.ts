import * as PIXI from 'pixi.js'

export type Mode = 'idle' | 'spinning' | 'winner'

export class LEDRing extends PIXI.Container {
  private leds: PIXI.Sprite[] = [] // Use sprites for texture support
  private mode: Mode = 'idle'
  private ticker = PIXI.Ticker.shared
  private ledTexture: PIXI.Texture | null = null // Texture for the LEDs

  constructor(radius = 221, count = 40) {
    super()

    // Load LED texture asynchronously
    PIXI.Assets.load('/assets/led_texture.png').then((texture) => {
      this.ledTexture = texture
      this.createLEDs(radius, count)
    })

    this.ticker.add(this.update, this)
  }

  private createLEDs(radius: number, count: number) {
    if (!this.ledTexture) return // Ensure texture is loaded

    for (let i = 0; i < count; i++) {
      const led = new PIXI.Sprite(this.ledTexture)
      led.anchor.set(0.5)
      led.scale.set(0.5) // Adjust size of the LEDs
      const angle = (i / count) * Math.PI * 2
      led.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius
      )
      this.addChild(led)
      this.leds.push(led)
    }
  }

  setMode(mode: Mode, winnerIndex?: number) {
    this.mode = mode
    this.winnerSlice = winnerIndex ?? 0
  }

  private winnerSlice = 0
  private update(delta: number) {
    const t = performance.now() * 0.002
    this.leds.forEach((led, i) => {
      switch (this.mode) {
        case 'idle':
          led.alpha = Math.random() > 0.92 ? 1 : 0.2
          led.tint = 0xffffff // White light for idle mode
          break
        case 'spinning':
          led.alpha = (Math.floor((t * 20) + i) % 10) < 5 ? 1 : 0.2
          led.tint = 0xffff00 // Yellow light for spinning mode
          break
        case 'winner':
          led.alpha = (Math.sin(t * 10) + 1) / 2 > 0.5 ? 1 : 0.2
          led.tint = 0xddff22 // Red light for winner mode
          break
      }

      // Add a subtle glow effect
      led.scale.set(led.alpha * 0.6 + 0.4) // Scale LEDs based on alpha
    })
  }
}