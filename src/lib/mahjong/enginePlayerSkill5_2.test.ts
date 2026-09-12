import { describe, expect, it, vi } from "vitest";
import { disableAkuukanSource } from "../akuukan/state";
import {
  createInitialGameState,
  declarePlayerRon,
  declarePlayerTsumo
} from "./engine";
import type {
  GameState,
  Tile,
  TileSuit
} from "./types";

let serial = 0;

function tile(suit: TileSuit, rank: number): Tile {
  return {
    id: `skill-5-2-${serial++}`,
    suit,
    rank,
    red: false
  };
}

function waitingHand(): Tile[] {
  return [
    ...[3, 4, 5, 6, 7].map(rank => tile("man", rank)),
    ...[2, 3, 4, 5, 5].map(rank => tile("pin", rank)),
    ...[6, 7, 8].map(rank => tile("sou", rank))
  ];
}

function prepare(winnerCount = 1): GameState {
  const state = createInitialGameState(() => 0.5, {
    enemyId: "enemy-1",
    equippedSkills: [{ id: "5-2", level: 5 }]
  });

  const winningTile = tile("man", 2);
  const discard = {
    tile: winningTile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };

  state.round.phase = "reaction";
  state.round.currentSeat = 2;
  state.round.lastDiscard = { seat: 1, discard };
  state.round.liveWall = [tile("man", 1)];
  state.round.deadWall = Array.from(
    { length: 14 },
    () => tile("honor", 7)
  );
  state.round.doraIndicatorCount = 1;
  state.round.rinshanDrawCount = 0;

  state.round.players = state.round.players.map(player => {
    const wins =
      player.seat === 0 ||
      (player.seat === 2 && winnerCount >= 2) ||
      (player.seat === 3 && winnerCount >= 3);

    return {
      ...player,
      hand: wins ? waitingHand() : [],
      melds: [],
      discards: player.seat === 1 ? [discard] : [],
      riichi: wins,
      ippatsu: false,
      drawnTileId: null,
      drawnTileSource: null,
      temporaryFuriten: false,
      riichiFuriten: false
    };
  });

  return state;
}

function disabled(state: GameState): GameState {
  return {
    ...state,
    akuukan: disableAkuukanSource(
      state.akuukan!,
      "player-skill:5-2"
    )
  };
}

describe("5-2 裏ドラ抽選のエンジン統合", () => {
  it("ロン牌も対象に含め、裏ドラを点数計算に反映する", () => {
    const state = prepare();
    const before = JSON.stringify(state);

    const baseline = declarePlayerRon(
      disabled(state),
      () => 0.1
    );
    const result = declarePlayerRon(state, () => 0.1);

    expect(
      result.round.winResult?.uraDoraIndicatorTiles
    ).toEqual([state.round.liveWall[0]]);

    expect(result.round.winResult?.han).toBe(
      baseline.round.winResult!.han + 1
    );

    expect(result.round.liveWall[0]).toBe(
      state.round.deadWall[5]
    );

    expect(JSON.stringify(state)).toBe(before);
  });

  it("ツモ和了でも裏ドラを点数計算に反映する", () => {
    const state = prepare();
    const winningTile =
      state.round.lastDiscard!.discard.tile;

    state.round.phase = "discarding";
    state.round.currentSeat = 0;
    state.round.lastDiscard = null;
    state.round.players[1].discards = [];
    state.round.players[0].hand.push(winningTile);
    state.round.players[0].drawnTileId = winningTile.id;
    state.round.players[0].drawnTileSource = "liveWall";

    // 第1ツモ和了にはしない。
    state.round.players[0].discards = [{
      tile: tile("honor", 1),
      tsumogiri: false,
      riichiDeclaration: true,
      faceDown: false,
      called: false
    }];

    const baseline = declarePlayerTsumo(
      disabled(state),
      () => 0.1
    );
    const result = declarePlayerTsumo(state, () => 0.1);

    expect(
      result.round.winResult?.uraDoraIndicatorTiles
    ).toEqual([state.round.liveWall[0]]);

    expect(result.round.winResult?.han).toBe(
      baseline.round.winResult!.han + 1
    );
  });

  it("ダブロンでは1回だけ抽選し、両者の点数へ反映する", () => {
    const state = prepare(2);
    const baseline = declarePlayerRon(
      disabled(state),
      () => 0.1
    );
    const random = vi.fn(() => 0.1);
    const result = declarePlayerRon(state, random);
    const wins = result.round.doubleRonResult!.winResults;

    expect(
      wins.map(win => win.winnerSeat)
    ).toEqual([2, 0]);

    for (const win of wins) {
      const original =
        baseline.round.doubleRonResult!.winResults.find(
          candidate =>
            candidate.winnerSeat === win.winnerSeat
        )!;

      expect(win.uraDoraIndicatorTiles).toEqual([
        state.round.liveWall[0]
      ]);
      expect(win.han).toBe(original.han + 1);
    }

    expect(random).toHaveBeenCalledTimes(1);
  });

  it("三家和では裏ドラを抽選しない", () => {
    const state = prepare(3);
    const random = vi.fn(() => 0.1);
    const result = declarePlayerRon(state, random);

    expect(
      result.round.abortiveDrawResult?.reason
    ).toBe("tripleRon");

    expect(result.round.deadWall).toEqual(
      state.round.deadWall
    );
    expect(random).not.toHaveBeenCalled();
  });
});
