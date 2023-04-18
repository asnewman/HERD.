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
  /**
   * A set of the names of the sheep that are currently selected.
   * Set<string>
   */
  sheepSelected: new Set(),
};

const SPRITES = {
  sheep: "sheep",
  sheepBomber: "sheepBomber",
  base: "base",
  path: "path",
  empty: "empty",
  grassTile: "grassTile",
};

// load sprites
loadSprite(SPRITES.empty, "sprites/empty.png");

const sheepAtlasSettings = {
  x: 0,
  y: 0,
  width: 96,
  height: 64,
  frames: [
    quad(0, 15, 32, 17),
    quad(32, 16, 32, 16),
    quad(64, 16, 32, 16),
    quad(0, 16, 32, 16),
    quad(32, 16, 32, 16),
    quad(64, 16, 32, 16),
  ],
  anims: {
    graze: {
      loop: true,
      from: 0,
      to: 5,
    },
  },
};

loadSpriteAtlas("sprites/spritesheet-sheep.png", {
  [SPRITES.sheep]: sheepAtlasSettings,
});
loadSpriteAtlas("sprites/spritesheet-sheep-bomber.png", {
  [SPRITES.sheepBomber]: sheepAtlasSettings,
});

loadSpriteAtlas("sprites/spritesheet-env.png", {
  [SPRITES.grassTile]: {
    x: 16,
    y: 16,
    width: 32,
    height: 32,
  },
  [SPRITES.base]: {
    x: 96,
    y: 16,
    width: 48,
    height: 48
  },
  [SPRITES.path]: {
    x: 144,
    y: 32,
    height: 16,
    width: 16,
    scale: 2,
  }
});

const SCENES = {
  menu: "menu",
  sheepConfig: "sheep_config",
  mapGeneration: "map_generation",
};

scene(SCENES.menu, () => {
  add([text("Menu"), pos(0, 0), color(RED)]);
  addButton("Map Generation", {
    pos: vec2(0, 100),
    colorText: BLACK,
    onClick: () => {
      go(SCENES.mapGeneration);
    },
  });
  addButton("Sheep Configuration", {
    pos: vec2(0, 200),
    colorText: BLACK,
    onClick: () => {
      go(SCENES.sheepConfig);
    },
  });
});

const map = [
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
    ]

scene(SCENES.mapGeneration, () => {
  addLevel(
    map,
    {
      tileWidth: 32,
      tileHeight: 32,
      tiles: {
        x: () => [sprite(SPRITES.base)],
        "-": () => [sprite(SPRITES.path)],
        "|": () => [sprite(SPRITES.path)],
        // " ": () => [sprite(SPRITES.empty)],
      }
    }
  );
});

scene(SCENES.sheepConfig, () => {
  // temporary: create a bunch of sheep in random positions
  const segmentWidth = width() / 5;
  const segmentHeight = height() / 5;
  const getOffset = () => rand(-50, 50);
  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      const xStart = x * segmentWidth;
      const yStart = y * segmentHeight;
      createSheep({
        name: `sheep${x}${y}`,
        pos: [
          xStart + segmentWidth / 2 + getOffset(),
          yStart + segmentHeight / 2 + getOffset(),
        ],
      });
    }
  }

  const onSheepTypeClick = (type) => () => {
    for (const sheepName of gameState.sheepSelected) {
      const sheep = gameState.sheep[sheepName];
      const flipXBefore = sheep.flipX;
      const frameBefore = sheep.frame;
      if (!sheep) continue;
      sheep.setType(type);
      sheep.flipX = flipXBefore;
      sheep.frame = frameBefore;
      sheep.play("graze");
      sheep.toggleSelected();
      gameState.sheepSelected.delete(sheepName);
    }
  };

  const sheepTypeButtonPadding = 30;

  addButton("Bomber", {
    pos: (w) =>
      vec2(width() - w - sheepTypeButtonPadding, sheepTypeButtonPadding),
    colorText: BLACK,
    colorBackground: WHITE,
    onClick: onSheepTypeClick("bomber"),
  });
  addButton("Shielder", {
    pos: (w, h) =>
      vec2(
        width() - w - sheepTypeButtonPadding,
        sheepTypeButtonPadding + h + sheepTypeButtonPadding
      ),
    colorText: BLACK,
    colorBackground: WHITE,
    onClick: onSheepTypeClick("shielder"),
  });
  addButton("Commando", {
    pos: (w, h) =>
      vec2(
        width() - w - sheepTypeButtonPadding,
        sheepTypeButtonPadding +
          h +
          sheepTypeButtonPadding +
          h +
          sheepTypeButtonPadding
      ),
    colorText: BLACK,
    colorBackground: WHITE,
    onClick: onSheepTypeClick("commando"),
  });
});

go(SCENES.sheepConfig);
// go(SCENES.mapGeneration);

const SHEEP_STATES = {
  grazing: "grazing",
  walking: "walking",
};

const SHEEP_ANIM_SPEED = 0.6;

