import {
  tryUseAkuukanAbility
} from "./abilityUse";
import type {
  AkuukanAbilityUseResult,
  AkuukanAbilityUseState
} from "./abilityUse";
import {
  getEquippedPlayerSkill
} from "./equipment";
import {
  getPlayerSkillDefinition
} from "./playerSkillCatalog";
import {
  getPlayerSkillLevelDefinition
} from "./playerSkillCatalogTypes";

export interface AkuukanPlayerSkill1_14State
  extends AkuukanAbilityUseState {
  readonly honba: number;
}

interface AkuukanPlayerSkill1_14Config {
  readonly mpCost: number;
  readonly honbaIncrease: number;
}

function getAkuukanPlayerSkill1_14Config(
  state: AkuukanPlayerSkill1_14State
): AkuukanPlayerSkill1_14Config | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      state.akuukan,
      "1-14"
    );

  if (!equippedSkill) {
    return null;
  }

  const definition =
    getPlayerSkillDefinition("1-14");
  const levelDefinition =
    getPlayerSkillLevelDefinition(
      definition,
      equippedSkill.level
    );

  if (
    definition.kind !== "active" ||
    definition.usageScope !== "turn" ||
    levelDefinition.mpCost === null ||
    !Number.isFinite(
      levelDefinition.mpCost
    ) ||
    levelDefinition.mpCost < 0
  ) {
    throw new Error(
      "スキル1-14の使用MPまたは使用範囲が不正です。"
    );
  }

  const honbaIncrease =
    levelDefinition.effectValues
      .honbaIncrease;

  if (
    typeof honbaIncrease !== "number" ||
    !Number.isSafeInteger(
      honbaIncrease
    ) ||
    honbaIncrease < 1
  ) {
    throw new Error(
      "スキル1-14の本場増加数が不正です。"
    );
  }

  return {
    mpCost: levelDefinition.mpCost,
    honbaIncrease
  };
}

export function tryActivateAkuukanPlayerSkill1_14<
  TState extends AkuukanPlayerSkill1_14State
>(
  state: TState
): AkuukanAbilityUseResult<TState> {
  if (
    !Number.isSafeInteger(state.honba) ||
    state.honba < 0
  ) {
    throw new RangeError(
      "本場は0以上の安全な整数で指定してください。"
    );
  }

  const config =
    getAkuukanPlayerSkill1_14Config(
      state
    );

  if (!config) {
    return {
      state,
      succeeded: false,
      failureReason: "skillNotEquipped"
    };
  }

  const honbaAfter =
    state.honba + config.honbaIncrease;

  if (!Number.isSafeInteger(honbaAfter)) {
    throw new RangeError(
      "スキル1-14適用後の本場が安全な整数になりません。"
    );
  }

  const abilityUse =
    tryUseAkuukanAbility(
      state,
      "turn",
      "player-skill:1-14",
      config.mpCost
    );

  if (!abilityUse.succeeded) {
    return abilityUse;
  }

  return {
    ...abilityUse,
    state: {
      ...abilityUse.state,
      honba: honbaAfter
    }
  };
}
