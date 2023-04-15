// Initialize Kaboom
const k = kaboom({
  width: 640,
  height: 480,
  clearColor: [0, 0, 0, 1],
  loadRoot: "sprites",
});

// Load the sprites
k.loadSprite("base", "sprites/grass.png");
k.loadSprite("path", "sprites/path.png");

k.scene("main", () => {
  createMap();

  k.action(() => {
    // Add your game logic here
  });
});

k.start("main");

/**
 * Creates a map with two bases and a zigzag path connecting them.
 * The bases are placed at the top-left and bottom-right corners of the screen.
 * The zigzag path is built with the path sprite and alternates between the top and bottom of the screen.
 * Make sure to load the sprites ("base" and "path") before calling this function.
 */
function createMap() {
  // Place the bases
  k.add([k.sprite("base"), k.pos(10, 10)]);
  k.add([k.sprite("base"), k.pos(k.width() - 110, k.height() - 110)]);

  // Draw the zigzag path
  const pathWidth = 20;
  const zigzagSpacing = 40;
  const numZigzags = (k.width() - 20) / zigzagSpacing;

  for (let i = 0; i < numZigzags; i++) {
    const xPos = 10 + i * zigzagSpacing;

    if (i % 2 === 0) {
      k.add([k.sprite("path"), k.pos(xPos, 10 + pathWidth)]);
    } else {
      k.add([k.sprite("path"), k.pos(xPos, k.height() - 30 - pathWidth)]);
    }
  }
}
