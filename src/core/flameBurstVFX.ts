/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import {
  Emitter,
  System,
  SpriteRenderer,
  SpawnBurst,
  SpawnFromEvents,
  InitLifetime,
  InitPosition,
  InitVelocity,
  InitColor,
  InitSize,
  VelocityIntegrator,
  ColorOverLife,
  AlphaOverLife,
  SizeOverLife,
  Gradient,
  Curve1D,
} from 'three-plume';

export class FlameBurstSystem {
  public system: System;
  public projectileEmitter: Emitter;
  public impactEmitter: Emitter;

  constructor(scene: THREE.Scene) {
    // 1. Create procedural particle texture (glowing fire ball/spark)
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(250, 204, 21, 0.9)'); // Yellow
    grad.addColorStop(0.7, 'rgba(249, 115, 22, 0.6)'); // Orange
    grad.addColorStop(1, 'rgba(239, 68, 68, 0)');     // Red fade
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const fireTexture = new THREE.CanvasTexture(canvas);

    // 2. Projectile Emitter (Flame Burst missile)
    this.projectileEmitter = new Emitter({
      name: 'projectile',
      capacity: 10,
      duration: 0.4,
      loop: false,
      events: { onDeath: true }, // Fires event on death for sub-emitter trigger
      spawn: [
        new SpawnBurst({
          bursts: [{ time: 0, count: 1 }],
        }),
      ],
      init: [
        new InitLifetime({
          lifetime: { kind: 'constant', value: 0.4 },
        }),
        new InitPosition({
          shape: { kind: 'point' },
        }),
        new InitVelocity({
          shape: { kind: 'sphere', radius: 0.2 },
          speed: { kind: 'constant', value: 35.0 },
        }),
        new InitColor({
          color: { kind: 'constant', value: [1.0, 0.8, 0.2] }, // Bright Yellow-Orange
          alpha: { kind: 'constant', value: 1.0 },
        }),
        new InitSize({
          size: { kind: 'constant', value: 1.8 },
        }),
      ],
      update: [
        new VelocityIntegrator(),
        new ColorOverLife({
          gradient: new Gradient([
            { t: 0.0, color: [1.0, 0.9, 0.3, 1.0] },
            { t: 0.5, color: [0.98, 0.45, 0.09, 1.0] }, // #f97316
            { t: 1.0, color: [0.94, 0.27, 0.27, 0.0] },  // #ef4444
          ]),
        }),
        new AlphaOverLife({
          curve: new Curve1D([
            { t: 0, v: 1 },
            { t: 0.8, v: 1 },
            { t: 1, v: 0 },
          ]),
        }),
        new SizeOverLife({
          curve: new Curve1D([
            { t: 0, v: 0.8 },
            { t: 0.5, v: 1.5 },
            { t: 1, v: 0.2 },
          ]),
        }),
      ],
      render: new SpriteRenderer({
        textures: { base: fireTexture },
        blending: 'additive',
      }),
    });

    // 3. Impact Sub-Emitter (Sparks and Smoke triggered on projectile death)
    this.impactEmitter = new Emitter({
      name: 'impact',
      capacity: 50,
      duration: 0.5,
      loop: false,
      spawn: [
        new SpawnFromEvents({
          source: this.projectileEmitter,
          perEvent: 30, // 30 sparks & smoke particles on impact
          inheritVelocity: false,
        }),
      ],
      init: [
        new InitLifetime({
          lifetime: { kind: 'range', min: 0.2, max: 0.5 }, // Dissipation in 0.5s
        }),
        new InitPosition({
          shape: { kind: 'sphere', radius: 0.5 },
        }),
        new InitVelocity({
          shape: { kind: 'sphere', radius: 1.0 },
          speed: { kind: 'range', min: 8.0, max: 22.0 }, // Dry impact explosion
        }),
        new InitColor({
          color: {
            kind: 'list',
            values: [
              [0.98, 0.45, 0.09], // Orange #f97316
              [0.98, 0.8, 0.08],  // Yellow #facc15
              [0.94, 0.27, 0.27], // Red #ef4444
            ],
          },
          alpha: { kind: 'constant', value: 1.0 },
        }),
        new InitSize({
          size: { kind: 'range', min: 0.6, max: 1.4 },
        }),
      ],
      update: [
        new VelocityIntegrator(),
        new ColorOverLife({
          gradient: new Gradient([
            { t: 0.0, color: [1.0, 0.85, 0.2, 1.0] },
            { t: 0.4, color: [0.98, 0.45, 0.09, 0.8] },
            { t: 1.0, color: [0.2, 0.2, 0.2, 0.0] }, // Smoke fade out
          ]),
        }),
        new AlphaOverLife({
          curve: new Curve1D([
            { t: 0, v: 1 },
            { t: 0.6, v: 0.8 },
            { t: 1, v: 0 },
          ]),
        }),
        new SizeOverLife({
          curve: new Curve1D([
            { t: 0, v: 1.0 },
            { t: 1, v: 0.2 },
          ]),
        }),
      ],
      render: new SpriteRenderer({
        textures: { base: fireTexture },
        blending: 'additive',
      }),
    });

    // 4. Plume System containing both emitters
    this.system = new System({
      emitters: [this.projectileEmitter, this.impactEmitter],
    });

    scene.add(this.system.object3D);
  }

  public triggerAt(position: THREE.Vector3) {
    this.system.object3D.position.copy(position);
    this.projectileEmitter.play();
    this.impactEmitter.play();
  }

  public update(renderer: any, dt: number, camera: THREE.Camera) {
    this.system.tick(renderer, dt, this.system.object3D.matrixWorld, 1.0, camera);
  }

  public dispose() {
    this.system.dispose();
  }
}
