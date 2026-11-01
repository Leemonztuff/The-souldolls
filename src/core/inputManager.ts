/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type GameAction =
  | 'moveForward'
  | 'moveBackward'
  | 'turnLeft'
  | 'turnRight'
  | 'strafeLeft'
  | 'strafeRight'
  | 'accept'
  | 'cancel'
  | 'pause'
  | 'interact'
  | 'attack'
  | 'sprint'
  | 'luminadex';

export class InputManager {
  private actions: Record<GameAction, boolean> = {
    moveForward: false,
    moveBackward: false,
    turnLeft: false,
    turnRight: false,
    strafeLeft: false,
    strafeRight: false,
    accept: false,
    cancel: false,
    pause: false,
    interact: false,
    attack: false,
    sprint: false,
    luminadex: false,
  };

  private mouseDeltaX: number = 0;
  private isMouseDown: boolean = false;
  private lastTouchX: number = 0;

  constructor(domElement: HTMLElement) {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    domElement.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);

    domElement.addEventListener('touchstart', this.handleTouchStart, { passive: true });
    domElement.addEventListener('touchmove', this.handleTouchMove, { passive: true });
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (['Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === 'KeyW' || e.code === 'ArrowUp') this.actions.moveForward = true;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') this.actions.moveBackward = true;
    if (e.code === 'KeyA') this.actions.strafeLeft = true;
    if (e.code === 'KeyD') this.actions.strafeRight = true;
    if (e.code === 'KeyQ' || e.code === 'ArrowLeft') this.actions.turnLeft = true;
    if (e.code === 'KeyE' || e.code === 'ArrowRight') this.actions.turnRight = true;
    if (e.code === 'Space' || e.code === 'Enter') this.actions.accept = true;
    if (e.code === 'Escape') this.actions.cancel = true;
    if (e.code === 'KeyP') this.actions.pause = true;
    if (e.code === 'KeyE' && !this.actions.turnRight) this.actions.interact = true;
    if (e.code === 'Space') this.actions.attack = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.actions.sprint = true;
    if (e.code === 'KeyJ') this.actions.luminadex = true;
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'KeyW' || e.code === 'ArrowUp') this.actions.moveForward = false;
    if (e.code === 'KeyS' || e.code === 'ArrowDown') this.actions.moveBackward = false;
    if (e.code === 'A' || e.code === 'KeyA') this.actions.strafeLeft = false;
    if (e.code === 'KeyD') this.actions.strafeRight = false;
    if (e.code === 'KeyQ' || e.code === 'ArrowLeft') this.actions.turnLeft = false;
    if (e.code === 'KeyE' || e.code === 'ArrowRight') this.actions.turnRight = false;
    if (e.code === 'Space' || e.code === 'Enter') this.actions.accept = false;
    if (e.code === 'Escape') this.actions.cancel = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.actions.sprint = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    this.isMouseDown = true;
    this.mouseDeltaX = e.clientX;
    this.actions.accept = true;
  };

  private handleMouseUp = () => {
    this.isMouseDown = false;
    this.actions.accept = false;
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isMouseDown) {
      const delta = e.clientX - this.mouseDeltaX;
      if (delta > 2) this.actions.turnRight = true;
      else if (delta < -2) this.actions.turnLeft = true;
      else {
        this.actions.turnRight = false;
        this.actions.turnLeft = false;
      }
      this.mouseDeltaX = e.clientX;
    }
  };

  private handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      this.lastTouchX = e.touches[0].clientX;
      this.actions.accept = true;
    }
  };

  private handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const delta = e.touches[0].clientX - this.lastTouchX;
      if (delta > 2) this.actions.turnRight = true;
      else if (delta < -2) this.actions.turnLeft = true;
      else {
        this.actions.turnRight = false;
        this.actions.turnLeft = false;
      }
      this.lastTouchX = e.touches[0].clientX;
    }
  };

  public isActionActive(action: GameAction): boolean {
    return this.actions[action];
  }

  public setVirtualAction(action: GameAction, active: boolean) {
    this.actions[action] = active;
  }

  public destroy() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }
}
