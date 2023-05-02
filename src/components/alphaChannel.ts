import { Comp, GameObj } from "kaboom";
import { k } from "../kaboom";
import { SHADERS } from "../game";

export function alphaChannel(alpha: number): Comp {
  const c: Comp = {
    id: 'alphaChannel',
    add: function(this: GameObj) {
      this.use(k.shader(SHADERS.alpha, { u_alpha: alpha }))
    }
  }

  return c;
}