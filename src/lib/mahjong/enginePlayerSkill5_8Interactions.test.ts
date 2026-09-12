import { describe, expect, it, vi } from "vitest";
import {
  createInitialGameState,
  drawTile
} from "./engine";
import type { Tile, TileSuit } from "./types";
import type { EnemyId } from "../akuukan/types";

let serial = 0;

function tile(suit: TileSuit, rank: number): Tile {
  return {
    id: `haitei-interaction-${serial++}`,
    suit,
    rank,
    red: false
  };
}

function prepare(enemyId: EnemyId = "enemy-12") {
  const state = createInitialGameState(() => 0.5, {
    enemyId,
    equippedSkills: [{ id: "5-8", level: 5 }]
  });

  state.round.phase = "drawing";
  state.round.currentSeat = 0;
  state.round.liveWall = [tile("pin", 9)];
  state.round.deadWall = Array.from(
    { length: 14 },
    () => tile("honor", 7)
  );
  state.round.deadWall[0] = tile("man", 3);
  state.round.doraIndicatorCount = 1;
  state.round.rinshanDrawCount = 0;
  state.playerMp = 0;

  state.round.players[0] = {
    ...state.round.players[0],
    hand: [
      ...[1, 2].map(rank => tile("man", rank)),
      ...[2, 3, 4, 5, 5].map(rank => tile("pin", rank)),
      ...[2, 3, 4, 6, 7, 8].map(rank => tile("sou", rank))
    ],
    melds: [],
    riichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null,
    discards: [{
      tile: tile("man", 3),
      tsumogiri: false,
      riichiDeclaration: false,
      faceDown: false,
      called: false
    }]
  };

  return state;
}

describe("5-8 海底抽選と予約牌・敵能力", () => {
  it("予約牌があれば通常山と王牌を動かさず、海底抽選とMP加算を行わない", () => {
    const state = prepare("enemy-1");
    const reserved = tile("man", 3);

    state.akuukan = {
      ...state.akuukan!,
      playerSkill3_13Transfer: {
        targetPlayerId: state.round.players[0].id,
        remainingCollectionTurns: 0,
        reservedTiles: [reserved]
      }
    };

    const random = vi.fn(() => 0.1);
    const result = drawTile(state, 0, random);

    expect(
      result.round.players[0].drawnTileId
    ).toBe(reserved.id);
    expect(
      result.round.players[0].drawnTileSource
    ).toBe("river");
    expect(result.round.liveWall).toEqual(
      state.round.liveWall
    );
    expect(result.round.deadWall).toEqual(
      state.round.deadWall
    );
    expect(result.playerMp).toBe(0);
    expect(random).not.toHaveBeenCalled();
  });

  it("E-23の強制分岐で、王牌にある直前の捨て牌と同種の牌を選ぶ", () => {
    const state = prepare();
    const random = vi.fn(() => 0.1);
    const result = drawTile(state, 0, random);

    expect(
      result.round.players[0].drawnTileId
    ).toBe(state.round.deadWall[0].id);
    expect(result.round.deadWall[0]).toBe(
      state.round.liveWall[0]
    );
    expect(result.playerMp).toBe(30);
    expect(random).toHaveBeenCalledTimes(1);
  });

  it("E-23の除外分岐では、5-8の和了牌でも候補から除外する", () => {
    const state = prepare();

    const random = vi.fn()
      .mockReturnValueOnce(0.9)
      .mockReturnValue(0);

    const result = drawTile(state, 0, random);

    expect(
      result.round.players[0].drawnTileId
    ).toBe(state.round.liveWall[0].id);
    expect(result.round.deadWall).toEqual(
      state.round.deadWall
    );
    expect(random).toHaveBeenCalledTimes(2);
  });

  it("E-23で異なる牌種が残らない場合も同じ重みの候補から抽選する", () => {
    const state = prepare();

    state.round.liveWall = [tile("man", 3)];
    state.round.deadWall = Array.from(
      { length: 14 },
      () => tile("man", 3)
    );

    const random = vi.fn(() => 0.9);
    const result = drawTile(state, 0, random);

    expect(
      result.round.players[0].drawnTileId
    ).toBe(state.round.deadWall[12].id);
    expect(result.round.deadWall[12]).toBe(
      state.round.liveWall[0]
    );
    expect(random).toHaveBeenCalledTimes(1);
  });
});
