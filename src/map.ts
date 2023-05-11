const X = 0;
const Y = 1;
let map: string[] = [];

function findStart(m = map): [number, number] | undefined {
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (m[y][x] === "x") {
        return [x, y];
      }
    }
  }
  return undefined;
}

export function forEachChar(
  map: string[],
  char: string,
  tileSize: number,
  cb: (pos: [number, number]) => void
) {
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] === char) {
        cb([x * tileSize, y * tileSize]);
      }
    }
  }
}

function fillMap(): string[] {
  map = [
    "┌─┐                       ",
    "│ xpppppppppppp           ",
    "└─┘           p           ",
    "              p           ",
    "         pppppp           ",
    "         p                ",
    "         pppppppppppppp   ",
    "                      p   ",
    "                      p   ",
    "                 pppppp   ",
    "                 p        ",
    "            pppppp        ",
    "            p          ┌─┐",
    "            pppppppppppo │",
    "                       └─┘",
  ];
  // const start = findStart();

  // let curr = start;

  // if (curr === undefined) {
  //   console.error("no start found");
  //   return map;
  // }

  // while (map[curr[Y]][curr[X]] !== "o") {
  //   try {
  //     curr = nextPath(curr);
  //   } catch (e) {
  //     console.error(e);
  //     console.log("failed attempt");
  //     console.log(map);
  //     fillMap();
  //     break;
  //   }
  // }

  return map;
}

class MapTraverser {
  private visited = new Set<string>();
  private validCharacters = ["p", "o"];
  public moves: ("left" | "right" | "down")[] = [];

  constructor(private map: string[]) {
    this.map = map;
  }

  private isValidTraverseMove(x: number, y: number) {
    return (
      this.validCharacters.includes(this.map[y][x]) &&
      !this.visited.has(JSON.stringify([x, y]))
    );
  }

  private traverseMap(currNode: [number, number]): [number, number][] {
    if (this.map[currNode[Y]][currNode[X]] === "o") {
      return [currNode];
    }

    // right
    if (this.isValidTraverseMove(currNode[X] + 1, currNode[Y])) {
      this.visited.add(JSON.stringify([currNode[X] + 1, currNode[Y]]));
      this.moves.push("right");
      return [currNode, ...this.traverseMap([currNode[X] + 1, currNode[Y]])];
    }

    // left
    if (this.isValidTraverseMove(currNode[X] - 1, currNode[Y])) {
      this.visited.add(JSON.stringify([currNode[X] - 1, currNode[Y]]));
      this.moves.push("left");
      return [currNode, ...this.traverseMap([currNode[X] - 1, currNode[Y]])];
    }

    // down
    this.visited.add(JSON.stringify([currNode[X], currNode[Y] + 1]));
    this.moves.push("down");
    return [currNode, ...this.traverseMap([currNode[X], currNode[Y] + 1])];
  }

  private findStart(): [number, number] | undefined {
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < this.map[y].length; x++) {
        if (this.map[y][x] === "x") {
          return [x, y];
        }
      }
    }
    return undefined;
  }

  public updateMap(map: string[]) {
    this.map = map;
  }

  public traverse() {
    const start = this.findStart();
    if (start === undefined) {
      throw new Error("no start found");
    }
    this.traverseMap(start);
    let prev = "right";
    this.moves = this.moves.filter((move) => {
      if (move === prev) {
        return false;
      }
      prev = move;
      return true;
    });
  }
}

export { fillMap, findStart, MapTraverser };
export default { fillMap, findStart, MapTraverser };
