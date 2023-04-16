kaboom();

/**
 * Global state tracking the current state of the game. I think
 * an object is probably ok for now, but lmk if you disagree or think
 * we should take a different approach!
 */
var gameState = {
  /**
   * A map of sheep by sheepName -> Sheep object.
   * When a sheep is added to the game, it will be added to this map,
   * and we'll ensure that its name is unique.
   */
  sheep: {},
};

const SPRITES = {
  sheep: "sheep",
  base: "base",
  path: "path",
  empty: "empty",
};

// load sprites
loadSprite(SPRITES.sheep, "sprites/lolsheep.jpg");
loadSprite(SPRITES.base, "sprites/base.png");
loadSprite(SPRITES.path, "sprites/path.png");
loadSprite(SPRITES.empty, "sprites/empty.png");

const SCENES = {
  menu: "menu",
  sheepConfig: "sheep_config",
  mapGeneration: "map_generation",
};

scene(SCENES.menu, () => {
  add([text("Menu"), pos(0, 0), color(RED)]);
  addButton("Map Generation", {
    pos: vec2(0, 100),
    colorText: CYAN,
    onClick: () => {
      go(SCENES.mapGeneration);
    },
  });
  addButton("Sheep Configuration", {
    pos: vec2(0, 200),
    colorText: CYAN,
    onClick: () => {
      go(SCENES.sheepConfig);
    },
  });
});

scene(SCENES.mapGeneration, () => {
  addLevel(
    [
      "x--          ",
      "  |          ",
      "  |          ",
      "  |----      ",
      "      |      ",
      "      |      ",
      "   ---|      ",
      "   |         ",
      "   |-----    ",
      "        |---x",
    ],
    {
      width: 32,
      height: 32,
      x: () => [sprite(SPRITES.base)],
      "-": () => [sprite(SPRITES.path)],
      "|": () => [sprite(SPRITES.path)],
      " ": () => [sprite(SPRITES.empty)],
    }
  );
  setTimeout(() => alert("I'm the map!"));
});

scene(SCENES.sheepConfig, () => {
  burp();
  add([sprite(SPRITES.sheep)]);
  setTimeout(() => alert("baaaa"));
});

go(SCENES.menu);

const SHEEP_STATES = {
  grazing: "grazing",
  walking: "walking",
};

function createSheep(options) {
  if (!options.name) {
    throw new Error("Sheep must have a name");
  }

  if (gameState.sheep[options.name]) {
    throw new Error(`Sheep name ${options.name} already exists`);
  }

  if (!options.pos) {
    throw new Error("Sheep must have a position");
  }

  const sheep = add([
    options.name,
    options.pos,
    // sprite(SPRITES.sheep),

    state(
      options.initialState || SHEEP_STATES.grazing,
      Object.values(SHEEP_STATES)
    ),
    area(),
  ]);

  sheep.onStateEnter(SHEEP_STATES.grazing, () => {
    // recursively:
    // - play grazing animation
    // - randomly shuffle around
  });

  return sheep;
}
