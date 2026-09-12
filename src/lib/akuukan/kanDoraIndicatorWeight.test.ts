import { describe, expect, it } from "vitest";
import type { Tile } from "../mahjong/types";
import {
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";
import type { SkillLevel } from "./types";
import {
  getAkuukanPlayerSkill5_3IndicatorWeightMultiplier as multiplier,
  type AkuukanPlayerSkill5_3IndicatorWeightInput
} from "./kanDoraIndicatorWeight";

function input(
  level: SkillLevel = 5
): AkuukanPlayerSkill5_3IndicatorWeightInput {
  return {
    akuukan: createInitialAkuukanGameState({
      enemyId: "enemy-1",
      equippedSkills: [{ id: "5-3", level }]
    }),
    kanOwnerIsPlayer: true,
    kanEstablished: true,
    addsNewIndicator: true,
    kanMeld: {
      kind: "closedKan",
      tiles: Array.from(
        { length: 4 },
        (_, i): Tile => ({
          id: `kan-${i}`,
          suit: "man",
          rank: 5,
          red: i === 0
        })
      )
    },
    candidate: {
      id: "indicator",
      suit: "man",
      rank: 4,
      red: false
    }
  };
}

describe("5-3 槓ドラ表示牌の抽選重量", () => {
  it.each([
    [1, 1.1],
    [2, 1.4],
    [3, 1.8],
    [4, 2.3],
    [5, 3]
  ] as const)(
    "Lv.%sで%s倍になる",
    (level, expected) => {
      expect(multiplier(input(level))).toBe(expected);
    }
  );

  it.each([
    "openKan",
    "closedKan",
    "addedKan"
  ] as const)("%sに適用する", kind => {
    const value = input();

    expect(
      multiplier({
        ...value,
        kanMeld: {
          ...value.kanMeld,
          kind
        }
      })
    ).toBe(3);
  });

  it.each([
    "kanOwnerIsPlayer",
    "kanEstablished",
    "addsNewIndicator"
  ] as const)("%sが偽なら補正しない", key => {
    expect(
      multiplier({
        ...input(),
        [key]: false
      })
    ).toBe(1);
  });

  it("槓子と同じ牌を表示牌にしても補正しない", () => {
    const value = input();

    expect(
      multiplier({
        ...value,
        candidate: {
          ...value.candidate,
          rank: 5
        }
      })
    ).toBe(1);
  });

  it("ポンと不完全な槓子には補正しない", () => {
    const value = input();

    expect(
      multiplier({
        ...value,
        kanMeld: {
          kind: "pon",
          tiles: value.kanMeld.tiles.slice(0, 3)
        }
      })
    ).toBe(1);

    expect(
      multiplier({
        ...value,
        kanMeld: {
          kind: "closedKan",
          tiles: []
        }
      })
    ).toBe(1);
  });

  it("未装備と無効化中は補正しない", () => {
    const value = input();

    expect(
      multiplier({
        ...value,
        akuukan: createInitialAkuukanGameState({
          enemyId: "enemy-1",
          equippedSkills: []
        })
      })
    ).toBe(1);

    expect(
      multiplier({
        ...value,
        akuukan: disableAkuukanSource(
          value.akuukan,
          "player-skill:5-3"
        )
      })
    ).toBe(1);
  });
});
