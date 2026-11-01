/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class GameLoop {
  private animationFrameId: number = 0;
  private lastTime: number = performance.now();
  private accumulator: number = 0;
  private readonly timeStep: number = 1 / 60; // 60 FPS fixed logic
  private readonly maxDt: number = 0.1; // Max 0.1s to prevent tab-switch teleporting

  private updateCallback: (dt: number) => void;
  private renderCallback: (alpha: number) => void;

  constructor(updateCallback: (dt: number) => void, renderCallback: (alpha: number) => void) {
    this.updateCallback = updateCallback;
    this.renderCallback = renderCallback;
  }

  public start() {
    this.lastTime = performance.now();
    const loop = (currentTime: number) => {
      this.animationFrameId = requestAnimationFrame(loop);

      const rawDt = (currentTime - this.lastTime) / 1000;
      this.lastTime = currentTime;
      const dt = Math.min(rawDt, this.maxDt);

      this.accumulator += dt;

      while (this.accumulator >= this.timeStep) {
        this.updateCallback(this.timeStep);
        this.accumulator -= this.timeStep;
      }

      const alpha = this.accumulator / this.timeStep;
      this.renderCallback(alpha);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  public stop() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}
