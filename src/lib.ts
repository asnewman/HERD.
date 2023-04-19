import { k } from "./kaboom";
import { Color, Comp, GameObj, Vec2, CompList } from "kaboom";

type IButtonTextComp = Comp & { setText: (text: string) => void };

interface IButtonTextOptions {
  text: string;
  color?: Color;
  height?: number;
}

function buttonText(opts: IButtonTextOptions): IButtonTextComp {
  let _ref: GameObj | null = null;

  return {
    id: "buttonText",
    add(this: GameObj) {
      _ref = this.add([
        k.text(opts.text, { size: opts.height }),
        k.color(opts.color || k.BLACK),
      ]);
    },
    setText(this: GameObj, textValue) {
      if (!_ref) {
        return;
      }

      _ref.text = textValue;
    },
  };
}

interface IAddButtonOptions {
  pos: Vec2 | ((w: number, h: number) => Vec2);
  font?: string;
  textHeight?: number;
  colorBackground?: Color;
  colorOutline?: [number, Color];
  colorText?: Color;
  onClick?: (a: GameObj) => void;
}

export function addButton(textValue: string, options: IAddButtonOptions) {
  // Measure the size of the text to determine the size the button should be
  const formattedText = k.formatText({
    text: textValue,
    font: options.font,
    size: options.textHeight,
  });

  const posValue =
    typeof options.pos === "function"
      ? options.pos(formattedText.width, formattedText.height)
      : options.pos || k.vec2(0, 0);

  // Pseudo-random tag generation for the `onClick` event.
  let tag = "button";
  tag += "-" + textValue;
  tag += "-" + posValue.x;
  tag += "-" + posValue.y;
  tag += "-" + Math.random();

  const buttonComponents: CompList<Comp> = [
    tag,
    k.rect(formattedText.width, formattedText.height),
    k.pos(posValue),
    k.outline(...(options.colorOutline || [2, k.BLACK])),
    k.color(options.colorBackground || k.WHITE),
    buttonText({
      text: textValue,
      color: options.colorText,
      height: formattedText.height,
    }),
  ];

  if (options.onClick) {
    buttonComponents.push(k.area());
    k.onClick(tag, options.onClick);
  }

  return k.add(buttonComponents);
}
