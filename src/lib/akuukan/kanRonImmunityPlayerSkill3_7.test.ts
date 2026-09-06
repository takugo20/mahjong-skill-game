import {
  describe,
  expect,
  it
} from "vitest";
import {
  activatePlayerSkill3_7RonImmunity,
  hasPlayerSkill3_7RonImmunity
} from "./kanRonImmunity";
import {
  beginAkuukanRound,
  createInitialAkuukanGameState,
  disableAkuukanSource
} from "./state";

function createAkuukan() {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: [{
      id: "3-7",
      level: 1
    }]
  });
}

describe("プレイヤースキル3-7 防御結界【槓】", () => {
  it("装備中に槓を宣言するとロン無効状態を付与する", () => {
    const activated =
      activatePlayerSkill3_7RonImmunity(
        createAkuukan()
      );

    expect(
      hasPlayerSkill3_7RonImmunity(
        activated
      )
    ).toBe(true);
  });

  it("未装備ならロン無効状態を付与しない", () => {
    const akuukan =
      createInitialAkuukanGameState({
        enemyId: "enemy-1",
        equippedSkills: []
      });

    expect(
      activatePlayerSkill3_7RonImmunity(
        akuukan
      )
    ).toBe(akuukan);
    expect(
      hasPlayerSkill3_7RonImmunity(
        akuukan
      )
    ).toBe(false);
  });

  it("スキル無効化中ならロン無効状態を付与しない", () => {
    const disabled = disableAkuukanSource(
      createAkuukan(),
      "player-skill:3-7"
    );

    expect(
      activatePlayerSkill3_7RonImmunity(
        disabled
      )
    ).toBe(disabled);
    expect(
      hasPlayerSkill3_7RonImmunity(
        disabled
      )
    ).toBe(false);
  });

  it("付与済みのロン無効状態は次局開始時に解除する", () => {
    const activated =
      activatePlayerSkill3_7RonImmunity(
        createAkuukan()
      );
    const nextRound =
      beginAkuukanRound(activated);

    expect(
      hasPlayerSkill3_7RonImmunity(
        nextRound
      )
    ).toBe(false);
  });
});
