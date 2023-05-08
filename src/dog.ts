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
  attacking = "attacking",
}

const DOG_PATROL_RADIUS = 150;

const DOG_ANIM_IDLE_SPEED = 0.6;
const DOG_ANIM_ATTACK_SPEED = 1.5;
const DOG_ANIM_RUN_SPEED = 1.5;
const DOG_HUNT_VELOCITY = 8000;
const DOG_PATROL_VELOCITY = 4000;

const DOG_ATTACK_RANGE = 60;
const DOG_ATTACK_DAMAGE = 10;

interface ICreateDogOptions {
  name: string;
  pos: [number, number];
  initialState?: DogState;
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
  type Target = GameObj<HealthComp | (PosComp & { name: string })>;

  function dogState() {
    const states = {
      /**
       * The last direction the dog was moving in.
       * Used to determine what the next direction should be.
       */
      lastDirection: "",
      /**
       * The current direction the dog is moving in.
       * Can be "left", "right", or "idle".
       */
      direction: "right",
      patrolling: {
        collider: null as GameObj<
          Comp | AreaComp | PosComp | CircleComp
        > | null,
        /**
         * The amount of time for which the dog has been moving in the
         * current direction.
         */
        cycleTime: 0,
        /**
         * The amount of time for which the dog should move in the current
         * direction before changing it.
         */
        cycleTimeLimit: 0,
      },
      hunting: {
        target: null as Target | null,
        isWaitingToAttack: false,
      },
      // super simple state:
      // - check if target is in range
      // - if so, bite the target
      // - if not, go back to hunting
      attacking: {
        target: null as Target | null,
        hasAppliedDamage: false,
      },
    };

    type Anim = "run" | "idle" | "attack";
    const setAnimation = function (this: DogObj, name: Anim) {
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
        // patrolling
        this.onStateEnter(DogState.patrolling, async () => {
          states.lastDirection = "right";
          states.direction = ["left", "right", "idle"][k.rand(2)];
          states.patrolling = {
            collider: dog.add([
              // arbitrary magic numbers to put the dog at the center of the circle - not sure why it doesn't have width/height lol
              k.pos(18, 12),
              k.circle(DOG_PATROL_RADIUS),
              k.area(),
              k.color(0, 0, 0),
              alphaChannel(0), // set to something between .1 and .9 for debugging
            ]) as GameObj<Comp | AreaComp | PosComp | CircleComp>,
            cycleTime: 0,
            cycleTimeLimit: getDirectionTimeLimit(),
          };

          setAnimation.call(this, "idle");

          // TODO: debounce this like 10ms, track targets ordered by how close they are,
          // and once function actually executes, to enter the hunting state, choose the
          // closest one
          states.patrolling.collider!.onCollide("sheep", (sheep) => {
            // if the dog is already hunting or attacking,
            // don't change its target
            if (dog.state === "hunting" || dog.state === "attacking") {
              return;
            }

            dog.enterState(DogState.hunting, sheep);
          });
        });
        this.onStateEnd(DogState.patrolling, () => {
          states.patrolling.collider!.destroy();
          states.patrolling.collider = null;
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
              moveValues = [-DOG_PATROL_VELOCITY * delta, 0];
              break;
            }
            case "right": {
              moveValues = [DOG_PATROL_VELOCITY * delta, 0];
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

        // hunting
        this.onStateEnter(DogState.hunting, async (target: Target) => {
          states.hunting.target = target;
        });
        this.onStateUpdate(DogState.hunting, async () => {
          if (!states.hunting.target?.isAlive()) {
            states.hunting.target = null;
            this.enterState(DogState.patrolling);
            return;
          }

          const { target } = states.hunting;

          // if the target is to the left of the dog, flip the image
          states.direction = target.pos.x < this.pos.x ? "left" : "right";
          states.lastDirection = states.direction;

          const [distanceToTarget, unitVector] = getVectorInfo(
            this.pos,
            target.pos
          );

          // if the dog is within attack range, attack the target
          if (distanceToTarget <= DOG_ATTACK_RANGE) {
            this.enterState(DogState.attacking, states.hunting.target);
            return;
          }

          // if the dog is not within attack range, run towards the target
          setAnimation.call(this, "run");
          this.move(
            unitVector.x * DOG_HUNT_VELOCITY * k.dt(),
            unitVector.y * DOG_HUNT_VELOCITY * k.dt()
          );
        });

        // attacking
        this.onStateEnter(DogState.attacking, async (target: Target) => {
          states.attacking.target = target;
          states.attacking.hasAppliedDamage = false;
          setAnimation.call(this, "attack");
        });
        this.onStateUpdate(DogState.attacking, async () => {
          // if target is non-existent or dead, go back to patrolling
          if (!states.attacking.target?.isAlive()) {
            this.enterState(DogState.patrolling);
            return;
          }

          // actually apply damage midway through the attack animation
          if (this.frame === 3 && !states.attacking.hasAppliedDamage) {
            states.attacking.target!.damage(DOG_ATTACK_DAMAGE);
            states.attacking.hasAppliedDamage = true;
          }

          // wait until the animation has fully played to process what to do next
          if (this.frame !== this.numFrames() - 1) {
            return;
          }

          const { target } = states.attacking;
          const [distanceToTarget] = getVectorInfo(this.pos, target.pos);

          // if target is too far to attack again, go back to hunting it
          if (distanceToTarget > DOG_ATTACK_RANGE) {
            this.enterState(DogState.hunting, states.attacking.target);
            return;
          }

          // if target still within attack range, restart attack state
          this.enterState(DogState.attacking, states.attacking.target);
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
    health({
      onDamage: options?.onDamage,
      onDeath: options?.onDestroy,
    }),
    dogTag,
    k.pos(...options.pos),
    k.sprite(SPRITES.dogIdle, { animSpeed: DOG_ANIM_IDLE_SPEED }),
    k.scale(3, 3),
    k.state(
      options.initialState || DogState.patrolling,
      Object.values(DogState)
    ),
    k.area(),
    k.body(),
    dogState(),
    k.shader(SHADERS.damaged, {
      u_flash_intensity: 0,
    }),
  ]);

  dog.onUpdate(() => {
    dog.uniform["u_flash_intensity"] = dog.getDamageTime();
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
