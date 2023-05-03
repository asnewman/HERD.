const X = 0;
const Y = 1;
let map: string[] = [];

function nextPath(currentPos: [number, number]) {
  let newPos;
  const bounds = [map[0].length, map.length];

  function isMoveValid(x: number, y: number) {
    const validCharacters = [" ", "o"];
    return validCharacters.includes(map[y][x]);
  }

  const moveRight =
    currentPos[X] + 1 < bounds[X] &&
    isMoveValid(currentPos[X] + 1, currentPos[Y])
      ? () => {
          newPos = [currentPos[X] + 1, currentPos[Y]];
        }
      : false;
  const moveLeft =
    currentPos[X] - 1 >= 0 && isMoveValid(currentPos[X] - 1, currentPos[Y])
      ? () => {
          newPos = [currentPos[X] - 1, currentPos[Y]];
        }
      : false;
  const moveDown =
    currentPos[Y] + 1 < bounds[Y] &&
    isMoveValid(currentPos[X], currentPos[Y] + 1)
      ? () => {
          newPos = [currentPos[X], currentPos[Y] + 1];
        }
      : false;

  let options = [moveRight, moveLeft, moveDown];

  if (map[currentPos[Y]].includes("o")) {
    options = [moveRight];
  }

  const validOptions = options.filter((o) => Boolean(o)) as (() => void)[];

  if (validOptions.length === 0) {
    throw new Error("stuck!");
  }

  const randOptionIdx = Math.floor(Math.random() * validOptions.length);
  validOptions[randOptionIdx]();

  if (!newPos) {
    throw new Error("no new position");
  }

  if (map[currentPos[Y]][currentPos[X] + 1] !== "o") {
    let rowArray = map[newPos[Y]].split(""); // convert string to array
    rowArray[newPos[X]] = "p"; // replace character at index
    map[newPos[Y]] = rowArray.join(""); // convert array back to string
  }

  return newPos;
}

function findStart(): [number, number] | undefined {
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === "x") {
        return [x, y];
      }
    }
  }
  return undefined;
}

function fillMap(): string[] {
  map = [
    "┌─┐          ",
    "│ x          ",
    "└─┘          ",
    "             ",
    "             ",
    "             ",
    "             ",
    "             ",
    "             ",
    "          ┌─┐",
    "          o │",
    "          └─┘",
  ];
  const start = findStart();

  let curr = start;

  if (curr === undefined) {
    console.error("no start found");
    return map;
  }

  while (map[curr[Y]][curr[X]] !== "o") {
    try {
      curr = nextPath(curr);
    } catch (e) {
      console.error(e);
      console.log("failed attempt");
      console.log(map);
      fillMap();
      break;
    }
  }

  return map;
}

export { fillMap };
