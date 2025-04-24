import * as PIXI from 'pixi.js'

export class Marker extends PIXI.Container {
  private marker: PIXI.Graphics

  constructor() {
    super()
    this.marker = new PIXI.Graphics()
    this.buildMarker()
  }

  private buildMarker() {
    // Create a large marker
    this.marker.beginFill(0xff0000) // Red base color
    this.marker.drawPolygon([
      -50, -100, // Left point (large size)
      50, -100,  // Right point (large size)
      0, 0       // Bottom point
    ])
    this.marker.endFill()

    // Add shadow effect
    const shadow = new PIXI.Graphics()
    shadow.beginFill(0x000000, 0.5) // Semi-transparent black for shadow
    shadow.drawPolygon([
      -50, -100, 
      50, -100,  
      0, 0
    ])
    shadow.endFill()
    shadow.position.set(5, 5) // Offset for shadow
    this.marker.addChild(shadow)

    // Position the marker at the top center
    this.marker.position.set(0, -200) // Adjust position to be above the wheel
    this.addChild(this.marker)
  }
}