import {
  describe,
  expect,
  it
} from "vitest";
import {
  toBoardTile,
  toBoardTileSuit,
  toBoardWind,
  toRuleMeld,
  toRuleMelds,
  toRuleTile,
  toRuleTiles,
  toRuleTileSuit,
  toRuleTileType,
  toRuleWind
} from "./adapter";
import type {
  BoardMeld,
  BoardTile
} from "./adapter";

function createBoardTile(
  id: string,
  suit: BoardTile["suit"],
  rank: number,
  copy = 0,
  isRed = false
): BoardTile {
  return {
    id,
    suit,
    rank,
    copy,
    isRed
  };
}

describe("牌種と風の変換", () => {
  it("卓用牌種を判定用牌種へ変換する", () => {
    expect(toRuleTileSuit("m")).toBe(
      "man"
    );
    expect(toRuleTileSuit("p")).toBe(
      "pin"
    );
    expect(toRuleTileSuit("s")).toBe(
      "sou"
    );
    expect(toRuleTileSuit("z")).toBe(
      "honor"
    );
  });

  it("判定用牌種を卓用牌種へ戻す", () => {
    expect(toBoardTileSuit("man")).toBe(
      "m"
    );
    expect(toBoardTileSuit("pin")).toBe(
      "p"
    );
    expect(toBoardTileSuit("sou")).toBe(
      "s"
    );
    expect(
      toBoardTileSuit("honor")
    ).toBe("z");
  });

  it("日本語の風と判定用の風を相互変換する", () => {
    expect(toRuleWind("東")).toBe("east");
    expect(toRuleWind("南")).toBe("south");
    expect(toRuleWind("西")).toBe("west");
    expect(toRuleWind("北")).toBe("north");

    expect(toBoardWind("east")).toBe("東");
    expect(toBoardWind("south")).toBe("南");
    expect(toBoardWind("west")).toBe("西");
    expect(toBoardWind("north")).toBe("北");
  });
});

describe("物理牌の変換", () => {
  it("ID・牌種・数字・赤状態を保持する", () => {
    const boardTile = createBoardTile(
      "m5-0",
      "m",
      5,
      0,
      true
    );

    expect(toRuleTile(boardTile)).toEqual({
      id: "m5-0",
      suit: "man",
      rank: 5,
      red: true
    });

    expect(boardTile).toEqual({
      id: "m5-0",
      suit: "m",
      rank: 5,
      copy: 0,
      isRed: true
    });
  });

  it("スキルで赤ドラ化した字牌も保持する", () => {
    const converted = toRuleTile(
      createBoardTile(
        "z7-2",
        "z",
        7,
        2,
        true
      )
    );

    expect(converted).toEqual({
      id: "z7-2",
      suit: "honor",
      rank: 7,
      red: true
    });
  });

  it("複数の卓用牌を一括変換する", () => {
    const tiles = [
      createBoardTile(
        "m1-0",
        "m",
        1
      ),
      createBoardTile(
        "p5-0",
        "p",
        5,
        0,
        true
      ),
      createBoardTile(
        "s9-3",
        "s",
        9,
        3
      ),
      createBoardTile(
        "z1-1",
        "z",
        1,
        1
      )
    ];

    expect(toRuleTiles(tiles)).toEqual([
      {
        id: "m1-0",
        suit: "man",
        rank: 1,
        red: false
      },
      {
        id: "p5-0",
        suit: "pin",
        rank: 5,
        red: true
      },
      {
        id: "s9-3",
        suit: "sou",
        rank: 9,
        red: false
      },
      {
        id: "z1-1",
        suit: "honor",
        rank: 1,
        red: false
      }
    ]);
  });

  it("和了牌やドラ表示牌を牌種へ変換する", () => {
    expect(
      toRuleTileType({
        suit: "p",
        rank: 9
      })
    ).toEqual({
      suit: "pin",
      rank: 9
    });
  });

  it("判定用牌を卓用牌へ戻す", () => {
    expect(
      toBoardTile(
        {
          id: "skill-s3",
          suit: "sou",
          rank: 3,
          red: true
        },
        2
      )
    ).toEqual({
      id: "skill-s3",
      suit: "s",
      rank: 3,
      copy: 2,
      isRed: true
    });
  });
});

describe("副露の変換", () => {
  it("副露種別と全ての構成牌を保持する", () => {
    const meld: BoardMeld = {
      kind: "chi",
      tiles: [
        createBoardTile(
          "m2-0",
          "m",
          2
        ),
        createBoardTile(
          "m3-0",
          "m",
          3
        ),
        createBoardTile(
          "m4-0",
          "m",
          4
        )
      ]
    };

    expect(toRuleMeld(meld)).toEqual({
      kind: "chi",
      tiles: [
        {
          id: "m2-0",
          suit: "man",
          rank: 2,
          red: false
        },
        {
          id: "m3-0",
          suit: "man",
          rank: 3,
          red: false
        },
        {
          id: "m4-0",
          suit: "man",
          rank: 4,
          red: false
        }
      ]
    });
  });

  it("複数の副露を一括変換する", () => {
    const melds: BoardMeld[] = [
      {
        kind: "pon",
        tiles: [0, 1, 2].map(
          (copy) =>
            createBoardTile(
              `z5-${copy}`,
              "z",
              5,
              copy
            )
        )
      },
      {
        kind: "closedKan",
        tiles: [0, 1, 2, 3].map(
          (copy) =>
            createBoardTile(
              `p1-${copy}`,
              "p",
              1,
              copy
            )
        )
      }
    ];

    const converted =
      toRuleMelds(melds);

    expect(converted).toHaveLength(2);
    expect(converted[0]?.kind).toBe("pon");
    expect(converted[1]?.kind).toBe(
      "closedKan"
    );
    expect(
      converted[0]?.tiles.every(
        (tile) =>
          tile.suit === "honor" &&
          tile.rank === 5
      )
    ).toBe(true);
  });
});

describe("不正な値の拒否", () => {
  it("数牌の10を拒否する", () => {
    expect(() =>
      toRuleTile(
        createBoardTile(
          "m10-0",
          "m",
          10
        )
      )
    ).toThrow(
      "man-10は有効な牌種ではありません"
    );
  });

  it("字牌の8を拒否する", () => {
    expect(() =>
      toRuleTileType({
        suit: "z",
        rank: 8
      })
    ).toThrow(
      "honor-8は有効な牌種ではありません"
    );
  });

  it("範囲外の複製番号を拒否する", () => {
    expect(() =>
      toBoardTile(
        {
          id: "m1",
          suit: "man",
          rank: 1,
          red: false
        },
        4
      )
    ).toThrow(
      "物理牌の複製番号は0から3で指定してください"
    );
  });
});
