import {
  describe,
  expect,
  it,
  vi
} from "vitest";
import type {
  SeatIndex,
  Tile
} from "../mahjong/types";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  TransparentTilePlayer
} from "./transparentTiles";
import {
  getPlayerSkill3_4VisibleTileIds,
  isPlayerSkill3_4TileVisible,
  synchronizePlayerSkill3_4VisibleTiles
} from "./transparentTiles";
import type {
  SkillLevel
} from "./types";

function createHand(
  playerId: string,
  count: number
): Tile[] {
  return Array.from(
    { length: count },
    (_, index) => ({
      id: `${playerId}-tile-${index}`,
      suit: "man" as const,
      rank: index % 9 + 1,
      red: false
    })
  );
}

function createPlayer(
  seat: SeatIndex,
  handSize = 13
): TransparentTilePlayer {
  const id = `player-${seat}`;

  return {
    id,
    seat,
    hand: createHand(id, handSize)
  };
}

function createAkuukan(
  level: SkillLevel = 1
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: [{
      id: "3-4",
      level
    }]
  });
}

describe("プレイヤースキル3-4 透牌", () => {
  it.each([
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
    [5, 6]
  ] as const)(
    "Lv.%sでは他家ごとに%s枚公開する",
    (level, expectedCount) => {
      const result =
        synchronizePlayerSkill3_4VisibleTiles({
          akuukan: createAkuukan(level),
          players: [
            createPlayer(1),
            createPlayer(2),
            createPlayer(3)
          ],
          random: () => 0
        });

      for (const seat of [1, 2, 3]) {
        expect(
          getPlayerSkill3_4VisibleTileIds(
            result,
            `player-${seat}`
          )
        ).toHaveLength(expectedCount);
      }
    }
  );

  it("公開牌が手牌に残っていれば同じ物理牌を維持する", () => {
    const player = createPlayer(1);
    const first =
      synchronizePlayerSkill3_4VisibleTiles({
        akuukan: createAkuukan(2),
        players: [player],
        random: () => 0
      });
    const random = vi.fn(() => 0.5);
    const second =
      synchronizePlayerSkill3_4VisibleTiles({
        akuukan: first,
        players: [player],
        random
      });

    expect(
      getPlayerSkill3_4VisibleTileIds(
        second,
        player.id
      )
    ).toEqual([
      "player-1-tile-0",
      "player-1-tile-1"
    ]);
    expect(random).not.toHaveBeenCalled();
  });

  it("公開牌が手牌を離れたら残る非公開牌から補充する", () => {
    const player = createPlayer(1);
    const first =
      synchronizePlayerSkill3_4VisibleTiles({
        akuukan: createAkuukan(2),
        players: [player],
        random: () => 0
      });
    const handAfterDiscard =
      player.hand.filter(
        (tile) =>
          tile.id !== "player-1-tile-0"
      );
    const second =
      synchronizePlayerSkill3_4VisibleTiles({
        akuukan: first,
        players: [{
          ...player,
          hand: handAfterDiscard
        }],
        random: () => 0
      });

    expect(
      getPlayerSkill3_4VisibleTileIds(
        second,
        player.id
      )
    ).toEqual([
      "player-1-tile-1",
      "player-1-tile-2"
    ]);
  });

  it("手牌が指定枚数未満なら存在する牌だけ公開する", () => {
    const player = createPlayer(1, 2);
    const result =
      synchronizePlayerSkill3_4VisibleTiles({
        akuukan: createAkuukan(5),
        players: [player],
        random: () => 0
      });

    expect(
      getPlayerSkill3_4VisibleTileIds(
        result,
        player.id
      )
    ).toHaveLength(2);
  });

  it("プレイヤー自身の手牌は透牌の対象にしない", () => {
    const result =
      synchronizePlayerSkill3_4VisibleTiles({
        akuukan: createAkuukan(5),
        players: [createPlayer(0)],
        random: () => 0
      });

    expect(
      result
        .playerSkill3_4VisibleTileIdsByPlayerId
    ).toEqual({});
  });

  it("未装備なら状態を変更しない", () => {
    const akuukan =
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: []
      });
    const result =
      synchronizePlayerSkill3_4VisibleTiles({
        akuukan,
        players: [createPlayer(1)],
        random: () => 0
      });

    expect(result).toBe(akuukan);
  });

  it("無効化中は公開牌を選ばず表示もしない", () => {
    const selected =
      synchronizePlayerSkill3_4VisibleTiles({
        akuukan: createAkuukan(),
        players: [createPlayer(1)],
        random: () => 0
      });
    const disabled = disableAkuukanSource(
      selected,
      "player-skill:3-4"
    );

    expect(
      synchronizePlayerSkill3_4VisibleTiles({
        akuukan: disabled,
        players: [createPlayer(1)],
        random: () => 0
      })
    ).toBe(disabled);
    expect(
      getPlayerSkill3_4VisibleTileIds(
        disabled,
        "player-1"
      )
    ).toEqual([]);
    expect(
      isPlayerSkill3_4TileVisible(
        disabled,
        "player-1",
        "player-1-tile-0"
      )
    ).toBe(false);
  });

  it("指定された物理牌だけを公開対象と判定する", () => {
    const result =
      synchronizePlayerSkill3_4VisibleTiles({
        akuukan: createAkuukan(),
        players: [createPlayer(1)],
        random: () => 0
      });

    expect(
      isPlayerSkill3_4TileVisible(
        result,
        "player-1",
        "player-1-tile-0"
      )
    ).toBe(true);
    expect(
      isPlayerSkill3_4TileVisible(
        result,
        "player-1",
        "player-1-tile-1"
      )
    ).toBe(false);
  });

  it("不正な乱数を拒否する", () => {
    expect(() =>
      synchronizePlayerSkill3_4VisibleTiles({
        akuukan: createAkuukan(),
        players: [createPlayer(1)],
        random: () => 1
      })
    ).toThrow(
      "乱数は0以上1未満で指定してください。"
    );
  });
});
