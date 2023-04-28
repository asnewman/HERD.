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

export enum SheepState {
  grazing = "grazing",
  walking = "walking",
}

const SHEEP_ANIM_SPEED = 0.6;
const SHEEP_GRAZE_VELOCITY = 3000;

interface ICreateSheepOptions {
  name: string;
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
      setType(this: GameObj, type: "bomber" | "shielder" | "commando") {
        if (type === "bomber") {
          this.use(k.sprite(SPRITES.sheepBomber));
          return;
        }

        this.use(k.sprite(SPRITES.sheep));
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

  function sheepState() {
    const states = {
      isSelected: false,
      grazing: {
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
        cycleTime: 0,
        /**
         * The amount of time for which the sheep should move in the current
         * direction before changing it.
         */
        cycleTimeLimit: 0,
      },
      walking: {
        direction: "right" as "left" | "right",
      },
    };

    return {
      id: "sheepState",
      add: function (
        this: GameObj<StateComp | SpriteComp | AreaComp | BodyComp | PosComp>
      ) {
        this.onStateEnter(SheepState.grazing, async () => {
          states.grazing = {
            lastDirection: "right",
            direction: ["left", "right", "idle"][k.rand(2)],
            cycleTime: 0,
            cycleTimeLimit: getDirectionTimeLimit(),
          };
          this.flipX = states.grazing.direction === "left";
          this.play("graze");
        });

        // prevent each sheep from colliding with other sheep
        this.onCollide("sheep", () => {
          states.grazing.direction = "idle";
          states.grazing.cycleTime = 0;
          states.grazing.cycleTimeLimit = getDirectionTimeLimit();
        });

        this.onStateUpdate(SheepState.grazing, () => {
          const delta = k.dt();

          let moveValues: [number, number] = [-1, -1];
          switch (states.grazing.direction) {
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

          states.grazing.cycleTime += delta;

          const shouldNotChangeDirection =
            states.grazing.cycleTime <= states.grazing.cycleTimeLimit;
          if (shouldNotChangeDirection) {
            return;
          }

          states.grazing.cycleTime = 0;
          states.grazing.cycleTimeLimit = getDirectionTimeLimit();

          // if currently idle, start moving in a direction
          if (states.grazing.direction === "idle") {
            // if the sheep was last going left, go right now
            states.grazing.direction =
              states.grazing.lastDirection === "right" ? "left" : "right";
            // track last direction to know what direction to move in next time
            states.grazing.lastDirection = states.grazing.direction;
            // sheep sprite faces right by default - flip it to the left if it's going left
            this.flipX = states.grazing.direction === "left";
            // play the grazing animation while moving
            this.play("graze");
            return;
          }

          // sheep was moving, so now should idle for a cycle
          states.grazing.direction = "idle";
          this.stop();
          this.frame = 0;
        });

        this.onStateEnter(SheepState.walking, () => {
          this.play("graze");
          this.flipX = states.walking.direction === "left";
        });

        this.onStateUpdate(SheepState.walking, () => {
          let moveValues: [number, number] = [-1, -1];
          switch (states.walking.direction) {
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
    };
  }

  const getDirectionTimeLimit = () => k.rand(10) * 0.2;

  const sheepTag = `sheep-${options.name}`;

  const sheep = k.add([
    "sheep",
    { name: options.name },
    health({
      onDamage: options?.onDamage,
      onDeath: options?.onDestroy,
    }),
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
    sheepState(),
    k.shader(SHADERS.damaged, {
      u_flash_intensity: 0,
    }),
  ]);

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

  return sheep;
}
