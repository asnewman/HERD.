import { Color, Comp, GameObj } from "kaboom";
import { k } from "../kaboom";

export interface HealthComp extends Comp {
  /**
   * @param damage damage to take
   * @returns remaining health
   */
  damage: (damage: number) => number;
  /**
   * @returns the percentage of time elapsed (decimal between 0 and 1)
   * for the "damage" state; mostly used for animation timing, but could
   * be used for other things like invincibility frames
   */
  getDamageTime: () => number;
}

interface HealthOptions {
  maxHealth?: number;
  startingHealth?: number;
  colorOutline?: Color;
  colorFill?: Color;
  onDamage?: () => void;
  onDeath?: () => void;
}

export function health(options?: HealthOptions): HealthComp {
  let state = {
    visible: true,
    current: options?.startingHealth || options?.maxHealth || 100,
    max: options?.maxHealth || 100,
  };

  const colorOutline = options?.colorOutline || k.RED.darken(150);
  const colorFill = options?.colorFill || k.RED;

  const DEFAULT_WIDTH = 32;
  const getCurrentWidth = () => {
    return (state.current / state.max) * DEFAULT_WIDTH;
  };

  const DAMAGE_ANIM_DURATION_S = 0.2;
  let damageAnimState: "idle" | "ascending" | "descending" = "idle";
  let damageAnimCurrTime = 0;

  return {
    id: "health",
    require: ["area"],
    update() {
      if (damageAnimState === "idle") return;

      if (
        damageAnimState === "ascending" &&
        damageAnimCurrTime >= DAMAGE_ANIM_DURATION_S
      ) {
        damageAnimState = "descending";
      } else if (damageAnimState === "descending" && damageAnimCurrTime <= 0) {
        damageAnimState = "idle";
        damageAnimCurrTime = 0;
      }

      damageAnimCurrTime += k.dt() * (damageAnimState === "ascending" ? 1 : -1);
    },
    draw(this: GameObj) {
      if (!state.visible) return;

      // background fill
      k.drawRect({
        width: DEFAULT_WIDTH,
        height: 5,
        pos: k.vec2(0, -8),
        color: colorOutline,
      });

      // fill
      k.drawRect({
        width: getCurrentWidth(),
        height: 5,
        pos: k.vec2(0, -8),
        color: colorFill,
      });

      // outline
      k.drawRect({
        width: DEFAULT_WIDTH,
        height: 5,
        pos: k.vec2(0, -8),
        fill: false,
        outline: { color: colorOutline, width: 1.5 },
      });
    },
    inspect() {
      return JSON.stringify(state);
    },
    damage(amount) {
      if (state.current <= 0) return 0;

      damageAnimState = "ascending";
      damageAnimCurrTime = 0;

      state.current -= amount;
      if (options?.onDamage) {
        options.onDamage();
      }

      if (state.current <= 0) {
        state.current = 0;
        if (options?.onDeath) {
          options.onDeath();
        }
      }

      return state.current;
    },
    getDamageTime() {
      return damageAnimCurrTime / DAMAGE_ANIM_DURATION_S;
    },
  };
}
