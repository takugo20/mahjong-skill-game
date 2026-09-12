import { describe, expect, it } from "vitest";
import type { Tile } from "../mahjong/types";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import {
  getAkuukanPlayerSkill5_8HaiteiCandidates as candidates
} from "./haiteiDrawCandidates";

function tile(id: string): Tile {
  return {
    id,
    suit: "man",
    rank: 5,
    red: false
  };
}

function input() {
  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-8", level: 5 }]
    }),
    drawerIsPlayer: true,
    isNormalLiveWallDraw: true,
    tenpaiBeforeDraw: true,
    liveWall: [tile("last")],
    deadWall: Array.from(
      { length: 14 },
      (_, i) => tile(`dead-${i}`)
    ),
    doraIndicatorCount: 2,
    rinshanDrawCount: 1
  };
}

describe("5-8 海底牌の候補", () => {
  it("最後の通常山牌と未取得・未確定の王牌を取得元付きで返す", () => {
    const value = input();
    value.deadWall[5].red = true;

    const before = JSON.stringify(value);
    const result = candidates(value);

    expect(result.map(c => c.tile.id)).toEqual([
      "last",
      "dead-1",
      "dead-2",
      "dead-3",
      "dead-5",
      "dead-7",
      "dead-8",
      "dead-9",
      "dead-10",
      "dead-11",
      "dead-12",
      "dead-13"
    ]);

    expect(result[0]).toEqual({
      source: "liveWall",
      index: 0,
      tile: value.liveWall[0]
    });

    const ura = result.find(
      c => c.index === 5 && c.source === "deadWall"
    )!;

    expect(ura.tile).toBe(value.deadWall[5]);
    expect(ura.tile.red).toBe(true);
    expect(JSON.stringify(value)).toBe(before);
  });

  it("表示牌5枚・嶺上取得4回なら裏表示牌候補だけを王牌から返す", () => {
    const value = input();

    const result = candidates({
      ...value,
      doraIndicatorCount: 5,
      rinshanDrawCount: 4
    });

    expect(result.map(c => c.tile.id)).toEqual([
      "last",
      "dead-5",
      "dead-7",
      "dead-9",
      "dead-11",
      "dead-13"
    ]);
  });

  it.each([0, 2])(
    "通常山が%s枚なら特別抽選の候補を返さない",
    count => {
      expect(
        candidates({
          ...input(),
          liveWall: Array.from(
            { length: count },
            (_, i) => tile(`live-${i}`)
          )
        })
      ).toEqual([]);
    }
  );

  it.each([
    "drawerIsPlayer",
    "isNormalLiveWallDraw",
    "tenpaiBeforeDraw"
  ] as const)("%sが偽なら候補を返さない", key => {
    expect(
      candidates({
        ...input(),
        [key]: false
      })
    ).toEqual([]);
  });

  it("未装備と無効化中は候補を返さない", () => {
    const value = input();

    const states = [
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: []
      }),
      disableAkuukanSource(
        value.akuukan,
        "player-skill:5-8"
      )
    ];

    for (const akuukan of states) {
      expect(
        candidates({
          ...value,
          akuukan
        })
      ).toEqual([]);
    }
  });
});
