import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Tile,
  TileSuit
} from "../mahjong/types";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  AkuukanGameState,
  EnemyId
} from "./types";
import {
  AKUUKAN_E5_TARGET_SUITS,
  activateAkuukanE2DrawRestriction,
  clearAkuukanE2DrawRestriction,
  getAkuukanE2LiveWallDrawIndex,
  getAkuukanE2RestrictedPlayerIds,
  getAkuukanE5LiveWallDrawIndex,
  getAkuukanE11LiveWallTileIndex,
  isAkuukanE2DrawRestricted,
  selectAkuukanE5TargetSuit
} from "./drawTileSelection";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id:
      `e2-draw-selection-` +
      serialNumber,
    suit,
    rank,
    red
  };
}

function createTiles(
  suit: TileSuit,
  ranks: readonly number[]
): Tile[] {
  return ranks.map(
    (rank) => createTile(suit, rank)
  );
}

function createSingleWaitHand(): Tile[] {
  return [
    ...createTiles("man", [1, 2, 3]),
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("sou", [1, 2, 3]),
    ...createTiles("honor", [1, 1, 1]),
    createTile("pin", 5)
  ];
}

function createTwoSidedWaitHand(): Tile[] {
  return [
    ...createTiles("pin", [1, 2, 3]),
    ...createTiles("pin", [4, 5, 6]),
    ...createTiles("sou", [7, 8, 9]),
    ...createTiles("honor", [5, 5]),
    ...createTiles("man", [2, 3])
  ];
}

function createAkuukan(
  enemyId: EnemyId = "enemy-1"
): AkuukanGameState {
  return createInitialAkuukanGameState({
    enemyId,
    equippedSkills: []
  });
}

function activateE2(
  akuukan: AkuukanGameState,
  priorRiichiPlayerIds:
    readonly string[],
  declarerIsSelectedEnemy = true
): AkuukanGameState {
  return activateAkuukanE2DrawRestriction({
    akuukan,
    declarerIsSelectedEnemy,
    priorRiichiPlayerIds
  });
}

describe("E-2のツモ制限対象記録", () => {
  it("敵1本人の追っかけ立直で先行立直者を重複なく記録する", () => {
    const initial = createAkuukan();
    const priorIds = [
      "player-0",
      "player-1",
      "player-0"
    ];
    const activated = activateE2(
      initial,
      priorIds
    );

    expect(activated).not.toBe(initial);
    expect(
      getAkuukanE2RestrictedPlayerIds(
        activated
      )
    ).toEqual([
      "player-0",
      "player-1"
    ]);

    priorIds.push("player-3");

    expect(
      getAkuukanE2RestrictedPlayerIds(
        activated
      )
    ).toEqual([
      "player-0",
      "player-1"
    ]);
  });

  it("特殊能力者本人以外の立直では発動しない", () => {
    const initial = createAkuukan();
    const result = activateE2(
      initial,
      ["player-0"],
      false
    );

    expect(result).toBe(initial);
    expect(
      getAkuukanE2RestrictedPlayerIds(
        result
      )
    ).toEqual([]);
  });

  it("先行立直者がいないかE-2を持たない敵なら発動しない", () => {
    const noPriorRiichi = createAkuukan();
    const otherEnemy = createAkuukan(
      "enemy-2"
    );

    expect(
      activateE2(noPriorRiichi, [])
    ).toBe(noPriorRiichi);
    expect(
      activateE2(
        otherEnemy,
        ["player-0"]
      )
    ).toBe(otherEnemy);
  });

  it("E-2が無効なら発動しない", () => {
    const disabled = disableAkuukanSource(
      createAkuukan(),
      "enemy-ability:E-2"
    );

    expect(
      activateE2(
        disabled,
        ["player-0"]
      )
    ).toBe(disabled);
  });

  it("発動後に立直した者を制限対象へ追加しない", () => {
    const activated = activateE2(
      createAkuukan(),
      ["player-0"]
    );
    const duplicateActivation = activateE2(
      activated,
      ["player-0", "player-3"]
    );

    expect(duplicateActivation).toBe(
      activated
    );
    expect(
      getAkuukanE2RestrictedPlayerIds(
        duplicateActivation
      )
    ).toEqual(["player-0"]);
  });

  it("記録されたプレイヤーだけを制限対象と判定する", () => {
    const akuukan = activateE2(
      createAkuukan(),
      ["player-0", "player-1"]
    );

    expect(
      isAkuukanE2DrawRestricted({
        akuukan,
        playerId: "player-0"
      })
    ).toBe(true);
    expect(
      isAkuukanE2DrawRestricted({
        akuukan,
        playerId: "player-3"
      })
    ).toBe(false);
  });

  it("発動後でもE-2が無効なら制限しない", () => {
    const activated = activateE2(
      createAkuukan(),
      ["player-0"]
    );
    const disabled = disableAkuukanSource(
      activated,
      "enemy-ability:E-2"
    );

    expect(
      isAkuukanE2DrawRestricted({
        akuukan: disabled,
        playerId: "player-0"
      })
    ).toBe(false);
    expect(
      getAkuukanE2RestrictedPlayerIds(
        disabled
      )
    ).toEqual(["player-0"]);
  });

  it("次局用の解除で対象記録を空にする", () => {
    const activated = activateE2(
      createAkuukan(),
      ["player-0"]
    );
    const cleared =
      clearAkuukanE2DrawRestriction(
        activated
      );
    const duplicateClear =
      clearAkuukanE2DrawRestriction(
        cleared
      );

    expect(cleared).not.toBe(activated);
    expect(
      getAkuukanE2RestrictedPlayerIds(
        cleared
      )
    ).toEqual([]);
    expect(duplicateClear).toBe(cleared);
  });
});

