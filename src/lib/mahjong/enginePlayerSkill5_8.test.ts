import { describe, expect, it } from "vitest";
import {
  createInitialGameState,
  drawTile,
  canPlayerTsumo
} from "./engine";
import { disableAkuukanSource } from "../akuukan/state";
import type { SeatIndex, Tile, TileSuit } from "./types";

let serial = 0;

function tile(suit: TileSuit, rank: number): Tile {
  return {
    id: `narrow-draw-${serial++}`,
    suit,
    rank,
    red: false
  };
}

function prepare(
  wait: "penchan" | "kanchan" | "ryanmen" = "penchan",
  seat: SeatIndex = 0
) {
  const state = createInitialGameState(() => 0.5, {
    enemyId: "enemy-1",
    equippedSkills: [{ id: "5-8", level: 5 }]
  });

  const hand = wait === "ryanmen"
    ? [
        ...[3, 4, 5, 6, 7].map(rank => tile("man", rank)),
        ...[2, 3, 4, 5, 5].map(rank => tile("pin", rank)),
        ...[6, 7, 8].map(rank => tile("sou", rank))
      ]
    : [
        ...(wait === "penchan" ? [1, 2] : [2, 4])
          .map(rank => tile("man", rank)),
        ...[2, 3, 4, 5, 5].map(rank => tile("pin", rank)),
        ...[2, 3, 4, 6, 7, 8].map(rank => tile("sou", rank))
      ];

  state.round.phase = "drawing";
  state.round.currentSeat = seat;
  state.round.liveWall = [
    tile("pin", 9),
    wait === "ryanmen"
      ? tile("man", 2)
      : tile("man", 3)
  ];

  state.round.players[seat] = {
    ...state.round.players[seat],
    hand,
    melds: [],
    riichi: false,
    ippatsu: false,
    drawnTileId: null,
    drawnTileSource: null,
    discards: [{
      tile: tile("honor", 1),
      tsumogiri: false,
      riichiDeclaration: false,
      faceDown: false,
      called: false
    }]
  };

  const winning = state.round.liveWall[1];
  state.round.liveWall = [state.round.liveWall[0]];
  state.round.deadWall = Array.from(
    { length: 14 },
    () => tile("honor", 7)
  );
  state.round.deadWall[0] = winning;
  state.round.doraIndicatorCount = 1;
  state.round.rinshanDrawCount = 0;
  state.playerMp = 0;

  return state;
}

describe("5-8 海底牌のエンジン統合", () => {
  it("王牌の和了牌を海底牌として引き、MPを30だけ加算する", () => {
    const state = prepare();
    const before = JSON.stringify(state);
    const result = drawTile(state, 0, () => 0.1);

    expect(
      result.round.players[0].drawnTileId
    ).toBe(state.round.deadWall[0].id);
    expect(
      result.round.players[0].drawnTileSource
    ).toBe("liveWall");
    expect(result.round.liveWall).toHaveLength(0);
    expect(result.round.deadWall).toHaveLength(14);
    expect(result.round.deadWall[0]).toBe(
      state.round.liveWall[0]
    );
    expect(result.round.deadWall[4]).toBe(
      state.round.deadWall[4]
    );
    expect(result.playerMp).toBe(30);
    expect(canPlayerTsumo(result)).toBe(true);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("無効化中は通常山の最後の牌を引く", () => {
    const state = prepare();
    state.akuukan = disableAkuukanSource(
      state.akuukan!,
      "player-skill:5-8"
    );

    expect(
      drawTile(state, 0, () => 0.1)
        .round.players[0].drawnTileId
    ).toBe(state.round.liveWall[0].id);
  });

  it("CPUには海底牌の特別抽選を適用しない", () => {
    const state = prepare("penchan", 1);

    expect(
      drawTile(state, 1, () => 0.1)
        .round.players[1].drawnTileId
    ).toBe(state.round.liveWall[0].id);
  });
});
