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
  additionalTags?: string[];
  pos: Vec2 | ((w: number, h: number) => Vec2);
  font?: string;
  textHeight?: number;
  colorBackground?: Color;
  colorOutline?: [number, Color];
  colorText?: Color;
  onClick?: (a: GameObj) => void;
  parent?: GameObj;
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

  if (options.additionalTags) {
    buttonComponents.push(...options.additionalTags);
  }

  if (options.onClick) {
    buttonComponents.push(k.area());
    k.onClick(tag, options.onClick);
  }

  return options.parent
    ? options.parent.add(buttonComponents)
    : k.add(buttonComponents);
}

type IButton = Omit<IAddButtonOptions, "pos"> & {
  text: string;
  margin?: [number, number, number, number];
};

interface IMenuOptions {
  pos: [number, number];
  // pos: Vec2 | ((w: number, h: number) => Vec2);
  padding?: [number, number, number, number];
  color?: Color;
}

export function createMenu(menu: IMenuOptions, buttons: IButton[]) {
  let visible = false;
  let menuSize = { width: 0, height: 0 };
  let buttonMaxWidth = 0;

  let currentPosition = { x: menu.pos[0] || 0, y: menu.pos[1] || 0 };

  const [menuPadTop, menuPadRight, menuPadBot, menuPadLeft] =
    menu.padding || [];

  if (menuPadTop) currentPosition.y += menuPadTop;
  if (menuPadLeft) currentPosition.x += menuPadLeft;

  let createButtonFunctions: ((m: GameObj) => GameObj<Comp>)[] = [];
  buttons.forEach((b) => {
    const { width, height } = k.formatText({
      text: b.text,
      font: b.font,
      size: b.textHeight,
    });
    const [top, right, bot, left] = b.margin || [];

    let totalHeight = height;
    if (top) totalHeight += top;
    if (bot) totalHeight += bot;

    let totalWidth = width;
    if (right) totalWidth += right;
    if (left) totalWidth += left;

    // Since buttons are stacked vertically within menus, width values
    // don't stack; instead, we just need to track the widest button
    buttonMaxWidth = Math.max(width, totalWidth);

    // add top margin to y pos before drawing
    if (top) currentPosition.y += top;

    (function (x: number, y: number) {
      createButtonFunctions.push((m) => {
        return addButton(b.text, {
          ...b,
          parent: m,
          pos: k.vec2(x, y),
        });
      });
    })(currentPosition.x, currentPosition.y);

    // add button height (minus top margin already applied) to y pos
    // after drawing
    currentPosition.y += totalHeight - (top || 0);

    // Since buttons are stacked vertically within menus, height and
    // vertical margin values simply get added to the height of the menu
    menuSize.height += totalHeight;
  });

  if (menuPadRight) menuSize.width += menuPadRight;
  if (menuPadLeft) menuSize.width += menuPadLeft;
  if (menuPadTop) menuSize.height += menuPadTop;
  if (menuPadBot) menuSize.height += menuPadBot;

  menuSize.width += buttonMaxWidth;

  let menuRef: GameObj<Comp> | null = null;
  let buttonsArray: GameObj<Comp>[] = [];
  const createButtons = () => {
    // clear out any old references (extra check)
    if (menuRef) menuRef.destroy();
    buttonsArray = [];

    // create menu parent
    menuRef = k.add([
      k.pos(menu.pos[0], menu.pos[1]),
      ...(menu.color
        ? [k.rect(menuSize.width, menuSize.height), k.color(menu.color)]
        : []),
    ]);

    // create new buttons
    createButtonFunctions.forEach((cb) => buttonsArray.push(cb(menuRef!)));
  };

  return {
    show() {
      if (visible) return;

      createButtons();
      visible = true;
    },
    hide() {
      if (!visible) return;

      buttonsArray.forEach((b) => b.destroy());
      if (menuRef) menuRef.destroy();
      visible = false;
    },
    toggle() {
      return visible ? this.hide() : this.show();
    },
  };
}
