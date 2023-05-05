import { createParticleEmitter } from "../lib";
import { k } from "../kaboom";
import { Vec2 } from "kaboom";

const lifepan = 0.8;
const smokeEmitter = createParticleEmitter({
  lifepan,
  getParticle: () => [
    k.circle(k.rand(70, 120)),
    k.color(k.Color.fromHex("#555555")),
    k.scale(1),
    k.z(0),
  ],
  getParticleVelocity: () => [k.rand(-150, 150), k.rand(-150, 150)],
  onParticleUpdate: (particle, { timeAlive }) => {
    particle.scale = k.vec2(timeAlive * 0.4 + 1, timeAlive * 0.4 + 1);
  },
  particleLifespan: 0.6,
  particlesPerEmission: 10,
});

const sparkEmitter = createParticleEmitter({
  lifepan,
  getParticle: () => [
    k.circle(k.rand(1, 30)),
    k.color(k.Color.fromHex("#FFED64")),
    k.scale(k.rand(0.5, 1)),
    k.z(1),
  ],
  getParticleVelocity: () => [k.rand(-600, 600), k.rand(-600, 600)],
  onParticleUpdate: (particle, { timeAlive }) => {
    particle.scale = k.vec2(1 - timeAlive * 2, 1 - timeAlive * 2);
  },
  particleLifespan: 0.45,
  particlesPerEmission: 20,
});

export function createExplosion(pos: Vec2) {
  smokeEmitter.emit(pos);
  sparkEmitter.emit(pos);
  k.shake(5);
}
