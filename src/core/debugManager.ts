/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';

export class DebugManager {
  private container: HTMLDivElement;
  private engine: any; // Using any to avoid circular dependency
  private enabled: boolean = false;
  private stats: {
    fps: number;
    ms: number;
    drawCalls: number;
    triangles: number;
    trees: number;
    grass: number;
    renderScale: number;
  } = { fps: 0, ms: 0, drawCalls: 0, triangles: 0, trees: 0, grass: 0, renderScale: 1 };

  constructor(engine: any) {
    this.engine = engine;
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      pointer-events: none;
      z-index: 1000;
      display: none;
      border: 1px solid #0f0;
    `;
    document.body.appendChild(this.container);

    window.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        this.enabled = !this.enabled;
        this.container.style.display = this.enabled ? 'block' : 'none';
      }
    });
  }

  public update(renderer: THREE.WebGLRenderer, scene: THREE.Scene, trees: any[], grass: any[]) {
    if (!this.enabled) return;

    this.stats.drawCalls = renderer.info.render.calls;
    this.stats.triangles = renderer.info.render.triangles;
    this.stats.trees = trees.length;
    this.stats.grass = grass.length;
    
    // Simple FPS calculation
    const now = performance.now();
    // This is a simplified calculation, needs integration with game loop dt for accuracy
    this.stats.ms = (now % 1000); 

    this.container.innerHTML = `
      <div>FPS: ${Math.round(1000 / (this.stats.ms || 1))}</div>
      <div>MS: ${this.stats.ms.toFixed(2)}</div>
      <div>Draw Calls: ${this.stats.drawCalls}</div>
      <div>Triangles: ${this.stats.triangles}</div>
      <div>Trees: ${this.stats.trees}</div>
      <div>Grass: ${this.stats.grass}</div>
      <div>Render Scale: ${this.stats.renderScale.toFixed(2)}</div>
    `;
  }
}
