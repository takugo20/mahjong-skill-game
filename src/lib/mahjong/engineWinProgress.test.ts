import { describe, expect, it } from "vitest";
import {
  recordAkuukanGameWinProgress
} from "../akuukan/gameWinProgress";
import {
  createInitialAkuukanGameState
} from "../akuukan/state";
import {
  createInitialGameState,
  declarePlayerRon,
  declarePlayerTsumo
} from "./engine";
import type { GameState, Tile, TileSuit } from "./types";

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
    equippedSkills: []
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

describe("和了確定と解放進捗の接続", () => {
  it.each([1, 2])(
    "和了者%s人のロンでもプレイヤーの進捗は1回だけ増える",
    count => {
      const state = prepare(count);
      const result = declarePlayerRon(state, () => 0.5);
      const progress =
        result.playerSkillDrawProgress!.growth.unlockProgress;

      expect(progress["tanyao-win-count"]).toBe(1);
      expect(progress["pinfu-win-count"]).toBe(1);
      expect(progress["round-draw-count"]).toBe(0);
      expect(
        result.playerSkillDrawProgress?.recordedRoundNumbers
      ).toEqual([1]);
      expect(
        state.playerSkillDrawProgress?.growth
          .unlockProgress["tanyao-win-count"]
      ).toBe(0);
      expect(
        recordAkuukanGameWinProgress(result, [])
      ).toBe(result);
    }
  );

  it("ツモ和了でも進捗を記録する", () => {
    const state = prepare();
    const winningTile = state.round.lastDiscard!.discard.tile;

    state.round.phase = "discarding";
    state.round.currentSeat = 0;
    state.round.lastDiscard = null;
    state.round.players[0].hand.push(winningTile);
    state.round.players[0].drawnTileId = winningTile.id;
    state.round.players[0].drawnTileSource = "liveWall";
    state.round.players[0].discards = [{
      tile: tile("honor", 1),
      tsumogiri: false,
      riichiDeclaration: false,
      faceDown: false,
      called: false
    }];

    const result = declarePlayerTsumo(state, () => 0.5);

    expect(result.round.winResult?.winMethod).toBe("tsumo");
    expect(
      result.playerSkillDrawProgress?.growth
        .unlockProgress["tanyao-win-count"]
    ).toBe(1);
  });

  it("三家和では和了進捗を増やさず流局だけを数える", () => {
    const result = declarePlayerRon(prepare(3), () => 0.5);

    expect(
      result.round.abortiveDrawResult?.reason
    ).toBe("tripleRon");
    expect(
      result.playerSkillDrawProgress?.growth
        .unlockProgress["tanyao-win-count"]
    ).toBe(0);
    expect(
      result.playerSkillDrawProgress?.growth
        .unlockProgress["round-draw-count"]
    ).toBe(1);
  });

  it("E-27で無効になった和了は流局だけを数える", () => {
    const state = prepare();

    state.akuukan = createInitialAkuukanGameState({
      enemyId: "enemy-15",
      equippedSkills: []
    });

    const result = declarePlayerRon(state, () => 0.5);

    expect(
      result.round.abortiveDrawResult?.reason
    ).toBe("enemyAbilityE27");
    expect(
      result.playerSkillDrawProgress?.growth
        .unlockProgress["tanyao-win-count"]
    ).toBe(0);
    expect(
      result.playerSkillDrawProgress?.growth
        .unlockProgress["round-draw-count"]
    ).toBe(1);
  });
});
