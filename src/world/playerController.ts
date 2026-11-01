/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { PlayerState } from '../types';
import { LUMINATI_SCALE } from '../data/constants';
import { getTerrainHeight } from './worldGen';
import {
  PlayerDirection,
  DIRECTION_BASE_FRAMES,
  getPlayerTexture,
  onPlayerTexturesLoaded,
} from './playerSprites';

export class PlayerController {
  public state: PlayerState;
  public mesh: THREE.Sprite;
  private animTimer: number = 0;
  private animFrame: number = 0;
  private idleTime: number = 0;
  public facingDirection: PlayerDirection = 'up';
  public facingRight: boolean = true;
  public isSprinting: boolean = false;

  public static readonly BASE_WIDTH = LUMINATI_SCALE.PLAYER_WIDTH;
  public static readonly BASE_HEIGHT = LUMINATI_SCALE.PLAYER_HEIGHT;
  public static readonly HALF_HEIGHT = LUMINATI_SCALE.PLAYER_HALF_HEIGHT;

  constructor(scene: THREE.Scene) {
    this.state = {
      x: 0,
      z: 7.0,
      y: 0,
      rotation: 0,
      speed: 6,
      isMoving: false,
      soulsCollected: 0,
      hp: 100,
      maxHp: 100,
      gold: 50,
      inventory: [],
      questState: 'none',
    };

    // Start facing North (up / into village)
    const initialTex = getPlayerTexture(DIRECTION_BASE_FRAMES[this.facingDirection]);

    const mat = new THREE.SpriteMaterial({
      map: initialTex,
      transparent: true,
      alphaTest: 0.25,
    });

    this.mesh = new THREE.Sprite(mat);
    this.mesh.scale.set(PlayerController.BASE_WIDTH, PlayerController.BASE_HEIGHT, 1);
    scene.add(this.mesh);

    onPlayerTexturesLoaded(() => {
      const frameIdx = DIRECTION_BASE_FRAMES[this.facingDirection] + this.animFrame;
      this.mesh.material.map = getPlayerTexture(frameIdx);
      this.mesh.material.needsUpdate = true;
    });

    this.updatePosition(0, 0, 0, false);
  }

  public updatePosition(
    dt: number,
    strafeDir: number = 0,
    forwardDir: number = 0,
    isSprinting: boolean = false
  ) {
    this.isSprinting = isSprinting;
    const terrainY = getTerrainHeight(this.state.x, this.state.z);
    const targetY = terrainY + PlayerController.HALF_HEIGHT;

    if (dt <= 0 || isNaN(this.state.y)) {
      this.state.y = targetY;
    } else {
      this.state.y = THREE.MathUtils.lerp(this.state.y, targetY, Math.min(1.0, dt * 10));
    }

    if (strafeDir > 0.1) {
      this.facingRight = true;
    } else if (strafeDir < -0.1) {
      this.facingRight = false;
    }

    if (this.state.isMoving && dt > 0) {
      // Determine 4-directional orientation
      if (Math.abs(forwardDir) > 0.15 || Math.abs(strafeDir) > 0.15) {
        if (Math.abs(forwardDir) >= Math.abs(strafeDir)) {
          this.facingDirection = forwardDir > 0 ? 'up' : 'down';
        } else {
          this.facingDirection = strafeDir > 0 ? 'right' : 'left';
        }
      }

      this.animTimer += dt;
      const animInterval = isSprinting ? 0.085 : 0.135;
      if (this.animTimer > animInterval) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 4;
        const frameIdx = DIRECTION_BASE_FRAMES[this.facingDirection] + this.animFrame;
        this.mesh.material.map = getPlayerTexture(frameIdx);
        this.mesh.material.needsUpdate = true;
      }

      const targetTilt =
        -strafeDir * 0.045 +
        (isSprinting ? (this.facingDirection === 'left' ? -0.03 : this.facingDirection === 'right' ? 0.03 : 0) : 0);
      this.mesh.material.rotation = THREE.MathUtils.lerp(
        this.mesh.material.rotation,
        targetTilt,
        Math.min(1.0, dt * 14)
      );

      this.mesh.scale.set(PlayerController.BASE_WIDTH, PlayerController.BASE_HEIGHT, 1);
    } else {
      this.idleTime += dt;
      const breath = Math.sin(this.idleTime * 2.8) * 0.14;
      this.mesh.scale.set(PlayerController.BASE_WIDTH, PlayerController.BASE_HEIGHT + breath, 1);

      if (this.animFrame !== 0) {
        this.animFrame = 0;
        const frameIdx = DIRECTION_BASE_FRAMES[this.facingDirection];
        this.mesh.material.map = getPlayerTexture(frameIdx);
        this.mesh.material.needsUpdate = true;
      }

      this.mesh.material.rotation = THREE.MathUtils.lerp(
        this.mesh.material.rotation,
        0,
        Math.min(1.0, dt * 12)
      );
    }

    this.mesh.position.set(this.state.x, this.state.y, this.state.z);
  }

  public reset() {
    this.state.x = 0;
    this.state.z = 2;
    this.state.rotation = 0;
    this.state.soulsCollected = 0;
    this.facingDirection = 'up';
    this.facingRight = true;
    this.updatePosition(0, 0, 0, false);
  }
}
