import { createDog } from "./dog";
import { k } from "./kaboom";
import { createMenu, drawBg, getFact, getName, initCamera } from "./lib";
import { createExplosion } from "./objects/explosion";
import { SheepState, createSheep } from "./sheep";
import { fillMap, findStart, forEachChar } from "./map";
import { hideUI, ui } from "./menus";
import icons from "./html/icons";
import colors from "./html/colors";

export const TILE_SIZE = 48;

export interface IGameState {
  sheepNames: Set<string>;
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
  /**
   * String representation of the map
   */
  map: string[];
}

export const SHADERS = {
  damaged: "damaged",
  alpha: "alpha",
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

k.loadShader(
  SHADERS.alpha,
  undefined,
  `
  uniform float u_alpha;
  vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
      vec4 c = def_frag();
      return vec4(c.rgb, u_alpha);
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
  dogRun: "dogRun",
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

k.loadSprite(SPRITES.dogRun, "sprites/dog/dog-run.png", {
  frames: [
    k.quad(0, 20 / 48, 48 / 288, 28 / 48),
    k.quad((48 * 1) / 288, 20 / 48, 48 / 288, 28 / 48),
    k.quad((48 * 2) / 288, 20 / 48, 48 / 288, 28 / 48),
    k.quad((48 * 3) / 288, 20 / 48, 48 / 288, 28 / 48),
    k.quad((48 * 4) / 288, 20 / 48, 48 / 288, 28 / 48),
    k.quad((48 * 5) / 288, 20 / 48, 48 / 288, 28 / 48),
  ],
  anims: {
    run: {
      loop: true,
      from: 0,
      to: 5,
    },
  },
});
k.loadSprite(SPRITES.dogIdle, "sprites/dog/dog-idle.png", {
  frames: [
    k.quad(0, 16 / 48, 48 / 192, 32 / 48),
    k.quad((48 * 1) / 192, 16 / 48, 48 / 192, 32 / 48),
    k.quad((48 * 2) / 192, 16 / 48, 48 / 192, 32 / 48),
    k.quad((48 * 3) / 192, 16 / 48, 48 / 192, 32 / 48),
  ],
  anims: {
    idle: {
      loop: true,
      from: 0,
      to: 3,
    },
  },
});

k.loadSprite(SPRITES.dogAttack, "sprites/dog/dog-attack.png", {
  frames: [
    k.quad(0, 16 / 48, 48 / 192, 32 / 48),
    k.quad((48 * 1) / 192, 16 / 48, 48 / 192, 32 / 48),
    k.quad((48 * 2) / 192, 16 / 48, 48 / 192, 32 / 48),
    k.quad((48 * 3) / 192, 16 / 48, 48 / 192, 32 / 48),
    // trailing frames - can add more of these to make the attack animation longer
    k.quad(0, 16 / 48, 48 / 192, 32 / 48),
    k.quad(0, 16 / 48, 48 / 192, 32 / 48),
  ],
  anims: {
    attack: {
      loop: false,
      from: 0,
      to: 5,
    },
  },
});

export function startGame() {
  let gameState: IGameState = {
    sheep: {},
    sheepNames: new Set(),
    sheepSelected: new Set(),
    enemies: {},
    map: [],
  };

  function getSheepName() {
    const name = getName(gameState.sheepNames);
    gameState.sheepNames.add(name);
    return name;
  }

  function getSheepAge() {
    return Math.round(k.rand(3, 50));
  }

  function getSheepFact() {
    return getFact();
  }

  function removeSheepName(name: string) {
    gameState.sheepNames.delete(name);
  }

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
    mainMenu: "mainMenu",
    menu: "menu",
    sheepConfig: "sheep_config",
    mapGeneration: "map_generation",
    healthCombat: "healthCombat",
    fx: "fx",
    levelOne: "levelOne", // temporary
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
          margin: [0, 0, p, 0],
          onClick: () => k.go(SCENES.healthCombat),
        },
        {
          text: "Effects",
          margin: [0, 0, p, 0],
          onClick: () => k.go(SCENES.fx),
        },
        {
          text: "Main Menu",
          margin: [0, 0, p, 0],
          onClick: () => k.go(SCENES.mainMenu),
        },
      ]
    );
    m.show();
  });

  k.scene(SCENES.mapGeneration, () => {
    drawBg();

    gameState.map = fillMap();

    k.addLevel(gameState.map, {
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      tiles: {
        "┌": () => [k.sprite(SPRITES.baseTopLeft), k.scale(3)],
        "│": () => [k.sprite(SPRITES.baseVertical), k.scale(3)],
        x: () => [k.sprite(SPRITES.baseVertical), k.scale(3)],
        o: () => [k.sprite(SPRITES.baseVertical), k.scale(3)],
        "└": () => [k.sprite(SPRITES.baseBottomLeft), k.scale(3)],
        "┐": () => [k.sprite(SPRITES.baseTopRight), k.scale(3)],
        "─": () => [k.sprite(SPRITES.baseHorizontal), k.scale(3)],
        "┘": () => [k.sprite(SPRITES.baseBottomRight), k.scale(3)],
        p: () => [k.sprite(SPRITES.path), k.scale(3), k.area(), "path"],
        // " ": () => [sprite(SPRITES.empty)],
      },
    });

    const startPositionTile = findStart() || [0, 0];
    const startPosition: [number, number] = [
      startPositionTile[0] * TILE_SIZE,
      startPositionTile[1] * TILE_SIZE,
    ];

    const sheep = createSheep(gameState, {
      name: `sheepish`,
      age: 10,
      pos: startPosition,
      initialState: SheepState.pathing,
      onDamage: () => {},
      onDeath: () => {
        sheep.destroy();
      },
    });
  });

  k.scene(SCENES.sheepConfig, () => {
    drawBg();

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
          age: 10,
          type: "standard",
          pos: [
            xStart + segmentWidth / 2 + getOffset(),
            yStart + segmentHeight / 2 + getOffset(),
          ],
          selectable: true,
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
    const levelSize = k.vec2(k.width() * 2, k.height() * 2);

    drawBg(levelSize);
    initCamera(levelSize);

    const damageSounds = [
      SOUNDS.sheepHurt1,
      SOUNDS.sheepHurt2,
      SOUNDS.sheepHurt3,
    ];

    // temporary: create a bunch of sheep in random positions
    const segmentWidth = levelSize.x / 5;
    const segmentHeight = levelSize.y / 5;
    const getOffset = () => k.rand(-50, 50);
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const xStart = x * segmentWidth;
        const yStart = y * segmentHeight;
        createSheep(gameState, {
          name: `sheep${x}${y}`,
          age: 10,
          type: k.choose(["standard", "bomber"]),
          pos: [
            xStart + segmentWidth / 2 + getOffset(),
            yStart + segmentHeight / 2 + getOffset(),
          ],
        });

        createSheep(gameState, {
          name: `2sheep${x}${y}`,
          age: 10,
          type: k.choose(["standard", "bomber"]),
          pos: [
            xStart + segmentWidth / 2 + getOffset() * 10,
            yStart + segmentHeight / 2 + getOffset() * 10,
          ],
        });
      }
    }

    k.onClick(() => {
      const pos = k.toWorld(k.mousePos());
      createDog(gameState, {
        name: "doggo-" + new Date().getTime().toString() + Math.random() * 100,
        pos: [pos.x, pos.y],
      });
    });
  });

  k.scene(SCENES.fx, () => {
    drawBg();
    k.onClick(() => {
      createExplosion(k.mousePos());
    });
  });

  k.scene(SCENES.mainMenu, () => {
    const btn = "px-4 py-1 text-5xl text-black-600 font-semibold bg-white";
    ui({
      id: "menu",
      class:
        "w-6/12 h-full flex flex-col justify-center items-center top-0 left-0",
      template: `
        <div>
          <h1 class="text-9xl font-bold mb-2">HERD</h2>
          <div class="flex flex-col space-y-2">
            <button id="play" class="${btn}">Play</button>
            <button id="options" class="${btn}">Options</button>
            <button id="quit" class="${btn}">Quit</button>
          </div>
        </div>
      `,
      onClick: {
        play: (e: MouseEvent) => {
          hideUI();
          k.go(SCENES.levelOne);
          k.canvas.focus();
        },
        options: (e: MouseEvent) => {
          console.log("Options clicked");
        },
        quit: (e: MouseEvent) => {
          console.log("Quit clicked");
        },
      },
    });

    k.add([
      k.sprite(SPRITES.grassTile, {
        width: k.width() / 2,
        height: k.height(),
        tiled: true,
      }),
      k.pos(k.width() / 2, 0),
      k.z(0),
    ]);
    createSheep(gameState, {
      name: "shep",
      age: 10,
      type: "standard",
      pos: [k.width() - k.width() / 4 - 100, k.height() / 2],
    });
  });

  k.scene(SCENES.levelOne, () => {
    const mapTileSize = 16;
    const mapScale = 3;

    gameState.map = [
      "                                                      ",
      "                                                      ",
      "┌───────────┐                            ┌───────────┐",
      "│    S      │                            │           │",
      "│           │                            │           │",
      "│ S         │                            │           │",
      "│           │                            │           │",
      "│       S   │                            │           │",
      "│           xppppppppppppppppppppppppppppo           │",
      "│  S        │                            │           │",
      "│           │                            │           │",
      "│      S    │            D               │           │",
      "│           │                            │           │",
      "│      S    │                            │           │",
      "│      S    │                            │           │",
      "└───────────┘                            └───────────┘",
      "                                                      ",
      "                                                      ",
    ];
    const mapWidth = gameState.map[0].length * mapTileSize * mapScale;
    const mapHeight = gameState.map.length * mapTileSize * mapScale;
    const levelSize = k.vec2(mapWidth, mapHeight);
    drawBg(levelSize);
    initCamera(levelSize);

    k.addLevel(gameState.map, {
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
      tiles: {
        "┌": () => [
          k.sprite(SPRITES.baseTopLeft),
          k.scale(mapScale),
          k.area(),
          k.body({ isStatic: true }),
          k.z(1),
        ],
        "│": () => [
          k.sprite(SPRITES.baseVertical),
          k.scale(mapScale),
          k.area(),
          k.body({ isStatic: true }),
          k.z(1),
        ],
        x: () => [
          k.sprite(SPRITES.baseVertical),
          k.scale(mapScale),
          k.area(),
          k.body(),
          k.z(1),
        ],
        o: () => [k.sprite(SPRITES.baseVertical), k.scale(mapScale), k.z(1)],
        "└": () => [
          k.sprite(SPRITES.baseBottomLeft),
          k.scale(mapScale),
          k.area(),
          k.body({ isStatic: true }),
          k.z(1),
        ],
        "┐": () => [
          k.sprite(SPRITES.baseTopRight),
          k.scale(mapScale),
          k.area(),
          k.body({ isStatic: true }),
          k.z(1),
        ],
        "─": () => [
          k.sprite(SPRITES.baseHorizontal),
          k.scale(mapScale),
          k.area(),
          k.body({ isStatic: true }),
          k.z(1),
        ],
        "┘": () => [
          k.sprite(SPRITES.baseBottomRight),
          k.scale(mapScale),
          k.area(),
          k.body({ isStatic: true }),
          k.z(1),
        ],
        p: () => [
          k.sprite(SPRITES.path),
          k.scale(mapScale),
          k.z(1),
          k.area(),
          "path",
        ],
      },
    });

    forEachChar(gameState.map, "S", mapTileSize * mapScale, ([x, y]) => {
      const maxHealth = Math.floor(k.rand(50, 200));
      const startingHealth = Math.round(k.rand(40, maxHealth));

      const sheep = createSheep(gameState, {
        name: getSheepName(),
        age: getSheepAge(),
        fact: getSheepFact(),
        type: "standard",
        initialState: SheepState.grazing,
        selectable: true,
        pos: [x, y],
        onDeath: () => {
          removeSheepName(sheep.name);
          sheep.destroy();
        },
        health: {
          maxHealth,
          startingHealth,
        },
        onClick: () => onSheepClick(sheep),
      });
    });

    forEachChar(gameState.map, "D", mapTileSize * mapScale, ([x, y]) => {
      createDog(gameState, {
        name: "doggo-" + new Date().getTime().toString() + Math.random() * 100,
        pos: [x, y],
      });
    });

    function onSheepClick(sheep: any) {
      if (sheep.getIsSelected() && gameState.sheepSelected.size === 1) {
        uiSelectedSheep.hide();
        return;
      }

      updateSheepUI(sheep);
      uiSelectedSheep.show();
      for (const s of gameState.sheepSelected) {
        const selectedSheep = gameState.sheep[s];
        if (!selectedSheep) continue;
        if (selectedSheep.name === sheep.name) continue;
        selectedSheep.toggleSelected();
        gameState.sheepSelected.delete(selectedSheep.name);
      }
    }

    const buttonRelease =
      "p-3 bg-red-600 hover:bg-red-700 text-white rounded transition-colors";
    const buttonSheepType =
      "p-3 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors";

    // const selectionUIId = "game-ui";
    // const _selectionUI = showUI(
    //   {
    //     class: "absolute right-0 top-0 w-2/12",
    //     template: `
    //       <div>
    //         <div class="flex flex-col space-y-5 py-5 mr-5">
    //           <button id="release" class="${buttonRelease}">Release</button>
    //           <button id="bomber" class="${buttonSheepType}">Bomber</button>
    //           <button id="shielder" class="${buttonSheepType}">Shielder</button>
    //           <button id="commando" class="${buttonSheepType}">Commando</button>
    //         </div>
    //       </div>
    //     `,
    //     onClick: {
    //       release: onSheepRelease,
    //       bomber: onSheepTypeClick("bomber"),
    //       shielder: onSheepTypeClick("shielder"),
    //       commando: onSheepTypeClick("commando"),
    //     },
    //   },
    //   selectionUIId
    // );

    const uiSelectedSheep = ui({
      id: "selected-sheep",
      visible: false,
      class: "absolute right-0 top-0 w-2/12 m-5",
      template: `
          <div class="bg-slate-700 h-full p-5 rounded" id="selected-sheep-container">
            <h1 id="sheep-name" class="text-3xl text-white font-black uppercase"></h1>
            <p id="sheep-age" class="text-sm font-thin text-white"></p>
            <p id="sheep-fact" class="text-white mt-5"></p>
            <div class="group mt-5">
                <label class="flex items-center">
                  ${icons.heart({
                    fill: colors.red400,
                    strokeColor: "none",
                    strokeWidth: "0",
                  })} <span class="ml-1 text-white"><span class="font-bold">Health</span> <span class="text-sm font-light">(<span id="sheep-health-current">100</span> / <span id="sheep-health-max">100</span>)</span></span>
                </label>
                <div class="h-4 w-full bg-red-200" id="sheep-health-container">
                  <div class="h-full bg-red-400"></div>
                </div>
            </div>
            <div class="mt-2">
                <label class="flex items-center">
                ${icons.bolt({
                  fill: colors.yellow400,
                  strokeColor: "none",
                  strokeWidth: "0",
                })} <span class="ml-1 text-white"><span class="font-bold">Speed</span> <span class="text-sm font-light">(<span id="sheep-speed">100</span>)</span></span>
                </label>
                <div class="h-4 w-full bg-yellow-400"></div>
            </div>
            <div class="mt-2">
                <label class="flex items-center">
                ${icons.rocketLaunch({
                  fill: colors.indigo400,
                  strokeColor: "none",
                  strokeWidth: "0",
                })} <span class="ml-1 text-white"><span class="font-bold">Bravery</span> <span class="text-sm font-light">(<span id="sheep-bravery">100</span>)</span></span>
                </label>
                <div class="h-4 w-full bg-indigo-400"></div>
            </div>
          </div>
        `,
      onClick: {},
    });

    function updateSheepUI(sheep: any) {
      "sheep-bravery";
      "sheep-speed";
      "sheep-health-current";
      "sheep-health-max";

      uiSelectedSheep.updateNode(
        "sheep-name",
        (e) => (e.innerHTML = sheep.name)
      );
      uiSelectedSheep.updateNode(
        "sheep-age",
        (e) => (e.innerHTML = `${sheep.age} years old`)
      );
      uiSelectedSheep.updateNode(
        "sheep-fact",
        (e) => (e.innerHTML = sheep.fact)
      );

      const healthCurrent = sheep.getHealth();
      const healthMax = sheep.getMaxHealth();
      uiSelectedSheep.updateNode(
        "sheep-health-current",
        (e) => (e.innerHTML = healthCurrent)
      );
      uiSelectedSheep.updateNode(
        "sheep-health-max",
        (e) => (e.innerHTML = healthMax)
      );

      const healthPercentage = healthCurrent / healthMax;
      const healthContainer = uiSelectedSheep.element.querySelector(
        "#sheep-health-container"
      );
      if (!healthContainer) throw new Error("Couldn't find container");

      console.log("healthContainer.clientWidth", healthContainer.clientWidth);

      const healthBar = healthContainer.querySelector("div")!;
      if (!healthContainer) throw new Error("Couldn't find bar");

      const healthWidth = healthContainer.clientWidth * healthPercentage;
      healthBar.style.width = `${healthWidth}px`;
    }

    function onSheepTypeClick(type: "bomber" | "shielder" | "commando") {
      return () => {
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

        k.canvas.focus();
      };
    }

    function onSheepRelease() {
      for (const sheepName of gameState.sheepSelected) {
        const sheep = gameState.sheep[sheepName];
        if (!sheep) continue;
        sheep.startPathing();
        sheep.toggleSelected();
      }

      k.canvas.focus();
    }

    // testing
    // const s = Object.values(gameState.sheep)[0];
    // onSheepClick(s);
    // s.toggleSelected();
  });

  k.go(SCENES.levelOne);
}
