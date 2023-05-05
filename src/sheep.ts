import {
  AreaComp,
  BodyComp,
  GameObj,
  PosComp,
  SpriteComp,
  StateComp,
} from "kaboom";
import { k } from "./kaboom";
import { IGameState, SHADERS, SPRITES } from "./game";
import { health } from "./components/health";
import { createExplosion } from "./objects/explosion";

export enum SheepState {
  grazing = "grazing",
  walking = "walking",
  pathing = "pathing",
}

export type SheepType = "standard" | "bomber" | "shielder" | "commando";

const SHEEP_ANIM_SPEED = 0.6;
const SHEEP_GRAZE_VELOCITY = 3000;

interface ICreateSheepOptions {
  name: string;
  type?: SheepType;
  pos: [number, number];
  initialState?: SheepState;
  health?: boolean;
  onDamage?: () => void;
  onDestroy?: () => void;
  selectable?: boolean;
}

export function createSheep(
  gameState: IGameState,
  options: ICreateSheepOptions
) {
  if (!options.name) {
    throw new Error("Sheep must have a name");
  }

  if (gameState.sheep[options.name]) {
    throw new Error(`Sheep name ${options.name} already exists`);
  }

  if (!options.pos) {
    throw new Error("Sheep must have a position");
  }

  function selectable() {
    let isSelected = false;
    return {
      id: "selectable",
      require: ["area"],
      draw() {
        if (!isSelected) return;
        k.drawRect({
          width: 32,
          height: 17,
          pos: k.vec2(0, 0),
          fill: false,
          outline: { color: k.RED, width: 1 },
        });
      },
      inspect() {
        return String(isSelected);
      },
      setSelected(value: boolean) {
        isSelected = value;
      },
      toggleSelected() {
        const wasAlreadySelected = gameState.sheepSelected.has(sheep.name);

        wasAlreadySelected
          ? gameState.sheepSelected.delete(sheep.name)
          : gameState.sheepSelected.add(sheep.name);

        this.setSelected(!wasAlreadySelected);
      },
    };
  }

  function sheepState(type: SheepType = "standard") {
    const states = {
      type,
      isSelected: false,
      /**
       * The last direction the sheep was moving in.
       * Used to determine what the next direction should be.
       */
      lastDirection: "",
      /**
       * The current direction the sheep is moving in.
       * Can be "left", "right", or "idle".
       */
      direction: "right",
      /**
       * The amount of time for which the sheep has been moving in the
       * current direction.
       */
      moveTime: 0,
      /**
       * The amount of time for which the sheep should move in the current
       * direction before changing it.
       */
      directionTimeLimit: 0,
    };

    function setType(this: GameObj, type: SheepType) {
      states.type = type;

      if (type === "bomber") {
        this.use(k.sprite(SPRITES.sheepBomber));
        return;
      }

      this.use(k.sprite(SPRITES.sheep));
    }

    return {
      id: "sheepState",
      add: function (
        this: GameObj<StateComp | SpriteComp | AreaComp | BodyComp | PosComp>
      ) {
        setType.call(this, type);

        this.onStateEnter(SheepState.grazing, async () => {
          states.lastDirection = "right";
          states.direction = ["left", "right", "idle"][k.rand(2)];
          states.moveTime = 0;
          states.directionTimeLimit = getDirectionTimeLimit();
          this.flipX = states.direction === "left";
          this.play("graze");
        });

        // prevent each sheep from colliding with other sheep
        this.onCollide("sheep", () => {
          states.direction = "idle";
          states.moveTime = 0;
          states.directionTimeLimit = getDirectionTimeLimit();
        });

        this.onStateUpdate(SheepState.grazing, () => {
          const delta = k.dt();

          let moveValues: [number, number] = [-1, -1];
          switch (states.direction) {
            case "idle": {
              moveValues = [0, 0];
              break;
            }
            case "left": {
              moveValues = [-SHEEP_GRAZE_VELOCITY * delta, 0];
              break;
            }
            case "right": {
              moveValues = [SHEEP_GRAZE_VELOCITY * delta, 0];
              break;
            }
          }
          this.move(...moveValues);

          states.moveTime += delta;

          const shouldNotChangeDirection =
            states.moveTime <= states.directionTimeLimit;
          if (shouldNotChangeDirection) {
            return;
          }

          states.moveTime = 0;
          states.directionTimeLimit = getDirectionTimeLimit();

          // if currently idle, start moving in a direction
          if (states.direction === "idle") {
            // if the sheep was last going left, go right now
            states.direction =
              states.lastDirection === "right" ? "left" : "right";
            // track last direction to know what direction to move in next time
            states.lastDirection = states.direction;
            // sheep sprite faces right by default - flip it to the left if it's going left
            this.flipX = states.direction === "left";
            // play the grazing animation while moving
            this.play("graze");
            return;
          }

          // sheep was moving, so now should idle for a cycle
          states.direction = "idle";
          this.stop();
          this.frame = 0;
        });

        this.onStateEnter(SheepState.walking, () => {
          this.play("graze");
          this.flipX = states.direction === "left";
        });

        this.onStateUpdate(SheepState.walking, () => {
          let moveValues: [number, number] = [-1, -1];
          switch (states.direction) {
            case "left": {
              moveValues = [-SHEEP_GRAZE_VELOCITY * k.dt(), 0];
              break;
            }
            case "right": {
              moveValues = [SHEEP_GRAZE_VELOCITY * k.dt(), 0];
              break;
            }
          }
          this.move(...moveValues);
        });

        // add the sheep to the game state
        gameState.sheep[options.name] = this;
      },
      getType(this: GameObj) {
        return states.type;
      },
      setType,
    };
  }

  const getDirectionTimeLimit = () => k.rand(10) * 0.2;

  const sheepTag = `sheep-${options.name}`;

  const sheep = k.add([
    "sheep",
    { name: options.name },
    health({ onDamage }),
    sheepTag,
    k.pos(...options.pos),
    k.sprite(SPRITES.sheep, { animSpeed: SHEEP_ANIM_SPEED }),
    k.scale(3, 3),
    k.state(
      options.initialState || SheepState.grazing,
      Object.values(SheepState)
    ),
    k.area(),
    ...(options.selectable ? [selectable()] : []),
    k.body(),
    sheepState(options.type),
    k.shader(SHADERS.damaged, {
      u_flash_intensity: 0,
    }),
  ]);

  function onDamage() {
    options.onDamage?.();
    if (sheep.getType() === "bomber") {
      createExplosion(sheep.pos);
    }
  }

  sheep.onUpdate(() => {
    sheep.uniform["u_flash_intensity"] = sheep.getDamageTime();
  });

  k.onClick(sheepTag, () => {
    if (!sheep.setSelected) return;

    const wasAlreadySelected = gameState.sheepSelected.has(sheep.name);

    wasAlreadySelected
      ? gameState.sheepSelected.delete(sheep.name)
      : gameState.sheepSelected.add(sheep.name);

    sheep.setSelected(!wasAlreadySelected);
  });

  sheep.toggleSelected;

  return sheep;
}
