import {
  describe,
  expect,
  it
} from "vitest";
import type {
  Discard,
  Tile,
  TileSuit
} from "../mahjong/types";
import {
  countAkuukanPhysicalHonorDiscards,
  getAkuukanPlayerSkill1_7BonusHan
} from "./bonusHan";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type {
  SkillLevel
} from "./types";

let serialNumber = 0;

function createTile(
  suit: TileSuit,
  rank: number
): Tile {
  serialNumber += 1;

  return {
    id: `bonus-han-${serialNumber}`,
    suit,
    rank,
    red: false
  };
}

function createDiscard(
  suit: TileSuit,
  rank: number,
  options: {
    readonly called?: boolean;
    readonly faceDown?: boolean;
  } = {}
): Discard {
  return {
    tile: createTile(suit, rank),
    tsumogiri: false,
    riichiDeclaration: false,
    faceDown: options.faceDown ?? false,
    called: options.called ?? false
  };
}

function createAkuukan(
  level: SkillLevel = 1,
  equipped = true
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [{
          id: "1-7",
          level
        }]
      : []
  });
}

function createHonorDiscards(
  count: number
): Discard[] {
  return Array.from(
    { length: count },
    (_, index) =>
      createDiscard(
        "honor",
        (index % 7) + 1
      )
  );
}

function getBonusHan(
  level: SkillLevel,
  discards: readonly Discard[],
  options: {
    readonly winnerIsPlayer?: boolean;
    readonly hasValidYaku?: boolean;
  } = {}
): number {
  return getAkuukanPlayerSkill1_7BonusHan({
    akuukan: createAkuukan(level),
    winnerIsPlayer:
      options.winnerIsPlayer ?? true,
    discards,
    hasValidYaku:
      options.hasValidYaku ?? true
  });
}

describe("プレイヤースキル1-7のボーナス翻", () => {
  it("各レベルの必要字牌枚数を適用する", () => {
    const cases: readonly {
      level: SkillLevel;
      minimumHonorDiscards: number;
    }[] = [
      {
        level: 1,
        minimumHonorDiscards: 9
      },
      {
        level: 2,
        minimumHonorDiscards: 8
      },
      {
        level: 3,
        minimumHonorDiscards: 7
      },
      {
        level: 4,
        minimumHonorDiscards: 5
      },
      {
        level: 5,
        minimumHonorDiscards: 3
      }
    ];

    for (const currentCase of cases) {
      expect(
        getBonusHan(
          currentCase.level,
          createHonorDiscards(
            currentCase.minimumHonorDiscards
          )
        )
      ).toBe(1);

      expect(
        getBonusHan(
          currentCase.level,
          createHonorDiscards(
            currentCase.minimumHonorDiscards - 1
          )
        )
      ).toBe(0);
    }
  });

  it("副露に使われて河から離れた字牌を数えない", () => {
    const discards = [
      ...createHonorDiscards(8),
      createDiscard(
        "honor",
        7,
        { called: true }
      )
    ];

    expect(
      countAkuukanPhysicalHonorDiscards(
        discards
      )
    ).toBe(8);
    expect(getBonusHan(1, discards)).toBe(0);
  });

  it("裏向きでも河に残る字牌は数える", () => {
    const discards = [
      createDiscard(
        "honor",
        1,
        { faceDown: true }
      ),
      createDiscard(
        "honor",
        2,
        { faceDown: true }
      ),
      createDiscard(
        "honor",
        3,
        { faceDown: true }
      )
    ];

    expect(
      countAkuukanPhysicalHonorDiscards(
        discards
      )
    ).toBe(3);
    expect(getBonusHan(5, discards)).toBe(1);
  });

  it("数牌は河の字牌枚数に含めない", () => {
    const discards = [
      ...createHonorDiscards(8),
      createDiscard("man", 1),
      createDiscard("pin", 9),
      createDiscard("sou", 5)
    ];

    expect(
      countAkuukanPhysicalHonorDiscards(
        discards
      )
    ).toBe(8);
    expect(getBonusHan(1, discards)).toBe(0);
  });

  it("有効な役がなければ条件達成時も加算しない", () => {
    expect(
      getBonusHan(
        5,
        createHonorDiscards(3),
        { hasValidYaku: false }
      )
    ).toBe(0);
  });

  it("CPUの和了には適用しない", () => {
    expect(
      getBonusHan(
        5,
        createHonorDiscards(3),
        { winnerIsPlayer: false }
      )
    ).toBe(0);
  });

  it("未装備またはE-18による無効化中は適用しない", () => {
    const discards = createHonorDiscards(9);
    const notEquipped =
      getAkuukanPlayerSkill1_7BonusHan({
        akuukan: createAkuukan(1, false),
        winnerIsPlayer: true,
        discards,
        hasValidYaku: true
      });
    const disabled =
      getAkuukanPlayerSkill1_7BonusHan({
        akuukan: disableAkuukanSource(
          createAkuukan(),
          "player-skill:1-7"
        ),
        winnerIsPlayer: true,
        discards,
        hasValidYaku: true
      });

    expect(notEquipped).toBe(0);
    expect(disabled).toBe(0);
  });
});
