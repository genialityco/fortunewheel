export class SpinButton extends PIXI.Sprite {
    constructor(texture: PIXI.Texture, onTap: () => void) {
      super(texture)
      this.anchor.set(0.5)
      this.interactive = true
      this.buttonMode = true
      this.on('pointerdown', onTap)
    }
  }