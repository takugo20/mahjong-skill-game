import { describe, expect, it } from "vitest";
import {
  createInitialGameState,
  discardTile,
  playPlayerDiscard,
  getPlayerSelfKanOptions,
  playPlayerSelfKan
} from "./engine";
import {
  createAkuukanPlayerSkill5_4Progress as createProgress
} from "../akuukan/extendedIppatsuProgress";
import type { Tile, TileSuit } from "./types";

let serial = 0;

function tile(suit: TileSuit, rank: number): Tile {
  return {
    id: `progress-${serial++}`,
    suit,
    rank,
    red: false
  };
}

function prepare() {
  const state = createInitialGameState(() => 0.5, {
    enemyId: "enemy-1",
    equippedSkills: [{ id: "5-4", level: 1 }]
  });

  state.round.players.forEach(player => {
    player.hand = [];
    player.melds = [];
    player.discards = [];
    player.riichi = false;
    player.ippatsu = false;
    player.drawnTileId = null;
  });

  state.round.liveWall = Array.from(
    { length: 20 },
    () => tile("honor", 7)
  );

  const player = state.round.players[0];
  player.hand = [
    ...[2, 3, 4].map(rank => tile("man", rank)),
    ...[2, 3, 4].map(rank => tile("pin", rank)),
    ...[2, 3, 4, 6, 7, 8].map(rank => tile("sou", rank)),
    tile("pin", 5),
    tile("honor", 7)
  ];
  player.riichi = true;
  player.ippatsu = true;
  player.drawnTileId = player.hand[13].id;
  player.drawnTileSource = "liveWall";
  player.extendedIppatsuProgress = createProgress();
  player.discards = [{
    tile: tile("honor", 1),
    tsumogiri: false,
    riichiDeclaration: true,
    faceDown: false,
    called: false
  }];

  return state;
}

describe("5-4の実際の打牌・槓による進行", () => {
  it("打牌では反応待ちになり、CPUの反応完了後に1巡進む", () => {
    const state = prepare();
    const id = state.round.players[0].drawnTileId!;

    const discarded = discardTile(
      state,
      id,
      false,
      () => 0.5
    );

    expect(
      discarded.round.players[0].extendedIppatsuProgress
    ).toEqual({
      completedTurnsAfterRiichi: 0,
      awaitingDiscardReactions: true,
      interruptedByCallOrKan: false
    });

    const result = playPlayerDiscard(
      state,
      id,
      () => 0.5
    );

    expect(
      result.round.players[0].extendedIppatsuProgress
    ).toEqual({
      completedTurnsAfterRiichi: 1,
      awaitingDiscardReactions: false,
      interruptedByCallOrKan: false
    });

    expect(result.round.players[0].ippatsu).toBe(false);

    expect(
      state.round.players[0].extendedIppatsuProgress
    ).toEqual(createProgress());
  });

  it("立直後の合法な暗槓が成立すると延長期間を失う", () => {
    const state = prepare();
    const player = state.round.players[0];
    const kan = Array.from(
      { length: 4 },
      () => tile("man", 1)
    );

    player.hand = [
      ...kan,
      ...[2, 3, 4].map(rank => tile("man", rank)),
      ...[2, 3, 4].map(rank => tile("pin", rank)),
      ...[2, 3, 4].map(rank => tile("sou", rank)),
      tile("pin", 5)
    ];
    player.drawnTileId = kan[3].id;

    const option = getPlayerSelfKanOptions(state).find(
      candidate => candidate.kind === "closedKan"
    );

    expect(option).toBeDefined();

    const result = playPlayerSelfKan(
      state,
      option!.id,
      () => 0.5
    );

    expect(result.round.kanCount).toBe(1);

    expect(
      result.round.players[0].extendedIppatsuProgress
        ?.interruptedByCallOrKan
    ).toBe(true);

    expect(result.round.players[0].ippatsu).toBe(false);
  });
});

describe("5-4の他家副露による中断", () => {
  it.each(["pon", "openKan"] as const)(
    "CPUの%s成立で延長一発を終了する",
    kind => {
      const state = prepare();
      const calledTile = tile("honor", 5);
      const player = state.round.players[0];

      player.hand[13] = calledTile;
      player.drawnTileId = calledTile.id;

      state.round.players[1].hand = [
        ...Array.from(
          { length: kind === "pon" ? 2 : 3 },
          () => tile("honor", 5)
        ),
        ...[2, 2].map(rank => tile("man", rank)),
        ...(kind === "pon"
          ? [tile("man", 9)]
          : []),
        ...[1, 2, 3, 4, 5, 6].map(
          rank => tile("pin", rank)
        ),
        ...[7, 8].map(rank => tile("sou", rank))
      ];

      const before = JSON.stringify(state);

      const result = playPlayerDiscard(
        state,
        calledTile.id,
        () => 0.5
      );

      expect(
        result.round.players[1].melds[0]
      ).toMatchObject({
        kind,
        calledTileId: calledTile.id
      });

      expect(
        result.round.players[0].extendedIppatsuProgress
      ).toMatchObject({
        interruptedByCallOrKan: true,
        awaitingDiscardReactions: false
      });

      expect(result.round.players[0].ippatsu).toBe(false);
      expect(JSON.stringify(state)).toBe(before);
    }
  );
});
