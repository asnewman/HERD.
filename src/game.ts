import { createDog } from "./dog";
import { k } from "./kaboom";
import { createMenu } from "./lib";
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
  /**
   * A set of the enemies that are currently part of the game.
   */
  enemies: Record<string, any>;
}

export const SHADERS = {
  damaged: "damaged",
};

k.loadShader(
  SHADERS.damaged,
  undefined,
  `
  uniform float u_flash_intensity;
  vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
      vec4 c = def_frag();
      return mix(c, vec4(vec4(.6, 0, 0, 1).rgb, c.a), u_flash_intensity * .7);
  }
`
);

export const SOUNDS = {
  sheepHurt1: "sheepHurt1",
  sheepHurt2: "sheepHurt2",
  sheepHurt3: "sheepHurt3",
};

k.loadSound(SOUNDS.sheepHurt1, "../sounds/hurt-1.wav");
k.loadSound(SOUNDS.sheepHurt2, "../sounds/hurt-2.wav");
k.loadSound(SOUNDS.sheepHurt3, "../sounds/hurt-3.wav");

export const SPRITES = {
  sheep: "sheep",
  sheepBomber: "sheepBomber",
  dogWalk: "dogWalk",
  dogIdle: "dogIdle",
  dogAttack: "dogAttack",
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

const f = [
  k.quad(0, 0, 2, 2),
  // k.quad(48, 20, 48, 28),
  // k.quad(96, 20, 48, 28),
  // k.quad(144, 20, 48, 28),
  // k.quad(192, 20, 48, 28),
  // k.quad(240, 20, 48, 28),
];

k.loadSprite(SPRITES.dogWalk, "sprites/dog/dog-walk.png", {
  // sliceX: 6,
  frames: f,
  anims: {
    walk: {
      loop: true,
      from: 0,
      to: 0,
    },
  },
});
k.loadSprite(SPRITES.dogIdle, "sprites/dog/dog-walk.png", {
  frames: f,
  anims: {
    idle: {
      loop: true,
      from: 0,
      to: 0,
    },
  },
});
// k.loadSprite(SPRITES.dogIdle, "sprites/dog/dog-idle.png", {
//   sliceX: 4,
//   anims: {
//     idle: {
//       loop: true,
//       from: 0,
//       to: 3,
//     },
//   },
// });
k.loadSprite(SPRITES.dogAttack, "sprites/dog/dog-attack.png", {
  sliceX: 4,
});

export function startGame() {
  let gameState: IGameState = {
    sheep: {},
    sheepSelected: new Set(),
    enemies: {},
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
    healthCombat: "healthCombat",
  };

  k.scene(SCENES.menu, () => {
    const p = 20;

    k.add([
      k.text("Menu", {
        size: 100,
      }),
      k.pos(p, p),
      k.color(k.BLUE),
    ]);

    const m = createMenu(
      {
        pos: [0, 50],
        padding: [p, p, p, p],
      },
      [
        {
          text: "Map Generation",
          colorText: k.BLACK,
          colorBackground: k.WHITE,
          margin: [0, 0, p, 0],
          onClick: () => k.go(SCENES.mapGeneration),
        },
        {
          text: "Sheep Configuration",
          margin: [0, 0, p, 0],
          onClick: () => k.go(SCENES.sheepConfig),
        },
        {
          text: "Health & Combat Testing",
          onClick: () => k.go(SCENES.healthCombat),
        },
      ]
    );
    m.show();
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

    const p = 10;
    const m = createMenu(
      {
        pos: [0, 0],
        padding: [p, p, p, p],
      },
      [
        {
          text: "Bomber",
          colorText: k.BLACK,
          colorBackground: k.WHITE,
          margin: [0, 0, p, 0],
          onClick: onSheepTypeClick("bomber"),
        },
        {
          text: "Shielder",
          margin: [0, 0, p, 0],
          onClick: onSheepTypeClick("shielder"),
        },
        {
          text: "Commando",
          onClick: onSheepTypeClick("commando"),
        },
      ]
    );

    m.show();
  });

  k.scene(SCENES.healthCombat, () => {
    const damageSounds = [
      SOUNDS.sheepHurt1,
      SOUNDS.sheepHurt2,
      SOUNDS.sheepHurt3,
    ];

    const sheep = createSheep(gameState, {
      name: `sheepish`,
      pos: [k.width() / 2, k.height() / 2 - 100],
      onDamage: () => {
        console.log("baaaaaa ouch");
        const i = Math.round(k.rand(damageSounds.length - 1));
        const s = damageSounds[i];
        k.play(s);
      },
      onDestroy: () => {
        console.log("bai");
        sheep.destroy();
      },
    });

    const dog = createDog(gameState, {
      name: "doggo",
      pos: [k.width() / 2, k.height() / 2 + 100],
    });

    setInterval(() => {
      // sheep.damage(10);
    }, 1000);
  });

  k.go(SCENES.healthCombat);
}