describe("E-2の通常山ツモ候補除外", () => {
  it("通常山が空なら選択位置を返さない", () => {
    const akuukan = activateE2(
      createAkuukan(),
      ["player-0"]
    );

    expect(
      getAkuukanE2LiveWallDrawIndex({
        akuukan,
        playerId: "player-0",
        concealedTiles:
          createSingleWaitHand(),
        melds: [],
        liveWall: []
      })
    ).toBeNull();
  });

  it("制限対象外なら和了牌が先頭でも通常どおり選ぶ", () => {
    const akuukan = activateE2(
      createAkuukan(),
      ["player-0"]
    );

    expect(
      getAkuukanE2LiveWallDrawIndex({
        akuukan,
        playerId: "player-3",
        concealedTiles:
          createSingleWaitHand(),
        melds: [],
        liveWall: [
          createTile("pin", 5),
          createTile("man", 9)
        ]
      })
    ).toBe(0);
  });

  it("単騎待ちの通常牌と赤牌を飛ばして別の牌を選ぶ", () => {
    const akuukan = activateE2(
      createAkuukan(),
      ["player-0"]
    );

    expect(
      getAkuukanE2LiveWallDrawIndex({
        akuukan,
        playerId: "player-0",
        concealedTiles:
          createSingleWaitHand(),
        melds: [],
        liveWall: [
          createTile("pin", 5),
          createTile("pin", 5, true),
          createTile("man", 9)
        ]
      })
    ).toBe(2);
  });

  it("複数の和了牌をすべて飛ばして別の牌を選ぶ", () => {
    const akuukan = activateE2(
      createAkuukan(),
      ["player-0"]
    );

    expect(
      getAkuukanE2LiveWallDrawIndex({
        akuukan,
        playerId: "player-0",
        concealedTiles:
          createTwoSidedWaitHand(),
        melds: [],
        liveWall: [
          createTile("man", 1),
          createTile("man", 4),
          createTile("honor", 7)
        ]
      })
    ).toBe(2);
  });

  it("通常山の候補がすべて和了牌ならそのツモだけ不発にする", () => {
    const akuukan = activateE2(
      createAkuukan(),
      ["player-0"]
    );

    expect(
      getAkuukanE2LiveWallDrawIndex({
        akuukan,
        playerId: "player-0",
        concealedTiles:
          createSingleWaitHand(),
        melds: [],
        liveWall: [
          createTile("pin", 5),
          createTile("pin", 5, true)
        ]
      })
    ).toBe(0);
  });

  it("聴牌していないかE-2が無効なら先頭を選ぶ", () => {
    const activated = activateE2(
      createAkuukan(),
      ["player-0"]
    );
    const disabled = disableAkuukanSource(
      activated,
      "enemy-ability:E-2"
    );
    const liveWall = [
      createTile("pin", 5),
      createTile("man", 9)
    ];

    expect(
      getAkuukanE2LiveWallDrawIndex({
        akuukan: activated,
        playerId: "player-0",
        concealedTiles:
          createTiles("man", [1, 2, 4]),
        melds: [],
        liveWall
      })
    ).toBe(0);
    expect(
      getAkuukanE2LiveWallDrawIndex({
        akuukan: disabled,
        playerId: "player-0",
        concealedTiles:
          createSingleWaitHand(),
        melds: [],
        liveWall
      })
    ).toBe(0);
  });
});

