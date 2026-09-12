import { describe, expect, it } from "vitest";
import {
  createInitialGameState,
  drawTile,
  canPlayerTsumo
} from "./engine";
import {
  disableAkuukanSource
} from "../akuukan/state";
import type {
  SeatIndex,
  Tile,
  TileSuit
} from "./types";

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
    equippedSkills: [{ id: "5-6", level: 5 }]
  });

  const hand = wait === "ryanmen"
    ? [
        ...[3, 4, 5, 6, 7].map(rank => tile("man", rank)),
        ...[2, 3, 4, 5, 5].map(rank => tile("pin", rank)),
        ...[6, 7, 8].map(rank => tile("sou", rank))
      ]
    : [
        ...(wait === "penchan" ? [1, 2] : [2, 4]).map(
          rank => tile("man", rank)
        ),
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

  return state;
}

describe("5-6 愚形強化のエンジン統合", () => {
  it.each(["penchan", "kanchan"] as const)(
    "%sの和了牌の重量を2倍にする",
    wait => {
      const state = prepare(wait);
      const before = JSON.stringify(state);

      const normal = drawTile(
        state,
        0,
        () => 1 / 3 - 0.000001
      );
      const winning = drawTile(
        state,
        0,
        () => 1 / 3 + 0.000001
      );

      expect(
        normal.round.players[0].drawnTileId
      ).toBe(state.round.liveWall[0].id);

      expect(
        winning.round.players[0].drawnTileId
      ).toBe(state.round.liveWall[1].id);

      expect(canPlayerTsumo(normal)).toBe(false);
      expect(canPlayerTsumo(winning)).toBe(true);

      expect(winning.round.liveWall).toEqual([
        state.round.liveWall[0]
      ]);
      expect(
        winning.round.players[0].hand
      ).toHaveLength(14);

      expect(JSON.stringify(state)).toBe(before);
    }
  );

  it("両面待ちの和了牌には補正しない", () => {
    const state = prepare("ryanmen");
    const result = drawTile(state, 0, () => 0.9);

    expect(
      result.round.players[0].drawnTileId
    ).toBe(state.round.liveWall[0].id);

    const winningState = {
      ...state,
      round: {
        ...state.round,
        liveWall: [state.round.liveWall[1]]
      }
    };

    expect(
      canPlayerTsumo(
        drawTile(winningState, 0, () => 0.5)
      )
    ).toBe(true);
  });

  it("CPUの辺張待ちには補正しない", () => {
    const state = prepare("penchan", 1);
    const result = drawTile(state, 1, () => 0.9);

    expect(
      result.round.players[1].drawnTileId
    ).toBe(state.round.liveWall[0].id);
  });

  it("5-6の無効化中は補正しない", () => {
    const state = prepare();

    state.akuukan = disableAkuukanSource(
      state.akuukan!,
      "player-skill:5-6"
    );

    const result = drawTile(state, 0, () => 0.9);

    expect(
      result.round.players[0].drawnTileId
    ).toBe(state.round.liveWall[0].id);
  });
});
