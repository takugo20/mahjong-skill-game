import {
  describe,
  expect,
  it
} from "vitest";
import {
  AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID,
  reservePlayerSkill2_19AfterWin
} from "./nextRoundPairGuarantee";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";

function createAkuukan(
  equipped = true
) {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: equipped
      ? [
          {
            id: "2-19",
            level: 5
          }
        ]
      : []
  });
}

describe("恩恵享受【縦】の次局予約", () => {
  it.each([
    "sevenPairs",
    "toitoi",
    "sanshokuDoukou",
    "sanankou",
    "sankantsu"
  ] as const)(
    "%sが成立した和了後に対子保証を予約する",
    (yakuId) => {
      const result =
        reservePlayerSkill2_19AfterWin({
          akuukan: createAkuukan(),
          normalYakuIds: [yakuId]
        });

      expect(result.nextRoundEffects).toEqual([
        {
          instanceId:
            AKUUKAN_PLAYER_SKILL_2_19_INSTANCE_ID,
          sourceId: "player-skill:2-19",
          remainingTurns: null
        }
      ]);
    }
  );

  it("対象役が複数成立しても予約は1件だけにする", () => {
    const initial = createAkuukan();
    const first =
      reservePlayerSkill2_19AfterWin({
        akuukan: initial,
        normalYakuIds: [
          "toitoi",
          "sanankou"
        ]
      });
    const second =
      reservePlayerSkill2_19AfterWin({
        akuukan: first,
        normalYakuIds: ["sankantsu"]
      });

    expect(second).toBe(first);
    expect(second.nextRoundEffects).toHaveLength(
      1
    );
  });

  it("対象外の役では予約しない", () => {
    const initial = createAkuukan();

    expect(
      reservePlayerSkill2_19AfterWin({
        akuukan: initial,
        normalYakuIds: ["pinfu"]
      })
    ).toBe(initial);
  });

  it("未装備なら予約しない", () => {
    const initial = createAkuukan(false);

    expect(
      reservePlayerSkill2_19AfterWin({
        akuukan: initial,
        normalYakuIds: ["sevenPairs"]
      })
    ).toBe(initial);
  });

  it("スキルが無効なら予約しない", () => {
    const disabled = disableAkuukanSource(
      createAkuukan(),
      "player-skill:2-19"
    );

    expect(
      reservePlayerSkill2_19AfterWin({
        akuukan: disabled,
        normalYakuIds: ["sevenPairs"]
      })
    ).toBe(disabled);
  });
});
