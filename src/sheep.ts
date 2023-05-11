import {
  AreaComp,
  BodyComp,
  GameObj,
  PosComp,
  SpriteComp,
  StateComp,
} from "kaboom";
import { k } from "./kaboom";
import { IGameState, SHADERS, SPRITES, TILE_SIZE } from "./game";
import { health } from "./components/health";
import { createExplosion } from "./objects/explosion";
import Map from "./map";

export enum SheepState {
  grazing = "grazing",
  walking = "walking",
  pathing = "pathing",
}

export type SheepType = "standard" | "bomber" | "shielder" | "commando";

const SHEEP_ANIM_SPEED = 0.6;
const SHEEP_GRAZE_VELOCITY = 6000;

interface ICreateSheepOptions {
  name: string;
  type?: SheepType;
  pos: [number, number];
  initialState?: SheepState;
  health?: boolean;
  onDamage?: () => void;
  onDeath?: () => void;
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

    let mapTraverser = new Map.MapTraverser(gameState.map);

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
        function changePathingDirection(): [number, number] {
          switch (mapTraverser.moves[moveIdx++]) {
            case "left": {
              states.lastDirection = states.direction;
              states.direction = "left";
              return [-SHEEP_GRAZE_VELOCITY * k.dt(), 0];
            }
            case "right": {
              states.lastDirection = states.direction;
              states.direction = "right";
              return [SHEEP_GRAZE_VELOCITY * k.dt(), 0];
            }
            case "down": {
              states.lastDirection = states.direction;
              states.direction = "down";
              return [0, SHEEP_GRAZE_VELOCITY * k.dt()];
            }
            default: {
              states.lastDirection = states.direction;
              states.direction = "idle";
              return [0, 0];
            }
          }
        }

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
          this.play("graze");
          this.flipX = states.direction === "left";

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

        let moveIdx = 0;

        this.onStateEnter(SheepState.pathing, () => {
          mapTraverser.traverse();
          this.play("graze");
          this.flipX = states.direction === "left";
        });

        this.onStateUpdate(SheepState.pathing, () => {
          let moveValues: [number, number] = [-1, -1];
          this.flipX = states.direction === "left";

          switch (states.direction) {
            case "left": {
              const tileX = Math.ceil((this.pos.x - 5) / TILE_SIZE);
              const tileY = Math.ceil(this.pos.y / TILE_SIZE);
              if (gameState.map[tileY][tileX] !== "p") {
                moveValues = changePathingDirection();
              } else {
                moveValues = [-SHEEP_GRAZE_VELOCITY * k.dt(), 0];
              }
              break;
            }
            case "right": {
              const tileX = Math.ceil((this.pos.x + 5) / TILE_SIZE);
              const tileY = Math.ceil(this.pos.y / TILE_SIZE);
              if (gameState.map[tileY][tileX] !== "p") {
                moveValues = changePathingDirection();
              } else {
                moveValues = [SHEEP_GRAZE_VELOCITY * k.dt(), 0];
              }
              break;
            }
            case "down": {
              const tileX = Math.ceil(this.pos.x / TILE_SIZE);
              const tileY = Math.ceil((this.pos.y + 5) / TILE_SIZE);
              if (gameState.map[tileY][tileX] !== "p") {
                moveValues = changePathingDirection();
              } else {
                moveValues = [0, SHEEP_GRAZE_VELOCITY * k.dt()];
              }
              break;
            }
            default: {
              this.stop();
              break;
            }
          }

          if (!(moveValues[0] === -1 && moveValues[1] === -1)) {
            this.move(...moveValues);
          }
        });

        // add the sheep to the game state
        gameState.sheep[options.name] = this;
      },
      getType(this: GameObj) {
        return states.type;
      },
      startPathing(this: GameObj<PosComp | StateComp>) {
        mapTraverser.updateMap(gameState.map);

        const start = Map.findStart(gameState.map);
        if (!start) {
          throw new Error("Sheep cannot start pathing without a start tile");
        }

        const [x, y] = [start[0] * TILE_SIZE, start[1] * TILE_SIZE];
        this.pos = k.vec2(x + TILE_SIZE, y);
        states.direction = "right";
        this.enterState(SheepState.pathing);
      },
      setType,
    };
  }

  const getDirectionTimeLimit = () => k.rand(10) * 0.2;

  const sheepTag = `sheep-${options.name}`;

  const sheep = k.add([
    "sheep",
    { name: options.name },
    health({ onDamage, onDeath: options.onDeath }),
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
