kaboom();

// load sprites
loadSprite("sheep", "sprites/lolsheep.jpg");

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
  setTimeout(() => alert("I'm the map!"));
});

scene(SCENES.sheepConfig, () => {
  burp();
  add([sprite("sheep")]);
  setTimeout(() => alert("baaaa"));
});

go(SCENES.menu);
