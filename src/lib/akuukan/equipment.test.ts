import {
  describe,
  expect,
  it
} from "vitest";
import {
  tryUseAkuukanAbility
} from "./abilityUse";
import {
  getEquippedPlayerSkill,
  getEquippedPlayerSkillLevel,
  getPlayerSkillIdFromSourceId,
  isAkuukanPlayerSkillEquipped
} from "./equipment";
import {
  createInitialAkuukanGameState
} from "./state";

function createAkuukanState() {
  return createInitialAkuukanGameState({
    enemyId: "enemy-1",
    equippedSkills: [
      {
        id: "1-1",
        level: 3
      }
    ]
  });
}

describe("亜空間麻雀の装備スキル参照", () => {
  it("装備中のスキルとレベルを取得する", () => {
    const state = createAkuukanState();
    const equippedSkill =
      getEquippedPlayerSkill(
        state,
        "1-1"
      );

    expect(equippedSkill).toEqual({
      id: "1-1",
      level: 3
    });
    expect(
      getEquippedPlayerSkillLevel(
        state,
        "1-1"
      )
    ).toBe(3);

    if (equippedSkill !== null) {
      equippedSkill.level = 5;
    }

    expect(
      state.setup.equippedSkills[0].level
    ).toBe(3);
  });

  it("未装備のスキルは存在しないものとして扱う", () => {
    const state = createAkuukanState();

    expect(
      getEquippedPlayerSkill(
        state,
        "1-2"
      )
    ).toBeNull();
    expect(
      isAkuukanPlayerSkillEquipped(
        state,
        "1-2"
      )
    ).toBe(false);
    expect(
      getEquippedPlayerSkillLevel(
        state,
        "1-2"
      )
    ).toBeNull();
  });

  it("効果元IDからプレイヤースキルだけを取り出す", () => {
    expect(
      getPlayerSkillIdFromSourceId(
        "player-skill:1-1"
      )
    ).toBe("1-1");
    expect(
      getPlayerSkillIdFromSourceId(
        "enemy-ability:E-1"
      )
    ).toBeNull();
  });
});

describe("装備状態と能力使用の連携", () => {
  it("未装備のプレイヤースキルを使用できない", () => {
    const initial = {
      akuukan: createAkuukanState(),
      playerMp: 420,
      maxMp: 900
    };

    const result = tryUseAkuukanAbility(
      initial,
      "round",
      "player-skill:1-2",
      120
    );

    expect(result).toEqual({
      state: initial,
      succeeded: false,
      failureReason: "skillNotEquipped"
    });
    expect(result.state).toBe(initial);
    expect(result.state.playerMp).toBe(420);
    expect(
      result.state.akuukan.usedSources.round
    ).toEqual([]);
  });

  it("敵能力にはプレイヤーの装備判定を適用しない", () => {
    const initial = {
      akuukan: createAkuukanState(),
      playerMp: 420,
      maxMp: 900
    };

    const result = tryUseAkuukanAbility(
      initial,
      "round",
      "enemy-ability:E-1",
      0
    );

    expect(result.succeeded).toBe(true);
    expect(result.failureReason).toBeNull();
    expect(result.state.playerMp).toBe(420);
    expect(
      result.state.akuukan.usedSources.round
    ).toEqual(["enemy-ability:E-1"]);
  });
});