describe("E-5の局開始時対象色選択", () => {
  it("乱数の3区間を索子・筒子・萬子へ対応させる", () => {
    const akuukan = createAkuukan(
      "enemy-5"
    );

    expect(
      AKUUKAN_E5_TARGET_SUITS
    ).toEqual(["sou", "pin", "man"]);
    expect(
      selectAkuukanE5TargetSuit({
        akuukan,
        random: () => 0
      })
    ).toBe("sou");
    expect(
      selectAkuukanE5TargetSuit({
        akuukan,
        random: () => 0.5
      })
    ).toBe("pin");
    expect(
      selectAkuukanE5TargetSuit({
        akuukan,
        random: () => 0.999999
      })
    ).toBe("man");
  });

  it("E-5を持たないか無効なら色を選ばず乱数も消費しない", () => {
    let randomCallCount = 0;
    const random = () => {
      randomCallCount += 1;
      return 0;
    };
    const disabled = disableAkuukanSource(
      createAkuukan("enemy-5"),
      "enemy-ability:E-5"
    );

    expect(
      selectAkuukanE5TargetSuit({
        akuukan: createAkuukan(
          "enemy-4"
        ),
        random
      })
    ).toBeNull();
    expect(
      selectAkuukanE5TargetSuit({
        akuukan: disabled,
        random
      })
    ).toBeNull();
    expect(randomCallCount).toBe(0);
  });
});

describe("E-5の特定色限定ツモ", () => {
  it("通常山が空なら選択位置を返さない", () => {
    expect(
      getAkuukanE5LiveWallDrawIndex({
        akuukan: createAkuukan(
          "enemy-5"
        ),
        recipientIsSelectedEnemy: true,
        targetSuit: "sou",
        liveWall: []
      })
    ).toBeNull();
  });

  it("索子・筒子・萬子のどれが対象でも最初の同色牌を選ぶ", () => {
    const akuukan = createAkuukan(
      "enemy-5"
    );

    for (const targetSuit of
      AKUUKAN_E5_TARGET_SUITS) {
      expect(
        getAkuukanE5LiveWallDrawIndex({
          akuukan,
          recipientIsSelectedEnemy: true,
          targetSuit,
          liveWall: [
            createTile("honor", 1),
            createTile(
              targetSuit,
              5,
              true
            ),
            createTile(targetSuit, 6)
          ]
        })
      ).toBe(1);
    }
  });

  it("対象色が残っている間は字牌と他色を飛ばす", () => {
    expect(
      getAkuukanE5LiveWallDrawIndex({
        akuukan: createAkuukan(
          "enemy-5"
        ),
        recipientIsSelectedEnemy: true,
        targetSuit: "sou",
        liveWall: [
          createTile("honor", 7),
          createTile("man", 9),
          createTile("pin", 1),
          createTile("sou", 3)
        ]
      })
    ).toBe(3);
  });

  it("対象色が通常山から尽きたら通常どおり先頭を選ぶ", () => {
    expect(
      getAkuukanE5LiveWallDrawIndex({
        akuukan: createAkuukan(
          "enemy-5"
        ),
        recipientIsSelectedEnemy: true,
        targetSuit: "sou",
        liveWall: [
          createTile("honor", 2),
          createTile("pin", 4),
          createTile("man", 7)
        ]
      })
    ).toBe(0);
  });

  it("能力者CPU本人以外には限定ツモを適用しない", () => {
    expect(
      getAkuukanE5LiveWallDrawIndex({
        akuukan: createAkuukan(
          "enemy-5"
        ),
        recipientIsSelectedEnemy: false,
        targetSuit: "sou",
        liveWall: [
          createTile("honor", 3),
          createTile("sou", 8)
        ]
      })
    ).toBe(0);
  });

  it("対象色が未選択なら通常どおり先頭を選ぶ", () => {
    expect(
      getAkuukanE5LiveWallDrawIndex({
        akuukan: createAkuukan(
          "enemy-5"
        ),
        recipientIsSelectedEnemy: true,
        targetSuit: null,
        liveWall: [
          createTile("honor", 4),
          createTile("sou", 2)
        ]
      })
    ).toBe(0);
  });

  it("E-5を持たない敵または能力無効時は適用しない", () => {
    const disabled = disableAkuukanSource(
      createAkuukan("enemy-5"),
      "enemy-ability:E-5"
    );
    const liveWall = [
      createTile("honor", 5),
      createTile("sou", 6)
    ];

    expect(
      getAkuukanE5LiveWallDrawIndex({
        akuukan: createAkuukan(
          "enemy-4"
        ),
        recipientIsSelectedEnemy: true,
        targetSuit: "sou",
        liveWall
      })
    ).toBe(0);
    expect(
      getAkuukanE5LiveWallDrawIndex({
        akuukan: disabled,
        recipientIsSelectedEnemy: true,
        targetSuit: "sou",
        liveWall
      })
    ).toBe(0);
  });
});

