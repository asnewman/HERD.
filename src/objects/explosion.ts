import {
  AreaComp,
  BodyComp,
  EventController,
  GameObj,
  PosComp,
  ScaleComp,
  ShaderComp,
  Vec2,
} from "kaboom";
import { k } from "../kaboom";
import { Comp } from "kaboom";

interface IOptions {
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

  particleFadeDuration?: number;
  /**
   * Callback function returning an array of components responsible
   * for rendering the particle - should include a sprite or primitive
   * @param particleIndex
   */
  getParticle: (arg: {
    emissionIndex: number;
    particleIndex: number;
  }) => Comp[];
  getParticleVelocity: (arg: {
    emissionIndex: number;
    particleIndex: number;
    timeAlive: number;
  }) => [number, number];
  onParticleUpdate?: (
    particle: GameObj<PosComp | AreaComp | BodyComp | ScaleComp | ShaderComp>,
    arg: {
      emissionIndex: number;
      particleIndex: number;
      timeAlive: number;
    }
  ) => void;
}

export function createParticleEmitter(options: IOptions) {
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
            k.body(),
            ...(options.particleLifespan
              ? [
                  k.lifespan(options.particleLifespan, {
                    fade: options.particleFadeDuration,
                  }),
                ]
              : []),
            "particle",
          ]) as GameObj<BodyComp | PosComp | AreaComp | ScaleComp | ShaderComp>;

          particles.push(particle);

          let timeAlive = 0;
          const [x, y] = options.getParticleVelocity({
            emissionIndex,
            particleIndex,
            timeAlive,
          });
          const updateEvent = particle.onUpdate(() => {
            // console.log("timeAlive", timeAlive);
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
