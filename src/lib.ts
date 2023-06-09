import { SPRITES } from "./game";
import { k } from "./kaboom";
import {
  Color,
  Comp,
  GameObj,
  Vec2,
  CompList,
  AreaComp,
  BodyComp,
  EventController,
  PosComp,
  ScaleComp,
  ShaderComp,
  Collision,
  Key,
} from "kaboom";

import names from "../misc/names.json";
import facts from "../misc/facts.json";

type IButtonTextComp = Comp & { setText: (text: string) => void };

interface IButtonTextOptions {
  text: string;
  color?: Color;
  height?: number;
}

function buttonText(opts: IButtonTextOptions): IButtonTextComp {
  let _ref: GameObj | null = null;

  return {
    id: "buttonText",
    add(this: GameObj) {
      _ref = this.add([
        k.text(opts.text, { size: opts.height }),
        k.color(opts.color || k.BLACK),
      ]);
    },
    setText(this: GameObj, textValue) {
      if (!_ref) {
        return;
      }

      _ref.text = textValue;
    },
  };
}

interface IAddButtonOptions {
  additionalTags?: string[];
  pos: Vec2 | ((w: number, h: number) => Vec2);
  font?: string;
  textHeight?: number;
  colorBackground?: Color;
  colorOutline?: [number, Color];
  colorText?: Color;
  onClick?: (a: GameObj) => void;
  parent?: GameObj;
}

export function addButton(textValue: string, options: IAddButtonOptions) {
  // Measure the size of the text to determine the size the button should be
  const formattedText = k.formatText({
    text: textValue,
    font: options.font,
    size: options.textHeight,
  });

  const posValue =
    typeof options.pos === "function"
      ? options.pos(formattedText.width, formattedText.height)
      : options.pos || k.vec2(0, 0);

  // Pseudo-random tag generation for the `onClick` event.
  let tag = "button";
  tag += "-" + textValue;
  tag += "-" + posValue.x;
  tag += "-" + posValue.y;
  tag += "-" + Math.random();

  const buttonComponents: CompList<Comp> = [
    tag,
    k.rect(formattedText.width, formattedText.height),
    k.pos(posValue),
    k.outline(...(options.colorOutline || [2, k.BLACK])),
    k.color(options.colorBackground || k.WHITE),
    buttonText({
      text: textValue,
      color: options.colorText,
      height: formattedText.height,
    }),
  ];

  if (options.additionalTags) {
    buttonComponents.push(...options.additionalTags);
  }

  if (options.onClick) {
    buttonComponents.push(k.area());
    k.onClick(tag, options.onClick);
  }

  return options.parent
    ? options.parent.add(buttonComponents)
    : k.add(buttonComponents);
}

type IButton = Omit<IAddButtonOptions, "pos"> & {
  text: string;
  margin?: [number, number, number, number];
};

interface IMenuOptions {
  pos: [number, number];
  // pos: Vec2 | ((w: number, h: number) => Vec2);
  padding?: [number, number, number, number];
  color?: Color;
}

export function createMenu(menu: IMenuOptions, buttons: IButton[]) {
  let visible = false;
  let menuSize = { width: 0, height: 0 };
  let buttonMaxWidth = 0;

  let currentPosition = { x: menu.pos[0] || 0, y: menu.pos[1] || 0 };

  const [menuPadTop, menuPadRight, menuPadBot, menuPadLeft] =
    menu.padding || [];

  if (menuPadTop) currentPosition.y += menuPadTop;
  if (menuPadLeft) currentPosition.x += menuPadLeft;

  let createButtonFunctions: ((m: GameObj) => GameObj<Comp>)[] = [];
  buttons.forEach((b) => {
    const { width, height } = k.formatText({
      text: b.text,
      font: b.font,
      size: b.textHeight,
    });
    const [top, right, bot, left] = b.margin || [];

    let totalHeight = height;
    if (top) totalHeight += top;
    if (bot) totalHeight += bot;

    let totalWidth = width;
    if (right) totalWidth += right;
    if (left) totalWidth += left;

    // Since buttons are stacked vertically within menus, width values
    // don't stack; instead, we just need to track the widest button
    buttonMaxWidth = Math.max(width, totalWidth);

    // add top margin to y pos before drawing
    if (top) currentPosition.y += top;

    (function (x: number, y: number) {
      createButtonFunctions.push((m) => {
        return addButton(b.text, {
          ...b,
          parent: m,
          pos: k.vec2(x, y),
        });
      });
    })(currentPosition.x, currentPosition.y);

    // add button height (minus top margin already applied) to y pos
    // after drawing
    currentPosition.y += totalHeight - (top || 0);

    // Since buttons are stacked vertically within menus, height and
    // vertical margin values simply get added to the height of the menu
    menuSize.height += totalHeight;
  });

  if (menuPadRight) menuSize.width += menuPadRight;
  if (menuPadLeft) menuSize.width += menuPadLeft;
  if (menuPadTop) menuSize.height += menuPadTop;
  if (menuPadBot) menuSize.height += menuPadBot;

  menuSize.width += buttonMaxWidth;

  let menuRef: GameObj<Comp> | null = null;
  let buttonsArray: GameObj<Comp>[] = [];
  const createButtons = () => {
    // clear out any old references (extra check)
    if (menuRef) menuRef.destroy();
    buttonsArray = [];

    // create menu parent
    menuRef = k.add([
      k.pos(menu.pos[0], menu.pos[1]),
      ...(menu.color
        ? [k.rect(menuSize.width, menuSize.height), k.color(menu.color)]
        : []),
    ]);

    // create new buttons
    createButtonFunctions.forEach((cb) => buttonsArray.push(cb(menuRef!)));
  };

  return {
    menu,
    show() {
      if (visible) return;

      createButtons();
      visible = true;
    },
    hide() {
      if (!visible) return;

      buttonsArray.forEach((b) => b.destroy());
      if (menuRef) menuRef.destroy();
      visible = false;
    },
    toggle() {
      return visible ? this.hide() : this.show();
    },
  };
}

