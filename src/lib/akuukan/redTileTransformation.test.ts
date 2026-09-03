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
  applyAkuukanRedTileTransformation
} from "./redTileTransformation";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  PlayerSkillId,
  SkillLevel
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number,
  red = false
): Tile {
  serialNumber += 1;

  return {
    id: `red-transformation-${serialNumber}`,
    suit,
    rank,
    red
  };
}

function createState(
  skillId: PlayerSkillId = "1-1",
  level: SkillLevel = 1
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: [{
      id: skillId,
      level
    }]
  });
}

function createRandom(
  values: readonly number[]
): {
  readonly random: () => number;
  readonly getCallCount: () => number;
} {
  let callCount = 0;

  return {
    random: () => {
      const value =
        values[callCount] ?? 0;
      callCount += 1;
      return value;
    },
    getCallCount: () => callCount
  };
}

describe("プレイヤースキルの赤ドラ化共通処理", () => {
  it("確率判定成功時は未赤牌から選んだ字牌も赤ドラ化できる", () => {
    const tiles = [
      createTile("man", 1),
      createTile("honor", 7),
      createTile("pin", 5, true)
    ];
    const random = createRandom([
      0.049,
      0.75
    ]);
    const result =
      applyAkuukanRedTileTransformation({
        akuukan: createState(),
        skillId: "1-1",
        tiles,
        random: random.random
      });

    expect(result.transformedTileId).toBe(
      tiles[1].id
    );
    expect(
      result.tiles.map((tile) => tile.red)
    ).toEqual([false, true, true]);
    expect(random.getCallCount()).toBe(2);
    expect(
      tiles.map((tile) => tile.red)
    ).toEqual([false, false, true]);
  });

  it("確率境界以上では赤ドラ化せず選択乱数も消費しない", () => {
    const tiles = [
      createTile("sou", 3),
      createTile("sou", 4)
    ];
    const random = createRandom([
      0.05,
      0.9
    ]);
    const result =
      applyAkuukanRedTileTransformation({
        akuukan: createState(),
        skillId: "1-1",
        tiles,
        random: random.random
      });

    expect(result.transformedTileId).toBeNull();
    expect(
      result.tiles.map((tile) => tile.red)
    ).toEqual([false, false]);
    expect(random.getCallCount()).toBe(1);
  });

  it("既存の赤牌を候補から除外して未赤牌を選び直す", () => {
    const tiles = [
      createTile("man", 5, true),
      createTile("pin", 2)
    ];
    const result =
      applyAkuukanRedTileTransformation({
        akuukan: createState(),
        skillId: "1-1",
        tiles,
        random: createRandom([0, 0]).random
      });

    expect(result.transformedTileId).toBe(
      tiles[1].id
    );
    expect(
      result.tiles.map((tile) => tile.red)
    ).toEqual([true, true]);
  });

  it("全牌が赤なら乱数を使わず不発にする", () => {
    const tiles = [
      createTile("honor", 1, true),
      createTile("sou", 9, true)
    ];
    const random = createRandom([0, 0]);
    const result =
      applyAkuukanRedTileTransformation({
        akuukan: createState(),
        skillId: "1-1",
        tiles,
        random: random.random
      });

    expect(result.transformedTileId).toBeNull();
    expect(result.tiles).toEqual(tiles);
    expect(random.getCallCount()).toBe(0);
  });

  it("レベル5では50パーセント未満だけ成功する", () => {
    const successTile = createTile(
      "pin",
      8
    );
    const failureTile = createTile(
      "pin",
      9
    );
    const akuukan = createState("1-1", 5);

    expect(
      applyAkuukanRedTileTransformation({
        akuukan,
        skillId: "1-1",
        tiles: [successTile],
        random: createRandom([
          0.499,
          0
        ]).random
      }).transformedTileId
    ).toBe(successTile.id);
    expect(
      applyAkuukanRedTileTransformation({
        akuukan,
        skillId: "1-1",
        tiles: [failureTile],
        random: createRandom([0.5]).random
      }).transformedTileId
    ).toBeNull();
  });

  it("未装備またはE-18による無効化中は乱数を使わない", () => {
    const tile = createTile("man", 7);
    const notEquippedRandom =
      createRandom([0, 0]);
    const disabledRandom =
      createRandom([0, 0]);
    const disabled = disableAkuukanSource(
      createState(),
      "player-skill:1-1"
    );

    expect(
      applyAkuukanRedTileTransformation({
        akuukan: createState("1-2"),
        skillId: "1-1",
        tiles: [tile],
        random: notEquippedRandom.random
      }).transformedTileId
    ).toBeNull();
    expect(
      applyAkuukanRedTileTransformation({
        akuukan: disabled,
        skillId: "1-1",
        tiles: [tile],
        random: disabledRandom.random
      }).transformedTileId
    ).toBeNull();
    expect(
      notEquippedRandom.getCallCount()
    ).toBe(0);
    expect(
      disabledRandom.getCallCount()
    ).toBe(0);
  });
});
