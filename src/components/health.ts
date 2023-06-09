import { Color, Comp, GameObj } from "kaboom";
import { k } from "../kaboom";

export interface HealthComp extends Comp {
  /**
   *
   * @returns whether or not health remains
   */
  isAlive: () => boolean;
  /**
   * @param damage damage to take
   * @returns remaining health
   */
  damage: (this: GameObj, damage: number) => number;
  /**
   * @returns the percentage of time elapsed (decimal between 0 and 1)
   * for the "damage" state; mostly used for animation timing, but could
   * be used for other things like invincibility frames
   */
  getDamageTime: () => number;
  /**
   *
   * @returns the amount of health remaining
   */
  getHealth: () => number;
  /**
   *
   * @returns the max amount of health
   */
  getMaxHealth: () => number;
}

/**
 * The health bar will cease to be visible after this amount of time
 * has elapsed since the last time damage was taken.
 */
const HEALTH_BAR_VISIBLITY_TIME = 3000;

/**
 * Tag to identify entities with health.
 */
export const HEALTH_TAG = "entity-with-health";

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
    visible: false,
    current: options?.startingHealth || options?.maxHealth || 100,
    max: options?.maxHealth || 100,
  };

  let hideHealthbarTimeout: number | null = null;
  const hideHealthbar = () => {
    hideHealthbarTimeout = null;
    state.visible = false;
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
    add(this: GameObj) {
      this.use(HEALTH_TAG);
    },
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

        if (hideHealthbarTimeout) clearTimeout(hideHealthbarTimeout);
        hideHealthbarTimeout = setTimeout(
          hideHealthbar,
          HEALTH_BAR_VISIBLITY_TIME
        );
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

      state.visible = true;

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
        } else {
          this.destroy();
        }
      }

      return state.current;
    },
    getHealth() {
      return state.current;
    },
    getMaxHealth() {
      return state.max;
    },
    getDamageTime() {
      return damageAnimCurrTime / DAMAGE_ANIM_DURATION_S;
    },
    isAlive() {
      return state.current > 0;
    },
  };
}
