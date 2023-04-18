function buttonText({ text: textValue, color: colorValue, height }) {
  let _ref;

  return {
    id: "buttonText",
    add() {
      _ref = this.add([
        text(textValue, { size: height }),
        color(colorValue || BLACK),
      ]);
    },
    setText(textValue) {
      _ref.text = textValue;
    },
  };
}

/**
 * @typedef {{
 * pos: Vec2;
 * font?: string;
 * textHeight?: number;
 * colorBackground?: string;
 * colorOutline?: [OutlineWidth, OutlineColor];
 * colorText?: Color;
 * onClick?: (e: Event) => void;
 * }} AddButtonOptions
 */

/**
 *
 * @param {string} textValue
 * @param {AddButtonOptions} options
 */
function addButton(textValue, options) {
  // Pseudo-random tag generation for the `onClick` event.
  let tag = "button";
  tag += "-" + textValue;
  tag += "-" + options.pos.x;
  tag += "-" + options.pos.y;
  tag += "-" + Math.random();

  // Measure the size of the text to determine the size the button should be
  const formattedText = formatText({
    text: textValue,
    font: options.font,
    size: options.textHeight,
  });

  const buttonComponents = [
    tag,
    rect(formattedText.width, formattedText.height),
    pos(options.pos || vec2(0, 0)),
    outline(...(options.colorOutline || [2, BLACK])),
    color(options.colorBackground || WHITE),
    buttonText({
      text: textValue,
      color: options.colorText,
      height: formattedText.height,
    }),
  ];

  if (options.onClick) {
    buttonComponents.push(area());
    onClick(tag, options.onClick);
  }

  return add(buttonComponents);
}