interface IParticleEmitterOptions {
  /**
   * The lifespan of the emitter (in seconds), or -1 for infinite
   */
  lifepan: number;
  /**
   * The interval between particle emissions (in seconds). If not specified,
   * only a single emission will happen.
   */
  emissionInterval?: number;
  /**
   * The number of particles per emiission.
   */
  particlesPerEmission?: number;
  /**
   * The lifespan of each particle (in seconds)
   */
  particleLifespan?: number;
  /**
   * Callback function returning an array of components responsible
   * for rendering the particle - should include a sprite or primitive
   * @param particleIndex
   */
  getParticle: (arg: {
    emissionIndex: number;
    particleIndex: number;
  }) => Comp[];
  /**
   *  Callback function returning the velocity of a given particle.
   * @param arg
   * @returns
   */
  getParticleVelocity: (arg: {
    emissionIndex: number;
    particleIndex: number;
    timeAlive: number;
  }) => [number, number];
  /**
   * Callback function executed on each update of a particle. Can be used
   * for manually adjusting scale, opacity, etc.
   * @param particle
   * @param arg
   * @returns
   */
  onParticleUpdate?: (
    particle: GameObj<PosComp | AreaComp | BodyComp | ScaleComp | ShaderComp>,
    arg: {
      emissionIndex: number;
      particleIndex: number;
      timeAlive: number;
    }
  ) => void;
  /**
   * Callback function executed when a particle collides with a given tag.
   * @param tag
   * @param callback
   * @returns
   */
  onCollision?: {
    tag: string;
    cb: (obj: GameObj<any>, col?: Collision | undefined) => void;
  };
}

export function createParticleEmitter(options: IParticleEmitterOptions) {
  const particlesPerEmission = options.particlesPerEmission || 1;

  const emit = (pos: Vec2) => {
    let updateEvents: EventController[] = [];
    let particles: GameObj[] = [];

    const loopEvent = k.loop(
      options.emissionInterval || options.lifepan + 1,
      () => {
        let i = 0;
        for (let j = 0; j < particlesPerEmission; j++) {
          const emissionIndex = i;
          const particleIndex = j;

          const particle = k.add([
            k.pos(pos.x, pos.y),
            ...options.getParticle({ emissionIndex, particleIndex }),
            k.anchor("center"),
            k.area({ collisionIgnore: ["particle"] }),
            // k.body(),
            ...(options.particleLifespan
              ? [k.lifespan(options.particleLifespan)]
              : []),
            "particle",
            // TODO: types are a bit messy
          ]) as GameObj<BodyComp | PosComp | AreaComp | ScaleComp | ShaderComp>;

          if (options.onCollision) {
            particle.onCollide(options.onCollision.tag, options.onCollision.cb);
          }

          particles.push(particle);

          let timeAlive = 0;
          const [x, y] = options.getParticleVelocity({
            emissionIndex,
            particleIndex,
            timeAlive,
          });
          const updateEvent = particle.onUpdate(() => {
            particle.move(x, y);
            if (options.onParticleUpdate) {
              options.onParticleUpdate(particle, {
                emissionIndex,
                particleIndex,
                timeAlive,
              });
            }

            timeAlive += k.dt();
          });
          updateEvents.push(updateEvent);

          i++;
        }
      }
    );

    if (options.lifepan !== -1) {
      k.wait(options.lifepan, () => {
        loopEvent.cancel();
        updateEvents.forEach((ue) => ue.cancel());
        updateEvents = [];

        if (!options.particleLifespan) {
          particles.forEach((p) => p.destroy());
          particles = [];
        }
      });
    }
  };

  return {
    emit,
  };
}

