import {
  describe,
  expect,
  it
} from "vitest";
import {
  advanceKanWall
} from "./kanWall";
import type {
  Tile
} from "./types";

function createTile(id: string): Tile {
  return {
    id,
    suit: "man",
    rank: 1,
    red: false
  };
}

function createWallInput() {
  return {
    liveWall: [
      createTile("live-1"),
      createTile("live-2"),
      createTile("replacement")
    ],
    deadWall: Array.from(
      { length: 14 },
      (_, index) =>
        createTile(`dead-${index}`)
    ),
    kanCount: 0,
    doraIndicatorCount: 1,
    rinshanDrawCount: 0
  };
}

describe("槓成立時の牌山処理", () => {
  it("嶺上牌を取り通常山末尾を王牌へ補充する", () => {
    const input = createWallInput();
    const result = advanceKanWall(input);

    expect(result.rinshanTile.id).toBe(
      "dead-0"
    );
    expect(result.replacementTile.id).toBe(
      "replacement"
    );
    expect(
      result.liveWall.map((tile) => tile.id)
    ).toEqual(["live-1", "live-2"]);
    expect(result.deadWall[0].id).toBe(
      "replacement"
    );
    expect(result.deadWall).toHaveLength(14);
    expect(result.kanCount).toBe(1);
    expect(result.doraIndicatorCount).toBe(2);
    expect(result.rinshanDrawCount).toBe(1);
  });

  it("取得回数に対応する次の嶺上牌を使う", () => {
    const input = {
      ...createWallInput(),
      kanCount: 2,
      doraIndicatorCount: 3,
      rinshanDrawCount: 2
    };

    const result = advanceKanWall(input);

    expect(result.rinshanTile.id).toBe(
      "dead-2"
    );
    expect(result.deadWall[2].id).toBe(
      "replacement"
    );
  });

  it("ドラ表示牌は最大5枚に保つ", () => {
    const result = advanceKanWall({
      ...createWallInput(),
      doraIndicatorCount: 5
    });

    expect(result.doraIndicatorCount).toBe(5);
  });

  it("5回目の槓と5枚目の嶺上牌取得を禁止する", () => {
    expect(() =>
      advanceKanWall({
        ...createWallInput(),
        kanCount: 4
      })
    ).toThrow("これ以上は槓できません。");

    expect(() =>
      advanceKanWall({
        ...createWallInput(),
        rinshanDrawCount: 4
      })
    ).toThrow("これ以上は槓できません。");
  });

  it("王牌補充用の通常山牌がない場合は処理しない", () => {
    expect(() =>
      advanceKanWall({
        ...createWallInput(),
        liveWall: []
      })
    ).toThrow(
      "王牌へ補充する通常山牌がありません。"
    );
  });

  it("元の牌山配列を変更しない", () => {
    const input = createWallInput();
    const originalLiveWall = [
      ...input.liveWall
    ];
    const originalDeadWall = [
      ...input.deadWall
    ];

    advanceKanWall(input);

    expect(input.liveWall).toEqual(
      originalLiveWall
    );
    expect(input.deadWall).toEqual(
      originalDeadWall
    );
  });
});
