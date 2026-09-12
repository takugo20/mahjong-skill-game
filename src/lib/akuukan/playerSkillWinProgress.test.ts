import { describe, expect, it } from "vitest";
import {
  createInitialPlayerSkillGrowthState
} from "./playerSkillProgress";
import {
  recordPlayerSkillWinProgress as record,
  type PlayerSkillWinProgressInput
} from "./playerSkillWinProgress";

function input(): PlayerSkillWinProgressInput {
  return {
    winnerIsPlayer: true,
    winIsValid: true,
    isNagashiMangan: false,
    yakuIds: [],
    waitType: "ryanmen",
    redDoraCount: 0,
    uraDoraHan: 0
  };
}

describe("和了によるスキル解放進捗", () => {
  it("同一和了に複数の対象役があっても合算条件は1回だけ増やす", () => {
    const initial = createInitialPlayerSkillGrowthState();

    const result = record(initial, {
      ...input(),
      yakuIds: [
        "toitoi",
        "sanankou",
        "sankantsu",
        "toitoi"
      ]
    });

    const condition =
      "toitoi-sanshoku-doukou-sanankou-or-sankantsu-win-count";

    expect(result.unlockProgress[condition]).toBe(1);
    expect(initial.unlockProgress[condition]).toBe(0);
    expect(result.skills).toBe(initial.skills);
  });

  it("役満と採用構成上の有効な通常役を両方記録する", () => {
    const result = record(
      createInitialPlayerSkillGrowthState(),
      {
        ...input(),
        yakuIds: [
          "fourConcealedTripletsSingleWait",
          "allHonors",
          "honroutou"
        ],
        waitType: "tanki"
      }
    );

    expect(
      result.unlockProgress[
        "suuankou-or-suuankou-tanki-win-count"
      ]
    ).toBe(1);
    expect(
      result.unlockProgress["tsuuiisou-win-count"]
    ).toBe(1);
    expect(
      result.unlockProgress[
        "chinroutou-or-honroutou-win-count"
      ]
    ).toBe(1);
    expect(
      result.unlockProgress["tanki-win-count"]
    ).toBe(1);
  });

  it("赤ドラ5枚は3枚・5枚の両条件、裏ドラ4翻は裏ドラ条件を満たす", () => {
    const result = record(
      createInitialPlayerSkillGrowthState(),
      {
        ...input(),
        redDoraCount: 5,
        uraDoraHan: 4
      }
    );

    expect(
      result.unlockProgress["win-with-at-least-3-red-dora"]
    ).toBe(1);
    expect(
      result.unlockProgress["win-with-at-least-5-red-dora"]
    ).toBe(1);
    expect(
      result.unlockProgress["win-with-at-least-4-ura-dora"]
    ).toBe(1);
  });

  it("閾値未満のドラは条件を満たさない", () => {
    const initial = createInitialPlayerSkillGrowthState();

    expect(
      record(initial, {
        ...input(),
        redDoraCount: 2,
        uraDoraHan: 3
      })
    ).toBe(initial);
  });

  it.each([
    "penchan",
    "kanchan"
  ] as const)(
    "%sの待ちを共通の進捗へ記録する",
    waitType => {
      const result = record(
        createInitialPlayerSkillGrowthState(),
        {
          ...input(),
          waitType
        }
      );

      expect(
        result.unlockProgress["penchan-or-kanchan-win-count"]
      ).toBe(1);
    }
  );

  it.each([
    { winnerIsPlayer: false },
    { winIsValid: false },
    { isNagashiMangan: true }
  ])(
    "CPU・無効和了・流し満貫は記録しない: %j",
    flags => {
      const initial = createInitialPlayerSkillGrowthState();

      expect(
        record(initial, {
          ...input(),
          yakuIds: ["haitei"],
          redDoraCount: 5,
          ...flags
        })
      ).toBe(initial);
    }
  );

  it("一発・嶺上・海底の個別条件と合算条件を記録する", () => {
    const result = record(
      createInitialPlayerSkillGrowthState(),
      {
        ...input(),
        yakuIds: ["haitei", "ippatsu"]
      }
    );

    expect(
      result.unlockProgress["haitei-win-count"]
    ).toBe(1);
    expect(
      result.unlockProgress["ippatsu-win-count"]
    ).toBe(1);
    expect(
      result.unlockProgress["rinshan-haitei-or-houtei-win-count"]
    ).toBe(1);
    expect(
      result.unlockProgress["rinshan-kaihou-win-count"]
    ).toBe(0);
  });
});