const CAMERA_ACCELERATION = 3000;
const CAMERA_DECELERATION = 2250;

const cameraMaxVelocity = {
  x: 10000,
  y: 10000,
};
let cameraVelocity = {
  x: 0,
  y: 0,
};

export function initCamera(levelSize: Vec2 = k.vec2(k.width(), k.height())) {
  const keysPressed = new Set<Key>();
  k.onKeyDown((k) => keysPressed.add(k));
  k.onKeyRelease((k) => keysPressed.delete(k));
  k.onUpdate(() => {
    // Track directions the camera should be moving towards according to keys pressed
    const movement = {
      left: keysPressed.has("a") || keysPressed.has("left"),
      right: keysPressed.has("d") || keysPressed.has("right"),
      up: keysPressed.has("w") || keysPressed.has("up"),
      down: keysPressed.has("s") || keysPressed.has("down"),
    };

    const dt = k.dt();

    // Apply acceleration to x and y velocities
    if (movement.left) {
      cameraVelocity.x = Math.min(
        0,
        Math.max(
          cameraVelocity.x - CAMERA_ACCELERATION * dt,
          -cameraMaxVelocity.x
        )
      );
    } else if (movement.right) {
      cameraVelocity.x = Math.max(
        0,
        Math.min(
          cameraVelocity.x + CAMERA_ACCELERATION * dt,
          cameraMaxVelocity.x
        )
      );
    }
    // Decelerate x if no movement keys are pressed for left/right
    else if (cameraVelocity.x !== 0) {
      const sign = Math.sign(cameraVelocity.x);
      cameraVelocity.x -= CAMERA_DECELERATION * sign * dt;
      if (Math.abs(cameraVelocity.x) < CAMERA_DECELERATION) {
        cameraVelocity.x = 0;
      }
    }
    if (movement.up) {
      cameraVelocity.y = Math.min(
        0,
        Math.max(
          cameraVelocity.y - CAMERA_ACCELERATION * dt,
          -cameraMaxVelocity.y
        )
      );
    } else if (movement.down) {
      cameraVelocity.y = Math.max(
        0,
        Math.min(
          cameraVelocity.y + CAMERA_ACCELERATION * dt,
          cameraMaxVelocity.y
        )
      );
    }
    // Decelerate y if no movement keys are pressed for up/down
    else if (cameraVelocity.y !== 0) {
      const sign = Math.sign(cameraVelocity.y);
      cameraVelocity.y -= CAMERA_DECELERATION * sign * dt;
      if (Math.abs(cameraVelocity.y) < CAMERA_DECELERATION) {
        cameraVelocity.y = 0;
      }
    }

    const currentPos = k.camPos();
    const cameraWidth = k.width();
    const cameraHeight = k.height();
    const minX = cameraWidth / 2;
    const minY = cameraHeight / 2;
    const maxX = levelSize.x - cameraWidth / 2;
    const maxY = levelSize.y - cameraHeight / 2;

    // if hitting left or right boundaries while moving in that direction, clear
    // x velocity
    if (
      (currentPos.x === minX && cameraVelocity.x < 0) ||
      (currentPos.x === maxX && cameraVelocity.x > 0)
    ) {
      cameraVelocity.x = 0;
    }

    // if hitting top or bottom boundaries while moving in that direction, clear
    // y velocity
    if (
      (currentPos.y === minY && cameraVelocity.y < 0) ||
      (currentPos.y === maxY && cameraVelocity.y > 0)
    ) {
      cameraVelocity.y = 0;
    }

    // apply velocity to camera position, constraining to level boundaries
    k.camPos(
      Math.max(Math.min(currentPos.x + cameraVelocity.x * dt, maxX), minX),
      Math.max(Math.min(currentPos.y + cameraVelocity.y * dt, maxY), minY)
    );
  });
}

export function drawBg(levelSize: Vec2 = k.vec2(k.width(), k.height())) {
  k.add([
    k.sprite(SPRITES.grassTile, {
      width: levelSize.x,
      height: levelSize.y,
      tiled: true,
    }),
    k.pos(0, 0),
    k.z(0),
  ]);
}

export function getName(existingSet: Set<string> = new Set()) {
  let name: string | null = null;
  while (!(name && !existingSet.has(name))) {
    name = k.choose(names);
  }
  return name;
}

export function getFact() {
  return k.choose(facts);
}
