import {GamePhase, LaneAxis, Direction } from "./objects.js";

export function selectLaneFromKeyboard(event, game) {
  switch (event.key) {    
    case " ":
    case "r": {
      game.labyrinth.rotateOuterTile();
    } break;
      
    case "ArrowUp": {
      if (game.labyrinth.selectedLaneY - 2 > 0) {
        game.labyrinth.selectedLaneY -= 2;
      }
      else {
        game.labyrinth.selectedLaneY = game.labyrinth.dimension - 2;
      }
      game.labyrinth.selectLane(LaneAxis.HORIZONTAL);
      game.labyrinth.moveOuterTile(-1, game.labyrinth.selectedLaneY);
    } break;

    case "ArrowDown": {
      if (game.labyrinth.selectedLaneY + 2 < game.labyrinth.dimension) {
        game.labyrinth.selectedLaneY += 2;
      }
      else {
        game.labyrinth.selectedLaneY = 1;
      }
      game.labyrinth.selectLane(LaneAxis.HORIZONTAL);
      game.labyrinth.moveOuterTile(-1, game.labyrinth.selectedLaneY);
    } break;

    case "ArrowLeft": {
      if (game.labyrinth.selectedLaneX - 2 > 0) {
        game.labyrinth.selectedLaneX -= 2;
      }
      else {
        game.labyrinth.selectedLaneX = game.labyrinth.dimension - 2;
      }
      game.labyrinth.selectLane(LaneAxis.VERTICAL);
      game.labyrinth.moveOuterTile(game.labyrinth.selectedLaneX, -1);
    } break;

    case "ArrowRight": {
      if (game.labyrinth.selectedLaneX + 2 < game.labyrinth.dimension) {
        game.labyrinth.selectedLaneX += 2;
      }
      else {
        game.labyrinth.selectedLaneX = 1;
      }
      game.labyrinth.selectLane(LaneAxis.VERTICAL);
      game.labyrinth.moveOuterTile(game.labyrinth.selectedLaneX, -1);
    } break;

    case "Enter": {
      if (game.labyrinth.selectionAxis == LaneAxis.VERTICAL &&
          game.labyrinth.laneEntryPoint != Direction.UP  &&
          game.labyrinth.laneEntryPoint != Direction.DOWN) 
      {
        game.labyrinth.laneEntryPoint = Direction.UP
      }
      else if (game.labyrinth.selectionAxis == LaneAxis.HORIZONTAL &&
               game.labyrinth.laneEntryPoint != Direction.LEFT  &&
               game.labyrinth.laneEntryPoint != Direction.RIGHT)
      {
        game.labyrinth.laneEntryPoint = Direction.LEFT
      }
      game.labyrinth.moveOuterTileToEntryPoint();

      game.phase = GamePhase.MOVE_LANE;
    } break;
  }
}

export function moveLaneFromKeyboard(event, game) {
  switch (event.key) {
    case " ":
    case "r": {
      game.labyrinth.rotateOuterTile();
    } break;
    
    case "Escape": {
      game.phase = GamePhase.SELECT_LANE;
    } break;

    case "ArrowLeft": {
      if (game.labyrinth.selectionAxis == LaneAxis.HORIZONTAL) {
        game.labyrinth.laneEntryPoint = Direction.LEFT;
        game.labyrinth.moveOuterTileToEntryPoint();
      }
    } break;

    case "ArrowRight": {
      if (game.labyrinth.selectionAxis == LaneAxis.HORIZONTAL) {
        game.labyrinth.laneEntryPoint = Direction.RIGHT;
        game.labyrinth.moveOuterTileToEntryPoint();
      }
    } break;

    case "ArrowUp": {
      if (game.labyrinth.selectionAxis == LaneAxis.VERTICAL) {
        game.labyrinth.laneEntryPoint = Direction.UP;
        game.labyrinth.moveOuterTileToEntryPoint();
      }
    } break;

    case "ArrowDown": {
      if (game.labyrinth.selectionAxis == LaneAxis.VERTICAL) {
        game.labyrinth.laneEntryPoint = Direction.DOWN;
        game.labyrinth.moveOuterTileToEntryPoint();
      }
    } break;

    case "Enter": {
      game.phase = GamePhase.MOVE_PLAYER;
      game.labyrinth.moveLane();
      let curPlayerTile = game.labyrinth.getPlayerTile(game.curPlayerTurn);
      game.labyrinth.playerPathFinding(curPlayerTile);
      if (game.labyrinth.pathFoundTiles.length == 1) game.nextRound();
    } break;
  }
}
