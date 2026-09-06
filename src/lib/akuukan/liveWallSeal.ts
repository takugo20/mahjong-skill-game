import type {
  Tile
} from "../mahjong/types";
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

export interface AkuukanPlayerSkill3_8State
  extends AkuukanAbilityUseState {
  readonly liveWall: Tile[];
}

interface AkuukanPlayerSkill3_8Config {
  readonly mpCost: number;
  readonly removedWallTileCount: number;
}

function getAkuukanPlayerSkill3_8Config(
  state: AkuukanPlayerSkill3_8State
): AkuukanPlayerSkill3_8Config | null {
  const equippedSkill =
    getEquippedPlayerSkill(
      state.akuukan,
      "3-8"
    );

  if (!equippedSkill) {
    return null;
  }

  const definition =
    getPlayerSkillDefinition("3-8");
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
      "スキル3-8の使用MPまたは使用範囲が不正です。"
    );
  }

  const removedWallTileCount =
    levelDefinition.effectValues
      .removedWallTileCount;

  if (
    typeof removedWallTileCount !==
      "number" ||
    !Number.isSafeInteger(
      removedWallTileCount
    ) ||
    removedWallTileCount < 1
  ) {
    throw new Error(
      "スキル3-8の山牌除外枚数が不正です。"
    );
  }

  return {
    mpCost: levelDefinition.mpCost,
    removedWallTileCount
  };
}

export function tryActivateAkuukanPlayerSkill3_8<
  TState extends AkuukanPlayerSkill3_8State
>(
  state: TState
): AkuukanAbilityUseResult<TState> {
  const config =
    getAkuukanPlayerSkill3_8Config(
      state
    );

  if (!config) {
    return {
      state,
      succeeded: false,
      failureReason: "skillNotEquipped"
    };
  }

  const abilityUse =
    tryUseAkuukanAbility(
      state,
      "turn",
      "player-skill:3-8",
      config.mpCost
    );

  if (!abilityUse.succeeded) {
    return abilityUse;
  }

  const removedCount = Math.min(
    config.removedWallTileCount,
    abilityUse.state.liveWall.length
  );

  return {
    ...abilityUse,
    state: {
      ...abilityUse.state,
      liveWall:
        removedCount === 0
          ? [...abilityUse.state.liveWall]
          : abilityUse.state.liveWall.slice(
              0,
              -removedCount
            )
    }
  };
}
