//TODO: Typescript refactor and entity class.
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const GamePhase = Object.freeze({"SELECT_LANE": 0,"MOVE_LANE": 1,"MOVE_PLAYER": 2});
const LaneAxis = Object.freeze({"VERTICAL": 0,"HORIZONTAL": 1});
const Direction = Object.freeze({"UP": 0,"RIGHT": 1,"DOWN": 2,"LEFT": 3});
const TileType = Object.freeze({"STRAIGHT": 0,"CORNER": 1,"TJUNCTION": 2});

class Treasure {
  constructor(scene, id, x, y, offset) {
    this.x = x;
    this.y = y;
    this.id = id;
    
    let geometry = new THREE.CircleGeometry(0.15, 8);
    let material = new THREE.MeshBasicMaterial({color: 0x000000});
    this.mesh =  new THREE.Mesh(geometry, material);
    this.mesh.position.setX(x * offset);
    this.mesh.position.setY(0.01);
    this.mesh.position.setZ(y * offset);
    this.mesh.rotateX(-Math.PI / 2);
    scene.add(this.mesh);
  }

  move(x, y, offset) {
    this.x = x;
    this.y = y;
    this.mesh.position.setX(x * offset);
    this.mesh.position.setZ(y * offset);
  }
}

class Pawn {
  constructor(scene, x, y, offset, color) {
    this.x = x;
    this.y = y;
    
    this.currentTreasure = undefined;
    this.remainingTreasures = [];
    this.hasMoved = false;
    
    let geometry = new THREE.CapsuleGeometry(0.25, 0.5, 1, 4);
    let material = new THREE.MeshBasicMaterial({color: color});
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.set(x * offset, geometry.parameters.length, y * offset);
    scene.add(this.mesh);
  }

  move(x, y, offset) {
    this.x = x;
    this.y = y;
    this.mesh.position.setX(x * offset);
    this.mesh.position.setZ(y * offset);
  }
}

class Tile {
  constructor(x, y, offset) {
    this.x = x;
    this.y = y;
    
    let geometry = new THREE.BoxGeometry(1, 0, 1);
    this.mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    this.mesh.position.set(x * offset, 0, y * offset);
    
    this.type = undefined;
    this.treasureId = undefined;
    this.directions = [];
  }

  move(x, y, offset, treasures) {
    this.x = x;
    this.y = y;
    this.mesh.position.setX(x * offset);
    this.mesh.position.setZ(y * offset);
    
    if (this.treasureId != undefined) {
      for (let treasure of treasures) {
        if (treasure.id == this.treasureId) {
          treasure.move(x, y, offset);
        }
      }
    }
  }

  rotateCounterClockwise(n = 1) {
    for (let i = 0; i < n; ++i) {
      for (let j = 0; j < this.directions.length; ++j) {
        this.directions[j]--;
        if (this.directions[j] < Direction.UP) {
          this.directions[j] = Direction.LEFT;
        }
      }
      this.mesh.geometry.rotateY(Math.PI / 2);
    }
  }

  rotateClockwise(n = 1) {
    for (let i = 0; i < n; ++i) {
      for (let j = 0; j < this.directions.length; ++j) {
        this.directions[j]++;
        if (this.directions[j] > Direction.LEFT) {
          this.directions[j] = Direction.UP;
        }
      }
      this.mesh.geometry.rotateY(-Math.PI / 2);
    }
  }

  setDefaultDirections(type) {    
    switch (type) {
      case TileType.STRAIGHT: {
        this.directions.push(Direction.UP);
        this.directions.push(Direction.DOWN);        
      } break;

      case TileType.CORNER: {
        this.directions.push(Direction.RIGHT);
        this.directions.push(Direction.DOWN);
      } break;

      case TileType.TJUNCTION: {
        this.directions.push(Direction.LEFT);
        this.directions.push(Direction.DOWN);
        this.directions.push(Direction.RIGHT);
      } break;
    }
  }
  
  setRandomType() {
    this.type = Math.round(Math.random() * TileType.TJUNCTION);
    this.setDefaultDirections(this.type);
  }

  updateTexture() {
    switch (this.type) {
      case TileType.STRAIGHT:
        this.mesh.material.map = new THREE.TextureLoader().load("data/straight.jpg");
        break;

      case TileType.CORNER:
        this.mesh.material.map = new THREE.TextureLoader().load("data/corner.jpg");
        break;

      case TileType.TJUNCTION:
        this.mesh.material.map = new THREE.TextureLoader().load("data/tjunction.jpg");
        break;
    }
  }

