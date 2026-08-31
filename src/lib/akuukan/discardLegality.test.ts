import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Tile
} from "../mahjong/types";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  AkuukanE19DiscardRestriction,
  AkuukanGameState,
  EnemyId
} from "./types";
import {
  AKUUKAN_E19_RESTRICTION_COUNT_PER_PLAYER,
  assignAkuukanE19DiscardRestrictions,
  clearAkuukanE19DiscardRestrictions,
  getAkuukanE19ForbiddenTileIds,
  isAkuukanE19DiscardAllowed,
  synchronizeAkuukanE19PlayerHandRestrictions
} from "./discardLegality";

function createTile(
  id: string,
  rank = 1
): Tile {
  return {
    id,
    suit: "man",
    rank,
    red: false
  };
}

function createHand(
  prefix: string,
  count = 5
): Tile[] {
  return Array.from(
    { length: count },
    (_, index) =>
      createTile(
        `${prefix}-${index}`,
        (index % 9) + 1
      )
  );
}

function createAkuukan(
  enemyId: EnemyId = "enemy-10"
): AkuukanGameState {
  return createInitialAkuukanGameState({
    enemyId,
    equippedSkills: []
  });
}

function createRestrictedAkuukan(
  restrictions:
    AkuukanE19DiscardRestriction[]
): AkuukanGameState {
  return {
    ...createAkuukan(),
    e19DiscardRestrictions:
      restrictions
  };
}

describe("E-19の配牌禁止牌指定", () => {
  it("他家3人へ異なる物理牌を3枚ずつ指定する", () => {
    const hands = {
      player: createHand("player"),
      rightCpu: createHand("right"),
      selectedEnemy:
        createHand("selected"),
      leftCpu: createHand("left")
    };
    const originalPlayerIds =
      hands.player.map((tile) => tile.id);
    let randomCallCount = 0;

    const result =
      assignAkuukanE19DiscardRestrictions({
        akuukan: createAkuukan(),
        players: [
          {
            playerId: "player-0",
            isSelectedEnemy: false,
            concealedTiles: hands.player
          },
          {
            playerId: "player-1",
            isSelectedEnemy: false,
            concealedTiles: hands.rightCpu
          },
          {
            playerId: "player-2",
            isSelectedEnemy: true,
            concealedTiles:
              hands.selectedEnemy
          },
          {
            playerId: "player-3",
            isSelectedEnemy: false,
            concealedTiles: hands.leftCpu
          }
        ],
        random: () => {
          randomCallCount += 1;
          return 0;
        }
      });

    expect(
      AKUUKAN_E19_RESTRICTION_COUNT_PER_PLAYER
    ).toBe(3);
    expect(
      result.e19DiscardRestrictions
    ).toHaveLength(9);
    expect(
      getAkuukanE19ForbiddenTileIds(
        result,
        "player-0"
      )
    ).toEqual([
      "player-0",
      "player-1",
      "player-2"
    ]);
    expect(
      getAkuukanE19ForbiddenTileIds(
        result,
        "player-1"
      )
    ).toEqual([
      "right-0",
      "right-1",
      "right-2"
    ]);
    expect(
      getAkuukanE19ForbiddenTileIds(
        result,
        "player-2"
      )
    ).toEqual([]);
    expect(
      getAkuukanE19ForbiddenTileIds(
        result,
        "player-3"
      )
    ).toEqual([
      "left-0",
      "left-1",
      "left-2"
    ]);
    expect(randomCallCount).toBe(9);
    expect(
      hands.player.map((tile) => tile.id)
    ).toEqual(originalPlayerIds);
  });

  it("乱数に従って末尾側の牌も重複なく指定する", () => {
    const result =
      assignAkuukanE19DiscardRestrictions({
        akuukan: createAkuukan(),
        players: [
          {
            playerId: "player-0",
            isSelectedEnemy: false,
            concealedTiles:
              createHand("random")
          }
        ],
        random: () => 0.999999
      });

    expect(
      getAkuukanE19ForbiddenTileIds(
        result,
        "player-0"
      )
    ).toEqual([
      "random-4",
      "random-3",
      "random-2"
    ]);
  });

  it("候補が3枚未満なら存在する異なる物理牌だけを指定する", () => {
    const duplicatedTile =
      createTile("same-id");
    const result =
      assignAkuukanE19DiscardRestrictions({
        akuukan: createAkuukan(),
        players: [
          {
            playerId: "player-0",
            isSelectedEnemy: false,
            concealedTiles: [
              duplicatedTile,
              { ...duplicatedTile },
              createTile("another-id")
            ]
          }
        ],
        random: () => 0
      });

    expect(
      getAkuukanE19ForbiddenTileIds(
        result,
        "player-0"
      )
    ).toEqual([
      "same-id",
      "another-id"
    ]);
  });

  it("再指定時は前局の指定へ追加せず新しい指定に置き換える", () => {
    const initial = createRestrictedAkuukan([
      {
        playerId: "player-0",
        tileId: "old-player-tile"
      },
      {
        playerId: "player-1",
        tileId: "old-cpu-tile"
      }
    ]);
    const result =
      assignAkuukanE19DiscardRestrictions({
        akuukan: initial,
        players: [
          {
            playerId: "player-0",
            isSelectedEnemy: false,
            concealedTiles:
              createHand("new")
          }
        ],
        random: () => 0
      });

    expect(
      result.e19DiscardRestrictions
    ).toEqual([
      {
        playerId: "player-0",
        tileId: "new-0"
      },
      {
        playerId: "player-0",
        tileId: "new-1"
      },
      {
        playerId: "player-0",
        tileId: "new-2"
      }
    ]);
    expect(
      initial.e19DiscardRestrictions
    ).toHaveLength(2);
  });

  it("E-19を持たない敵または能力無効時は以前の指定も消去する", () => {
    const oldRestrictions = [
      {
        playerId: "player-0",
        tileId: "old-tile"
      }
    ];
    const otherEnemy: AkuukanGameState = {
      ...createAkuukan("enemy-9"),
      e19DiscardRestrictions:
        oldRestrictions
    };
    const disabled = disableAkuukanSource(
      createRestrictedAkuukan(
        oldRestrictions
      ),
      "enemy-ability:E-19"
    );
    const players = [
      {
        playerId: "player-0",
        isSelectedEnemy: false,
        concealedTiles:
          createHand("unused")
      }
    ];

    expect(
      assignAkuukanE19DiscardRestrictions({
        akuukan: otherEnemy,
        players,
        random: () => 0
      }).e19DiscardRestrictions
    ).toBeUndefined();
    expect(
      assignAkuukanE19DiscardRestrictions({
        akuukan: disabled,
        players,
        random: () => 0
      }).e19DiscardRestrictions
    ).toBeUndefined();
  });
});

