import { describe, expect, it } from "vitest";
import {
  createInitialGameState,
  declarePlayerRon,
  declarePlayerTsumo
} from "./engine";
import {
  createAkuukanPlayerSkill5_4Progress
} from "../akuukan/extendedIppatsuProgress";
import {
  disableAkuukanSource
} from "../akuukan/state";
import type { Tile, TileSuit } from "./types";

let serial = 0;

function tile(suit: TileSuit, rank: number): Tile {
  return {
    id: `ippatsu-${serial++}`,
    suit,
    rank,
    red: false
  };
}

function prepare(method: "tsumo" | "ron") {
  const state = createInitialGameState(() => 0.5, {
    enemyId: "enemy-1",
    equippedSkills: [{ id: "5-4", level: 1 }]
  });

  const winningTile = tile("man", 2);
  const hand = [
    ...[3, 4, 5, 6, 7].map(rank => tile("man", rank)),
    ...[2, 3, 4, 5, 5].map(rank => tile("pin", rank)),
    ...[6, 7, 8].map(rank => tile("sou", rank))
  ];
  const discard = {
    tile: winningTile,
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: false,
    called: false
  };

  state.round.liveWall = [
    tile("honor", 1),
    tile("honor", 2)
  ];
  state.round.deadWall = Array.from(
    { length: 14 },
    () => tile("honor", 7)
  );
  state.round.phase =
    method === "tsumo" ? "discarding" : "reaction";
  state.round.currentSeat = method === "tsumo" ? 0 : 2;
  state.round.lastDiscard =
    method === "ron" ? { seat: 1, discard } : null;

  state.round.players.forEach(player => {
    player.hand = [];
    player.melds = [];
    player.discards = [];
    player.riichi = false;
    player.ippatsu = false;
    player.drawnTileId = null;
    player.drawnTileSource = null;
  });

  if (method === "ron") {
    state.round.players[1].discards = [discard];
  }

  const player = state.round.players[0];

  player.hand =
    method === "tsumo" ? [...hand, winningTile] : hand;
  player.riichi = true;
  player.discards = [{
    ...discard,
    tile: tile("honor", 1),
    riichiDeclaration: true
  }];
  player.drawnTileId =
    method === "tsumo" ? winningTile.id : null;
  player.drawnTileSource =
    method === "tsumo" ? "liveWall" : null;
  player.extendedIppatsuProgress = {
    ...createAkuukanPlayerSkill5_4Progress(),
    completedTurnsAfterRiichi: 1
  };

  return state;
}

function win(
  state: ReturnType<typeof prepare>,
  method: "tsumo" | "ron"
) {
  return method === "tsumo"
    ? declarePlayerTsumo(state, () => 0.5)
    : declarePlayerRon(state, () => 0.5);
}

describe("5-4 延長一発の役判定", () => {
  it.each(["tsumo", "ron"] as const)(
    "延長期間中の%sに一発を付ける",
    method => {
      const state = prepare(method);
      const before = JSON.stringify(state);
      const result = win(state, method);

      expect(
        result.round.winResult?.yakuNames
      ).toContain("一発");

      expect(result.round.players[0].ippatsu).toBe(false);
      expect(JSON.stringify(state)).toBe(before);
    }
  );

  it.each(["tsumo", "ron"] as const)(
    "第2巡の反応完了後の%sには一発を付けない",
    method => {
      const state = prepare(method);
      state.round.players[0].extendedIppatsuProgress = {
        ...createAkuukanPlayerSkill5_4Progress(),
        completedTurnsAfterRiichi: 2
      };

      const result = win(state, method);

      expect(result.round.winResult).not.toBeNull();
      expect(
        result.round.winResult?.yakuNames
      ).not.toContain("一発");
    }
  );

  it("副露・槓で中断された期間は一発にしない", () => {
    const state = prepare("ron");
    state.round.players[0].extendedIppatsuProgress = {
      ...createAkuukanPlayerSkill5_4Progress(),
      interruptedByCallOrKan: true
    };

    const result = win(state, "ron");

    expect(result.round.winResult).not.toBeNull();
    expect(
      result.round.winResult?.yakuNames
    ).not.toContain("一発");
  });

  it("5-4が無効化中でも通常の一発は認める", () => {
    const state = prepare("tsumo");
    state.akuukan = disableAkuukanSource(
      state.akuukan!,
      "player-skill:5-4"
    );

    expect(
      win(state, "tsumo").round.winResult?.yakuNames
    ).not.toContain("一発");

    state.round.players[0].ippatsu = true;

    expect(
      win(state, "tsumo").round.winResult?.yakuNames
    ).toContain("一発");
  });
});
