import { describe, expect, it } from "vitest";
import type { Tile } from "../mahjong/types";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import {
  exchangeAkuukanPlayerSkill5_8HaiteiTile as exchange
} from "./haiteiTileExchange";

function tile(id: string): Tile {
  return {
    id,
    suit: "man",
    rank: 5,
    red: false
  };
}

function input() {
  const deadWall = Array.from(
    { length: 14 },
    (_, i) => tile(`dead-${i}`)
  );
  deadWall[5].red = true;

  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-8", level: 5 }]
    }),
    drawerIsPlayer: true,
    isNormalLiveWallDraw: true,
    tenpaiBeforeDraw: true,
    liveWall: [tile("last")],
    deadWall,
    doraIndicatorCount: 2,
    rinshanDrawCount: 1,
    selected: {
      source: "deadWall" as const,
      index: 5,
      tile: deadWall[5]
    }
  };
}

describe("5-8 海底牌の交換", () => {
  it("王牌と最後の通常山牌を交換し、枚数・物理牌・赤牌属性を保つ", () => {
    const value = input();
    const before = JSON.stringify(value);
    const result = exchange(value);

    expect(result.liveWall[0]).toBe(value.deadWall[5]);
    expect(result.liveWall[0].red).toBe(true);
    expect(result.deadWall[5]).toBe(value.liveWall[0]);
    expect(result.liveWall).toHaveLength(1);
    expect(result.deadWall).toHaveLength(14);

    expect(
      [...result.liveWall, ...result.deadWall]
        .map(t => t.id)
        .sort()
    ).toEqual(
      [...value.liveWall, ...value.deadWall]
        .map(t => t.id)
        .sort()
    );

    expect(result.deadWall[4]).toBe(value.deadWall[4]);
    expect(result.deadWall[6]).toBe(value.deadWall[6]);
    expect(JSON.stringify(value)).toBe(before);
  });

  it("通常山牌が選ばれた場合と未選択の場合は交換しない", () => {
    const value = input();

    const selections = [
      null,
      {
        source: "liveWall" as const,
        index: 0,
        tile: value.liveWall[0]
      }
    ];

    for (const selected of selections) {
      expect(
        exchange({
          ...value,
          selected
        })
      ).toEqual({
        liveWall: value.liveWall,
        deadWall: value.deadWall
      });
    }
  });

  it.each([0, 4, 6])(
    "取得済み・確定済みの王牌位置%sを拒否する",
    index => {
      const value = input();

      expect(() =>
        exchange({
          ...value,
          selected: {
            source: "deadWall",
            index,
            tile: value.deadWall[index]
          }
        })
      ).toThrow("現在の抽選候補にありません");
    }
  );

  it("取得元の位置にない牌IDを拒否する", () => {
    const value = input();

    expect(() =>
      exchange({
        ...value,
        selected: {
          ...value.selected,
          tile: tile("stale")
        }
      })
    ).toThrow("現在の抽選候補にありません");
  });

  it.each([
    "drawerIsPlayer",
    "isNormalLiveWallDraw",
    "tenpaiBeforeDraw"
  ] as const)("%sが偽なら交換しない", key => {
    const value = input();

    expect(
      exchange({
        ...value,
        [key]: false
      })
    ).toEqual({
      liveWall: value.liveWall,
      deadWall: value.deadWall
    });
  });

  it("無効化中は交換しない", () => {
    const value = input();

    expect(
      exchange({
        ...value,
        akuukan: disableAkuukanSource(
          value.akuukan,
          "player-skill:5-8"
        )
      })
    ).toEqual({
      liveWall: value.liveWall,
      deadWall: value.deadWall
    });
  });
});