const SHEEP_GRAZE_VELOCITY = 3000;
const SHEEP_GRAZE_DIRECTION_CHANGE_TIME = 2;

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

  function selectable() {
    let isSelected = false;
    return {
      id: "selectable",
      require: ["area"],
      draw() {
        if (!isSelected) return;
        drawRect({
          width: 32,
          height: 17,
          pos: vec2(0, 0),
          fill: false,
          outline: { color: RED, width: 1 },
        });
      },
      inspect() {
        return String(isSelected);
      },
      setSelected(value) {
        isSelected = value;
      },
      setType(type) {
        if (type === "bomber") {
          this.use(sprite(SPRITES.sheepBomber));
          return;
        }

        this.use(sprite(SPRITES.sheep));
      },
      toggleSelected() {
        const wasAlreadySelected = gameState.sheepSelected.has(sheep.name);

        wasAlreadySelected
          ? gameState.sheepSelected.delete(sheep.name)
          : gameState.sheepSelected.add(sheep.name);

        this.setSelected(!wasAlreadySelected);
      },
    };
  }

  const sheepTag = `sheep-${options.name}`;
  const sheep = add([
    "sheep",
    { name: options.name },
    sheepTag,
    pos(...options.pos),
    sprite(SPRITES.sheep, { animSpeed: SHEEP_ANIM_SPEED }),
    scale(3, 3),
    state(
      options.initialState || SHEEP_STATES.grazing,
      Object.values(SHEEP_STATES)
    ),
    area(),
    selectable(),
    body(),
  ]);

  const sheepState = {
    grazing: {
      /**
       * The current direction the sheep is moving in.
       * Can be "left", "right", or "idle".
       */
      direction: "right",
      /**
       * The amount of time for which the sheep has been moving in the
       * current direction.
       */
      cycleTime: 0,
      /**
       * The amount of time for which the sheep should move in the current
       * direction before changing it.
       */
      cycleTimeLimit: 0,
    },
  };

  const getDirectionTimeLimit = () => rand(10) * 0.2;

  sheep.onStateEnter(SHEEP_STATES.grazing, async () => {
    sheepState.grazing = {
      lastDirection: "right",
      direction: ["left", "right", "idle"][rand(2)],
      cycleTime: 0,
      cycleTimeLimit: getDirectionTimeLimit(),
    };
    sheep.flipX = sheepState.grazing.direction === "left";
    sheep.play("graze");
  });

  // prevent each sheep from colliding with other sheep
  sheep.onCollide("sheep", () => {
    sheepState.grazing.direction = "idle";
    sheepState.grazing.cycleTime = 0;
    sheepState.grazing.cycleTimeLimit = getDirectionTimeLimit();
  });

  sheep.onStateUpdate(SHEEP_STATES.grazing, () => {
    const delta = dt();

    let moveValues = [];
    switch (sheepState.grazing.direction) {
      case "idle": {
        moveValues = [0, 0];
        break;
      }
      case "left": {
        moveValues = [-SHEEP_GRAZE_VELOCITY * delta, 0];
        break;
      }
      case "right": {
        moveValues = [SHEEP_GRAZE_VELOCITY * delta, 0];
        break;
      }
    }
    sheep.move(...moveValues);

    sheepState.grazing.cycleTime += delta;

    const shouldNotChangeDirection =
      sheepState.grazing.cycleTime <= sheepState.grazing.cycleTimeLimit;
    if (shouldNotChangeDirection) {
      return;
    }

    sheepState.grazing.cycleTime = 0;
    sheepState.grazing.cycleTimeLimit = getDirectionTimeLimit();

    // if currently idle, start moving in a direction
    if (sheepState.grazing.direction === "idle") {
      // if the sheep was last going left, go right now
      sheepState.grazing.direction =
        sheepState.grazing.lastDirection === "right" ? "left" : "right";
      // track last direction to know what direction to move in next time
      sheepState.grazing.lastDirection = sheepState.grazing.direction;
      // sheep sprite faces right by default - flip it to the left if it's going left
      sheep.flipX = sheepState.grazing.direction === "left";
      // play the grazing animation while moving
      sheep.play("graze");
      return;
    }

    // sheep was moving, so now should idle for a cycle
    sheepState.grazing.direction = "idle";
    sheep.stop();
    sheep.frame = 0;
  });

  sheep.enterState(SHEEP_STATES.grazing);

  gameState.sheep[options.name] = sheep;

  const props = {
    isSelected: () => gameState.sheepSelected.has(sheep.name),
    toggleSelected: () => {
      const wasAlreadySelected = gameState.sheepSelected.has(sheep.name);

      wasAlreadySelected
        ? gameState.sheepSelected.delete(sheep.name)
        : gameState.sheepSelected.add(sheep.name);

      sheep.setSelected(!wasAlreadySelected);
    },
  };

  onClick(sheepTag, () => {
    props.toggleSelected();
  });

  return props;
}
