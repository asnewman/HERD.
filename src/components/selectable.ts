import { Comp, GameObj } from "kaboom";
import { k } from "../kaboom";

export interface SelectableComp extends Comp {
  getIsSelected: () => boolean;
  setSelected: (value: boolean) => void;
  toggleSelected: (this: GameObj<SelectableComp>) => void;
  onSelectedStateChange(cb: (newSelectedState: boolean) => void): void;
}

interface SelectableOptions {
  onStateChange?: (newSelectedState: boolean) => void;
}

export function selectable(opts?: SelectableOptions): SelectableComp {
  const state = {
    isSelected: false,
    onSelectedStateChangeCallbacks: [] as ((
      newSelectedState: boolean
    ) => void)[],
  };

  if (opts?.onStateChange) {
    state.onSelectedStateChangeCallbacks.push(opts.onStateChange);
  }

  return {
    id: "selectable",
    require: ["area"],
    draw() {
      if (!state.isSelected) return;
      k.drawRect({
        width: 32,
        height: 17,
        pos: k.vec2(0, 0),
        fill: false,
        outline: { color: k.RED, width: 1 },
      });
    },
    inspect() {
      return String(state.isSelected);
    },
    getIsSelected() {
      return state.isSelected;
    },
    setSelected(value: boolean) {
      state.isSelected = value;
    },
    toggleSelected(this: GameObj<SelectableComp>) {
      const newState = !state.isSelected;
      this.setSelected(newState);
      state.onSelectedStateChangeCallbacks.forEach((cb) => cb(newState));
    },
    onSelectedStateChange(cb: (newSelectedState: boolean) => void) {
      state.onSelectedStateChangeCallbacks.push(cb);
    },
  };
}
