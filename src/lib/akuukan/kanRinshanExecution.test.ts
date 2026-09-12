import { describe, expect, it, vi } from "vitest";
import { createInitialGameState } from "../mahjong/engine";
import {
  executeKan,
  type KanExecutionInput
} from "../mahjong/kanExecution";
import type { Tile } from "../mahjong/types";
import {
  executeKanWithAkuukanPlayerSkill5_7 as execute
} from "./kanRinshanExecution";
import { disableAkuukanSource } from "./state";

function tile(id: string, rank = 1): Tile {
  return { id, suit: "man", rank, red: false };
}

function prepare(
  kind: "closedKan" | "addedKan" | "openKan" = "closedKan"
) {
  const state = createInitialGameState(() => 0.5, {
    enemyId: "enemy-1",
    equippedSkills: [{ id: "5-7", level: 5 }]
  });

  const round = state.round;
  const kanTiles = Array.from(
    { length: 4 },
    (_, i) => tile(`kan-${i}`, 6)
  );
  const otherTiles = Array.from(
    { length: 10 },
    (_, i) => ({
      ...tile(`hand-${i}`, i % 9 + 1),
      suit: "pin" as const
    })
  );

  round.liveWall = [
    tile("matching", 5),
    tile("replacement")
  ];
  round.deadWall = Array.from(
    { length: 14 },
    (_, i) => tile(`dead-${i}`)
  );
  round.doraIndicatorCount = 1;
  round.rinshanDrawCount = 0;
  round.kanCount = 0;
  round.currentSeat = 0;
  round.phase = "discarding";
  round.players[0].melds = [];

  let input: KanExecutionInput;

  if (kind === "openKan") {
    const discard = {
      tile: kanTiles[3],
      tsumogiri: false,
      riichiDeclaration: false,
      faceDown: false,
      called: false
    };

    round.phase = "reaction";
    round.lastDiscard = { seat: 2, discard };
    round.players[2].discards = [discard];
    round.players[0].hand = [
      ...kanTiles.slice(0, 3),
      ...otherTiles
    ];

    input = {
      round,
      option: {
        id: "open",
        kind,
        callerSeat: 0,
        discarderSeat: 2,
        calledTileId: kanTiles[3].id,
        handTileIds: [
          kanTiles[0].id,
          kanTiles[1].id,
          kanTiles[2].id
        ]
      }
    };
  } else if (kind === "addedKan") {
    round.players[0].melds = [{
      kind: "pon",
      tiles: kanTiles.slice(0, 3),
      calledFrom: 2,
      calledTileId: kanTiles[0].id
    }];
    round.players[0].hand = [
      kanTiles[3],
      ...otherTiles
    ];

    input = {
      round,
      declarerSeat: 0,
      option: {
        id: "added",
        kind,
        meldIndex: 0,
        tileId: kanTiles[3].id
      }
    };
  } else {
    round.players[0].hand = [
      ...kanTiles,
      ...otherTiles
    ];

    input = {
      round,
      declarerSeat: 0,
      option: {
        id: "closed",
        kind,
        tileIds: [
          kanTiles[0].id,
          kanTiles[1].id,
          kanTiles[2].id,
          kanTiles[3].id
        ]
      }
    };
  }

  return { input, akuukan: state.akuukan! };
}

describe("5-7と槓成立処理の接続", () => {
  it.each([
    "closedKan",
    "addedKan",
    "openKan"
  ] as const)(
    "%sで嶺上牌を選び、槓と取得を1回だけ進める",
    kind => {
      const { input, akuukan } = prepare(kind);
      const before = JSON.stringify(input);
      const random = vi.fn(() => 0.1);

      const result = execute(
        input,
        akuukan,
        value => value.rinshanTile.id === "matching",
        random
      );

      expect(result.rinshanTile).toBe(
        input.round.liveWall[0]
      );
      expect(result.round.liveWall).toHaveLength(1);
      expect(result.round.deadWall).toHaveLength(14);
      expect(result.round.kanCount).toBe(1);
      expect(result.round.rinshanDrawCount).toBe(1);
      expect(result.round.doraIndicatorCount).toBe(2);
      expect(result.round.deadWall[6]).toBe(
        input.round.deadWall[6]
      );
      expect(
        result.round.players[0].melds[0].kind
      ).toBe(kind);
      expect(
        result.round.players[0].hand.filter(
          t => t.id === "matching"
        )
      ).toHaveLength(1);
      expect(random).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(input)).toBe(before);
    }
  );

  it("合法な和了候補がなければ抽選しない", () => {
    const { input, akuukan } = prepare();
    const random = vi.fn(() => 0.1);

    expect(
      execute(input, akuukan, () => false, random)
    ).toEqual(executeKan(input));

    expect(random).not.toHaveBeenCalled();
  });

  it("無効化中は候補の和了判定も抽選もしない", () => {
    const { input, akuukan } = prepare();
    const judge = vi.fn(() => true);
    const random = vi.fn(() => 0.1);

    expect(
      execute(
        input,
        disableAkuukanSource(
          akuukan,
          "player-skill:5-7"
        ),
        judge,
        random
      )
    ).toEqual(executeKan(input));

    expect(judge).not.toHaveBeenCalled();
    expect(random).not.toHaveBeenCalled();
  });

  it("5-3で選んだ槓ドラを5-7の交換から保護する", () => {
    const { input } = prepare();

    const akuukan = createInitialGameState(() => 0.5, {
      enemyId: "enemy-1",
      equippedSkills: [
        { id: "5-3", level: 5 },
        { id: "5-7", level: 5 }
      ]
    }).akuukan!;

    const random = vi.fn()
      .mockReturnValueOnce(0.1)
      .mockReturnValue(0.25);

    const result = execute(
      input,
      akuukan,
      value => ["matching", "dead-1"].includes(
        value.rinshanTile.id
      ),
      random
    );

    expect(result.round.deadWall[6]).toBe(
      input.round.liveWall[0]
    );
    expect(result.rinshanTile).toBe(
      input.round.deadWall[1]
    );
    expect(result.round.kanCount).toBe(1);
    expect(result.round.rinshanDrawCount).toBe(1);
    expect(random).toHaveBeenCalledTimes(2);
  });
});
