import { GameObj } from "kaboom";

import { k } from "./kaboom";
import { addButton } from "./lib";

export function startGame() {
  /**
   * Global state tracking the current state of the game. I think
   * an object is probably ok for now, but lmk if you disagree or think
   * we should take a different approach!
   */
  var gameState: {
    sheep: {
      // TODO: type the sheep
      [sheepName: string]: any;
    };
    sheepSelected: Set<string>;
  } = {
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
    baseTopRight: "baseTopRight",
    baseTopLeft: "baseTopLeft",
    baseBottomRight: "baseBottomRight",
    baseBottomLeft: "baseBottomLeft",
    baseVertical: "baseVertical",
    baseHorizontal: "baseHorizontal",
    path: "path",
    empty: "empty",
    grassTile: "grassTile",
  };

  // load sprites
  k.loadSprite(SPRITES.empty, "sprites/empty.png");

  const sheepAtlasSettings = {
    x: 0,
    y: 0,
    width: 96,
    height: 64,
    frames: [
      k.quad(0, 15, 32, 17),
      k.quad(32, 16, 32, 16),
      k.quad(64, 16, 32, 16),
      k.quad(0, 16, 32, 16),
      k.quad(32, 16, 32, 16),
      k.quad(64, 16, 32, 16),
    ],
    anims: {
      graze: {
        loop: true,
        from: 0,
        to: 5,
      },
    },
  };

  k.loadSpriteAtlas("sprites/spritesheet-sheep.png", {
    [SPRITES.sheep]: sheepAtlasSettings,
  });
  k.loadSpriteAtlas("sprites/spritesheet-sheep-bomber.png", {
    [SPRITES.sheepBomber]: sheepAtlasSettings,
  });

  k.loadSpriteAtlas("sprites/spritesheet-env.png", {
    [SPRITES.grassTile]: {
      x: 16,
      y: 16,
      width: 32,
      height: 32,
    },
    [SPRITES.baseTopLeft]: {
      x: 96,
      y: 16,
      width: 16,
      height: 16,
    },
    [SPRITES.baseVertical]: {
      x: 96,
      y: 32,
      width: 16,
      height: 16,
    },
    [SPRITES.baseBottomLeft]: {
      x: 96,
      y: 48,
      width: 16,
      height: 16,
    },
    [SPRITES.baseTopRight]: {
      x: 128,
      y: 16,
      width: 16,
      height: 16,
    },
    [SPRITES.baseHorizontal]: {
      x: 112,
      y: 16,
      width: 16,
      height: 16,
    },
    [SPRITES.baseBottomRight]: {
      x: 128,
      y: 48,
      width: 16,
      height: 16,
    },
    [SPRITES.path]: {
      x: 144,
      y: 32,
      height: 16,
      width: 16,
    },
  });

  const SCENES = {
    menu: "menu",
    sheepConfig: "sheep_config",
    mapGeneration: "map_generation",
  };

  k.scene(SCENES.menu, () => {
    k.add([k.text("Menu"), k.pos(0, 0), k.color(k.RED)]);
    addButton("Map Generation", {
      pos: k.vec2(0, 100),
      colorText: k.BLACK,
      onClick: () => {
        k.go(SCENES.mapGeneration);
      },
    });
    addButton("Sheep Configuration", {
      pos: k.vec2(0, 200),
      colorText: k.BLACK,
      onClick: () => {
        k.go(SCENES.sheepConfig);
      },
    });
  });

  const map = [
    "┌─┐          ",
    "│ │--        ",
    "└─┘ |        ",
    "    ---      ",
    "      |      ",
    "      |      ",
    "   ---|      ",
    "   |         ",
    "   |-----    ",
    "        | ┌─┐",
    "        |-│ │",
    "          └─┘",
  ];

  k.scene(SCENES.mapGeneration, () => {
    k.addLevel(map, {
      tileWidth: 32,
      tileHeight: 32,
      tiles: {
        "┌": () => [k.sprite(SPRITES.baseTopLeft), k.scale(2)],
        "│": () => [k.sprite(SPRITES.baseVertical), k.scale(2)],
        "└": () => [k.sprite(SPRITES.baseBottomLeft), k.scale(2)],
        "┐": () => [k.sprite(SPRITES.baseTopRight), k.scale(2)],
        "─": () => [k.sprite(SPRITES.baseHorizontal), k.scale(2)],
        "┘": () => [k.sprite(SPRITES.baseBottomRight), k.scale(2)],
        "-": () => [k.sprite(SPRITES.path), k.scale(2)],
        "|": () => [k.sprite(SPRITES.path), k.scale(2)],
        // " ": () => [sprite(SPRITES.empty)],
      },
    });
  });

  k.scene(SCENES.sheepConfig, () => {
    // temporary: create a bunch of sheep in random positions
    const segmentWidth = k.width() / 5;
    const segmentHeight = k.height() / 5;
    const getOffset = () => k.rand(-50, 50);
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

    const onSheepTypeClick =
      (type: "bomber" | "shielder" | "commando") => () => {
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
        k.vec2(k.width() - w - sheepTypeButtonPadding, sheepTypeButtonPadding),
      colorText: k.BLACK,
      colorBackground: k.WHITE,
      onClick: onSheepTypeClick("bomber"),
    });
    addButton("Shielder", {
      pos: (w, h) =>
        k.vec2(
          k.width() - w - sheepTypeButtonPadding,
          sheepTypeButtonPadding + h + sheepTypeButtonPadding
        ),
      colorText: k.BLACK,
      colorBackground: k.WHITE,
      onClick: onSheepTypeClick("shielder"),
    });
    addButton("Commando", {
      pos: (w, h) =>
        k.vec2(
          k.width() - w - sheepTypeButtonPadding,
          sheepTypeButtonPadding +
            h +
            sheepTypeButtonPadding +
            h +
            sheepTypeButtonPadding
        ),
      colorText: k.BLACK,
      colorBackground: k.WHITE,
      onClick: onSheepTypeClick("commando"),
    });
  });

  enum SheepState {
    grazing = "grazing",
    walking = "walking",
  }

  const SHEEP_ANIM_SPEED = 0.6;
  const SHEEP_GRAZE_VELOCITY = 3000;

  interface ICreateSheepOptions {
    name: string;
    pos: [number, number];
    initialState?: SheepState;
  }

  function createSheep(options: ICreateSheepOptions) {
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
          k.drawRect({
            width: 32,
            height: 17,
            pos: k.vec2(0, 0),
            fill: false,
            outline: { color: k.RED, width: 1 },
          });
        },
        inspect() {
          return String(isSelected);
        },
        setSelected(value: boolean) {
          isSelected = value;
        },
        setType(this: GameObj, type: "bomber" | "shielder" | "commando") {
          if (type === "bomber") {
            this.use(k.sprite(SPRITES.sheepBomber));
            return;
          }

          this.use(k.sprite(SPRITES.sheep));
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
    const sheep = k.add([
      "sheep",
      { name: options.name },
      sheepTag,
      k.pos(...options.pos),
      k.sprite(SPRITES.sheep, { animSpeed: SHEEP_ANIM_SPEED }),
      k.scale(3, 3),
      k.state(
        options.initialState || SheepState.grazing,
        Object.values(SheepState)
      ),
      k.area(),
      selectable(),
      k.body(),
    ]);

    const sheepState = {
      grazing: {
        /**
         * The last direction the sheep was moving in.
         * Used to determine what the next direction should be.
         */
        lastDirection: "",
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

    const getDirectionTimeLimit = () => k.rand(10) * 0.2;

    sheep.onStateEnter(SheepState.grazing, async () => {
      sheepState.grazing = {
        lastDirection: "right",
        direction: ["left", "right", "idle"][k.rand(2)],
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

    sheep.onStateUpdate(SheepState.grazing, () => {
      const delta = k.dt();

      let moveValues: [number, number] = [-1, -1];
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

    sheep.enterState(SheepState.grazing);

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

    k.onClick(sheepTag, () => {
      props.toggleSelected();
    });

    return props;
  }

  k.go(SCENES.menu);
}