  rotateRandomly() {
    switch (this.type) {
      case TileType.STRAIGHT: {        
        if (Math.round(Math.random()) == 1) {
          this.rotateClockwise();
        }
      } break;

      case TileType.CORNER: {
        let shuffle = Math.round(Math.random() * 4);
        for (let i = 0; i < shuffle; ++i) {
          if (Math.round(Math.random()) == 1) {
            this.rotateClockwise();
          } else {
            this.rotateCounterClockwise();
          }
        }
      } break;

      case TileType.TJUNCTION: {
        let shuffle = Math.round(Math.random() * 4);
        for (let i = 0; i < shuffle; ++i) {
          if (Math.round(Math.random()) == 1) {
            this.rotateClockwise();
          } else {
            this.rotateCounterClockwise();
          }
        }
      } break;
    }
  }
}

function shuffle(arr) {
  let i = arr.length, j;
  while (i--) {
    j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

class Labyrinth {

  constructor(scene, dimension, tileOffset = 1) {
    if (dimension % 2 == 0 && dimension > 7) {
      alert("The dimension should be odd and superior to 7!");
      return;
    }

    this.selectionAxis = LaneAxis.HORIZONTAL;
    this.laneEntryPoint = Direction.LEFT;

    this.selectedLaneX = -1;
    this.selectedLaneY = 1;

    this.dimension = dimension;
    this.tileOffset = tileOffset;

    this.tiles = [];
    this.selectedTiles = [];
    this.pathFoundTiles = [];

    this.maxDim = this.dimension - 1;
    this.hDim = this.maxDim / 2;

    // Build the labyrinth
    for (let x = 0; x < dimension; ++x) {
      this.tiles.push([]);
      for (let y = 0; y < dimension; ++y) {
        this.tiles[x].push(new Tile(x, y, this.tileOffset));
        scene.add(this.tiles[x][y].mesh);
      }
    }

    // Set spawn tile
    this.tiles[0][0].type = TileType.CORNER;
    this.tiles[0][0].directions = [Direction.RIGHT, Direction.DOWN];
    this.tiles[0][0].updateTexture();

    this.tiles[0][this.maxDim].type = TileType.CORNER;
    this.tiles[0][this.maxDim].updateTexture();
    this.tiles[0][this.maxDim].directions = [Direction.RIGHT, Direction.DOWN];
    this.tiles[0][this.maxDim].rotateCounterClockwise();

    this.tiles[this.maxDim][0].type = TileType.CORNER;
    this.tiles[this.maxDim][0].updateTexture();
    this.tiles[this.maxDim][0].directions = [Direction.RIGHT, Direction.DOWN];
    this.tiles[this.maxDim][0].rotateClockwise();

    this.tiles[this.maxDim][this.maxDim].type = TileType.CORNER;
    this.tiles[this.maxDim][this.maxDim].updateTexture();
    this.tiles[this.maxDim][this.maxDim].directions = [Direction.RIGHT, Direction.DOWN];
    this.tiles[this.maxDim][this.maxDim].rotateClockwise();
    this.tiles[this.maxDim][this.maxDim].rotateClockwise();

    // Create outer tile
    let outerTile = new Tile(-1, dimension, this.tileOffset);
    outerTile.setRandomType();
    outerTile.updateTexture();
    outerTile.rotateRandomly();
    this.tiles.push(outerTile);
    scene.add(outerTile.mesh);

    // Create pawns
    this.pawns = [];
    this.pawns.push(new Pawn(scene, 0, 0, this.tileOffset, "red"));
    this.pawns.push(new Pawn(scene, this.maxDim, 0, this.tileOffset, "green"));
    this.pawns.push(new Pawn(scene, this.maxDim, this.maxDim, this.tileOffset, "orange"));
    this.pawns.push(new Pawn(scene, 0, this.maxDim, this.tileOffset, "blue"));

    // Create treasures (fixed and random ones)
    this.treasures = [];
    this.totalTreasures = Math.floor(24 * this.dimension / 7);
    
    // Assign fixed treasures and apply the right rotation to their T-junctions
    let treasureId = 0;
    let everyTreasuresCoords = [];
    let availableTreasureRandomSlots = [];
    for (let x = 0; x < this.dimension; x++) {
      for (let y = 0; y < this.dimension; y++) {
        if ((x != 0 && x != this.maxDim) || (y != 0 && y != this.maxDim)) {
          if (x % 2 == 0 && y % 2 == 0) {
            this.tiles[x][y].type = TileType.TJUNCTION;
            this.tiles[x][y].setDefaultDirections(TileType.TJUNCTION);
            this.tiles[x][y].updateTexture();
            everyTreasuresCoords.push({x: x, y: y});

            if (y == 0) { continue; }
            if (x == 0) { this.tiles[x][y].rotateCounterClockwise(); continue; }
            if (y == this.maxDim) { this.tiles[x][y].rotateClockwise(2); continue; }
            if (x == this.maxDim) { this.tiles[x][y].rotateClockwise(); continue; }
            if (x < this.hDim && y < this.hDim) { this.tiles[x][y].rotateCounterClockwise(); continue; }
            if (x < this.hDim && y > this.hDim) { this.tiles[x][y].rotateClockwise(2); continue; }
            if (x > this.hDim && y > this.hDim) { this.tiles[x][y].rotateClockwise(); continue; }
          } 
          else {
            availableTreasureRandomSlots.push({x: x, y: y});
          }
        }
      }
    }

    // Randomized treasures
    let randomTreasures = shuffle(availableTreasureRandomSlots)
                        .slice(0, this.totalTreasures / 2);
    
    for (let t of randomTreasures) everyTreasuresCoords.push({x: t.x, y: t.y});
        
    const treasuresPerPawn = Math.round(this.totalTreasures / this.pawns.length);
    for (let i = 0; i < this.pawns.length; ++i) {
      let pawnTreasures = shuffle(everyTreasuresCoords).splice(0, treasuresPerPawn);
      for (let j = 0; j < pawnTreasures.length; ++j) {
        this.treasures.push(new Treasure(scene, treasureId, pawnTreasures[j].x, pawnTreasures[j].y, this.tileOffset));        
        this.pawns[i].remainingTreasures.push(treasureId);
        this.tiles[pawnTreasures[j].x][pawnTreasures[j].y].treasureId = treasureId;
        treasureId++;
      }
      this.pawns[i].currentTreasure = i * treasuresPerPawn;
    }

    //DEBUG: Colored treasures same as their pawn
    for (let i = 0; i < this.pawns.length; ++i) {
      for (let j = 0; j < this.pawns[i].remainingTreasures.length; ++j) {
        this.treasures[this.pawns[i].remainingTreasures[j]].mesh.material.color = this.pawns[i].mesh.material.color;
      }
      this.treasures[this.pawns[i].currentTreasure].mesh.material.wireframe = true;
    }

    // Generate tiles type and direction randomly proportionally to the og game
    let tilesType = [];
    let quotaRandomTilesType = {
      [TileType.STRAIGHT]: Math.round(this.dimension * this.dimension / 28 * this.dimension),
      [TileType.CORNER]: Math.round(this.dimension * this.dimension / 21 * this.dimension),
      [TileType.TJUNCTION]: Math.round(this.dimension * this.dimension / 57  * this.dimension)
    };
    quotaRandomTilesType[outerTile.type]--;
    
    function fillTilesType(type) {
      for (let i = 0; i < quotaRandomTilesType[type]; ++i) tilesType.push(type);
    }
    fillTilesType(TileType.STRAIGHT);
    fillTilesType(TileType.CORNER);
    fillTilesType(TileType.TJUNCTION);
    tilesType = shuffle(tilesType);

    let n = 0;
    for (let x = 0; x < this.dimension; x++) {
      for (let y = 0; y < this.dimension; y++) {
        if (this.tiles[x][y].type == undefined) {
          this.tiles[x][y].type = tilesType[n];
          this.tiles[x][y].setDefaultDirections(tilesType[n]);
          this.tiles[x][y].updateTexture();
          this.tiles[x][y].rotateRandomly();
          n++;
        }
      }
    }
  }

  selectLane(axis) {
    this.selectedTiles = [];
    this.selectionAxis = axis;
    if (axis === LaneAxis.HORIZONTAL) {
      this.laneEntryPoint = Direction.LEFT;
      for (let x = 0; x < this.dimension; ++x) {
        this.selectedTiles.push(this.tiles[x][this.selectedLaneY]);
      }
    }
    else if (axis === LaneAxis.VERTICAL) {
      this.laneEntryPoint = Direction.TOP;
      for (let y = 0; y < this.dimension; ++y) {
        this.selectedTiles.push(this.tiles[this.selectedLaneX][y]);
      }
    }
  }

  rotateOuterTile() {
    this.tiles[this.dimension].rotateClockwise();
  }

  moveOuterTile(x , y) {
    this.tiles[this.dimension].move(x, y, this.tileOffset, this.treasures);
  }

  moveOuterTileToEntryPoint() {
    switch (this.laneEntryPoint) {
      case Direction.UP: this.moveOuterTile(this.selectedLaneX, -1); break;
      case Direction.DOWN: this.moveOuterTile(this.selectedLaneX, this.dimension); break;
      case Direction.LEFT: this.moveOuterTile(-1, this.selectedLaneY); break;
      case Direction.RIGHT: this.moveOuterTile(this.dimension, this.selectedLaneY); break;
    }
  }

  moveTiles(fromX, fromY, toX, toY) {
    this.tiles[fromX][fromY].move(toX, toY, this.tileOffset, this.treasures);
    
    for (let pawn of this.pawns) {
      if (pawn.hasMoved == false && pawn.x === fromX && pawn.y === fromY) {
        switch (this.laneEntryPoint) {
          case Direction.UP: {
            let delta = pawn.y + 1;
            if (delta < this.dimension) pawn.move(pawn.x, delta, this.tileOffset);
            else pawn.move(pawn.x, 0, this.tileOffset);
          } break;

          case Direction.DOWN: {
            let delta = pawn.y - 1;
            if (delta > -1) pawn.move(pawn.x, delta, this.tileOffset);
            else pawn.move(pawn.x, this.maxDim, this.tileOffset);
          } break;

          case Direction.LEFT: {
            let delta = pawn.x + 1;
            if (delta < this.dimension) pawn.move(delta, pawn.y, this.tileOffset);
            else pawn.move(0, pawn.y, this.tileOffset);
          } break;

          case Direction.RIGHT: {
            let delta = pawn.x - 1;
            if (delta > -1) pawn.move(delta, pawn.y, this.tileOffset);
            else pawn.move(this.maxDim, pawn.y, this.tileOffset);
          } break;
        }
        pawn.hasMoved = true;
      }
    }
  }

  moveLane() {
    switch (this.laneEntryPoint) {
      case Direction.UP: {
        this.moveOuterTile(this.selectedLaneX, 0);
        for (let i = 0; i < this.dimension; i++) {
          this.moveTiles(this.selectedLaneX, i, this.selectedLaneX, i + 1); 
          [this.tiles[this.selectedLaneX][0],this.tiles[this.selectedLaneX][i]]=
          [this.tiles[this.selectedLaneX][i],this.tiles[this.selectedLaneX][0]];
        }
        [this.tiles[this.dimension],this.tiles[this.selectedLaneX][0]]=
        [this.tiles[this.selectedLaneX][0],this.tiles[this.dimension]];
      } break;

      case Direction.DOWN: {
        this.moveOuterTile(this.selectedLaneX, this.maxDim);
        for (let i = this.maxDim; i >= 0; i--) {
          this.moveTiles(this.selectedLaneX, i, this.selectedLaneX, i - 1);
          [this.tiles[this.selectedLaneX][this.maxDim],this.tiles[this.selectedLaneX][i]]=
          [this.tiles[this.selectedLaneX][i],this.tiles[this.selectedLaneX][this.maxDim]];
        }
        [this.tiles[this.dimension],this.tiles[this.selectedLaneX][this.maxDim]]=
        [this.tiles[this.selectedLaneX][this.maxDim],this.tiles[this.dimension]];
        this.moveOuterTile(this.selectedLaneX, -1);
      } break;

      case Direction.LEFT: {
        this.moveOuterTile(0, this.selectedLaneY);
        for (let i = 0; i < this.dimension; i++) {
          this.moveTiles(i, this.selectedLaneY, i + 1, this.selectedLaneY);
          [this.tiles[0][this.selectedLaneY],this.tiles[i][this.selectedLaneY]]=
          [this.tiles[i][this.selectedLaneY],this.tiles[0][this.selectedLaneY]];
        }
        [this.tiles[this.dimension],this.tiles[0][this.selectedLaneY]]=
        [this.tiles[0][this.selectedLaneY],this.tiles[this.dimension]];
      } break;

      case Direction.RIGHT: {
        this.moveOuterTile(this.maxDim, this.selectedLaneY);
        for (let i = this.maxDim; i >= 0; i--) {
          this.moveTiles(i, this.selectedLaneY, i - 1, this.selectedLaneY);
          [this.tiles[this.maxDim][this.selectedLaneY],this.tiles[i][this.selectedLaneY]]=
          [this.tiles[i][this.selectedLaneY],this.tiles[this.maxDim][this.selectedLaneY]];
        }
        [this.tiles[this.dimension],this.tiles[this.maxDim][this.selectedLaneY]]=
        [this.tiles[this.maxDim][this.selectedLaneY],this.tiles[this.dimension]];
        this.moveOuterTile(-1, this.selectedLaneY);
      } break;
    }
    for (let pawn of this.pawns) pawn.hasMoved = false;
  }
  
  playerPathFinding(root, entry) {
    if (this.pathFoundTiles.includes(root)) return;
    
    const newSize = this.pathFoundTiles.push(root);
    let last = this.pathFoundTiles[newSize - 1];
    
    for (let direction of last.directions) {
      if (entry === direction) continue;
      
      switch (direction) {
        case Direction.LEFT: {
          const prevRow =  last.x - 1;
          if (prevRow >= 0) {
            let neighbour = this.tiles[prevRow][last.y];
            if (neighbour.directions.includes(Direction.RIGHT)) {
              this.playerPathFinding(neighbour, Direction.RIGHT);
            }
          }
        } break;
          
        case Direction.RIGHT: {
          const nextRow =  last.x + 1;
          if (nextRow <= this.maxDim) {
            let neighbour = this.tiles[nextRow][last.y];
            if (neighbour.directions.includes(Direction.LEFT)) {
              this.playerPathFinding(neighbour, Direction.LEFT);
            }
          }
        } break;

        case Direction.UP: {
          const prevCol =  last.y - 1;
          if (prevCol >= 0) {
            let neighbour = this.tiles[last.x][prevCol];
            if (neighbour.directions.includes(Direction.DOWN)) {
              this.playerPathFinding(neighbour, Direction.DOWN);
            }
          }
        } break;
          
        case Direction.DOWN: {
          const nextCol =  last.y + 1;
          if (nextCol <= this.maxDim) {
            let neighbour = this.tiles[last.x][nextCol];
            if (neighbour.directions.includes(Direction.UP)) {
              this.playerPathFinding(neighbour, Direction.UP);
            }
          }
        } break;
      }
    }
  }

  checkPlayerTreasures(currentPawn) {
    let seeked = this.treasures[this.pawns[currentPawn].currentTreasure];
    if (seeked.x == this.pawns[currentPawn].x && 
        seeked.y == this.pawns[currentPawn].y)
    {
      this.pawns[currentPawn].remainingTreasures.shift();
      if (this.pawns[currentPawn].remainingTreasures.length > 0) {
        seeked.mesh.material.wireframe = false;      
        this.pawns[currentPawn].currentTreasure = this.pawns[currentPawn].remainingTreasures[0];
        this.treasures[this.pawns[currentPawn].currentTreasure].mesh.material.wireframe = true;
      } else {
        alert(`Game over ! Player ${currentPawn} wins !`);
      }
    }
  }
}

class OrbitCamera {
  constructor(target, aspect, labyrinth, renderer) {
    this.perspective = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    this.controller = new OrbitControls(this.perspective, renderer.domElement);

    this.controller.enablePan = false;
    this.controller.target = new THREE.Vector3(target, 0, target);
    this.controller.rotateSpeed = 0.5;
    this.controller.maxPolarAngle = 1;
    this.controller.minDistance = labyrinth.dimension;
    this.controller.maxDistance = labyrinth.dimension * labyrinth.tileOffset + 1;

    this.perspective.position.x = this.controller.target.x;
    this.perspective.position.y = labyrinth.dimension;
    this.perspective.position.z = labyrinth.dimension + 4;

    this.controller.update(0);
  }
}

class Game {
  constructor() {
    this.scene = new THREE.Scene();
    this.raycaster = new THREE.Raycaster();
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.labyrinth = new Labyrinth(this.scene, 7);

    const target = (this.labyrinth.dimension - 1) / 2 * this.labyrinth.tileOffset;
    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new OrbitCamera(target, aspect, this.labyrinth, this.renderer);

    this.currentPawn = 0;
    this.labyrinth.pawns[this.currentPawn].mesh.material.wireframe = true;
    this.phase = GamePhase.SELECT_LANE;
  }
  
  getPlayerTile() {
    return this.labyrinth.tiles
      [this.labyrinth.pawns[this.currentPawn].x]
      [this.labyrinth.pawns[this.currentPawn].y];
  }
  
  nextRound() {
    this.labyrinth.checkPlayerTreasures(this.currentPawn);
    this.labyrinth.pathFoundTiles = [];
    this.labyrinth.pawns[this.currentPawn].mesh.material.wireframe = false;
    this.currentPawn++;
    if (this.currentPawn > 3) this.currentPawn = 0;
    this.labyrinth.pawns[this.currentPawn].mesh.material.wireframe = true;
    this.phase = GamePhase.SELECT_LANE;  
  }

  render() {
    this.renderer.render(this.scene, this.camera.perspective);
  }
}

export { Game, GamePhase, LaneAxis, Direction };