describe("E-11の風牌取得禁止", () => {
  it("通常山が空なら選択位置を返さない", () => {
    expect(
      getAkuukanE11LiveWallTileIndex({
        akuukan: createAkuukan(
          "enemy-7"
        ),
        recipientIsSelectedEnemy: false,
        liveWall: []
      })
    ).toBeNull();
  });

  it("他家の取得時は東南西北を飛ばして最初の非風牌を選ぶ", () => {
    expect(
      getAkuukanE11LiveWallTileIndex({
        akuukan: createAkuukan(
          "enemy-7"
        ),
        recipientIsSelectedEnemy: false,
        liveWall: [
          createTile("honor", 1),
          createTile("honor", 2),
          createTile("honor", 3),
          createTile("honor", 4),
          createTile("pin", 2)
        ]
      })
    ).toBe(4);
  });

  it("先頭が数牌なら通常どおり先頭を選ぶ", () => {
    expect(
      getAkuukanE11LiveWallTileIndex({
        akuukan: createAkuukan(
          "enemy-7"
        ),
        recipientIsSelectedEnemy: false,
        liveWall: [
          createTile("sou", 9),
          createTile("honor", 1)
        ]
      })
    ).toBe(0);
  });

  it("白發中は風牌ではないため通常どおり選ぶ", () => {
    for (const dragonRank of [5, 6, 7]) {
      expect(
        getAkuukanE11LiveWallTileIndex({
          akuukan: createAkuukan(
            "enemy-7"
          ),
          recipientIsSelectedEnemy: false,
          liveWall: [
            createTile(
              "honor",
              dragonRank
            ),
            createTile("man", 1)
          ]
        })
      ).toBe(0);
    }
  });

  it("能力者CPU本人には風牌取得禁止を適用しない", () => {
    expect(
      getAkuukanE11LiveWallTileIndex({
        akuukan: createAkuukan(
          "enemy-7"
        ),
        recipientIsSelectedEnemy: true,
        liveWall: [
          createTile("honor", 1),
          createTile("man", 1)
        ]
      })
    ).toBe(0);
  });

  it("通常山に風牌しかなければそのまま先頭を選ぶ", () => {
    expect(
      getAkuukanE11LiveWallTileIndex({
        akuukan: createAkuukan(
          "enemy-7"
        ),
        recipientIsSelectedEnemy: false,
        liveWall: [
          createTile("honor", 2),
          createTile("honor", 4)
        ]
      })
    ).toBe(0);
  });

  it("E-11を持たない敵または能力無効時は適用しない", () => {
    const disabled = disableAkuukanSource(
      createAkuukan("enemy-7"),
      "enemy-ability:E-11"
    );
    const liveWall = [
      createTile("honor", 3),
      createTile("pin", 3)
    ];

    expect(
      getAkuukanE11LiveWallTileIndex({
        akuukan: createAkuukan(
          "enemy-8"
        ),
        recipientIsSelectedEnemy: false,
        liveWall
      })
    ).toBe(0);
    expect(
      getAkuukanE11LiveWallTileIndex({
        akuukan: disabled,
        recipientIsSelectedEnemy: false,
        liveWall
      })
    ).toBe(0);
  });
});
