import { BodyComp, GameObj } from "kaboom";
import { k } from "../kaboom";
import { Comp } from "kaboom";

k.setGravity(800);

interface IOptions {
  /**
   * The lifespan of the emitter (in seconds)
   */
  lifepan: number;
  /**
   * The interval between particle emissions (in seconds)
   */
  emissionInterval: number;
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
}

export function createParticleEmitter(options: IOptions) {
  const particlesPerEmission = options.particlesPerEmission || 1;

  const emit = () => {
    let i = 0;
    const ev = k.loop(options.emissionInterval, () => {
      for (let j = 0; j < particlesPerEmission; j++) {
        const item = k.add([
          k.pos(k.mousePos()),
          ...options.getParticle({ emissionIndex: i, particleIndex: j }),
          k.anchor("center"),
          k.area({ collisionIgnore: ["particle"] }),
          k.body(),
          ...(options.particleLifespan
            ? [
                k.lifespan(options.particleLifespan, {
                  fade: options.particleLifespan / 2,
                }),
              ]
            : []),
          k.opacity(1),
          k.move(k.choose([k.LEFT, k.RIGHT]), k.rand(60, 240)),
          "particle",
        ]) as GameObj<BodyComp>;

        // item.onUpdate(() => {
        //   item;
        // });

        item.jump(k.rand(320, 640));
        i++;
      }
    });

    setTimeout(() => ev.cancel(), options.lifepan * 1000);
  };

  return {
    emit,
  };
}
