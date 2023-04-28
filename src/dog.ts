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

enum DogState {
  grazing = "grazing",
  walking = "walking",
}

const DOG_ANIM_SPEED = 0.6;
const DOG_MOVE_VELOCITY = 3000;

interface ICreateDogOptions {
  name: string;
  pos: [number, number];
  initialState?: DogState;
  health?: boolean;
  onDamage?: () => void;
  onDestroy?: () => void;
}

export function createDog(gameState: IGameState, options: ICreateDogOptions) {
  if (!options.name) {
    throw new Error("Dog must have a name");
  }

  if (gameState.enemies[options.name]) {
    throw new Error(`Dog name ${options.name} already exists`);
  }

  if (!options.pos) {
    throw new Error("Dog must have a position");
  }

  function dogState() {
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
    };

    return {
      id: "sheepState",
      add: function (
        this: GameObj<StateComp | SpriteComp | AreaComp | BodyComp | PosComp>
      ) {
        this.onStateEnter(DogState.grazing, async () => {
          states.grazing = {
            lastDirection: "right",
            direction: ["left", "right", "idle"][k.rand(2)],
            cycleTime: 0,
            cycleTimeLimit: getDirectionTimeLimit(),
          };
          this.unuse("sprite");
          this.use(k.sprite(SPRITES.dogWalk, { animSpeed: DOG_ANIM_SPEED }));
          this.play("walk");
          this.flipX = states.grazing.direction === "left";
        });

        // prevent each sheep from colliding with other sheep
        this.onCollide("sheep", () => {
          states.grazing.direction = "idle";
          states.grazing.cycleTime = 0;
          states.grazing.cycleTimeLimit = getDirectionTimeLimit();
        });

        this.onStateUpdate(DogState.grazing, () => {
          const delta = k.dt();

          let moveValues: [number, number] = [-1, -1];
          switch (states.grazing.direction) {
            case "idle": {
              moveValues = [0, 0];
              break;
            }
            case "left": {
              moveValues = [-DOG_MOVE_VELOCITY * delta, 0];
              break;
            }
            case "right": {
              moveValues = [DOG_MOVE_VELOCITY * delta, 0];
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
            // play the grazing animation while moving
            this.unuse("sprite");
            this.use(k.sprite(SPRITES.dogWalk, { animSpeed: DOG_ANIM_SPEED }));
            this.play("walk");

            this.flipX = states.grazing.direction === "left";
            return;
          }

          // sheep was moving, so now should idle for a cycle
          states.grazing.direction = "idle";
          this.unuse("sprite");
          this.use(k.sprite(SPRITES.dogIdle, { animSpeed: DOG_ANIM_SPEED }));
          this.frame = 0;
          this.play("idle");
        });

        // start in the grazing state
        this.enterState(DogState.grazing);

        // add the sheep to the game state
        gameState.sheep[options.name] = this;
      },
    };
  }

  const getDirectionTimeLimit = () => k.rand(10) * 0.2;

  const dogTag = `dog-${options.name}`;

  const dog = k.add([
    "dog",
    { name: options.name },
    health({
      onDamage: options?.onDamage,
      onDeath: options?.onDestroy,
    }),
    dogTag,
    k.pos(...options.pos),
    k.sprite(SPRITES.dogIdle, { animSpeed: DOG_ANIM_SPEED }),
    k.scale(3, 3),
    k.state(options.initialState || DogState.grazing, Object.values(DogState)),
    k.area(),
    k.body(),
    // dogState(),
    k.shader(SHADERS.damaged, {
      u_flash_intensity: 0,
    }),
  ]);

  dog.onUpdate(() => {
    dog.uniform["u_flash_intensity"] = dog.getDamageTime();
  });

  return dog;
}
