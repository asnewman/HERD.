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
  const formattedText = formatText({
    text: textValue,
    font: options.font,
    size: options.textHeight,
  });

  /**
   * Pseudo-random tag generation for the `onClick` event.
   */
  const tag = `button-${textValue}-${options.pos.x}-${
    options.pos.y
  }-${Math.random()}`;

  const buttonComponents = [
    rect(formattedText.width, formattedText.height),
    pos(options.pos || vec2(0, 0)),
    outline(...(options.colorOutline || [2, BLACK])),
    /**
     * Applies to both the `rect` and `text` components.
     */
    color(options.colorBackground || WHITE),
    /**
     * Since the `color` component applies to both the text and to the rect
     * in order to style the text differently, we need to wrap the
     * text in a [styling tag] and pass a `styles` property to the text options.
     *
     * This is a little wonky, but it works, and would be easy to add support
     * for styling multiple substrings within the text in the future if necessary.
     */
    text(`[${textValue}].style`, {
      size: options.textHeight,
      styles: {
        style: {
          color: options.colorText || BLUE,
        },
      },
    }),
    tag,
  ];

  if (options.onClick) {
    buttonComponents.push(area());
    onClick(tag, options.onClick);
  }

  return add(buttonComponents);
}