describe("E-19の打牌可否判定", () => {
  it("指定された所有者の物理牌だけを打牌禁止にする", () => {
    const state = createRestrictedAkuukan([
      {
        playerId: "player-0",
        tileId: "five-man-a"
      }
    ]);

    expect(
      isAkuukanE19DiscardAllowed({
        akuukan: state,
        playerId: "player-0",
        tileId: "five-man-a"
      })
    ).toBe(false);
    expect(
      isAkuukanE19DiscardAllowed({
        akuukan: state,
        playerId: "player-0",
        tileId: "five-man-b"
      })
    ).toBe(true);
    expect(
      isAkuukanE19DiscardAllowed({
        akuukan: state,
        playerId: "player-1",
        tileId: "five-man-a"
      })
    ).toBe(true);
  });

  it("指定記録が残っていてもE-19が無効なら打牌を認める", () => {
    const disabled = disableAkuukanSource(
      createRestrictedAkuukan([
        {
          playerId: "player-0",
          tileId: "forbidden-tile"
        }
      ]),
      "enemy-ability:E-19"
    );

    expect(
      getAkuukanE19ForbiddenTileIds(
        disabled,
        "player-0"
      )
    ).toEqual([]);
    expect(
      isAkuukanE19DiscardAllowed({
        akuukan: disabled,
        playerId: "player-0",
        tileId: "forbidden-tile"
      })
    ).toBe(true);
  });
});

describe("E-19の禁止状態解除", () => {
  it("手牌を離れた指定牌だけを解除し交換牌には引き継がない", () => {
    const initial = createRestrictedAkuukan([
      {
        playerId: "player-0",
        tileId: "remaining-tile"
      },
      {
        playerId: "player-0",
        tileId: "leaving-tile"
      },
      {
        playerId: "player-1",
        tileId: "other-player-tile"
      }
    ]);
    const result =
      synchronizeAkuukanE19PlayerHandRestrictions({
        akuukan: initial,
        playerId: "player-0",
        concealedTiles: [
          createTile("remaining-tile"),
          createTile("replacement-tile")
        ]
      });

    expect(
      result.e19DiscardRestrictions
    ).toEqual([
      {
        playerId: "player-0",
        tileId: "remaining-tile"
      },
      {
        playerId: "player-1",
        tileId: "other-player-tile"
      }
    ]);
    expect(
      getAkuukanE19ForbiddenTileIds(
        result,
        "player-0"
      )
    ).not.toContain("replacement-tile");
    expect(
      initial.e19DiscardRestrictions
    ).toHaveLength(3);
  });

  it("手牌が変わらなければ同じ状態を返し最後の指定解除後は項目を消す", () => {
    const initial = createRestrictedAkuukan([
      {
        playerId: "player-0",
        tileId: "remaining-tile"
      }
    ]);
    const unchanged =
      synchronizeAkuukanE19PlayerHandRestrictions({
        akuukan: initial,
        playerId: "player-0",
        concealedTiles: [
          createTile("remaining-tile")
        ]
      });
    const cleared =
      synchronizeAkuukanE19PlayerHandRestrictions({
        akuukan: unchanged,
        playerId: "player-0",
        concealedTiles: []
      });

    expect(unchanged).toBe(initial);
    expect(
      cleared.e19DiscardRestrictions
    ).toBeUndefined();
  });

  it("全解除は元の状態を変更せず未指定なら同じ状態を返す", () => {
    const unrestricted = createAkuukan();
    const restricted =
      createRestrictedAkuukan([
        {
          playerId: "player-0",
          tileId: "forbidden-tile"
        }
      ]);
    const cleared =
      clearAkuukanE19DiscardRestrictions(
        restricted
      );

    expect(
      cleared.e19DiscardRestrictions
    ).toBeUndefined();
    expect(
      restricted.e19DiscardRestrictions
    ).toHaveLength(1);
    expect(
      clearAkuukanE19DiscardRestrictions(
        unrestricted
      )
    ).toBe(unrestricted);
  });
});
