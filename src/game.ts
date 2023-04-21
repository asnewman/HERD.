import { Comp, GameObj } from "kaboom";
import { k } from "./kaboom";
import { addButton } from "./lib";
import { createSheep } from "./sheep";

export interface IGameState {
  /**
   * A map of sheep by sheepName -> Sheep object.
   * When a sheep is added to the game, it will be added to this map,
   * and we'll ensure that its name is unique.
   */
  sheep: Record<string, any>;
  /**
   * A set of the names of the sheep that are currently selected.
   * Set<string>
   */
  sheepSelected: Set<string>;
}

export const SPRITES = {
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

export function startGame() {
  let gameState: IGameState = {
    sheep: {},
    sheepSelected: new Set(),
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
        createSheep(gameState, {
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
    const sheepTypeButtonTags = ["sheep-type-button"];

    let buttonsVisible = true;

    let buttons: GameObj<Comp>[] = [];
    function createButtons() {
      buttons = [
        addButton("Bomber", {
          additionalTags: sheepTypeButtonTags,
          pos: (w) =>
            k.vec2(
              k.width() - w - sheepTypeButtonPadding,
              sheepTypeButtonPadding
            ),
          colorText: k.BLACK,
          colorBackground: k.WHITE,
          onClick: onSheepTypeClick("bomber"),
        }),
        addButton("Shielder", {
          additionalTags: sheepTypeButtonTags,
          pos: (w, h) =>
            k.vec2(
              k.width() - w - sheepTypeButtonPadding,
              sheepTypeButtonPadding + h + sheepTypeButtonPadding
            ),
          colorText: k.BLACK,
          colorBackground: k.WHITE,
          onClick: onSheepTypeClick("shielder"),
        }),
        addButton("Commando", {
          additionalTags: sheepTypeButtonTags,
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
        }),
      ];
    }
    createButtons();

    addButton("Toggle Menu", {
      additionalTags: sheepTypeButtonTags,
      pos: k.vec2(0, 0),
      colorText: k.BLACK,
      colorBackground: k.WHITE,
      onClick: () => {
        if (buttonsVisible) {
          buttons.forEach((b) => b.destroy());
          buttonsVisible = false;
          buttons = [];
          return;
        }

        createButtons();
        buttonsVisible = true;
      },
    });
  });

  k.go(SCENES.menu);
}
