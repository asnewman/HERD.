// Initialize Kaboom
const k = kaboom({
  width: 640,
  height: 480,
  clearColor: [0, 0, 0, 1],
  loadRoot: "sprites",
});

// Load the sprites
k.loadSprite("base", "https://i.imgur.com/lhnPeoD.png");
k.loadSprite("path", "https://i.imgur.com/3IfVfmj.png");

k.scene("main", () => {
  createMap();

  k.action(() => {
    // Add your game logic here
  });
});

k.go("main");

const baseScale = 0.1; // 50% of the original size
const pathScale = 0.1; // 50% of the original size

/**
 * Creates a map with two bases and a zigzag path connecting them.
 * The bases are placed at the top-left and bottom-right corners of the screen.
 * The zigzag path is built with the path sprite and alternates between the top and bottom of the screen.
 * Make sure to load the sprites ("base" and "path") before calling this function.
 */
function createMap() {
  // Place the bases
  const base1 = k.add([k.sprite("base"), k.pos(10, 10)]);
  const base2 = k.add([
    k.sprite("base"),
    k.pos(k.width() - 110, k.height() - 110),
  ]);

  // Scale the bases
  base1.scale = k.vec2(baseScale);
  base2.scale = k.vec2(baseScale);

  // Draw the zigzag path
  const pathWidth = 20;
  const zigzagSpacing = 40;
  const numZigzags = (k.width() - 20) / zigzagSpacing;

  for (let i = 0; i < numZigzags; i++) {
    const xPos = 10 + i * zigzagSpacing;

    if (i % 2 === 0) {
      const path = k.add([k.sprite("path"), k.pos(xPos, 10 + pathWidth)]);
      path.scale = k.vec2(pathScale);
    } else {
      const path = k.add([
        k.sprite("path"),
        k.pos(xPos, k.height() - 30 - pathWidth),
      ]);
      path.scale = k.vec2(pathScale);
    }
  }
}
