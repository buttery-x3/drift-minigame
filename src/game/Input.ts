export type ControlAction =
  | 'throttle'
  | 'brake'
  | 'left'
  | 'right'
  | 'reset'
  | 'regenerate'
  | 'camera';

const keyMap = new Map<string, ControlAction>([
  ['ArrowUp', 'throttle'],
  ['KeyW', 'throttle'],
  ['ArrowDown', 'brake'],
  ['KeyS', 'brake'],
  ['ArrowLeft', 'left'],
  ['KeyA', 'left'],
  ['ArrowRight', 'right'],
  ['KeyD', 'right'],
  ['KeyR', 'reset'],
  ['KeyT', 'regenerate'],
  ['KeyC', 'camera'],
]);

export class Input {
  private down = new Set<ControlAction>();
  private pressed = new Set<ControlAction>();

  constructor() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  isDown(action: ControlAction) {
    return this.down.has(action);
  }

  wasPressed(action: ControlAction) {
    return this.pressed.has(action);
  }

  endFrame() {
    this.pressed.clear();
  }

  clear() {
    this.down.clear();
    this.pressed.clear();
  }

  private onKeyDown = (event: KeyboardEvent) => {
    const action = keyMap.get(event.code);
    if (!action) return;
    event.preventDefault();
    if (!this.down.has(action)) {
      this.pressed.add(action);
    }
    this.down.add(action);
  };

  private onKeyUp = (event: KeyboardEvent) => {
    const action = keyMap.get(event.code);
    if (!action) return;
    event.preventDefault();
    this.down.delete(action);
  };
}
