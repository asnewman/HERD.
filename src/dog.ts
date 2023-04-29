import {
  AreaComp,
  BodyComp,
  CircleComp,
  Comp,
  GameObj,
  PosComp,
  SpriteComp,
  StateComp,
  Vec2,
} from "kaboom";
import { k } from "./kaboom";
import { IGameState, SHADERS, SPRITES } from "./game";
import { HealthComp, health } from "./components/health";
import { alphaChannel } from "./components/alphaChannel";

enum DogState {
  patrolling = "patrolling",
  running = "running",
  hunting = "hunting",
}

const DOG_ANIM_IDLE_SPEED = 0.6;
const DOG_ANIM_ATTACK_SPEED = 1.5;
const DOG_ANIM_RUN_SPEED = 1.5;
const DOG_MOVE_VELOCITY = 8000;

const DOG_ATTACK_RANGE = 60;
const DOG_ATTACK_FREQUENCY = 1;
const DOG_ATTACK_DAMAGE = 10;

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

  type DogObj = GameObj<StateComp | SpriteComp | AreaComp | BodyComp | PosComp>;

  function dogState() {
    const states = {
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
      patrolling: {
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
      hunting: {
        target: null as GameObj<HealthComp | PosComp> | null,
        isWaitingToAttack: false,
      },
      // super simple state:
      // - check if target is in range
      // - if so, bite the target
      // - if not, go back to hunting
      attacking: {
        target: null as GameObj<HealthComp | PosComp> | null,
        isWaitingToAttack: false,
      },
    };

    type Anim = "run" | "idle" | "attack";
    let setAnimation = function (this: DogObj, name: Anim) {
      const currentAnim = this.curAnim();
      if (currentAnim === name) return;

      this.unuse("sprite");

      if (name === "run") {
        this.use(k.sprite(SPRITES.dogRun, { animSpeed: DOG_ANIM_RUN_SPEED }));
        this.play("run");
      }

      if (name === "idle") {
        this.use(k.sprite(SPRITES.dogIdle, { animSpeed: DOG_ANIM_IDLE_SPEED }));
        this.play("idle");
      }

      if (name === "attack") {
        this.use(
          k.sprite(SPRITES.dogAttack, { animSpeed: DOG_ANIM_ATTACK_SPEED })
        );
        this.play("attack");
      }
    };

    return {
      id: "dogState",
      update(this: GameObj<SpriteComp | StateComp>) {
        this.flipX =
          this.curAnim() === "idle"
            ? states.lastDirection === "left"
            : states.direction === "left";
      },
      add: function (this: DogObj) {
        setAnimation = setAnimation.bind(this);
        this.onStateEnter(DogState.patrolling, async () => {
          states.lastDirection = "right";
          states.direction = ["left", "right", "idle"][k.rand(2)];
          states.patrolling = {
            cycleTime: 0,
            cycleTimeLimit: getDirectionTimeLimit(),
          };
          setAnimation.call(this, "idle");
        });

        this.onStateUpdate(DogState.patrolling, () => {
          const delta = k.dt();

          let moveValues: [number, number] = [-1, -1];
          switch (states.direction) {
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

          states.patrolling.cycleTime += delta;

          const shouldNotChangeDirection =
            states.patrolling.cycleTime <= states.patrolling.cycleTimeLimit;
          if (shouldNotChangeDirection) {
            return;
          }

          states.patrolling.cycleTime = 0;
          states.patrolling.cycleTimeLimit = getDirectionTimeLimit();

          // if currently idle, start moving in a direction
          if (states.direction === "idle") {
            // if the dog was last going left, go right now
            states.direction =
              states.lastDirection === "right" ? "left" : "right";
            // track last direction to know what direction to move in next time
            states.lastDirection = states.direction;
            setAnimation.call(this, "run");
            return;
          }

          // dog was moving, so now should idle for a cycle
          states.direction = "idle";
          setAnimation.call(this, "idle");
        });

        this.onStateEnter(
          DogState.hunting,
          async (sheep: GameObj<HealthComp | (PosComp & { name: string })>) => {
            console.log("woof! time to attack " + sheep.name);
            states.hunting.target = sheep;
          }
        );

        this.onStateUpdate(DogState.hunting, async () => {
          if (
            !states.hunting.target ||
            states.hunting.target.isAlive() === false
          ) {
            // give the attack animation time to finish playing before going back to patrolling
            if (
              this.curAnim() === "attack" &&
              this.frame !== this.numFrames() - 1
            )
              return;

            states.hunting.target = null;
            this.enterState(DogState.patrolling);
            return;
          }

          const { target } = states.hunting;

          // if the target is to the left of the dog, flip the image
          states.direction = target.pos.x < this.pos.x ? "left" : "right";
          states.lastDirection = states.direction;

          const [distance, unitVector] = getVectorInfo(this.pos, target.pos);

          // if within attack range, bite the sheep
          if (
            distance <= DOG_ATTACK_RANGE ||
            states.hunting.isWaitingToAttack
          ) {
            // currently waiting to attack, so check to see if we should idle, and early return
            // to avoid queuing up another one
            if (states.hunting.isWaitingToAttack) {
              // give the attack animation time to finish playing before going back to patrolling
              if (
                this.curAnim() !== "attack" ||
                (this.curAnim() === "attack" &&
                  this.frame === this.numFrames() - 1)
              )
                setAnimation.call(this, "idle");

              return;
            }

            states.hunting.isWaitingToAttack = true;
            k.wait(DOG_ATTACK_FREQUENCY, () => {
              // have to check if the sheep moved since the last time we set a timer to wait to attack
              if (
                distance > DOG_ATTACK_RANGE ||
                states.hunting.isWaitingToAttack === false
              ) {
                return;
              }
              setAnimation.call(this, "attack");
              target.damage(DOG_ATTACK_DAMAGE);
              states.hunting.isWaitingToAttack = false;
            });
          }
          // if not in attack range, move towards the sheep and return
          else if (
            this.curAnim() !== "attack" ||
            this.frame === this.numFrames() - 1
          ) {
            setAnimation.call(this, "run");
            this.move(
              unitVector.x * DOG_MOVE_VELOCITY * k.dt(),
              unitVector.y * DOG_MOVE_VELOCITY * k.dt()
            );
          }
        });

        // add the dog to the game state
        gameState.enemies[options.name] = this;
      },
    };
  }

  const getDirectionTimeLimit = () => k.rand(10) * 0.2;

  const dogTag = `dog-${options.name}`;

  const dog = k.add([
    "dog",
    { name: options.name },
    ...(options.health === false
      ? []
      : [
          health({
            onDamage: options?.onDamage,
            onDeath: options?.onDestroy,
          }),
        ]),
    dogTag,
    k.pos(...options.pos),
    k.sprite(SPRITES.dogIdle, { animSpeed: DOG_ANIM_IDLE_SPEED }),
    k.scale(3, 3),
    k.state(
      options.initialState || DogState.patrolling,
      Object.values(DogState)
    ),
    k.area(),
    // k.body(),
    dogState(),
    k.shader(SHADERS.damaged, {
      u_flash_intensity: 0,
    }),
  ]);

  if (options.health) {
    dog.onUpdate(() => {
      dog.uniform["u_flash_intensity"] = dog.getDamageTime();
    });
  }

  const PATROL_RADIUS = 150;

  const patrolCollider = dog.add([
    // arbitrary magic numbers to put the dog at the center of the circle - not sure why it doesn't have width/height lol
    k.pos(18, 12),
    k.circle(PATROL_RADIUS),
    k.area(),
    k.color(0, 0, 0),

    alphaChannel(0), // set to something between .1 and .9 for debugging
  ]) as GameObj<Comp | AreaComp | PosComp | CircleComp>;

  patrolCollider.onCollide("sheep", (sheep) => {
    dog.enterState(DogState.hunting, sheep);
  });

  return dog;
}

function getVectorInfo(obj1: Vec2, obj2: Vec2): readonly [number, Vec2] {
  // Calculate the direction vector
  const xDifference = obj2.x - obj1.x;
  const yDifference = obj2.y - obj1.y;

  // Normalize the direction vector
  const distance = Math.sqrt(
    xDifference * xDifference + yDifference * yDifference
  );
  const normalizedX = xDifference / distance;
  const normalizedY = yDifference / distance;

  // Return the normalized direction vector components
  return [distance, k.vec2(normalizedX, normalizedY)] as const;
}
